import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// PATCH /api/categories/[id] - 更新分类
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id } = await params;
		const body = await request.json() as {
			name?: string;
			color?: string;
			icon?: string;
			sort_order?: number;
		};
		
		// 验证分类是否存在且属于当前用户
		const categoryResult = await getDb()
			.prepare("SELECT * FROM habit_categories WHERE id = ? AND user_id = ?")
			.bind(id, user.id)
			.first();
		
		if (!categoryResult) {
			return NextResponse.json(
				{ error: "分类不存在" },
				{ status: 404 }
			);
		}
		
		const { name, color, icon, sort_order } = body;
		const updates: string[] = [];
		const values: any[] = [];
		
		// 验证并构建更新语句
		if (name !== undefined) {
			if (typeof name !== "string" || name.trim().length === 0) {
				return NextResponse.json(
					{ error: "分类名称不能为空" },
					{ status: 400 }
				);
			}
			if (name.length > 50) {
				return NextResponse.json(
					{ error: "分类名称不能超过50个字符" },
					{ status: 400 }
				);
			}
			
			// 检查名称是否与其他分类重复
			const existingResult = await getDb()
				.prepare(
					"SELECT id FROM habit_categories WHERE user_id = ? AND name = ? AND id != ?"
				)
				.bind(user.id, name.trim(), id)
				.first();
			
			if (existingResult) {
				return NextResponse.json(
					{ error: "分类名称已存在" },
					{ status: 409 }
				);
			}
			
			updates.push("name = ?");
			values.push(name.trim());
		}
		
		if (color !== undefined) {
			if (typeof color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
				return NextResponse.json(
					{ error: "颜色格式无效，请使用十六进制格式（如 #FF5733）" },
					{ status: 400 }
				);
			}
			updates.push("color = ?");
			values.push(color);
		}
		
		if (icon !== undefined) {
			updates.push("icon = ?");
			values.push(icon || null);
		}
		
		if (sort_order !== undefined) {
			if (typeof sort_order !== "number") {
				return NextResponse.json(
					{ error: "排序值必须是数字" },
					{ status: 400 }
				);
			}
			updates.push("sort_order = ?");
			values.push(sort_order);
		}
		
		if (updates.length === 0) {
			return NextResponse.json(
				{ error: "没有需要更新的字段" },
				{ status: 400 }
			);
		}
		
		// 添加 updated_at
		updates.push("updated_at = ?");
		values.push(Date.now());
		
		// 执行更新
		values.push(id, user.id);
		await getDb()
			.prepare(
				`UPDATE habit_categories SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
			)
			.bind(...values)
			.run();
		
		// 返回更新后的分类
		const updatedResult = await getDb()
			.prepare("SELECT * FROM habit_categories WHERE id = ? AND user_id = ?")
			.bind(id, user.id)
			.first();
		
		return NextResponse.json(updatedResult);
	} catch (error) {
		console.error("Error updating category:", error);
		return NextResponse.json(
			{ error: "Failed to update category" },
			{ status: 500 }
		);
	}
}

// DELETE /api/categories/[id] - 删除分类
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const user = await requireUser();
		const { id } = await params;
		
		// 验证分类是否存在且属于当前用户
		const categoryResult = await getDb()
			.prepare("SELECT * FROM habit_categories WHERE id = ? AND user_id = ?")
			.bind(id, user.id)
			.first();
		
		if (!categoryResult) {
			return NextResponse.json(
				{ error: "分类不存在" },
				{ status: 404 }
			);
		}
		
		// 将该分类下的所有习惯的 category_id 设置为 NULL（移至"未分类"）
		await getDb()
			.prepare(
				"UPDATE habits SET category_id = NULL, updated_at = ? WHERE user_id = ? AND category_id = ?"
			)
			.bind(Date.now(), user.id, id)
			.run();
		
		// 删除分类
		await getDb()
			.prepare("DELETE FROM habit_categories WHERE id = ? AND user_id = ?")
			.bind(id, user.id)
			.run();
		
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting category:", error);
		return NextResponse.json(
			{ error: "Failed to delete category" },
			{ status: 500 }
		);
	}
}
