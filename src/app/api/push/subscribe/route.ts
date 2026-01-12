import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";
import { DEFAULT_TZ_OFFSET_MINUTES } from "@/lib/date";
import { DEFAULT_JOB_WINDOW_DAYS, backfillUserJobs } from "@/lib/scheduled-jobs";

function isValidTzOffsetMin(v: unknown) {
	const n = typeof v === "number" ? v : Number(v);
	if (!Number.isFinite(n)) return null;
	if (n < -14 * 60 || n > 14 * 60) return null;
	return Math.trunc(n);
}

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const body = (await req.json().catch(() => null)) as any;
	const sub = body?.subscription;
	if (!sub || typeof sub !== "object") return badRequest("subscription is required");

	const endpoint = typeof sub.endpoint === "string" ? sub.endpoint : "";
	if (!endpoint) return badRequest("subscription.endpoint is required");

	const expirationTime = sub.expirationTime == null ? null : Number(sub.expirationTime);
	const keys = sub.keys || {};
	const p256dh = typeof keys.p256dh === "string" ? keys.p256dh : "";
	const auth = typeof keys.auth === "string" ? keys.auth : "";
	if (!p256dh || !auth) return badRequest("subscription.keys.p256dh/auth is required");

	const tzFromBody = isValidTzOffsetMin(body?.tzOffsetMin);
	const tzRaw = req.cookies.get("tzOffsetMin")?.value;
	const tzFromCookie = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : null;
	const tzOffsetMin = tzFromBody ?? (tzFromCookie != null ? tzFromCookie : DEFAULT_TZ_OFFSET_MINUTES);

	const now = Date.now();
	const id = crypto.randomUUID();
	const db = getDb();
	await db
		.prepare(
			"INSERT INTO push_subscriptions (id, user_id, endpoint, expiration_time, p256dh, auth, tz_offset_min, created_at, updated_at, disabled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, expiration_time = excluded.expiration_time, p256dh = excluded.p256dh, auth = excluded.auth, tz_offset_min = excluded.tz_offset_min, updated_at = excluded.updated_at, disabled_at = NULL",
		)
		.bind(id, user.id, endpoint, expirationTime, p256dh, auth, tzOffsetMin, now, now)
		.run();

	try {
		const row = await db
			.prepare(
				"SELECT COUNT(1) as c FROM scheduled_jobs WHERE user_id = ? AND status IN ('pending','retry','running') AND run_at >= ?",
			)
			.bind(user.id, now - 5 * 60_000)
			.first();
		const c = Number((row as any)?.c || 0);
		if (c === 0) {
			await backfillUserJobs(db, { userId: user.id, tzOffsetMin, days: DEFAULT_JOB_WINDOW_DAYS });
		}
	} catch {
		// ignore
	}

	return json({ ok: true });
}
