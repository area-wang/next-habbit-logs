import type { NextRequest } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized } from "@/lib/http";
import { getDb } from "@/lib/db";
import { getDaysAgo, getToday } from "@/lib/statistics";
import type { TimeDistributionPoint } from "@/lib/types";

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { searchParams } = new URL(req.url);
	const startDate = searchParams.get("startDate") || getDaysAgo(29);
	const endDate = searchParams.get("endDate") || getToday();

	try {
		// 查询任务数据
		const tasksRes = await getDb()
			.prepare(
				"SELECT start_min FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key >= ? AND scope_key <= ? AND start_min IS NOT NULL"
			)
			.bind(user.id, startDate, endDate)
			.all();

		// 统计每小时的任务数量
		const hourCounts = new Array(24).fill(0);
		let unsetCount = 0;

		for (const row of tasksRes.results || []) {
			const r = row as any;
			const startMin = Number(r.start_min);
			if (startMin >= 0 && startMin < 1440) {
				const hour = Math.floor(startMin / 60);
				hourCounts[hour]++;
			}
		}

		// 查询未设置时间的任务数量
		const unsetTasksRes = await getDb()
			.prepare(
				"SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key >= ? AND scope_key <= ? AND start_min IS NULL"
			)
			.bind(user.id, startDate, endDate)
			.first();
		unsetCount = Number((unsetTasksRes as any)?.count || 0);

		// 构建时间分布数据
		const data: TimeDistributionPoint[] = hourCounts.map((count, hour) => ({
			hour,
			count,
		}));

		return json({ data, unsetCount });
	} catch (error) {
		console.error("获取时间分布数据失败:", error);
		return json({ error: "获取时间分布数据失败" }, { status: 500 });
	}
}
