import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized } from "@/lib/http";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { id } = await params;
	const db = getDb();

	// 首先检查主页面是否存在且属于当前用户
	const mainPage = await db
		.prepare("SELECT user_id FROM reflections WHERE id = ?")
		.bind(id)
		.first();

	if (!mainPage) {
		return json({ error: "reflection not found" }, { status: 404 });
	}

	if (String(mainPage.user_id) !== user.id) {
		return unauthorized();
	}

	// 获取主页面和所有子页面
	// 主页面：id = ? AND parent_id IS NULL
	// 子页面：parent_id = ?
	const pagesRes = await db
		.prepare(
			`SELECT id, title, tags, side_tags, content, page_number, created_at, updated_at 
			FROM reflections 
			WHERE (id = ? OR parent_id = ?) AND user_id = ?
			ORDER BY page_number ASC`
		)
		.bind(id, id, user.id)
		.all();

	return json({
		pages: (pagesRes.results || []).map((r: any) => ({
			id: String(r.id),
			title: r.title ? String(r.title) : null,
			tags: r.tags ? JSON.parse(String(r.tags)) : [],
			sideTags: r.side_tags ? JSON.parse(String(r.side_tags)) : [],
			content: String(r.content),
			pageNumber: r.page_number ? Number(r.page_number) : 1,
			createdAt: Number(r.created_at),
			updatedAt: Number(r.updated_at),
		})),
	});
}
