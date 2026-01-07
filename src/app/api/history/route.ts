import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

function isValidMonth(s: string) {
	return /^\d{4}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { searchParams } = new URL(req.url);
	const month = String(searchParams.get("month") || "");
	if (!isValidMonth(month)) return badRequest("invalid month");

	const start = `${month}-01`;
	const end = `${month}-31`;

	const habitTotalRes = await getDb()
		.prepare("SELECT COUNT(*) as c FROM habits WHERE user_id = ? AND active = 1")
		.bind(user.id)
		.all();
	const habitTotalCount = Number((habitTotalRes.results?.[0] as any)?.c) || 0;

	const habitsRes = await getDb()
		.prepare(
			"SELECT date_ymd as date, COUNT(*) as habitCount FROM habit_checkins WHERE user_id = ? AND date_ymd >= ? AND date_ymd <= ? GROUP BY date_ymd",
		)
		.bind(user.id, start, end)
		.all();

	const tasksTotalRes = await getDb()
		.prepare(
			"SELECT scope_key as date, COUNT(*) as taskTotalCount FROM tasks WHERE user_id = ? AND scope_type = 'day' AND scope_key >= ? AND scope_key <= ? GROUP BY scope_key",
		)
		.bind(user.id, start, end)
		.all();

	const tasksRes = await getDb()
		.prepare(
			"SELECT scope_key as date, COUNT(*) as taskDoneCount FROM tasks WHERE user_id = ? AND scope_type = 'day' AND status = 'done' AND scope_key >= ? AND scope_key <= ? GROUP BY scope_key",
		)
		.bind(user.id, start, end)
		.all();

	const habitMap = new Map<string, number>();
	for (const r of habitsRes.results || []) habitMap.set(String((r as any).date), Number((r as any).habitCount) || 0);
	const taskTotalMap = new Map<string, number>();
	for (const r of tasksTotalRes.results || []) {
		taskTotalMap.set(String((r as any).date), Number((r as any).taskTotalCount) || 0);
	}
	const taskMap = new Map<string, number>();
	for (const r of tasksRes.results || []) taskMap.set(String((r as any).date), Number((r as any).taskDoneCount) || 0);

	const days: Array<{ date: string; habitDoneCount: number; habitTotalCount: number; taskDoneCount: number; taskTotalCount: number }> = [];
	const [yy, mm] = month.split("-").map((x) => Number(x));
	const dim = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
	for (let d = 1; d <= dim; d++) {
		const dd = String(d).padStart(2, "0");
		const date = `${month}-${dd}`;
		days.push({
			date,
			habitDoneCount: habitMap.get(date) || 0,
			habitTotalCount,
			taskDoneCount: taskMap.get(date) || 0,
			taskTotalCount: taskTotalMap.get(date) || 0,
		});
	}

	return json({ month, days });
}
