import { utcMsForOffsetMidnight } from "@/lib/date";

export const DEFAULT_JOB_WINDOW_DAYS = 30;

function clampTzOffsetMin(n: number) {
	if (!Number.isFinite(n)) return null;
	if (n < -14 * 60 || n > 14 * 60) return null;
	return Math.trunc(n);
}

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function addDaysYmd(ymd: string, deltaDays: number) {
	const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return "";
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "";
	const baseUtc = Date.UTC(y, mo - 1, d, 0, 0, 0, 0);
	return new Date(baseUtc + deltaDays * 86400_000).toISOString().slice(0, 10);
}

export async function getEffectiveUserTzOffsetMin(db: D1Database, p: { userId: string; fallback: number }) {
	const fallback = clampTzOffsetMin(p.fallback) ?? 480;
	try {
		const row = await db
			.prepare(
				"SELECT tz_offset_min FROM push_subscriptions WHERE user_id = ? AND disabled_at IS NULL ORDER BY updated_at DESC LIMIT 1",
			)
			.bind(p.userId)
			.first();
		const v = row && (row as any).tz_offset_min == null ? null : Number((row as any).tz_offset_min);
		return clampTzOffsetMin(v as any) ?? fallback;
	} catch {
		return fallback;
	}
}

export async function backfillUserJobs(db: D1Database, p: { userId: string; tzOffsetMin: number; days: number }) {
	const days = Math.max(1, Math.min(60, Math.trunc(p.days)));
	const tzOffsetMin = clampTzOffsetMin(p.tzOffsetMin) ?? 480;
	const today = new Date(Date.now() + tzOffsetMin * 60_000).toISOString().slice(0, 10);
	const end = addDaysYmd(today, days - 1);
	if (!isValidYmd(today) || !isValidYmd(end)) return;

	const tasksRes = await db
		.prepare(
			"SELECT id, title, scope_key, start_min, end_min, remind_before_min, status FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key >= ? AND scope_key <= ?",
		)
		.bind(p.userId, today, end)
		.all();
	const tasks = (tasksRes.results || []) as any[];
	for (const t of tasks) {
		const taskId = String((t as any).id || "");
		const title = String((t as any).title || "");
		const dayYmd = String((t as any).scope_key || "");
		const status = String((t as any).status || "");
		const startMin = (t as any).start_min == null ? null : Number((t as any).start_min);
		const endMin = (t as any).end_min == null ? null : Number((t as any).end_min);
		const remindBeforeMin = (t as any).remind_before_min == null ? null : Number((t as any).remind_before_min);
		if (!taskId || !title || !dayYmd) continue;
		await scheduleTaskJobs(db, {
			userId: p.userId,
			taskId,
			dayYmd,
			taskTitle: title,
			status,
			startMin,
			endMin,
			remindBeforeMin,
			tzOffsetMin,
		});
	}

	const habitsRes = await db
		.prepare("SELECT id, title, active, start_date, end_date FROM habits WHERE user_id = ?")
		.bind(p.userId)
		.all();
	const habits = (habitsRes.results || []) as any[];
	for (const h of habits) {
		const habitId = String((h as any).id || "");
		const habitTitle = String((h as any).title || "");
		const active = (h as any).active == null ? 0 : Number((h as any).active);
		const startDate = String((h as any).start_date || "");
		const endDate = (h as any).end_date == null ? null : String((h as any).end_date);
		if (!habitId || !habitTitle || !startDate) continue;

		const remindersRes = await db
			.prepare(
				"SELECT id, time_min, end_time_min, enabled FROM reminders WHERE user_id = ? AND target_type = 'habit' AND target_id = ? AND anchor = 'habit_time'",
			)
			.bind(p.userId, habitId)
			.all();
		const reminders = (remindersRes.results || [])
			.map((r: any) => ({
				reminderId: String(r.id || ""),
				timeMin: r.time_min == null ? NaN : Number(r.time_min),
				endTimeMin: r.end_time_min == null ? null : Number(r.end_time_min),
				enabled: Number(r.enabled) === 1,
			}))
			.filter((x) => x.reminderId && Number.isFinite(x.timeMin) && x.timeMin >= 0 && x.timeMin <= 1439);
		if (reminders.length === 0) continue;
		await scheduleHabitAllJobs(db, {
			userId: p.userId,
			habitId,
			habitTitle,
			active,
			startDate,
			endDate,
			reminders,
			tzOffsetMin,
			days,
		});
	}
}

export async function cancelScheduledJobsForTarget(db: D1Database, p: { userId: string; targetType: string; targetId: string }) {
	await db
		.prepare(
			"DELETE FROM scheduled_jobs WHERE user_id = ? AND target_type = ? AND target_id = ? AND status IN ('pending','retry','running')",
		)
		.bind(p.userId, p.targetType, p.targetId)
		.run();
}

export async function cancelScheduledJobsForReminder(db: D1Database, p: { userId: string; reminderId: string }) {
	await db
		.prepare("DELETE FROM scheduled_jobs WHERE user_id = ? AND reminder_id = ? AND status IN ('pending','retry','running')")
		.bind(p.userId, p.reminderId)
		.run();
}

async function insertJob(db: D1Database, p: {
	userId: string;
	kind: string;
	targetType: string;
	targetId: string;
	reminderId: string;
	dayYmd: string;
	runAt: number;
	tzOffsetMin: number;
	title: string;
	body: string;
	url: string;
	topic?: string;
	dedupeKey: string;
}) {
	const now0 = Date.now();
	if (!Number.isFinite(p.runAt)) return;
	if (p.runAt < now0 - 2 * 60_000) return;
	const id = crypto.randomUUID();
	const now = now0;
	await db
		.prepare(
			"INSERT INTO scheduled_jobs (id, user_id, kind, target_type, target_id, reminder_id, day_ymd, run_at, tz_offset_min, title, body, url, topic, status, attempts, next_retry_at, last_error, created_at, updated_at, dedupe_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, ?, ?, ?) ON CONFLICT(dedupe_key) DO NOTHING",
		)
		.bind(
			id,
			p.userId,
			p.kind,
			p.targetType,
			p.targetId,
			p.reminderId,
			p.dayYmd,
			p.runAt,
			p.tzOffsetMin,
			p.title,
			p.body,
			p.url,
			p.topic ?? null,
			now,
			now,
			p.dedupeKey,
		)
		.run();
}

export async function scheduleTaskJobs(db: D1Database, p: {
	userId: string;
	taskId: string;
	dayYmd: string;
	taskTitle: string;
	status: string;
	startMin: number | null;
	endMin: number | null;
	remindBeforeMin: number | null;
	tzOffsetMin: number;
}) {
	await cancelScheduledJobsForTarget(db, { userId: p.userId, targetType: "task", targetId: p.taskId });
	if (p.status !== "todo") return;
	if (!isValidYmd(p.dayYmd)) return;

	const base = utcMsForOffsetMidnight(p.dayYmd, p.tzOffsetMin);
	if (!Number.isFinite(base)) return;

	const reminderStartId = `rem:${p.userId}:task:${p.taskId}:task_start`;
	const startEnabled = p.startMin != null && p.remindBeforeMin != null;
	if (startEnabled) {
		const runAt = base + (Number(p.startMin) - Number(p.remindBeforeMin)) * 60_000;
		if (Number.isFinite(runAt)) {
			const minuteKey = Math.floor(runAt / 60_000);
			const dedupeKey = `${p.userId}:${reminderStartId}:${minuteKey}`;
			await insertJob(db, {
				userId: p.userId,
				kind: "task_start",
				targetType: "task",
				targetId: p.taskId,
				reminderId: reminderStartId,
				dayYmd: p.dayYmd,
				runAt,
				tzOffsetMin: p.tzOffsetMin,
				title: "爱你老己：即将开始",
				body: p.taskTitle,
				url: `/today?date=${encodeURIComponent(p.dayYmd)}&focus=task:${encodeURIComponent(p.taskId)}`,
				topic: `task:${p.taskId}`,
				dedupeKey,
			});
		}
	}

	const reminderEndId = `rem:${p.userId}:task:${p.taskId}:task_end`;
	const endEnabled = p.endMin != null;
	if (endEnabled) {
		const runAt = base + Number(p.endMin) * 60_000;
		if (Number.isFinite(runAt)) {
			const minuteKey = Math.floor(runAt / 60_000);
			const dedupeKey = `${p.userId}:${reminderEndId}:${minuteKey}`;
			await insertJob(db, {
				userId: p.userId,
				kind: "task_end",
				targetType: "task",
				targetId: p.taskId,
				reminderId: reminderEndId,
				dayYmd: p.dayYmd,
				runAt,
				tzOffsetMin: p.tzOffsetMin,
				title: "爱你老己：任务结束",
				body: p.taskTitle,
				url: `/today?date=${encodeURIComponent(p.dayYmd)}&focus=task:${encodeURIComponent(p.taskId)}`,
				topic: `task:${p.taskId}`,
				dedupeKey,
			});
		}
	}
}

function shouldScheduleJob(runAt: number, endTimeMin: number | null, tzOffsetMin: number): boolean {
	if (endTimeMin == null) return true;

	// 计算当天的结束时间
	const runDate = new Date(runAt);
	const dayStart = new Date(runDate);
	dayStart.setUTCHours(0, 0, 0, 0);
	const endTime = dayStart.getTime() + endTimeMin * 60_000 - tzOffsetMin * 60_000;

	// 只有当 runAt 早于 endTime 时才调度
	return runAt < endTime;
}

export async function scheduleHabitReminderJobs(db: D1Database, p: {
	userId: string;
	habitId: string;
	habitTitle: string;
	active: number;
	startDate: string;
	endDate: string | null;
	reminderId: string;
	enabled: boolean;
	timeMin: number;
	endTimeMin: number | null;
	tzOffsetMin: number;
	days: number;
}) {
	await cancelScheduledJobsForReminder(db, { userId: p.userId, reminderId: p.reminderId });
	if (Number(p.active) !== 1) return;
	if (!p.enabled) return;
	if (!isValidYmd(p.startDate)) return;

	const today = new Date(Date.now() + p.tzOffsetMin * 60_000).toISOString().slice(0, 10);
	const end = p.endDate && isValidYmd(p.endDate) ? p.endDate : null;
	const startFrom = today > p.startDate ? today : p.startDate;

	for (let i = 0; i < p.days; i++) {
		const ymd = addDaysYmd(startFrom, i);
		if (!ymd) break;
		if (end && ymd > end) break;
		const base = utcMsForOffsetMidnight(ymd, p.tzOffsetMin);
		if (!Number.isFinite(base)) continue;
		const runAt = base + Number(p.timeMin) * 60_000;
		if (!Number.isFinite(runAt)) continue;

		// 检查是否应该调度此任务
		if (!shouldScheduleJob(runAt, p.endTimeMin, p.tzOffsetMin)) continue;

		const minuteKey = Math.floor(runAt / 60_000);
		const dedupeKey = `${p.userId}:${p.reminderId}:${minuteKey}`;
		await insertJob(db, {
			userId: p.userId,
			kind: "habit_time",
			targetType: "habit",
			targetId: p.habitId,
			reminderId: p.reminderId,
			dayYmd: ymd,
			runAt,
			tzOffsetMin: p.tzOffsetMin,
			title: "爱你老己：习惯提醒",
			body: p.habitTitle,
			url: `/today?date=${encodeURIComponent(ymd)}&focus=habit:${encodeURIComponent(p.habitId)}`,
			topic: `habit:${p.habitId}`,
			dedupeKey,
		});
	}
}

export async function scheduleHabitAllJobs(db: D1Database, p: {
	userId: string;
	habitId: string;
	habitTitle: string;
	active: number;
	startDate: string;
	endDate: string | null;
	reminders: Array<{ reminderId: string; timeMin: number; endTimeMin?: number | null; enabled: boolean }>;
	tzOffsetMin: number;
	days: number;
}) {
	await cancelScheduledJobsForTarget(db, { userId: p.userId, targetType: "habit", targetId: p.habitId });
	if (Number(p.active) !== 1) return;
	for (const r of p.reminders) {
		await scheduleHabitReminderJobs(db, {
			userId: p.userId,
			habitId: p.habitId,
			habitTitle: p.habitTitle,
			active: p.active,
			startDate: p.startDate,
			endDate: p.endDate,
			reminderId: r.reminderId,
			enabled: r.enabled,
			timeMin: r.timeMin,
			endTimeMin: r.endTimeMin ?? null,
			tzOffsetMin: p.tzOffsetMin,
			days: p.days,
		});
	}
}
