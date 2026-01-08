import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { DEFAULT_TZ_OFFSET_MINUTES, ymdInOffset } from "@/lib/date";
import HabitList, { type Habit } from "./habit-list";
import TaskList from "./task-list";
import TodayDatePicker from "./date-picker";
import { cookies } from "next/headers";

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function TodayPage({
	searchParams,
}: {
	searchParams?: Promise<{ date?: string | string[] }>;
}) {
	const user = await requireUser();
	const sp = searchParams ? await searchParams : undefined;
	const raw = sp?.date;
	const cookieStore = await cookies();
	const tzRaw = cookieStore.get("tzOffsetMin")?.value;
	const tz = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
	const dateParam = Array.isArray(raw) ? raw[0] : raw;
	const date = dateParam && isValidYmd(dateParam) ? dateParam : ymdInOffset(new Date(), tz);

	const habitsRes = await getDb()
		.prepare("SELECT id, title, description FROM habits WHERE user_id = ? AND active = 1 ORDER BY created_at DESC")
		.bind(user.id)
		.all();
	const habits = (habitsRes.results || []) as Habit[];

	const tasksRes = await getDb()
		.prepare(
			"SELECT id, title, description, status, start_min, end_min, remind_before_min FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key = ? ORDER BY created_at DESC",
		)
		.bind(user.id, date)
		.all();
	const tasks = (tasksRes.results || []) as any[];

	const checkinsRes = await getDb()
		.prepare("SELECT habit_id FROM habit_checkins WHERE user_id = ? AND date_ymd = ?")
		.bind(user.id, date)
		.all();
	const checkedHabitIds = (checkinsRes.results || []).map((r: any) => String(r.habit_id));

	let habitRemindersByHabitId: Record<string, number[]> = {};
	if (habits.length > 0) {
		const ids = habits.map((h) => String((h as any).id));
		const placeholders = ids.map(() => "?").join(",");
		const remindersRes = await getDb()
			.prepare(
				`SELECT target_id as habit_id, time_min FROM reminders WHERE user_id = ? AND target_type = 'habit' AND anchor = 'habit_time' AND enabled = 1 AND target_id IN (${placeholders}) ORDER BY time_min ASC`,
			)
			.bind(user.id, ...ids)
			.all();
		for (const r of remindersRes.results || []) {
			const habitId = String((r as any).habit_id);
			const timeMin = (r as any).time_min == null ? null : Number((r as any).time_min);
			if (timeMin == null || !Number.isFinite(timeMin) || timeMin < 0 || timeMin > 1439) continue;
			if (!habitRemindersByHabitId[habitId]) habitRemindersByHabitId[habitId] = [];
			habitRemindersByHabitId[habitId].push(timeMin);
		}
		for (const k of Object.keys(habitRemindersByHabitId)) {
			habitRemindersByHabitId[k] = Array.from(new Set(habitRemindersByHabitId[k])).sort((a, b) => a - b);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">今天</h1>
				<div className="text-sm opacity-70 mt-1">日期：{date}</div>
				<div className="mt-3">
					<TodayDatePicker date={date} />
				</div>
			</div>

			<section className="space-y-3">
				<TaskList
					date={date}
					tzOffsetMin={tz}
					habits={habits}
					habitRemindersByHabitId={habitRemindersByHabitId}
					checkedHabitIds={checkedHabitIds}
					initialTasks={tasks.map((t) => ({
						id: String(t.id),
						title: String(t.title),
						description: t.description == null ? null : String(t.description),
						status: String(t.status),
						startMin: t.start_min == null ? null : Number(t.start_min),
						endMin: t.end_min == null ? null : Number(t.end_min),
						remindBeforeMin: t.remind_before_min == null ? null : Number(t.remind_before_min),
					}))}
				/>
			</section>

			<section className="space-y-3">
				<div className="flex items-end justify-between gap-4">
					<div>
						<h2 className="text-lg font-semibold">今日习惯</h2>
						<div className="text-sm opacity-70">一键完成/取消</div>
					</div>
				</div>
				<HabitList habits={habits} checkedHabitIds={checkedHabitIds} date={date} />
			</section>
		</div>
	);
}
