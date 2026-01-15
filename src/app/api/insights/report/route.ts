import type { NextRequest } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized, badRequest } from "@/lib/http";
import { getDb } from "@/lib/db";
import { calculateCompletionRate, getThisWeek, getThisMonth, getDateRange } from "@/lib/statistics";
import { callAIAPI, buildReportSummaryPrompt } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	try {
		const body = (await req.json()) as { type?: string; includeAI?: boolean };
		const { type, includeAI } = body;

		if (!type || !["week", "month"].includes(type)) {
			return badRequest("type必须是week或month");
		}

		// 获取时间范围
		const range = type === "week" ? getThisWeek() : getThisMonth();
		const { start, end } = range;
		const dateRange = getDateRange(start, end);

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

		// 计算习惯总数
		let habitTotal = 0;
		for (const date of dateRange) {
			for (const habit of activeHabits) {
				if (habit.start_date <= date && (!habit.end_date || habit.end_date >= date)) {
					habitTotal++;
				}
			}
		}

		// 查询习惯完成数
		const habitDoneRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM habit_checkins WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ?"
			)
			.bind(user.id, start, end)
			.first();
		const habitDone = Number((habitDoneRes as any)?.count || 0);

		// 查询任务统计
		const taskTotalRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key >= ? AND scope_key <= ?"
			)
			.bind(user.id, start, end)
			.first();
		const taskTotal = Number((taskTotalRes as any)?.count || 0);

		const taskDoneRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND status = 'done' AND scope_key >= ? AND scope_key <= ?"
			)
			.bind(user.id, start, end)
			.first();
		const taskDone = Number((taskDoneRes as any)?.count || 0);

		// 查询反思天数
		const reflectionDaysRes = await getDb()
			.prepare(
				"SELECT COUNT(DISTINCT date_ymd) as count FROM reflections WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ?"
			)
			.bind(user.id, start, end)
			.first();
		const reflectionDays = Number((reflectionDaysRes as any)?.count || 0);

		// 查询每日完成情况，找出最佳表现日
		const dailyHabitsRes = await getDb()
			.prepare(
				"SELECT date_ymd, COUNT(*) as count FROM habit_checkins WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ? GROUP BY date_ymd"
			)
			.bind(user.id, start, end)
			.all();

		const dailyTasksRes = await getDb()
			.prepare(
				"SELECT scope_key as date, COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND status = 'done' AND scope_key >= ? AND scope_key <= ? GROUP BY scope_key"
			)
			.bind(user.id, start, end)
			.all();

		const dailyScores = new Map<string, number>();
		for (const row of dailyHabitsRes.results || []) {
			const r = row as any;
			const date = String(r.date_ymd);
			dailyScores.set(date, Number(r.count));
		}
		for (const row of dailyTasksRes.results || []) {
			const r = row as any;
			const date = String(r.date);
			const current = dailyScores.get(date) || 0;
			dailyScores.set(date, current + Number(r.count));
		}

		let bestDay = start;
		let bestScore = 0;
		for (const [date, score] of dailyScores.entries()) {
			if (score > bestScore) {
				bestScore = score;
				bestDay = date;
			}
		}

		// 计算完成率
		const habitRate = calculateCompletionRate(habitDone, habitTotal);
		const taskRate = calculateCompletionRate(taskDone, taskTotal);

		// 分析需要改进的方面
		const improvements: string[] = [];
		if (habitRate < 70) improvements.push("习惯完成率");
		if (taskRate < 70) improvements.push("任务完成率");
		if (reflectionDays < dateRange.length * 0.5) improvements.push("反思频率");

		// 构建报告
		const period = type === "week" ? "本周" : "本月";
		const stats = {
			habitCompletionRate: habitRate,
			taskCompletionRate: taskRate,
			reflectionDays,
			bestDay,
			improvements,
		};

		let aiSummary: string | undefined;

		// 如果需要AI总结
		if (includeAI) {
			const prompt = buildReportSummaryPrompt({
				period,
				habitRate,
				taskRate,
				reflectionDays,
				bestDay,
				improvements,
			});

			const result = await callAIAPI(prompt);
			if (result.content) {
				aiSummary = result.content;
			}
		}

		return json({
			period,
			stats,
			aiSummary,
		});
	} catch (error) {
		console.error("生成报告失败:", error);
		return json({ error: "生成报告失败" }, { status: 500 });
	}
}
