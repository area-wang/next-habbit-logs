import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import { DEFAULT_TZ_OFFSET_MINUTES } from "@/lib/date";
import { DEFAULT_JOB_WINDOW_DAYS, cancelScheduledJobsForTarget, getEffectiveUserTzOffsetMin, scheduleHabitAllJobs } from "@/lib/scheduled-jobs";

// PATCH /api/habits/[id] - 更新习惯
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id } = await params;
		const body = await request.json() as Partial<{
			title: string;
			description: string;
			frequency_type: string;
			frequency_n: number;
			start_date: string;
			end_date: string | null;
			category_id: string | null;
			tags: string | string[] | null;
			active: number;
		}>;
		
		const db = getDb();
		
		// 验证习惯是否存在且属于当前用户
		const habitResult = await db
			.prepare("SELECT * FROM habits WHERE id = ? AND user_id = ?")
			.bind(id, user.id)
			.first();
		
		if (!habitResult) {
			return NextResponse.json(
				{ error: "习惯不存在" },
				{ status: 404 }
			);
		}
		
		const updates: string[] = [];
		const values: any[] = [];
		
		// 构建更新语句
		if (body.title !== undefined) {
			if (typeof body.title !== "string" || body.title.trim().length === 0) {
				return NextResponse.json(
					{ error: "习惯标题不能为空" },
					{ status: 400 }
				);
			}
			if (body.title.length > 50) {
				return NextResponse.json(
					{ error: "习惯标题不能超过50个字符" },
					{ status: 400 }
				);
			}
			updates.push("title = ?");
			values.push(body.title.trim());
		}
		
		if (body.description !== undefined) {
			updates.push("description = ?");
			values.push(body.description || null);
		}
		
		if (body.active !== undefined) {
			const v = Number(body.active);
			if (!Number.isFinite(v) || (v !== 0 && v !== 1)) {
				return NextResponse.json(
					{ error: "active 必须是 0 或 1" },
					{ status: 400 }
				);
			}
			updates.push("active = ?");
			values.push(v);
		}
		
		if (body.frequency_type !== undefined) {
			updates.push("frequency_type = ?");
			values.push(body.frequency_type);
		}
		
		if (body.frequency_n !== undefined) {
			updates.push("frequency_n = ?");
			values.push(body.frequency_n);
		}
		
		if (body.start_date !== undefined) {
			const startDate = String(body.start_date || "").trim();
			if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
				return NextResponse.json(
					{ error: "start_date 格式无效" },
					{ status: 400 }
				);
			}
			updates.push("start_date = ?");
			values.push(startDate);
		}
		
		if (body.end_date !== undefined) {
			const endDate = body.end_date ? String(body.end_date).trim() : null;
			if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
				return NextResponse.json(
					{ error: "end_date 格式无效" },
					{ status: 400 }
				);
			}
			updates.push("end_date = ?");
			values.push(endDate);
		}
		
		// 验证日期范围
		if (body.start_date !== undefined || body.end_date !== undefined) {
			const start = body.start_date !== undefined ? String(body.start_date || "").trim() : null;
			const end = body.end_date !== undefined ? (body.end_date ? String(body.end_date).trim() : null) : null;
			if (start && end && start > end) {
				return NextResponse.json(
					{ error: "start_date 必须小于等于 end_date" },
					{ status: 400 }
				);
			}
		}
		
		if (body.category_id !== undefined) {
			updates.push("category_id = ?");
			values.push(body.category_id || null);
		}
		
		if (body.tags !== undefined) {
			// 验证标签
			if (body.tags !== null) {
				try {
					const tags = typeof body.tags === "string" ? JSON.parse(body.tags) : body.tags;
					if (!Array.isArray(tags)) {
						return NextResponse.json(
							{ error: "标签格式无效" },
							{ status: 400 }
						);
					}
					if (tags.length > 10) {
						return NextResponse.json(
							{ error: "标签数量不能超过10个" },
							{ status: 400 }
						);
					}
					for (const tag of tags) {
						if (typeof tag !== "string" || tag.length > 20) {
							return NextResponse.json(
								{ error: "标签长度不能超过20个字符" },
								{ status: 400 }
							);
						}
					}
					updates.push("tags = ?");
					values.push(JSON.stringify(tags));
				} catch (e) {
					return NextResponse.json(
						{ error: "标签格式无效" },
						{ status: 400 }
					);
				}
			} else {
				updates.push("tags = ?");
				values.push(null);
			}
		}
		
		if (updates.length === 0) {
			return NextResponse.json(
				{ error: "没有需要更新的字段" },
				{ status: 400 }
			);
		}
		
		// 添加 updated_at
		updates.push("updated_at = ?");
		const now = Date.now();
		values.push(now);
		
		// 执行更新
		values.push(id, user.id);
		await db
			.prepare(
				`UPDATE habits SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
			)
			.bind(...values)
			.run();
		
		// 如果更新了日期相关字段,重新调度任务
		if (body.start_date !== undefined || body.end_date !== undefined || body.active !== undefined) {
			try {
				const tzRaw = request.cookies.get("tzOffsetMin")?.value;
				const tzFallback = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
				const tzOffsetMin = await getEffectiveUserTzOffsetMin(db, { userId: user.id, fallback: tzFallback });
				
				const habitRow = await db
					.prepare("SELECT id, title, active, start_date, end_date FROM habits WHERE id = ? AND user_id = ?")
					.bind(id, user.id)
					.first();
				
				const habitTitle = habitRow && (habitRow as any).title ? String((habitRow as any).title) : "";
				const active = habitRow && (habitRow as any).active != null ? Number((habitRow as any).active) : 0;
				const startDate = habitRow && (habitRow as any).start_date ? String((habitRow as any).start_date) : "";
				const endDate = habitRow && (habitRow as any).end_date ? String((habitRow as any).end_date) : null;
				
				if (habitTitle && startDate) {
					const remindersRes = await db
						.prepare(
							"SELECT id, time_min, end_time_min, enabled FROM reminders WHERE user_id = ? AND target_type = 'habit' AND target_id = ? AND anchor = 'habit_time'"
						)
						.bind(user.id, id)
						.all();
					
					const reminders = (remindersRes.results || [])
						.map((r: any) => ({
							reminderId: String(r.id || ""),
							timeMin: r.time_min == null ? NaN : Number(r.time_min),
							endTimeMin: r.end_time_min == null ? null : Number(r.end_time_min),
							enabled: Number(r.enabled) === 1,
						}))
						.filter((x) => x.reminderId && Number.isFinite(x.timeMin) && x.timeMin >= 0 && x.timeMin <= 1439);
					
					await scheduleHabitAllJobs(db, {
						userId: user.id,
						habitId: id,
						habitTitle,
						active,
						startDate,
						endDate,
						reminders,
						tzOffsetMin,
						days: DEFAULT_JOB_WINDOW_DAYS,
					});
				}
			} catch (scheduleError) {
				console.error("Error scheduling jobs:", scheduleError);
				// 不阻止更新操作
			}
		}
		
		// 返回更新后的习惯
		const updatedResult = await db
			.prepare("SELECT * FROM habits WHERE id = ? AND user_id = ?")
			.bind(id, user.id)
			.first();
		
		return NextResponse.json(updatedResult);
	} catch (error) {
		console.error("Error updating habit:", error);
		return NextResponse.json(
			{ error: "Failed to update habit" },
			{ status: 500 }
		);
	}
}

// DELETE /api/habits/[id] - 永久删除习惯
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id } = await params;
		
		const db = getDb();
		
		// 验证习惯是否存在且属于当前用户
		const habitResult = await db
			.prepare("SELECT * FROM habits WHERE id = ? AND user_id = ?")
			.bind(id, user.id)
			.first();
		
		if (!habitResult) {
			return NextResponse.json(
				{ error: "习惯不存在" },
				{ status: 404 }
			);
		}
		
		const habit = habitResult as any;
		
		// 如果有 archived_at 字段,验证习惯必须已归档才能删除
		if (habit.archived_at !== undefined && !habit.archived_at) {
			return NextResponse.json(
				{ error: "只能删除已归档的习惯，请先归档该习惯" },
				{ status: 400 }
			);
		}
		
		// 取消所有调度任务
		await cancelScheduledJobsForTarget(db, { userId: user.id, targetType: "habit", targetId: id });
		
		// 删除习惯（级联删除会自动删除相关的 checkins, reminders, archive_history）
		await db
			.prepare("DELETE FROM habits WHERE id = ? AND user_id = ?")
			.bind(id, user.id)
			.run();
		
		// 删除提醒
		await db
			.prepare("DELETE FROM reminders WHERE user_id = ? AND target_type = 'habit' AND target_id = ?")
			.bind(user.id, id)
			.run();
		
		// 记录删除日志
		console.log(`Habit permanently deleted: ${id} by user ${user.id} at ${Date.now()}`);
		
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting habit:", error);
		return NextResponse.json(
			{ error: "Failed to delete habit" },
			{ status: 500 }
		);
	}
}
