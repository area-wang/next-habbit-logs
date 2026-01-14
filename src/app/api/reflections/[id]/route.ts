import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { id } = await params;
	const db = getDb();

	const reflection = await db
		.prepare("SELECT id, title, tags, side_tags, content, created_at, updated_at FROM reflections WHERE id = ? AND user_id = ?")
		.bind(id, user.id)
		.first();

	if (!reflection) {
		return json({ error: "reflection not found" }, { status: 404 });
	}

	return json({
		reflection: {
			id: String(reflection.id),
			title: reflection.title ? String(reflection.title) : null,
			tags: reflection.tags ? JSON.parse(String(reflection.tags)) : [],
			sideTags: reflection.side_tags ? JSON.parse(String(reflection.side_tags)) : [],
			content: String(reflection.content),
			createdAt: Number(reflection.created_at),
			updatedAt: Number(reflection.updated_at),
		},
	});
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { id } = await params;
	const db = getDb();

	const existing = await db
		.prepare("SELECT user_id FROM reflections WHERE id = ?")
		.bind(id)
		.first();

	if (!existing) {
		return json({ error: "reflection not found" }, { status: 404 });
	}

	if (String(existing.user_id) !== user.id) {
		return unauthorized();
	}

	const body = (await req.json().catch(() => null)) as null | {
		title?: string;
		tags?: string[];
		sideTags?: any[];
		content?: string;
	};

	const updates: string[] = [];
	const values: any[] = [];

	if (body?.title !== undefined) {
		const title = body.title ? String(body.title).trim() : null;
		if (title && title.length > 100) {
			return badRequest("title must be <= 100 chars");
		}
		updates.push("title = ?");
		values.push(title);
	}

	if (body?.tags !== undefined) {
		const tags = Array.isArray(body.tags) ? body.tags : [];
		updates.push("tags = ?");
		values.push(JSON.stringify(tags));
	}

	if (body?.sideTags !== undefined) {
		const sideTags = Array.isArray(body.sideTags) ? body.sideTags : [];
		updates.push("side_tags = ?");
		values.push(JSON.stringify(sideTags));
	}

	if (body?.content !== undefined) {
		const content = String(body.content).trim();
		if (!content) {
			return badRequest("content cannot be empty");
		}
		if (content.length > 2000) {
			return badRequest("content must be <= 2000 chars");
		}
		updates.push("content = ?");
		values.push(content);
	}

	if (updates.length === 0) {
		return badRequest("no fields to update");
	}

	updates.push("updated_at = ?");
	values.push(Date.now());
	values.push(id);

	await db
		.prepare(`UPDATE reflections SET ${updates.join(", ")} WHERE id = ?`)
		.bind(...values)
		.run();

	return json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { id } = await params;
	const db = getDb();

	const existing = await db
		.prepare("SELECT user_id FROM reflections WHERE id = ?")
		.bind(id)
		.first();

	if (!existing) {
		return json({ error: "reflection not found" }, { status: 404 });
	}

	if (String(existing.user_id) !== user.id) {
		return unauthorized();
	}

	await db.prepare("DELETE FROM reflections WHERE id = ?").bind(id).run();

	return json({ ok: true });
}
