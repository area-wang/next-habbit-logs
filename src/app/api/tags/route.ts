import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import type { TagStats } from "@/lib/types";

// GET /api/tags - 获取所有标签及其使用次数
export async function GET() {
	try {
		const user = await requireUser();
		
		// 获取用户所有习惯的标签
		const result = await getDb()
			.prepare(
				"SELECT tags FROM habits WHERE user_id = ? AND tags IS NOT NULL AND tags != ''"
			)
			.bind(user.id)
			.all();
		
		// 统计标签使用次数
		const tagCountMap = new Map<string, number>();
		
		for (const row of result.results || []) {
			const tagsStr = (row as any).tags;
			if (!tagsStr) continue;
			
			try {
				const tags = JSON.parse(tagsStr) as string[];
				if (Array.isArray(tags)) {
					for (const tag of tags) {
						if (tag && typeof tag === "string") {
							const trimmedTag = tag.trim();
							if (trimmedTag) {
								tagCountMap.set(
									trimmedTag,
									(tagCountMap.get(trimmedTag) || 0) + 1
								);
							}
						}
					}
				}
			} catch (e) {
				// 忽略无效的 JSON
				console.error("Invalid tags JSON:", tagsStr, e);
			}
		}
		
		// 转换为数组并按使用次数降序排序
		const tagStats: TagStats[] = Array.from(tagCountMap.entries())
			.map(([tag, count]) => ({ tag, count }))
			.sort((a, b) => b.count - a.count);
		
		return NextResponse.json(tagStats);
	} catch (error) {
		console.error("Error fetching tags:", error);
		return NextResponse.json(
			{ error: "Failed to fetch tags" },
			{ status: 500 }
		);
	}
}
