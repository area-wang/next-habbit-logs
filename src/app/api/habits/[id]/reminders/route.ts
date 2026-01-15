import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";
import { DEFAULT_TZ_OFFSET_MINUTES } from "@/lib/date";
import { DEFAULT_JOB_WINDOW_DAYS, getEffectiveUserTzOffsetMin, scheduleHabitAllJobs } from "@/lib/scheduled-jobs";
import { validateReminder } from "@/lib/reminder-validation";

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

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { id } = await ctx.params;
	if (!id) return badRequest("id is required");

	const res = await getDb()
		.prepare(
			"SELECT time_min, end_time_min, enabled FROM reminders WHERE user_id = ? AND target_type = 'habit' AND target_id = ? AND anchor = 'habit_time' ORDER BY time_min ASC",
		)
		.bind(user.id, id)
		.all();

	const times = (res.results || [])
		.map((r: any) => ({
			timeMin: r.time_min == null ? null : Number(r.time_min),
			endTimeMin: r.end_time_min == null ? null : Number(r.end_time_min),
			enabled: Number(r.enabled) === 1,
		}))
		.filter((x) => x.timeMin != null && Number.isFinite(x.timeMin) && x.timeMin >= 0 && x.timeMin <= 1439);

	return json({ reminders: times });
}

type PostBody = {
	hhmm?: string;
	timeMin?: number;
	endHhmm?: string;
	endTimeMin?: number;
	enabled?: boolean;
};

async function refreshHabitJobs(db: D1Database, p: { userId: string; habitId: string; tzOffsetMin: number }) {
	const habitRow = await db
		.prepare("SELECT id, title, active, start_date, end_date FROM habits WHERE id = ? AND user_id = ?")
		.bind(p.habitId, p.userId)
		.first();
	const habitTitle = habitRow && (habitRow as any).title == null ? "" : String((habitRow as any).title);
	const active = habitRow && (habitRow as any).active == null ? 0 : Number((habitRow as any).active);
	const startDate = habitRow && (habitRow as any).start_date == null ? "" : String((habitRow as any).start_date);
	const endDate = habitRow && (habitRow as any).end_date == null ? null : String((habitRow as any).end_date);
	if (!habitTitle || !startDate) return;

	const remindersRes = await db
		.prepare(
			"SELECT id, time_min, end_time_min, enabled FROM reminders WHERE user_id = ? AND target_type = 'habit' AND target_id = ? AND anchor = 'habit_time'",
		)
		.bind(p.userId, p.habitId)
		.all();
	const reminders = (remindersRes.results || [])
		.map((r: any) => ({
			reminderId: String(r.id || ""),
			timeMin: r.time_min == null ? NaN : Number(r.time_min),
			endTimeMin: r.end_time_min == null ? null : Number(r.end_time_min),
			enabled: Number(r.enabled) === 1,
		}))
		.filter((x) => x.reminderId && Number.isFinite(x.timeMin) && x.timeMin >= 0 && x.timeMin <= 1439);

	await scheduleHabitAllJobs(db, {
		userId: p.userId,
		habitId: p.habitId,
		habitTitle,
		active,
		startDate,
		endDate,
		reminders,
		tzOffsetMin: p.tzOffsetMin,
		days: DEFAULT_JOB_WINDOW_DAYS,
	});
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const tzRaw = req.cookies.get("tzOffsetMin")?.value;
	const tzFallback = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
	const tzOffsetMin = await getEffectiveUserTzOffsetMin(getDb(), { userId: user.id, fallback: tzFallback });

	const { id } = await ctx.params;
	if (!id) return badRequest("id is required");

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

	let endTimeMin: number | null = null;
	if (body?.endTimeMin != null) {
		endTimeMin = Number(body.endTimeMin);
		if (!Number.isFinite(endTimeMin) || endTimeMin < 0 || endTimeMin > 1439) return badRequest("invalid endTimeMin");
	} else if (body?.endHhmm != null) {
		const endHhmm = String(body.endHhmm);
		if (!isValidHHMM(endHhmm)) return badRequest("invalid endHhmm");
		endTimeMin = hhmmToMin(endHhmm);
		if (endTimeMin == null) return badRequest("invalid endHhmm");
	}

	// 验证提醒配置
	const validation = validateReminder({ timeMin, endTimeMin });
	if (!validation.valid) {
		return badRequest(validation.error || "invalid reminder configuration");
	}

	const enabled = body?.enabled === false ? 0 : 1;
	const now = Date.now();
	const reminderId = `rem:${user.id}:habit:${id}:habit_time:${timeMin}`;

	const db = getDb();
	await db
		.prepare(
			"INSERT INTO reminders (id, user_id, target_type, target_id, anchor, offset_min, time_min, end_time_min, enabled, created_at, updated_at) VALUES (?, ?, 'habit', ?, 'habit_time', NULL, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET time_min = excluded.time_min, end_time_min = excluded.end_time_min, enabled = excluded.enabled, updated_at = excluded.updated_at",
		)
		.bind(reminderId, user.id, id, timeMin, endTimeMin, enabled, now, now)
		.run();

	await refreshHabitJobs(db, { userId: user.id, habitId: id, tzOffsetMin });

	return json({ ok: true });
}

type DeleteBody = {
	timeMin?: number;
};

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const tzRaw = req.cookies.get("tzOffsetMin")?.value;
	const tzFallback = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
	const tzOffsetMin = await getEffectiveUserTzOffsetMin(getDb(), { userId: user.id, fallback: tzFallback });

	const { id } = await ctx.params;
	if (!id) return badRequest("id is required");

	const body = (await req.json().catch(() => null)) as DeleteBody | null;
	const timeMin = body?.timeMin == null ? null : Number(body.timeMin);
	if (timeMin == null || !Number.isFinite(timeMin) || timeMin < 0 || timeMin > 1439) return badRequest("invalid timeMin");

	const db = getDb();
	await db
		.prepare(
			"DELETE FROM reminders WHERE user_id = ? AND target_type = 'habit' AND target_id = ? AND anchor = 'habit_time' AND time_min = ?",
		)
		.bind(user.id, id, timeMin)
		.run();

	await refreshHabitJobs(db, { userId: user.id, habitId: id, tzOffsetMin });

	return json({ ok: true });
}
