import type { NextRequest } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized } from "@/lib/http";
import { getDb } from "@/lib/db";
import { getDaysAgo, getToday, getDateRange } from "@/lib/statistics";
import type { HeatmapDataPoint } from "@/lib/types";

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	try {
		const today = getToday();
		const startDate = getDaysAgo(83); // 84天前（包括今天共84天）

		// 获取日期范围
		const dateRange = getDateRange(startDate, today);

		// 查询习惯打卡数据
		const habitCheckinsRes = await getDb()
			.prepare(
				"SELECT date_ymd, COUNT(*) as count FROM habit_checkins WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ? GROUP BY date_ymd"
			)
			.bind(user.id, startDate, today)
			.all();

		const checkinMap = new Map<string, number>();
		for (const row of habitCheckinsRes.results || []) {
			const r = row as any;
			checkinMap.set(String(r.date_ymd), Number(r.count));
		}

		// 构建热力图数据
		const data: HeatmapDataPoint[] = dateRange.map((date) => ({
			date,
			count: checkinMap.get(date) || 0,
		}));

		return json({ data });
	} catch (error) {
		console.error("获取热力图数据失败:", error);
		return json({ error: "获取热力图数据失败" }, { status: 500 });
	}
}
