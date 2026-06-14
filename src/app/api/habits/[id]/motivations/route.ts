import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// GET /api/habits/[id]/motivations - 获取习惯的动力列表
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id } = await params;

		const db = getDb();

		const result = await db
			.prepare(
				"SELECT id, content, image_url, sort_order, created_at, updated_at FROM habit_motivations WHERE habit_id = ? AND user_id = ? ORDER BY sort_order ASC"
			)
			.bind(id, user.id)
			.all();

		return NextResponse.json({
			motivations: result.results || [],
		});
	} catch (error) {
		console.error("Error fetching motivations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch motivations" },
			{ status: 500 }
		);
	}
}

// POST /api/habits/[id]/motivations - 保存/更新习惯的动力
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id: habitId } = await params;
		const body = await request.json() as { motivations: Array<{ content: string; images: string[] } | string> };

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

		// 删除现有的动力
		await db
			.prepare("DELETE FROM habit_motivations WHERE habit_id = ? AND user_id = ?")
			.bind(habitId, user.id)
			.run();

		// 保存新的动力
		const motivations = body.motivations || [];
		const now = Date.now();

		for (let i = 0; i < motivations.length && i < 5; i++) {
			const m = motivations[i];
			// 兼容旧格式（字符串）和新格式（对象）
			const content = typeof m === "string" ? String(m).trim() : String(m?.content || "").trim();
			const images = typeof m === "object" && Array.isArray(m.images) ? m.images : [];

			if (content.length === 0 || content.length > 200) continue;

			const motivationId = crypto.randomUUID();
			const imageUrlJson = images.length > 0 ? JSON.stringify(images) : null;

			await db
				.prepare(
					"INSERT INTO habit_motivations (id, habit_id, user_id, content, image_url, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
				)
				.bind(motivationId, habitId, user.id, content, imageUrlJson, i, now, now)
				.run();
		}

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Error saving motivations:", error);
		return NextResponse.json(
			{ error: "Failed to save motivations" },
			{ status: 500 }
		);
	}
}
