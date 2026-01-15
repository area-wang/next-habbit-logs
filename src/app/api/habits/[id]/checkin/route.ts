import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { id } = await ctx.params;
	if (!id) return badRequest("id is required");

	const body = (await req.json().catch(() => null)) as null | { date?: string; note?: string };
	const date = body?.date ? String(body.date) : "";
	if (!isValidYmd(date)) return badRequest("invalid date");

	const habitRes = await getDb()
		.prepare("SELECT start_date, end_date FROM habits WHERE id = ? AND user_id = ?")
		.bind(id, user.id)
		.all();
	const h0 = habitRes.results?.[0] as any;
	const startDate = h0?.start_date == null ? "" : String(h0.start_date);
	const endDate = h0?.end_date == null ? null : String(h0.end_date);
	if (!startDate) return badRequest("habit not found");
	if (date < startDate) return badRequest("date is before habit startDate");
	if (endDate && date > endDate) return badRequest("date is after habit endDate");

	const checkId = crypto.randomUUID();
	const now = Date.now();

	await getDb()
		.prepare(
			"INSERT INTO habit_checkins (id, habit_id, user_id, date_ymd, note, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(habit_id, date_ymd) DO UPDATE SET note = excluded.note",
		)
		.bind(checkId, id, user.id, date, body?.note ? String(body.note) : null, now)
		.run();

	return json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { id } = await ctx.params;
	const { searchParams } = new URL(req.url);
	const date = searchParams.get("date") || "";
	if (!isValidYmd(date)) return badRequest("invalid date");

	await getDb()
		.prepare("DELETE FROM habit_checkins WHERE habit_id = ? AND user_id = ? AND date_ymd = ?")
		.bind(id, user.id, date)
		.run();

	return json({ ok: true });
}
