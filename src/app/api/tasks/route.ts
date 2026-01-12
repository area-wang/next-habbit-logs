import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";
import { DEFAULT_TZ_OFFSET_MINUTES } from "@/lib/date";
import { getEffectiveUserTzOffsetMin, scheduleTaskJobs } from "@/lib/scheduled-jobs";

async function upsertReminder(db: D1Database, p: {
	userId: string;
	targetType: string;
	targetId: string;
	anchor: string;
	offsetMin: number | null;
	timeMin: number | null;
	enabled: boolean;
}) {
	const id = `rem:${p.userId}:${p.targetType}:${p.targetId}:${p.anchor}`;
	const now = Date.now();
	const enabledInt = p.enabled ? 1 : 0;
	await db
		.prepare(
			"INSERT INTO reminders (id, user_id, target_type, target_id, anchor, offset_min, time_min, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET offset_min = excluded.offset_min, time_min = excluded.time_min, enabled = excluded.enabled, updated_at = excluded.updated_at",
		)
		.bind(id, p.userId, p.targetType, p.targetId, p.anchor, p.offsetMin, p.timeMin, enabledInt, now, now)
		.run();
}

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidScope(scopeType: string, scopeKey: string) {
	if (!/^(day|week|month|year)$/.test(scopeType)) return false;
	if (scopeType === "day") return isValidYmd(scopeKey);
	if (scopeType === "month") return /^\d{4}-\d{2}$/.test(scopeKey);
	if (scopeType === "year") return /^\d{4}$/.test(scopeKey);
	if (scopeType === "week") return /^\d{4}-W\d{2}$/.test(scopeKey);
	return false;
}

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { searchParams } = new URL(req.url);
	const scopeType = String(searchParams.get("scopeType") || "day");
	const scopeKey = String(searchParams.get("scopeKey") || "");
	if (!scopeKey) return badRequest("scopeKey is required");
	if (!isValidScope(scopeType, scopeKey)) return badRequest("invalid scopeType/scopeKey");

	const res = await getDb()
		.prepare(
			"SELECT id, title, description, scope_type, scope_key, start_min, end_min, remind_before_min, status, created_at, updated_at FROM tasks WHERE user_id = ? AND scope_type = ? AND scope_key = ? ORDER BY created_at DESC",
		)
		.bind(user.id, scopeType, scopeKey)
		.all();

	return json({ tasks: res.results || [], scopeType, scopeKey });
}

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const tzRaw = req.cookies.get("tzOffsetMin")?.value;
	const tzFallback = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
	const tzOffsetMin = await getEffectiveUserTzOffsetMin(getDb(), { userId: user.id, fallback: tzFallback });

	const body = (await req.json().catch(() => null)) as null | {
		title?: string;
		description?: string | null;
		scopeType?: string;
		scopeKey?: string;
		startMin?: number | null;
		endMin?: number | null;
		remindBeforeMin?: number | null;
	};

	const title = body?.title ? String(body.title).trim() : "";
	if (!title) return badRequest("title is required");
	if (title.length > 50) return badRequest("title must be <= 50 chars");

	const scopeType = body?.scopeType ? String(body.scopeType) : "day";
	const scopeKey = body?.scopeKey ? String(body.scopeKey) : "";
	if (!scopeKey) return badRequest("scopeKey is required");
	if (!isValidScope(scopeType, scopeKey)) return badRequest("invalid scopeType/scopeKey");

	const startMin = body?.startMin == null ? null : Number(body.startMin);
	const endMin = body?.endMin == null ? null : Number(body.endMin);
	const remindBeforeMin = body?.remindBeforeMin == null ? null : Number(body.remindBeforeMin);

	if (startMin != null && (!Number.isFinite(startMin) || startMin < 0 || startMin > 1439)) return badRequest("invalid startMin");
	if (endMin != null && (!Number.isFinite(endMin) || endMin < 0 || endMin > 1439)) return badRequest("invalid endMin");
	if (remindBeforeMin != null && (!Number.isFinite(remindBeforeMin) || remindBeforeMin < 0 || remindBeforeMin > 1440)) {
		return badRequest("invalid remindBeforeMin");
	}

	const id = crypto.randomUUID();
	const now = Date.now();
	await getDb()
		.prepare(
			"INSERT INTO tasks (id, user_id, title, description, scope_type, scope_key, start_min, end_min, remind_before_min, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?)",
		)
		.bind(
			id,
			user.id,
			title,
			body?.description ? String(body.description) : null,
			scopeType,
			scopeKey,
			startMin,
			endMin,
			remindBeforeMin,
			now,
			now,
		)
		.run();

	const db = getDb();
	const startEnabled = startMin != null && remindBeforeMin != null;
	await upsertReminder(db, {
		userId: user.id,
		targetType: "task",
		targetId: id,
		anchor: "task_start",
		offsetMin: startEnabled ? -Number(remindBeforeMin) : null,
		timeMin: null,
		enabled: startEnabled,
	});
	const endEnabled = endMin != null;
	await upsertReminder(db, {
		userId: user.id,
		targetType: "task",
		targetId: id,
		anchor: "task_end",
		offsetMin: endEnabled ? 0 : null,
		timeMin: null,
		enabled: endEnabled,
	});
	if (scopeType === "day") {
		await scheduleTaskJobs(db, {
			userId: user.id,
			taskId: id,
			dayYmd: scopeKey,
			taskTitle: title,
			status: "todo",
			startMin,
			endMin,
			remindBeforeMin,
			tzOffsetMin,
		});
	}

	return json({ ok: true, taskId: id });
}
