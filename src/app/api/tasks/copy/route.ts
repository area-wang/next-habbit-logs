import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";
import { DEFAULT_TZ_OFFSET_MINUTES } from "@/lib/date";
import { getEffectiveUserTzOffsetMin, scheduleTaskJobs } from "@/lib/scheduled-jobs";

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function upsertReminder(db: D1Database, p: {
	userId: string;
	targetId: string;
	anchor: string;
	offsetMin: number | null;
	timeMin: number | null;
	enabled: boolean;
}) {
	const id = `rem:${p.userId}:task:${p.targetId}:${p.anchor}`;
	const now = Date.now();
	const enabledInt = p.enabled ? 1 : 0;
	await db
		.prepare(
			"INSERT INTO reminders (id, user_id, target_type, target_id, anchor, offset_min, time_min, enabled, created_at, updated_at) VALUES (?, ?, 'task', ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET offset_min = excluded.offset_min, time_min = excluded.time_min, enabled = excluded.enabled, updated_at = excluded.updated_at",
		)
		.bind(id, p.userId, p.targetId, p.anchor, p.offsetMin, p.timeMin, enabledInt, now, now)
		.run();
}

type PostBody = {
	fromScopeKey?: string;
	toScopeKey?: string;
	taskIds?: string[];
};

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const tzRaw = req.cookies.get("tzOffsetMin")?.value;
	const tzFallback = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
	const tzOffsetMin = await getEffectiveUserTzOffsetMin(getDb(), { userId: user.id, fallback: tzFallback });

	const body = (await req.json().catch(() => null)) as PostBody | null;
	const fromScopeKey = String(body?.fromScopeKey || "");
	const toScopeKey = String(body?.toScopeKey || "");
	if (!fromScopeKey) return badRequest("fromScopeKey is required");
	if (!toScopeKey) return badRequest("toScopeKey is required");
	if (!isValidYmd(fromScopeKey)) return badRequest("invalid fromScopeKey");
	if (!isValidYmd(toScopeKey)) return badRequest("invalid toScopeKey");

	const inputIds = Array.isArray(body?.taskIds) ? body?.taskIds : null;
	const taskIds = inputIds ? inputIds.map((x) => String(x)).filter(Boolean) : null;

	const db = getDb();
	let rows: any[] = [];
	if (!taskIds || taskIds.length === 0) {
		const res = await db
			.prepare(
				"SELECT id, title, description, start_min, end_min, remind_before_min FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key = ? ORDER BY created_at DESC",
			)
			.bind(user.id, fromScopeKey)
			.all();
		rows = (res.results || []) as any[];
	} else {
		const placeholders = taskIds.map(() => "?").join(",");
		const res = await db
			.prepare(
				`SELECT id, title, description, start_min, end_min, remind_before_min FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key = ? AND id IN (${placeholders}) ORDER BY created_at DESC`,
			)
			.bind(user.id, fromScopeKey, ...taskIds)
			.all();
		rows = (res.results || []) as any[];
	}

	if (!rows || rows.length === 0) return json({ ok: true, createdTasks: [] as any[] });

	const now = Date.now();
	const createdTasks: any[] = [];

	for (const r of rows) {
		const title = r?.title == null ? "" : String(r.title).trim();
		if (!title) continue;
		const id = crypto.randomUUID();
		const description = r?.description == null ? null : String(r.description);
		const startMin = r?.start_min == null ? null : Number(r.start_min);
		const endMin = r?.end_min == null ? null : Number(r.end_min);
		const remindBeforeMin = r?.remind_before_min == null ? null : Number(r.remind_before_min);

		await db
			.prepare(
				"INSERT INTO tasks (id, user_id, title, description, scope_type, scope_key, start_min, end_min, remind_before_min, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'day', ?, ?, ?, ?, 'todo', ?, ?)",
			)
			.bind(id, user.id, title, description, toScopeKey, startMin, endMin, remindBeforeMin, now, now)
			.run();

		const startEnabled = startMin != null && remindBeforeMin != null;
		await upsertReminder(db, {
			userId: user.id,
			targetId: id,
			anchor: "task_start",
			offsetMin: startEnabled ? -Number(remindBeforeMin) : null,
			timeMin: null,
			enabled: startEnabled,
		});
		const endEnabled = endMin != null;
		await upsertReminder(db, {
			userId: user.id,
			targetId: id,
			anchor: "task_end",
			offsetMin: endEnabled ? 0 : null,
			timeMin: null,
			enabled: endEnabled,
		});
		await scheduleTaskJobs(db, {
			userId: user.id,
			taskId: id,
			dayYmd: toScopeKey,
			taskTitle: title,
			status: "todo",
			startMin,
			endMin,
			remindBeforeMin,
			tzOffsetMin,
		});

		createdTasks.push({
			id,
			title,
			description,
			scope_type: "day",
			scope_key: toScopeKey,
			start_min: startMin,
			end_min: endMin,
			remind_before_min: remindBeforeMin,
			status: "todo",
			created_at: now,
			updated_at: now,
		});
	}

	return json({ ok: true, createdTasks });
}
