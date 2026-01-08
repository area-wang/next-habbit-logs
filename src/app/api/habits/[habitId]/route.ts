import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ habitId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { habitId } = await ctx.params;
	if (!habitId) return badRequest("habitId is required");

	const body = (await req.json().catch(() => null)) as null | {
		title?: string;
		description?: string | null;
		active?: number;
		startDate?: string;
		endDate?: string | null;
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
	if (body?.startDate !== undefined) {
		const startDate = String(body.startDate || "").trim();
		if (!isValidYmd(startDate)) return badRequest("invalid startDate");
		updates.push("start_date = ?");
		binds.push(startDate);
	}
	if (body?.endDate !== undefined) {
		const endDateRaw = body.endDate == null ? "" : String(body.endDate);
		const endDate = endDateRaw ? endDateRaw : null;
		if (endDate != null && endDate !== "" && !isValidYmd(endDate)) return badRequest("invalid endDate");
		updates.push("end_date = ?");
		binds.push(endDate);
	}

	if (body?.startDate !== undefined || body?.endDate !== undefined) {
		const start = body?.startDate !== undefined ? String(body.startDate || "").trim() : null;
		const endRaw = body?.endDate !== undefined ? (body.endDate == null ? "" : String(body.endDate)) : null;
		const end = endRaw != null && endRaw !== "" ? endRaw : null;
		if (start && end && start > end) return badRequest("startDate must be <= endDate");
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
