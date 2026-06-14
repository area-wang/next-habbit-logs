import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// GET /api/habits/[id]/action-logs - 获取习惯的行动记录列表
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id } = await params;

		const db = getDb();

		// 验证习惯是否存在且属于当前用户
		const habitResult = await db
			.prepare("SELECT id FROM habits WHERE id = ? AND user_id = ?")
			.bind(id, user.id)
			.first();

		if (!habitResult) {
			return NextResponse.json(
				{ error: "习惯不存在" },
				{ status: 404 }
			);
		}

		const result = await db
			.prepare(
				"SELECT id, content, image_url, mood, is_milestone, linked_date, created_at, updated_at FROM habit_action_logs WHERE habit_id = ? AND user_id = ? ORDER BY created_at DESC"
			)
			.bind(id, user.id)
			.all();

		return NextResponse.json({
			actionLogs: result.results || [],
		});
	} catch (error) {
		console.error("Error fetching action logs:", error);
		return NextResponse.json(
			{ error: "Failed to fetch action logs" },
			{ status: 500 }
		);
	}
}

// POST /api/habits/[id]/action-logs - 添加行动记录
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id: habitId } = await params;
		const body = await request.json() as {
			content: string;
			images?: string[];
			mood?: number | null;
			isMilestone?: boolean;
			linkedDate?: string | null;
		};

		const db = getDb();

		// 验证习惯是否存在且属于当前用户
		const habitResult = await db
			.prepare("SELECT id FROM habits WHERE id = ? AND user_id = ?")
			.bind(habitId, user.id)
			.first();

		if (!habitResult) {
			return NextResponse.json(
				{ error: "习惯不存在" },
				{ status: 404 }
			);
		}

		// 验证内容
		const content = String(body.content || "").trim();
		if (!content || content.length === 0) {
			return NextResponse.json(
				{ error: "行动内容不能为空" },
				{ status: 400 }
			);
		}
		if (content.length > 500) {
			return NextResponse.json(
				{ error: "行动内容不能超过500字符" },
				{ status: 400 }
			);
		}

		// 验证心情值
		const mood = body.mood != null ? Number(body.mood) : null;
		if (mood != null && (!Number.isFinite(mood) || mood < 1 || mood > 3)) {
			return NextResponse.json(
				{ error: "心情值必须是1-3之间" },
				{ status: 400 }
			);
		}

		// 验证日期格式
		const linkedDate = body.linkedDate ? String(body.linkedDate).trim() : null;
		if (linkedDate && !/^\d{4}-\d{2}-\d{2}$/.test(linkedDate)) {
			return NextResponse.json(
				{ error: "日期格式无效" },
				{ status: 400 }
			);
		}

		const now = Date.now();
		const actionLogId = crypto.randomUUID();
		const isMilestone = body.isMilestone ? 1 : 0;

		// 处理图片
		const images = body.images || [];
		const imageUrlJson = images.length > 0 ? JSON.stringify(images) : null;

		await db
			.prepare(
				"INSERT INTO habit_action_logs (id, habit_id, user_id, content, image_url, mood, is_milestone, linked_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
			)
			.bind(actionLogId, habitId, user.id, content, imageUrlJson, mood, isMilestone, linkedDate, now, now)
			.run();

		return NextResponse.json({ ok: true, actionLogId });
	} catch (error) {
		console.error("Error creating action log:", error);
		return NextResponse.json(
			{ error: "Failed to create action log" },
			{ status: 500 }
		);
	}
}

// DELETE /api/habits/[id]/action-logs/[logId] - 删除行动记录
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id: habitId } = await params;
		const { searchParams } = new URL(request.url);
		const logId = searchParams.get("logId");

		if (!logId) {
			return NextResponse.json(
				{ error: "缺少logId参数" },
				{ status: 400 }
			);
		}

		const db = getDb();

		await db
			.prepare("DELETE FROM habit_action_logs WHERE id = ? AND habit_id = ? AND user_id = ?")
			.bind(logId, habitId, user.id)
			.run();

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Error deleting action log:", error);
		return NextResponse.json(
			{ error: "Failed to delete action log" },
			{ status: 500 }
		);
	}
}
