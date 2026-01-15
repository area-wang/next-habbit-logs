import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";
import type { HabitCategory } from "@/lib/types";

// GET /api/categories - 获取用户的所有分类
export async function GET() {
	try {
		const user = await requireUser();
		
		const result = await getDb()
			.prepare(
				"SELECT * FROM habit_categories WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC"
			)
			.bind(user.id)
			.all();
		
		const categories = (result.results || []) as unknown as HabitCategory[];
		
		return NextResponse.json(categories);
	} catch (error) {
		console.error("Error fetching categories:", error);
		return NextResponse.json(
			{ error: "Failed to fetch categories" },
			{ status: 500 }
		);
	}
}

// POST /api/categories - 创建新分类
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		const body = await request.json() as {
			name?: string;
			color?: string;
			icon?: string;
		};
		
		const { name, color, icon } = body;
		
		// 验证必填字段
		if (!name || typeof name !== "string" || name.trim().length === 0) {
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
		
		if (!color || typeof color !== "string") {
			return NextResponse.json(
				{ error: "分类颜色不能为空" },
				{ status: 400 }
			);
		}
		
		// 验证颜色格式
		if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
			return NextResponse.json(
				{ error: "颜色格式无效，请使用十六进制格式（如 #FF5733）" },
				{ status: 400 }
			);
		}
		
		// 检查分类名称是否已存在
		const existingResult = await getDb()
			.prepare(
				"SELECT id FROM habit_categories WHERE user_id = ? AND name = ?"
			)
			.bind(user.id, name.trim())
			.first();
		
		if (existingResult) {
			return NextResponse.json(
				{ error: "分类名称已存在" },
				{ status: 409 }
			);
		}
		
		// 获取当前最大排序值
		const maxSortResult = await getDb()
			.prepare(
				"SELECT MAX(sort_order) as max_sort FROM habit_categories WHERE user_id = ?"
			)
			.bind(user.id)
			.first();
		
		const nextSortOrder = (maxSortResult && typeof (maxSortResult as any).max_sort === "number")
			? (maxSortResult as any).max_sort + 1
			: 0;
		
		// 创建新分类
		const categoryId = `cat:${user.id}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
		const now = Date.now();
		
		await getDb()
			.prepare(
				`INSERT INTO habit_categories (id, user_id, name, color, icon, sort_order, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				categoryId,
				user.id,
				name.trim(),
				color,
				icon || null,
				nextSortOrder,
				now,
				now
			)
			.run();
		
		const newCategory: HabitCategory = {
			id: categoryId,
			user_id: user.id,
			name: name.trim(),
			color,
			icon: icon || null,
			sort_order: nextSortOrder,
			created_at: now,
			updated_at: now,
		};
		
		return NextResponse.json(newCategory, { status: 201 });
	} catch (error) {
		console.error("Error creating category:", error);
		return NextResponse.json(
			{ error: "Failed to create category" },
			{ status: 500 }
		);
	}
}
