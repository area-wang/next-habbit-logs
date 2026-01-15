import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import type { BatchOperationResult } from "@/lib/types";

// POST /api/habits/batch - 批量操作习惯
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		const body = await request.json() as {
			habitIds: string[];
			operation: "archive" | "restore" | "delete" | "update";
			data?: any;
		};
		
		const { habitIds, operation, data } = body;
		
		// 验证输入
		if (!Array.isArray(habitIds) || habitIds.length === 0) {
			return NextResponse.json(
				{ error: "习惯ID列表不能为空" },
				{ status: 400 }
			);
		}
		
		if (habitIds.length > 100) {
			return NextResponse.json(
				{ error: "批量操作最多支持100个习惯" },
				{ status: 400 }
			);
		}
		
		if (!operation || !["archive", "restore", "delete", "update"].includes(operation)) {
			return NextResponse.json(
				{ error: "无效的操作类型" },
				{ status: 400 }
			);
		}
		
		const db = getDb();
		const result: BatchOperationResult = {
			success: 0,
			failed: 0,
			errors: [],
		};
		
		const now = Date.now();
		
		// 执行批量操作
		for (const habitId of habitIds) {
			try {
				// 验证习惯是否存在且属于当前用户
				const habitResult = await db
					.prepare("SELECT * FROM habits WHERE id = ? AND user_id = ?")
					.bind(habitId, user.id)
					.first();
				
				if (!habitResult) {
					result.failed++;
					result.errors.push({
						habitId,
						error: "习惯不存在",
					});
					continue;
				}
				
				const habit = habitResult as any;
				
				switch (operation) {
					case "archive":
						// 归档操作
						if (habit.archived_at) {
							result.failed++;
							result.errors.push({
								habitId,
								error: "习惯已经归档",
							});
							continue;
						}
						
						await db
							.prepare(
								"UPDATE habits SET archived_at = ?, updated_at = ? WHERE id = ? AND user_id = ?"
							)
							.bind(now, now, habitId, user.id)
							.run();
						
						// 停止提醒
						await db
							.prepare(
								"UPDATE reminders SET enabled = 0, updated_at = ? WHERE user_id = ? AND target_type = 'habit' AND target_id = ?"
							)
							.bind(now, user.id, habitId)
							.run();
						
						// 记录历史
						const archiveHistoryId = `arch:${user.id}:${habitId}:${now}:${Math.random().toString(36).substr(2, 9)}`;
						await db
							.prepare(
								"INSERT INTO habit_archive_history (id, habit_id, user_id, action, timestamp, note) VALUES (?, ?, ?, 'archive', ?, ?)"
							)
							.bind(archiveHistoryId, habitId, user.id, now, "批量归档")
							.run();
						
						result.success++;
						break;
					
					case "restore":
						// 恢复操作
						if (!habit.archived_at) {
							result.failed++;
							result.errors.push({
								habitId,
								error: "习惯未归档",
							});
							continue;
						}
						
						await db
							.prepare(
								"UPDATE habits SET archived_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?"
							)
							.bind(now, habitId, user.id)
							.run();
						
						// 恢复提醒
						await db
							.prepare(
								"UPDATE reminders SET enabled = 1, updated_at = ? WHERE user_id = ? AND target_type = 'habit' AND target_id = ?"
							)
							.bind(now, user.id, habitId)
							.run();
						
						// 记录历史
						const restoreHistoryId = `arch:${user.id}:${habitId}:${now}:${Math.random().toString(36).substr(2, 9)}`;
						await db
							.prepare(
								"INSERT INTO habit_archive_history (id, habit_id, user_id, action, timestamp, note) VALUES (?, ?, ?, 'restore', ?, ?)"
							)
							.bind(restoreHistoryId, habitId, user.id, now, "批量恢复")
							.run();
						
						result.success++;
						break;
					
					case "delete":
						// 删除操作（仅限已归档）
						if (!habit.archived_at) {
							result.failed++;
							result.errors.push({
								habitId,
								error: "只能删除已归档的习惯",
							});
							continue;
						}
						
						await db
							.prepare("DELETE FROM habits WHERE id = ? AND user_id = ?")
							.bind(habitId, user.id)
							.run();
						
						console.log(`Batch delete: habit ${habitId} by user ${user.id}`);
						result.success++;
						break;
					
					case "update":
						// 更新操作
						if (!data) {
							result.failed++;
							result.errors.push({
								habitId,
								error: "缺少更新数据",
							});
							continue;
						}
						
						const updates: string[] = [];
						const values: any[] = [];
						
						if (data.category_id !== undefined) {
							updates.push("category_id = ?");
							values.push(data.category_id || null);
						}
						
						if (data.tags !== undefined) {
							if (data.tags === null) {
								updates.push("tags = ?");
								values.push(null);
							} else {
								try {
									const tags = typeof data.tags === "string" ? JSON.parse(data.tags) : data.tags;
									if (!Array.isArray(tags)) {
										throw new Error("标签格式无效");
									}
									updates.push("tags = ?");
									values.push(JSON.stringify(tags));
								} catch (e) {
									result.failed++;
									result.errors.push({
										habitId,
										error: "标签格式无效",
									});
									continue;
								}
							}
						}
						
						if (data.frequency_type !== undefined) {
							updates.push("frequency_type = ?");
							values.push(data.frequency_type);
						}
						
						if (updates.length === 0) {
							result.failed++;
							result.errors.push({
								habitId,
								error: "没有需要更新的字段",
							});
							continue;
						}
						
						updates.push("updated_at = ?");
						values.push(now);
						values.push(habitId, user.id);
						
						await db
							.prepare(
								`UPDATE habits SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
							)
							.bind(...values)
							.run();
						
						result.success++;
						break;
				}
			} catch (error) {
				console.error(`Error processing habit ${habitId}:`, error);
				result.failed++;
				result.errors.push({
					habitId,
					error: error instanceof Error ? error.message : "操作失败",
				});
			}
		}
		
		return NextResponse.json(result);
	} catch (error) {
		console.error("Error in batch operation:", error);
		return NextResponse.json(
			{ error: "批量操作失败" },
			{ status: 500 }
		);
	}
}
