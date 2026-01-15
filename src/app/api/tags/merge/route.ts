import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// POST /api/tags/merge - 合并多个标签为一个
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		const body = await request.json() as {
			sourceTags: string[];
			targetTag: string;
		};
		
		const { sourceTags, targetTag } = body;
		
		// 验证输入
		if (!Array.isArray(sourceTags) || sourceTags.length === 0) {
			return NextResponse.json(
				{ error: "源标签列表不能为空" },
				{ status: 400 }
			);
		}
		
		if (!targetTag || typeof targetTag !== "string" || targetTag.trim().length === 0) {
			return NextResponse.json(
				{ error: "目标标签不能为空" },
				{ status: 400 }
			);
		}
		
		const trimmedTargetTag = targetTag.trim();
		const trimmedSourceTags = sourceTags
			.filter((tag) => typeof tag === "string" && tag.trim().length > 0)
			.map((tag) => tag.trim());
		
		if (trimmedSourceTags.length === 0) {
			return NextResponse.json(
				{ error: "没有有效的源标签" },
				{ status: 400 }
			);
		}
		
		// 获取所有包含源标签的习惯
		const result = await getDb()
			.prepare(
				"SELECT id, tags FROM habits WHERE user_id = ? AND tags IS NOT NULL AND tags != ''"
			)
			.bind(user.id)
			.all();
		
		let affectedCount = 0;
		const now = Date.now();
		
		for (const row of result.results || []) {
			const habitId = (row as any).id;
			const tagsStr = (row as any).tags;
			
			if (!tagsStr) continue;
			
			try {
				const tags = JSON.parse(tagsStr) as string[];
				if (!Array.isArray(tags)) continue;
				
				let modified = false;
				const newTags = new Set<string>();
				
				for (const tag of tags) {
					const trimmedTag = tag.trim();
					if (trimmedSourceTags.includes(trimmedTag)) {
						// 将源标签替换为目标标签
						newTags.add(trimmedTargetTag);
						modified = true;
					} else if (trimmedTag) {
						newTags.add(trimmedTag);
					}
				}
				
				if (modified) {
					// 更新习惯的标签
					const newTagsArray = Array.from(newTags);
					await getDb()
						.prepare(
							"UPDATE habits SET tags = ?, updated_at = ? WHERE id = ? AND user_id = ?"
						)
						.bind(JSON.stringify(newTagsArray), now, habitId, user.id)
						.run();
					
					affectedCount++;
				}
			} catch (e) {
				console.error(`Error processing tags for habit ${habitId}:`, e);
			}
		}
		
		return NextResponse.json({
			success: true,
			affectedHabits: affectedCount,
		});
	} catch (error) {
		console.error("Error merging tags:", error);
		return NextResponse.json(
			{ error: "Failed to merge tags" },
			{ status: 500 }
		);
	}
}
