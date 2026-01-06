import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import HabitList, { type Habit } from "./habit-list";

function todayYmdUtc() {
	return new Date().toISOString().slice(0, 10);
}

export default async function TodayPage() {
	const user = await requireUser();
	const date = todayYmdUtc();

	const habitsRes = await getDb()
		.prepare("SELECT id, title, description FROM habits WHERE user_id = ? AND active = 1 ORDER BY created_at DESC")
		.bind(user.id)
		.all();
	const habits = (habitsRes.results || []) as Habit[];

	const checkinsRes = await getDb()
		.prepare("SELECT habit_id FROM habit_checkins WHERE user_id = ? AND date_ymd = ?")
		.bind(user.id, date)
		.all();
	const checkedHabitIds = (checkinsRes.results || []).map((r: any) => String(r.habit_id));

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">今天</h1>
				<div className="text-sm opacity-70 mt-1">日期（UTC）：{date}</div>
			</div>

			<section className="space-y-3">
				<div className="flex items-end justify-between gap-4">
					<div>
						<h2 className="text-lg font-semibold">今日习惯</h2>
						<div className="text-sm opacity-70">一键完成/取消，保持“低摩擦”。</div>
					</div>
				</div>
				<HabitList habits={habits} checkedHabitIds={checkedHabitIds} date={date} />
			</section>
		</div>
	);
}
