import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// POST /api/habits/[id]/archive - 归档习惯
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id } = await params;
		const body = await request.json().catch(() => ({})) as { note?: string };
		const { note } = body;
		
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
		
		// 检查是否已归档
		if (habit.archived_at) {
			return NextResponse.json(
				{ error: "习惯已经归档" },
				{ status: 400 }
			);
		}
		
		const now = Date.now();
		
		// 更新习惯为归档状态
		await db
			.prepare(
				"UPDATE habits SET archived_at = ?, updated_at = ? WHERE id = ? AND user_id = ?"
			)
			.bind(now, now, id, user.id)
			.run();
		
		// 停止该习惯的所有提醒（将 enabled 设置为 0）
		await db
			.prepare(
				"UPDATE reminders SET enabled = 0, updated_at = ? WHERE user_id = ? AND target_type = 'habit' AND target_id = ?"
			)
			.bind(now, user.id, id)
			.run();
		
		// 记录归档历史
		const historyId = `arch:${user.id}:${id}:${now}:${Math.random().toString(36).substr(2, 9)}`;
		await db
			.prepare(
				"INSERT INTO habit_archive_history (id, habit_id, user_id, action, timestamp, note) VALUES (?, ?, ?, 'archive', ?, ?)"
			)
			.bind(historyId, id, user.id, now, note || null)
			.run();
		
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error archiving habit:", error);
		return NextResponse.json(
			{ error: "Failed to archive habit" },
			{ status: 500 }
		);
	}
}
