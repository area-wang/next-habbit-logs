import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

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

	return json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { taskId } = await ctx.params;
	if (!taskId) return badRequest("taskId is required");

	await getDb().prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").bind(taskId, user.id).run();
	return json({ ok: true });
}
