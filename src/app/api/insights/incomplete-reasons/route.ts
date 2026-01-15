import type { NextRequest } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized } from "@/lib/http";
import { getDb } from "@/lib/db";
import { getDaysAgo, getToday } from "@/lib/statistics";
import type { IncompleteReasonStat } from "@/lib/types";

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { searchParams } = new URL(req.url);
	const startDate = searchParams.get("startDate") || getDaysAgo(29);
	const endDate = searchParams.get("endDate") || getToday();

	try {
		// 查询未完成原因数据
		const notesRes = await getDb()
			.prepare(
				"SELECT date_ymd, item_type, item_id, note FROM daily_item_notes WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ? AND note IS NOT NULL AND note != ''"
			)
			.bind(user.id, startDate, endDate)
			.all();

		// 按原因分组统计
		const reasonMap = new Map<
			string,
			Array<{ date: string; itemType: string; itemId: string }>
		>();

		for (const row of notesRes.results || []) {
			const r = row as any;
			const reason = String(r.note).trim();
			if (!reason) continue;

			if (!reasonMap.has(reason)) {
				reasonMap.set(reason, []);
			}
			reasonMap.get(reason)!.push({
				date: String(r.date_ymd),
				itemType: String(r.item_type),
				itemId: String(r.item_id),
			});
		}

		const total = notesRes.results?.length || 0;

		// 查询习惯和任务标题
		const habitIds = new Set<string>();
		const taskIds = new Set<string>();

		for (const items of reasonMap.values()) {
			for (const item of items) {
				if (item.itemType === "habit") {
					habitIds.add(item.itemId);
				} else if (item.itemType === "task") {
					taskIds.add(item.itemId);
				}
			}
		}

		// 查询习惯标题
		const habitTitles = new Map<string, string>();
		if (habitIds.size > 0) {
			const habitIdsArray = Array.from(habitIds);
			const placeholders = habitIdsArray.map(() => "?").join(",");
			const habitsRes = await getDb()
				.prepare(`SELECT id, title FROM habits WHERE id IN (${placeholders})`)
				.bind(...habitIdsArray)
				.all();
			for (const row of habitsRes.results || []) {
				const r = row as any;
				habitTitles.set(String(r.id), String(r.title));
			}
		}

		// 查询任务标题
		const taskTitles = new Map<string, string>();
		if (taskIds.size > 0) {
			const taskIdsArray = Array.from(taskIds);
			const placeholders = taskIdsArray.map(() => "?").join(",");
			const tasksRes = await getDb()
				.prepare(`SELECT id, title FROM tasks WHERE id IN (${placeholders})`)
				.bind(...taskIdsArray)
				.all();
			for (const row of tasksRes.results || []) {
				const r = row as any;
				taskTitles.set(String(r.id), String(r.title));
			}
		}

		// 构建统计结果
		const reasons: IncompleteReasonStat[] = Array.from(reasonMap.entries())
			.map(([reason, items]) => ({
				reason,
				count: items.length,
				percentage: total > 0 ? (items.length / total) * 100 : 0,
				items: items.map((item) => ({
					date: item.date,
					itemType: item.itemType,
					itemId: item.itemId,
					itemTitle:
						item.itemType === "habit"
							? habitTitles.get(item.itemId) || "未知习惯"
							: taskTitles.get(item.itemId) || "未知任务",
				})),
			}))
			.sort((a, b) => b.count - a.count); // 按出现次数降序排序

		return json({ reasons, total });
	} catch (error) {
		console.error("获取未完成原因数据失败:", error);
		return json({ error: "获取未完成原因数据失败" }, { status: 500 });
	}
}
