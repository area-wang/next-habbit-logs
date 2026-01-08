import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { taskId } = await ctx.params;
	if (!taskId) return badRequest("taskId is required");

	const body = (await req.json().catch(() => null)) as null | {
		title?: string;
		description?: string | null;
		status?: string;
		startMin?: number | null;
		endMin?: number | null;
		remindBeforeMin?: number | null;
	};

	const updates: string[] = [];
	const binds: any[] = [];

	if (body?.title != null) {
		const title = String(body.title).trim();
		if (!title) return badRequest("title cannot be empty");
		if (title.length > 50) return badRequest("title must be <= 50 chars");
		updates.push("title = ?");
		binds.push(title);
	}
	if (body?.description !== undefined) {
		updates.push("description = ?");
		binds.push(body.description == null ? null : String(body.description));
	}
	if (body?.status != null) {
		const status = String(body.status);
		if (!/^(todo|done)$/.test(status)) return badRequest("invalid status");
		updates.push("status = ?");
		binds.push(status);
	}
	if (body?.startMin !== undefined) {
		const v = body.startMin == null ? null : Number(body.startMin);
		if (v != null && (!Number.isFinite(v) || v < 0 || v > 1439)) return badRequest("invalid startMin");
		updates.push("start_min = ?");
		binds.push(v);
	}
	if (body?.endMin !== undefined) {
		const v = body.endMin == null ? null : Number(body.endMin);
		if (v != null && (!Number.isFinite(v) || v < 0 || v > 1439)) return badRequest("invalid endMin");
		updates.push("end_min = ?");
		binds.push(v);
	}
	if (body?.remindBeforeMin !== undefined) {
		const v = body.remindBeforeMin == null ? null : Number(body.remindBeforeMin);
		if (v != null && (!Number.isFinite(v) || v < 0 || v > 1440)) return badRequest("invalid remindBeforeMin");
		updates.push("remind_before_min = ?");
		binds.push(v);
	}

	if (updates.length === 0) return badRequest("no updates");

	const now = Date.now();
	updates.push("updated_at = ?");
	binds.push(now);

	binds.push(taskId, user.id);

	await getDb()
		.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
		.bind(...binds)
		.run();

	if (body?.startMin !== undefined || body?.endMin !== undefined || body?.remindBeforeMin !== undefined) {
		const row = await getDb()
			.prepare("SELECT start_min, end_min, remind_before_min FROM tasks WHERE id = ? AND user_id = ?")
			.bind(taskId, user.id)
			.first();
		const startMin = row && (row as any).start_min == null ? null : Number((row as any).start_min);
		const endMin = row && (row as any).end_min == null ? null : Number((row as any).end_min);
		const rbm = row && (row as any).remind_before_min == null ? null : Number((row as any).remind_before_min);
		const db = getDb();
		const startEnabled = startMin != null && rbm != null;
		await upsertReminder(db, {
			userId: user.id,
			targetId: taskId,
			anchor: "task_start",
			offsetMin: startEnabled ? -Number(rbm) : null,
			timeMin: null,
			enabled: startEnabled,
		});
		const endEnabled = endMin != null;
		await upsertReminder(db, {
			userId: user.id,
			targetId: taskId,
			anchor: "task_end",
			offsetMin: endEnabled ? 0 : null,
			timeMin: null,
			enabled: endEnabled,
		});
	}

	return json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { taskId } = await ctx.params;
	if (!taskId) return badRequest("taskId is required");

	const db = getDb();
	await db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").bind(taskId, user.id).run();
	await db
		.prepare("DELETE FROM reminders WHERE user_id = ? AND target_type = 'task' AND target_id = ?")
		.bind(user.id, taskId)
		.run();
	return json({ ok: true });
}
