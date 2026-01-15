import type { NextRequest } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized } from "@/lib/http";
import { getDb } from "@/lib/db";
import {
	calculateCompletionRate,
	calculateStreak,
	getThisWeek,
	getThisMonth,
	getDaysAgo,
	getToday,
} from "@/lib/statistics";
import type { InsightsStats } from "@/lib/types";

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { searchParams } = new URL(req.url);
	const daysParam = searchParams.get("days");
	const days = daysParam ? Number.parseInt(daysParam, 10) : 30;

	if (![7, 30, 90].includes(days)) {
		return json({ error: "days参数必须是7、30或90" }, { status: 400 });
	}

	try {
		const today = getToday();
		const startDate = getDaysAgo(days - 1);
		const thisWeek = getThisWeek();
		const thisMonth = getThisMonth();

		// 查询活跃的习惯
		const activeHabitsRes = await getDb()
			.prepare(
				"SELECT id, start_date, end_date FROM habits WHERE user_id = ? AND active = 1"
			)
			.bind(user.id)
			.all();
		const activeHabits = (activeHabitsRes.results || []) as Array<{
			id: string;
			start_date: string;
			end_date: string | null;
		}>;

		// 计算指定天数的习惯统计
		let habitTotalDays = 0;
		for (let i = 0; i < days; i++) {
			const date = getDaysAgo(i);
			for (const habit of activeHabits) {
				if (habit.start_date <= date && (!habit.end_date || habit.end_date >= date)) {
					habitTotalDays++;
				}
			}
		}

		const habitDoneDaysRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM habit_checkins WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ?"
			)
			.bind(user.id, startDate, today)
			.first();
		const habitDoneDays = Number((habitDoneDaysRes as any)?.count || 0);

		// 计算本周习惯统计
		let habitTotalWeek = 0;
		const weekDays = Math.ceil(
			(new Date(thisWeek.end).getTime() - new Date(thisWeek.start).getTime()) /
				(1000 * 60 * 60 * 24)
		) + 1;
		for (let i = 0; i < weekDays; i++) {
			const date = new Date(thisWeek.start);
			date.setDate(date.getDate() + i);
			const dateStr = date.toISOString().split("T")[0];
			for (const habit of activeHabits) {
				if (habit.start_date <= dateStr && (!habit.end_date || habit.end_date >= dateStr)) {
					habitTotalWeek++;
				}
			}
		}

		const habitDoneWeekRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM habit_checkins WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ?"
			)
			.bind(user.id, thisWeek.start, thisWeek.end)
			.first();
		const habitDoneWeek = Number((habitDoneWeekRes as any)?.count || 0);

		// 计算本月习惯统计
		let habitTotalMonth = 0;
		const monthDays = Math.ceil(
			(new Date(thisMonth.end).getTime() - new Date(thisMonth.start).getTime()) /
				(1000 * 60 * 60 * 24)
		) + 1;
		for (let i = 0; i < monthDays; i++) {
			const date = new Date(thisMonth.start);
			date.setDate(date.getDate() + i);
			const dateStr = date.toISOString().split("T")[0];
			for (const habit of activeHabits) {
				if (habit.start_date <= dateStr && (!habit.end_date || habit.end_date >= dateStr)) {
					habitTotalMonth++;
				}
			}
		}

		const habitDoneMonthRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM habit_checkins WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ?"
			)
			.bind(user.id, thisMonth.start, thisMonth.end)
			.first();
		const habitDoneMonth = Number((habitDoneMonthRes as any)?.count || 0);

		// 查询任务统计（指定天数）
		const taskTotalDaysRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key >= ? AND scope_key <= ?"
			)
			.bind(user.id, startDate, today)
			.first();
		const taskTotalDays = Number((taskTotalDaysRes as any)?.count || 0);

		const taskDoneDaysRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND status = 'done' AND scope_key >= ? AND scope_key <= ?"
			)
			.bind(user.id, startDate, today)
			.first();
		const taskDoneDays = Number((taskDoneDaysRes as any)?.count || 0);

		// 查询本周任务统计
		const taskTotalWeekRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key >= ? AND scope_key <= ?"
			)
			.bind(user.id, thisWeek.start, thisWeek.end)
			.first();
		const taskTotalWeek = Number((taskTotalWeekRes as any)?.count || 0);

		const taskDoneWeekRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND status = 'done' AND scope_key >= ? AND scope_key <= ?"
			)
			.bind(user.id, thisWeek.start, thisWeek.end)
			.first();
		const taskDoneWeek = Number((taskDoneWeekRes as any)?.count || 0);

		// 查询本月任务统计
		const taskTotalMonthRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key >= ? AND scope_key <= ?"
			)
			.bind(user.id, thisMonth.start, thisMonth.end)
			.first();
		const taskTotalMonth = Number((taskTotalMonthRes as any)?.count || 0);

		const taskDoneMonthRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND status = 'done' AND scope_key >= ? AND scope_key <= ?"
			)
			.bind(user.id, thisMonth.start, thisMonth.end)
			.first();
		const taskDoneMonth = Number((taskDoneMonthRes as any)?.count || 0);

		// 查询反思天数（指定天数）
		const reflectionDaysRes = await getDb()
			.prepare(
				"SELECT COUNT(DISTINCT date_ymd) as count FROM reflections WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ?"
			)
			.bind(user.id, startDate, today)
			.first();
		const reflectionDays = Number((reflectionDaysRes as any)?.count || 0);

		// 计算连续天数（基于习惯打卡）- 保留用于AI分析
		const checkinDatesRes = await getDb()
			.prepare(
				"SELECT DISTINCT date_ymd FROM habit_checkins WHERE user_id = ? ORDER BY date_ymd DESC LIMIT 365"
			)
			.bind(user.id)
			.all();
		const checkinDates = (checkinDatesRes.results || []).map((r: any) => String(r.date_ymd));
		const currentStreak = calculateStreak(checkinDates);

		// 计算完成率
		const habitCompletionRate = calculateCompletionRate(habitDoneDays, habitTotalDays);
		const taskCompletionRate = calculateCompletionRate(taskDoneDays, taskTotalDays);
		const weekHabitRate = calculateCompletionRate(habitDoneWeek, habitTotalWeek);
		const monthHabitRate = calculateCompletionRate(habitDoneMonth, habitTotalMonth);
		const weekTaskRate = calculateCompletionRate(taskDoneWeek, taskTotalWeek);
		const monthTaskRate = calculateCompletionRate(taskDoneMonth, taskTotalMonth);

		const stats: InsightsStats = {
			habitCompletionRate,
			taskCompletionRate,
			reflectionDays,
			currentStreak,
			weekHabitRate,
			monthHabitRate,
			weekTaskRate,
			monthTaskRate,
		};

		return json(stats);
	} catch (error) {
		console.error("获取统计数据失败:", error);
		return json({ error: "获取统计数据失败" }, { status: 500 });
	}
}
