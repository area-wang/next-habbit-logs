import type { NextRequest } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized, badRequest } from "@/lib/http";
import { getDb } from "@/lib/db";
import { calculateCompletionRate, getDaysAgo, getToday, getDateRange } from "@/lib/statistics";
import type { TrendDataPoint } from "@/lib/types";

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { searchParams } = new URL(req.url);
	const daysParam = searchParams.get("days");
	const days = daysParam ? Number.parseInt(daysParam, 10) : 30;

	if (![7, 30, 90].includes(days)) {
		return badRequest("days参数必须是7、30或90");
	}

	try {
		const today = getToday();
		const startDate = getDaysAgo(days - 1);

		// 获取日期范围
		const dateRange = getDateRange(startDate, today);

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

		// 查询习惯打卡数据
		const habitCheckinsRes = await getDb()
			.prepare(
				"SELECT date_ymd, COUNT(*) as count FROM habit_checkins WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ? GROUP BY date_ymd"
			)
			.bind(user.id, startDate, today)
			.all();
		const habitCheckins = new Map<string, number>();
		for (const row of habitCheckinsRes.results || []) {
			const r = row as any;
			habitCheckins.set(String(r.date_ymd), Number(r.count));
		}

		// 查询任务数据
		const tasksRes = await getDb()
			.prepare(
				"SELECT scope_key as date, status, COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key >= ? AND scope_key <= ? GROUP BY scope_key, status"
			)
			.bind(user.id, startDate, today)
			.all();
		const taskStats = new Map<string, { total: number; done: number }>();
		for (const row of tasksRes.results || []) {
			const r = row as any;
			const date = String(r.date);
			const count = Number(r.count);
			const status = String(r.status);

			if (!taskStats.has(date)) {
				taskStats.set(date, { total: 0, done: 0 });
			}
			const stats = taskStats.get(date)!;
			stats.total += count;
			if (status === "done") {
				stats.done += count;
			}
		}

		// 构建趋势数据
		const data: TrendDataPoint[] = dateRange.map((date) => {
			// 计算该日期的习惯总数
			let habitTotal = 0;
			for (const habit of activeHabits) {
				if (habit.start_date <= date && (!habit.end_date || habit.end_date >= date)) {
					habitTotal++;
				}
			}

			const habitDone = habitCheckins.get(date) || 0;
			const taskData = taskStats.get(date) || { total: 0, done: 0 };

			return {
				date,
				habitRate: calculateCompletionRate(habitDone, habitTotal),
				taskRate: calculateCompletionRate(taskData.done, taskData.total),
				habitDone,
				habitTotal,
				taskDone: taskData.done,
				taskTotal: taskData.total,
			};
		});

		return json({ data });
	} catch (error) {
		console.error("获取趋势数据失败:", error);
		return json({ error: "获取趋势数据失败" }, { status: 500 });
	}
}
