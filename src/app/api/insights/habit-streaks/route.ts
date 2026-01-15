import type { NextRequest } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized } from "@/lib/http";
import { getDb } from "@/lib/db";
import { calculateStreak } from "@/lib/statistics";

interface HabitStreak {
	habitId: string;
	habitTitle: string;
	currentStreak: number;
	longestStreak: number;
}

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	try {
		// 查询所有活跃的习惯
		const habitsRes = await getDb()
			.prepare("SELECT id, title FROM habits WHERE user_id = ? AND active = 1 ORDER BY created_at DESC")
			.bind(user.id)
			.all();
		const habits = (habitsRes.results || []) as Array<{ id: string; title: string }>;

		const streaks: HabitStreak[] = [];

		for (const habit of habits) {
			// 查询该习惯的所有打卡日期
			const checkinsRes = await getDb()
				.prepare(
					"SELECT date_ymd FROM habit_checkins WHERE user_id = ? AND habit_id = ? ORDER BY date_ymd DESC LIMIT 365"
				)
				.bind(user.id, habit.id)
				.all();
			const checkinDates = (checkinsRes.results || []).map((r: any) => String(r.date_ymd));

			if (checkinDates.length === 0) {
				continue; // 跳过没有打卡记录的习惯
			}

			// 计算当前连续天数
			const currentStreak = calculateStreak(checkinDates);

			// 计算最长连续天数
			let longestStreak = 0;
			let tempStreak = 1;

			for (let i = 0; i < checkinDates.length - 1; i++) {
				const currentDate = new Date(checkinDates[i]);
				const nextDate = new Date(checkinDates[i + 1]);
				const diffDays = Math.round(
					(currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
				);

				if (diffDays === 1) {
					tempStreak++;
				} else {
					longestStreak = Math.max(longestStreak, tempStreak);
					tempStreak = 1;
				}
			}
			longestStreak = Math.max(longestStreak, tempStreak);

			streaks.push({
				habitId: habit.id,
				habitTitle: habit.title,
				currentStreak,
				longestStreak,
			});
		}

		// 按当前连续天数降序排序
		streaks.sort((a, b) => b.currentStreak - a.currentStreak);

		return json({ streaks });
	} catch (error) {
		console.error("获取习惯连续打卡数据失败:", error);
		return json({ error: "获取习惯连续打卡数据失败" }, { status: 500 });
	}
}
