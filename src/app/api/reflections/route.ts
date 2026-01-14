import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";
import { DEFAULT_TZ_OFFSET_MINUTES, ymdInOffset } from "@/lib/date";

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function calculateStats(db: any, userId: string, today: string) {
	const weekAgo = new Date(today);
	weekAgo.setDate(weekAgo.getDate() - 6);
	const weekStart = weekAgo.toISOString().split("T")[0];

	const monthStart = today.substring(0, 7) + "-01";

	const weekRes = await db
		.prepare("SELECT COUNT(DISTINCT date_ymd) as count FROM reflections WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ?")
		.bind(userId, weekStart, today)
		.first();

	const monthRes = await db
		.prepare("SELECT COUNT(DISTINCT date_ymd) as count FROM reflections WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ?")
		.bind(userId, monthStart, today)
		.first();

	const allDatesRes = await db
		.prepare("SELECT DISTINCT date_ymd FROM reflections WHERE user_id = ? AND date_ymd <= ? ORDER BY date_ymd DESC")
		.bind(userId, today)
		.all();

	let streakDays = 0;
	const dates = (allDatesRes.results || []).map((r: any) => String(r.date_ymd));
	if (dates.length > 0) {
		let checkDate = new Date(today);
		for (const dateStr of dates) {
			const expectedDate = checkDate.toISOString().split("T")[0];
			if (dateStr === expectedDate) {
				streakDays++;
				checkDate.setDate(checkDate.getDate() - 1);
			} else {
				break;
			}
		}
	}

	return {
		weekCount: Number(weekRes?.count || 0),
		monthCount: Number(monthRes?.count || 0),
		streakDays,
	};
}

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { searchParams } = new URL(req.url);
	const tzRaw = req.cookies.get("tzOffsetMin")?.value;
	const tz = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
	const today = ymdInOffset(new Date(), tz);

	const dateParam = searchParams.get("date");
	const tagsParam = searchParams.get("tags");
	const searchParam = searchParams.get("search");
	const startDateParam = searchParams.get("startDate");
	const endDateParam = searchParams.get("endDate");

	if (dateParam && !isValidYmd(dateParam)) {
		return badRequest("invalid date");
	}
	if (startDateParam && !isValidYmd(startDateParam)) {
		return badRequest("invalid startDate");
	}
	if (endDateParam && !isValidYmd(endDateParam)) {
		return badRequest("invalid endDate");
	}

	const db = getDb();

	let query = "SELECT id, title, tags, side_tags, content, created_at, updated_at FROM reflections WHERE user_id = ?";
	const params: any[] = [user.id];

	// 优先处理单个日期查询（用于编辑弹窗）
	if (dateParam) {
		query += " AND date_ymd = ?";
		params.push(dateParam);
	}
	// 如果提供了日期范围，使用日期范围筛选
	else if (startDateParam && endDateParam) {
		query += " AND date_ymd >= ? AND date_ymd <= ?";
		params.push(startDateParam, endDateParam);
	} else if (startDateParam) {
		query += " AND date_ymd >= ?";
		params.push(startDateParam);
	} else if (endDateParam) {
		query += " AND date_ymd <= ?";
		params.push(endDateParam);
	}
	// 如果没有提供任何日期参数，显示所有记录

	if (tagsParam) {
		query += " AND tags LIKE ?";
		params.push(`%${tagsParam}%`);
	}

	if (searchParam) {
		query += " AND (content LIKE ? OR title LIKE ?)";
		params.push(`%${searchParam}%`, `%${searchParam}%`);
	}

	query += " ORDER BY created_at DESC";

	const reflectionsRes = await db.prepare(query).bind(...params).all();

	const stats = await calculateStats(db, user.id, today);

	return json({
		reflections: (reflectionsRes.results || []).map((r: any) => ({
			id: String(r.id),
			title: r.title ? String(r.title) : null,
			tags: r.tags ? JSON.parse(String(r.tags)) : [],
			sideTags: r.side_tags ? JSON.parse(String(r.side_tags)) : [],
			content: String(r.content),
			createdAt: Number(r.created_at),
			updatedAt: Number(r.updated_at),
		})),
		stats,
	});
}

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const tzRaw = req.cookies.get("tzOffsetMin")?.value;
	const tz = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
	const today = ymdInOffset(new Date(), tz);

	const body = (await req.json().catch(() => null)) as null | {
		date?: string;
		title?: string;
		tags?: string[];
		sideTags?: any[];
		content?: string;
	};

	const date = body?.date && isValidYmd(body.date) ? body.date : today;
	const title = body?.title ? String(body.title).trim() : null;
	const tags = Array.isArray(body?.tags) ? body.tags : [];
	const sideTags = Array.isArray(body?.sideTags) ? body.sideTags : [];
	const content = body?.content ? String(body.content).trim() : "";

	if (!content) {
		return badRequest("content is required");
	}

	if (content.length > 2000) {
		return badRequest("content must be <= 2000 chars");
	}

	if (title && title.length > 100) {
		return badRequest("title must be <= 100 chars");
	}

	const id = crypto.randomUUID();
	const now = Date.now();
	const db = getDb();

	await db
		.prepare(
			"INSERT INTO reflections (id, user_id, date_ymd, title, tags, side_tags, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		)
		.bind(id, user.id, date, title, JSON.stringify(tags), JSON.stringify(sideTags), content, now, now)
		.run();

	return json({ ok: true, reflectionId: id });
}
