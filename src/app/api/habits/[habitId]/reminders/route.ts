import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

function isValidHHMM(s: string) {
	return /^\d{2}:\d{2}$/.test(s);
}

function hhmmToMin(s: string) {
	const m = s.match(/^(\d{2}):(\d{2})$/);
	if (!m) return null;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
	return hh * 60 + mm;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ habitId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { habitId } = await ctx.params;
	if (!habitId) return badRequest("habitId is required");

	const res = await getDb()
		.prepare(
			"SELECT time_min, enabled FROM reminders WHERE user_id = ? AND target_type = 'habit' AND target_id = ? AND anchor = 'habit_time' ORDER BY time_min ASC",
		)
		.bind(user.id, habitId)
		.all();

	const times = (res.results || [])
		.map((r: any) => ({
			timeMin: r.time_min == null ? null : Number(r.time_min),
			enabled: Number(r.enabled) === 1,
		}))
		.filter((x) => x.timeMin != null && Number.isFinite(x.timeMin) && x.timeMin >= 0 && x.timeMin <= 1439);

	return json({ reminders: times });
}

type PostBody = {
	hhmm?: string;
	timeMin?: number;
	enabled?: boolean;
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ habitId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { habitId } = await ctx.params;
	if (!habitId) return badRequest("habitId is required");

	const body = (await req.json().catch(() => null)) as PostBody | null;
	let timeMin: number | null = null;
	if (body?.timeMin != null) {
		timeMin = Number(body.timeMin);
		if (!Number.isFinite(timeMin) || timeMin < 0 || timeMin > 1439) return badRequest("invalid timeMin");
	} else if (body?.hhmm != null) {
		const hhmm = String(body.hhmm);
		if (!isValidHHMM(hhmm)) return badRequest("invalid hhmm");
		timeMin = hhmmToMin(hhmm);
		if (timeMin == null) return badRequest("invalid hhmm");
	} else {
		return badRequest("hhmm or timeMin is required");
	}

	const enabled = body?.enabled === false ? 0 : 1;
	const now = Date.now();
	const id = `rem:${user.id}:habit:${habitId}:habit_time:${timeMin}`;

	await getDb()
		.prepare(
			"INSERT INTO reminders (id, user_id, target_type, target_id, anchor, offset_min, time_min, enabled, created_at, updated_at) VALUES (?, ?, 'habit', ?, 'habit_time', NULL, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET time_min = excluded.time_min, enabled = excluded.enabled, updated_at = excluded.updated_at",
		)
		.bind(id, user.id, habitId, timeMin, enabled, now, now)
		.run();

	return json({ ok: true });
}

type DeleteBody = {
	timeMin?: number;
};

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ habitId: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { habitId } = await ctx.params;
	if (!habitId) return badRequest("habitId is required");

	const body = (await req.json().catch(() => null)) as DeleteBody | null;
	const timeMin = body?.timeMin == null ? null : Number(body.timeMin);
	if (timeMin == null || !Number.isFinite(timeMin) || timeMin < 0 || timeMin > 1439) return badRequest("invalid timeMin");

	await getDb()
		.prepare(
			"DELETE FROM reminders WHERE user_id = ? AND target_type = 'habit' AND target_id = ? AND anchor = 'habit_time' AND time_min = ?",
		)
		.bind(user.id, habitId, timeMin)
		.run();

	return json({ ok: true });
}
