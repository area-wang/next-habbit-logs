import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/auth-server";

// PATCH /api/custom-plan-tabs/[id] - 更新自定义 tab
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await requireUser();
	const db = getDb();
	const { id } = await params;
	const body = await req.json() as {
		name?: string;
		scopeType?: string;
		scopeKey?: string;
		sortOrder?: number;
	};
	
	// 验证 tab 是否属于当前用户
	const tab = await db
		.prepare("SELECT * FROM custom_plan_tabs WHERE id = ? AND user_id = ?")
		.bind(id, user.id)
		.first();
	
	if (!tab) {
		return NextResponse.json({ error: "Tab 不存在" }, { status: 404 });
	}
	
	const updates: string[] = [];
	const values: any[] = [];
	
	if (body.name !== undefined) {
		if (!body.name.trim()) {
			return NextResponse.json({ error: "名称不能为空" }, { status: 400 });
		}
		updates.push("name = ?");
		values.push(body.name.trim());
	}
	
	if (body.scopeType !== undefined) {
		if (!["day", "week", "month", "year", "custom"].includes(body.scopeType)) {
			return NextResponse.json({ error: "无效的 scope_type" }, { status: 400 });
		}
		updates.push("scope_type = ?");
		values.push(body.scopeType);
	}
	
	if (body.scopeKey !== undefined) {
		updates.push("scope_key = ?");
		values.push(body.scopeKey || null);
	}
	
	if (body.sortOrder !== undefined) {
		updates.push("sort_order = ?");
		values.push(body.sortOrder);
	}
	
	if (updates.length > 0) {
		updates.push("updated_at = ?");
		values.push(Math.floor(Date.now() / 1000));
		values.push(id);
		values.push(user.id);
		
		await db.prepare(
			`UPDATE custom_plan_tabs SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`
		).bind(...values).run();
	}
	
	const updatedTab = await db
		.prepare("SELECT * FROM custom_plan_tabs WHERE id = ?")
		.bind(id)
		.first();
	
	return NextResponse.json({ tab: updatedTab });
}

// DELETE /api/custom-plan-tabs/[id] - 删除自定义 tab
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await requireUser();
	const db = getDb();
	const { id } = await params;
	
	// 验证 tab 是否属于当前用户
	const tab = await db
		.prepare("SELECT * FROM custom_plan_tabs WHERE id = ? AND user_id = ?")
		.bind(id, user.id)
		.first();
	
	if (!tab) {
		return NextResponse.json({ error: "Tab 不存在" }, { status: 404 });
	}
	
	await db.prepare("DELETE FROM custom_plan_tabs WHERE id = ? AND user_id = ?").bind(id, user.id).run();
	
	return NextResponse.json({ success: true });
}
