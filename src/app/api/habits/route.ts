import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";
import { DEFAULT_TZ_OFFSET_MINUTES, ymdInOffset } from "@/lib/date";
import { validateReminder } from "@/lib/reminder-validation";
import { DEFAULT_JOB_WINDOW_DAYS, getEffectiveUserTzOffsetMin, scheduleHabitAllJobs } from "@/lib/scheduled-jobs";

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { searchParams } = new URL(req.url);
	const date = searchParams.get("date");
	if (date && !isValidYmd(date)) return badRequest("invalid date");
	
	// 新增查询参数
	const archived = searchParams.get("archived") === "true";
	const categoryId = searchParams.get("category_id");
	const tagsParam = searchParams.get("tags");
	const tagMatch = searchParams.get("tag_match") || "any"; // 'any' or 'all'

	// 构建查询条件
	let query = "SELECT id, title, description, frequency_type, frequency_n, active, start_date, end_date, category_id, tags, archived_at, created_at, updated_at FROM habits WHERE user_id = ?";
	const bindings: any[] = [user.id];
	
	// 归档筛选
	if (archived) {
		query += " AND archived_at IS NOT NULL";
	} else {
		query += " AND archived_at IS NULL";
	}
	
	// 分类筛选
	if (categoryId) {
		if (categoryId === "uncategorized") {
			query += " AND category_id IS NULL";
		} else {
			query += " AND category_id = ?";
			bindings.push(categoryId);
		}
	}
	
	query += " ORDER BY created_at DESC";

	const habitsRes = await getDb()
		.prepare(query)
		.bind(...bindings)
		.all();
	
	let habits = habitsRes.results || [];
	
	// 标签筛选（在应用层处理，因为 SQLite 不支持 JSON 查询）
	if (tagsParam) {
		const searchTags = tagsParam.split(",").map(t => t.trim()).filter(t => t);
		if (searchTags.length > 0) {
			habits = habits.filter((habit: any) => {
				if (!habit.tags) return false;
				try {
					const habitTags = JSON.parse(habit.tags) as string[];
					if (!Array.isArray(habitTags)) return false;
					
					if (tagMatch === "all") {
						// 必须包含所有搜索标签
						return searchTags.every(searchTag => 
							habitTags.some(habitTag => habitTag.trim() === searchTag)
						);
					} else {
						// 包含任一搜索标签
						return searchTags.some(searchTag => 
							habitTags.some(habitTag => habitTag.trim() === searchTag)
						);
					}
				} catch (e) {
					return false;
				}
			});
		}
	}

	let checkedHabitIds: string[] = [];
	if (date) {
		const checkinsRes = await getDb()
			.prepare("SELECT habit_id FROM habit_checkins WHERE user_id = ? AND date_ymd = ?")
			.bind(user.id, date)
			.all();
		checkedHabitIds = (checkinsRes.results || []).map((r: any) => String(r.habit_id));
	}

	return json({ habits, checkedHabitIds, date });
}

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const tzRaw = req.cookies.get("tzOffsetMin")?.value;
	const tz = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;

	const body = (await req.json().catch(() => null)) as null | {
		title?: string;
		description?: string;
		frequencyType?: string;
		frequencyN?: number;
		startDate?: string | null;
		endDate?: string | null;
		reminders?: Array<{
			timeMin: number;
			endTimeMin?: number | null;
			enabled?: boolean;
		}>;
	};
	const title = body?.title ? String(body.title).trim() : "";
	if (!title) return badRequest("title is required");
	if (title.length > 50) return badRequest("title must be <= 50 chars");

	const frequencyType = body?.frequencyType ? String(body.frequencyType) : "daily";
	const frequencyN = body?.frequencyN == null ? null : Number(body.frequencyN);
	if (!/^(daily|weekly)$/.test(frequencyType)) return badRequest("invalid frequencyType");
	if (frequencyType === "weekly") {
		if (!Number.isFinite(frequencyN) || frequencyN! <= 0 || frequencyN! > 7) return badRequest("frequencyN must be 1-7");
	}

	const startDateRaw = body?.startDate == null ? "" : String(body.startDate);
	const endDateRaw = body?.endDate == null ? "" : String(body.endDate);
	const defaultStart = ymdInOffset(new Date(), tz);
	const startDate = startDateRaw ? startDateRaw : defaultStart;
	const endDate = endDateRaw ? endDateRaw : null;
	if (!isValidYmd(startDate)) return badRequest("invalid startDate");
	if (endDate != null && endDate !== "" && !isValidYmd(endDate)) return badRequest("invalid endDate");
	if (endDate != null && endDate !== "" && startDate > endDate) return badRequest("startDate must be <= endDate");

	const id = crypto.randomUUID();
	const now = Date.now();
	const db = getDb();
	await db
		.prepare(
			"INSERT INTO habits (id, user_id, title, description, frequency_type, frequency_n, active, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)",
		)
		.bind(id, user.id, title, body?.description ? String(body.description) : null, frequencyType, frequencyN, startDate, endDate, now, now)
		.run();

	// 处理提醒配置
	const reminders = body?.reminders || [];
	if (reminders.length > 0) {
		// 验证所有提醒配置
		for (const reminder of reminders) {
			const validation = validateReminder(reminder);
			if (!validation.valid) {
				return badRequest(validation.error || "invalid reminder configuration");
			}
		}

		// 批量创建提醒
		for (const reminder of reminders) {
			const reminderId = `rem:${user.id}:habit:${id}:habit_time:${reminder.timeMin}`;
			const enabled = reminder.enabled === false ? 0 : 1;
			await db
				.prepare(
					"INSERT INTO reminders (id, user_id, target_type, target_id, anchor, offset_min, time_min, end_time_min, enabled, created_at, updated_at) VALUES (?, ?, 'habit', ?, 'habit_time', NULL, ?, ?, ?, ?, ?)",
				)
				.bind(reminderId, user.id, id, reminder.timeMin, reminder.endTimeMin ?? null, enabled, now, now)
				.run();
		}

		// 调度任务
		const tzOffsetMin = await getEffectiveUserTzOffsetMin(db, { userId: user.id, fallback: tz });
		const reminderConfigs = reminders.map((r) => ({
			reminderId: `rem:${user.id}:habit:${id}:habit_time:${r.timeMin}`,
			timeMin: r.timeMin,
			endTimeMin: r.endTimeMin ?? null,
			enabled: r.enabled !== false,
		}));

		await scheduleHabitAllJobs(db, {
			userId: user.id,
			habitId: id,
			habitTitle: title,
			active: 1,
			startDate,
			endDate,
			reminders: reminderConfigs,
			tzOffsetMin,
			days: DEFAULT_JOB_WINDOW_DAYS,
		});
	}

	return json({ ok: true, habitId: id });
}
