import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ habitId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { habitId } = await ctx.params;
	if (!habitId) return badRequest("habitId is required");

	const body = (await req.json().catch(() => null)) as null | { date?: string; note?: string };
	const date = body?.date ? String(body.date) : "";
	if (!isValidYmd(date)) return badRequest("invalid date");

	const id = crypto.randomUUID();
	const now = Date.now();

	await getDb()
		.prepare(
			"INSERT INTO habit_checkins (id, habit_id, user_id, date_ymd, note, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(habit_id, date_ymd) DO UPDATE SET note = excluded.note",
		)
		.bind(id, habitId, user.id, date, body?.note ? String(body.note) : null, now)
		.run();

	return json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ habitId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { habitId } = await ctx.params;
	const { searchParams } = new URL(req.url);
	const date = searchParams.get("date") || "";
	if (!isValidYmd(date)) return badRequest("invalid date");

	await getDb()
		.prepare("DELETE FROM habit_checkins WHERE habit_id = ? AND user_id = ? AND date_ymd = ?")
		.bind(habitId, user.id, date)
		.run();

	return json({ ok: true });
}
