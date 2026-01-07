import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ habitId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { habitId } = await ctx.params;
	if (!habitId) return badRequest("habitId is required");

	const body = (await req.json().catch(() => null)) as null | {
		title?: string;
		description?: string | null;
		active?: number;
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
	if (body?.active !== undefined) {
		const v = Number(body.active);
		if (!Number.isFinite(v) || (v !== 0 && v !== 1)) return badRequest("active must be 0 or 1");
		updates.push("active = ?");
		binds.push(v);
	}

	if (updates.length === 0) return badRequest("no updates");

	const now = Date.now();
	updates.push("updated_at = ?");
	binds.push(now);

	binds.push(habitId, user.id);

	await getDb()
		.prepare(`UPDATE habits SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
		.bind(...binds)
		.run();

	return json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ habitId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { habitId } = await ctx.params;
	if (!habitId) return badRequest("habitId is required");

	const db = getDb();
	await db.prepare("DELETE FROM habits WHERE id = ? AND user_id = ?").bind(habitId, user.id).run();
	await db
		.prepare("DELETE FROM reminders WHERE user_id = ? AND target_type = 'habit' AND target_id = ?")
		.bind(user.id, habitId)
		.run();
	return json({ ok: true });
}
