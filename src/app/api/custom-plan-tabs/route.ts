import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// GET /api/custom-plan-tabs - 获取用户的自定义 tabs
export async function GET(req: NextRequest) {
	try {
		const user = await requireUser();
		const db = getDb();
		
		const result = await db
			.prepare("SELECT * FROM custom_plan_tabs WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC")
			.bind(user.id)
			.all();
		
		return NextResponse.json({ tabs: result.results || [] });
	} catch (error) {
		console.error("Error fetching custom tabs:", error);
		return NextResponse.json(
			{ error: "获取失败", details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}

// POST /api/custom-plan-tabs - 创建新的自定义 tab
export async function POST(req: NextRequest) {
	try {
		const user = await requireUser();
		const db = getDb();
		const body = await req.json() as {
			name: string;
			scopeType: string;
			scopeKey?: string;
		};
		
		const { name, scopeType, scopeKey } = body;
		
		if (!name || !name.trim()) {
			return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
		}
		
		if (!["day", "week", "month", "year", "custom"].includes(scopeType)) {
			return NextResponse.json({ error: "无效的 scope_type" }, { status: 400 });
		}
		
		// 获取当前最大的 sort_order
		const maxOrderResult = await db
			.prepare("SELECT MAX(sort_order) as max_order FROM custom_plan_tabs WHERE user_id = ?")
			.bind(user.id)
			.first();
		
		const sortOrder = ((maxOrderResult?.max_order as number | null) ?? -1) + 1;
		
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);
		
		await db.prepare(
			`INSERT INTO custom_plan_tabs (id, user_id, name, scope_type, scope_key, sort_order, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		).bind(id, user.id, name.trim(), scopeType, scopeKey || null, sortOrder, now, now).run();
		
		const tabResult = await db.prepare("SELECT * FROM custom_plan_tabs WHERE id = ?").bind(id).first();
		
		return NextResponse.json({ tab: tabResult });
	} catch (error) {
		console.error("Error creating custom tab:", error);
		return NextResponse.json(
			{ error: "创建失败", details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		);
	}
}
