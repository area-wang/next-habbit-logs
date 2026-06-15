import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// GET /api/tasks/[taskId]/action-logs - 获取计划的行动记录列表
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ taskId: string }> }
) {
	try {
		const user = await requireUser();
		const { taskId } = await params;

		const db = getDb();

		// 验证任务是否存在且属于当前用户
		const taskResult = await db
			.prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
			.bind(taskId, user.id)
			.first();

		if (!taskResult) {
			return NextResponse.json(
				{ error: "计划不存在" },
				{ status: 404 }
			);
		}

		const result = await db
			.prepare(
				"SELECT id, content, image_url, mood, is_milestone, created_at, updated_at FROM task_action_logs WHERE task_id = ? AND user_id = ? ORDER BY created_at DESC"
			)
			.bind(taskId, user.id)
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

// POST /api/tasks/[taskId]/action-logs - 添加行动记录
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ taskId: string }> }
) {
	try {
		const user = await requireUser();
		const { taskId } = await params;
		const body = await request.json() as {
			content: string;
			images?: string[];
			mood?: number | null;
			isMilestone?: boolean;
		};

		const db = getDb();

		// 验证任务是否存在且属于当前用户
		const taskResult = await db
			.prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
			.bind(taskId, user.id)
			.first();

		if (!taskResult) {
			return NextResponse.json(
				{ error: "计划不存在" },
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

		const now = Date.now();
		const actionLogId = crypto.randomUUID();
		const isMilestone = body.isMilestone ? 1 : 0;

		// 处理图片
		const images = body.images || [];
		const imageUrlJson = images.length > 0 ? JSON.stringify(images) : null;

		await db
			.prepare(
				"INSERT INTO task_action_logs (id, task_id, user_id, content, image_url, mood, is_milestone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
			)
			.bind(actionLogId, taskId, user.id, content, imageUrlJson, mood, isMilestone, now, now)
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

// PATCH /api/tasks/[taskId]/action-logs - 更新行动记录
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ taskId: string }> }
) {
	try {
		const user = await requireUser();
		const { taskId } = await params;
		const { searchParams } = new URL(request.url);
		const logId = searchParams.get("logId");

		if (!logId) {
			return NextResponse.json(
				{ error: "缺少logId参数" },
				{ status: 400 }
			);
		}

		const body = await request.json() as {
			content?: string;
			images?: string[];
			mood?: number | null;
			isMilestone?: boolean;
		};

		const db = getDb();

		// 验证记录是否存在且属于当前用户
		const logResult = await db
			.prepare("SELECT id FROM task_action_logs WHERE id = ? AND task_id = ? AND user_id = ?")
			.bind(logId, taskId, user.id)
			.first();

		if (!logResult) {
			return NextResponse.json(
				{ error: "行动记录不存在" },
				{ status: 404 }
			);
		}

		const updates: string[] = [];
		const values: any[] = [];

		if (body.content !== undefined) {
			const content = String(body.content).trim();
			if (!content) {
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
			updates.push("content = ?");
			values.push(content);
		}

		if (body.images !== undefined) {
			const imageUrlJson = body.images.length > 0 ? JSON.stringify(body.images) : null;
			updates.push("image_url = ?");
			values.push(imageUrlJson);
		}

		if (body.mood !== undefined) {
			const mood = body.mood != null ? Number(body.mood) : null;
			if (mood != null && (!Number.isFinite(mood) || mood < 1 || mood > 3)) {
				return NextResponse.json(
					{ error: "心情值必须是1-3之间" },
					{ status: 400 }
				);
			}
			updates.push("mood = ?");
			values.push(mood);
		}

		if (body.isMilestone !== undefined) {
			updates.push("is_milestone = ?");
			values.push(body.isMilestone ? 1 : 0);
		}

		if (updates.length > 0) {
			updates.push("updated_at = ?");
			values.push(Date.now());
			values.push(logId);
			values.push(taskId);
			values.push(user.id);

			await db.prepare(
				`UPDATE task_action_logs SET ${updates.join(", ")} WHERE id = ? AND task_id = ? AND user_id = ?`
			).bind(...values).run();
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Error updating action log:", error);
		return NextResponse.json(
			{ error: "Failed to update action log" },
			{ status: 500 }
		);
	}
}

// DELETE /api/tasks/[taskId]/action-logs - 删除行动记录
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ taskId: string }> }
) {
	try {
		const user = await requireUser();
		const { taskId } = await params;
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
			.prepare("DELETE FROM task_action_logs WHERE id = ? AND task_id = ? AND user_id = ?")
			.bind(logId, taskId, user.id)
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
