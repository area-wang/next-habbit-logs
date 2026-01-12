// @ts-ignore `.open-next/worker.ts` is generated at build time
import { default as handler } from "./.open-next/worker.js";
import { utcMsForOffsetMidnight } from "./src/lib/date";
import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

function ymdInOffsetMs(nowMs: number, offsetMin: number) {
	const shifted = new Date(nowMs + offsetMin * 60_000);
	return shifted.toISOString().slice(0, 10);
}

async function hasTable(db: D1Database, name: string) {
	try {
		const row = await db
			.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
			.bind(name)
			.first();
		return !!(row as any)?.name;
	} catch {
		return false;
	}
}

async function previewScheduled(env: CloudflareEnv) {
	const db = env.DB;
	const now = Date.now();
	const maxJobsPerRun = 50;
	const okSubs = await hasTable(db, "push_subscriptions");
	const okJobs = await hasTable(db, "scheduled_jobs");
	const okDeliveries = await hasTable(db, "push_deliveries");
	if (!okSubs || !okJobs || !okDeliveries) {
		return {
			ok: true,
			reason: "missing_tables",
			tables: {
				push_subscriptions: okSubs,
				scheduled_jobs: okJobs,
				push_deliveries: okDeliveries,
			},
		};
	}

	let activeSubsOverall = 0;
	try {
		const allRes = await db
			.prepare("SELECT COUNT(1) as c FROM push_subscriptions WHERE disabled_at IS NULL")
			.all();
		activeSubsOverall = Number(((allRes.results || [])[0] as any)?.c || 0);
		if (!Number.isFinite(activeSubsOverall)) activeSubsOverall = 0;
	} catch {
		activeSubsOverall = 0;
	}

	const dueRes = await db
		.prepare(
			"SELECT id, user_id, run_at, title, topic FROM scheduled_jobs WHERE status IN ('pending','retry') AND run_at <= ? AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY run_at ASC LIMIT ?",
		)
		.bind(now, now, maxJobsPerRun)
		.all();
	const due = (dueRes.results || []) as any[];
	const users = new Set<string>();
	for (const j of due) {
		const uid = String((j as any).user_id || "");
		if (uid) users.add(uid);
	}

	const userIds = Array.from(users);
	const subsByUser: Record<string, number> = {};
	if (userIds.length > 0) {
		const placeholders = userIds.map(() => "?").join(",");
		const rowsRes = await db
			.prepare(
				`SELECT user_id, COUNT(1) as c FROM push_subscriptions WHERE disabled_at IS NULL AND user_id IN (${placeholders}) GROUP BY user_id`,
			)
			.bind(...userIds)
			.all();
		for (const r of (rowsRes.results || []) as any[]) {
			const uid = String((r as any).user_id || "");
			const c = Number((r as any).c || 0);
			if (uid) subsByUser[uid] = Number.isFinite(c) ? c : 0;
		}
	}
	let fanout = 0;
	for (const j of due) {
		const uid = String((j as any).user_id || "");
		fanout += subsByUser[uid] ?? 0;
	}
	const activeSubsTotal = Object.values(subsByUser).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
	return {
		ok: true,
		reason: "preview",
		now,
		jobs: due.length,
		users: users.size,
		activeSubsOverall,
		activeSubsTotal,
		fanout,
		subsByUser,
		sample: due.slice(0, 10).map((j: any) => ({
			id: String(j.id || ""),
			userId: String(j.user_id || ""),
			runAt: Number(j.run_at || 0),
			title: String(j.title || ""),
			topic: j.topic == null ? null : String(j.topic),
		})),
	};
}

async function runScheduled(env: CloudflareEnv) {
	const db = env.DB;
	const now = Date.now();
	const appOrigin = String(env.APP_ORIGIN || "").replace(/\/$/, "");
	const subscriptionStaleTtlMs = 30 * 24 * 60 * 60 * 1000;
	const jobLateTtlMs = 30 * 60_000;
	const maxJobsPerRun = 200;
	const maxAttempts = 3;

	const okSubs = await hasTable(db, "push_subscriptions");
	const okJobs = await hasTable(db, "scheduled_jobs");
	const okDeliveries = await hasTable(db, "push_deliveries");
	if (!okSubs || !okJobs || !okDeliveries) {
		return {
			ok: true,
			reason: "missing_tables",
			tables: {
				push_subscriptions: okSubs,
				scheduled_jobs: okJobs,
				push_deliveries: okDeliveries,
			},
		};
	}

	try {
		const staleBefore = now - subscriptionStaleTtlMs;
		await db
			.prepare("UPDATE push_subscriptions SET disabled_at = ?, updated_at = ? WHERE disabled_at IS NULL AND updated_at < ?")
			.bind(now, now, staleBefore)
			.run();
	} catch {
		// ignore
	}

	try {
		await db
			.prepare(
				"UPDATE scheduled_jobs SET status = 'dead', last_error = 'expired', updated_at = ? WHERE status IN ('pending','retry') AND run_at < ?",
			)
			.bind(now, now - jobLateTtlMs)
			.run();
	} catch {
		// ignore
	}

	let totalJobs = 0;
	let totalClaimed = 0;
	let totalInserted = 0;
	let totalSendOk = 0;
	let totalSendErr = 0;

	const dueRes = await db
		.prepare(
			"SELECT id, user_id, title, body, url, topic, attempts FROM scheduled_jobs WHERE status IN ('pending','retry') AND run_at <= ? AND run_at >= ? AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY run_at ASC LIMIT ?",
		)
		.bind(now, now - jobLateTtlMs, now, maxJobsPerRun)
		.all();
	const due = (dueRes.results || []) as any[];
	if (due.length === 0) {
		return { ok: true, reason: "done", subs: 0, jobs: 0, inserted: 0, sendOk: 0, sendErr: 0, claimed: 0 };
	}
	totalJobs = due.length;

	for (const j of due) {
		const jobId = String(j.id || "");
		const userId = String(j.user_id || "");
		const title = String(j.title || "");
		const body = String(j.body || "");
		const url0 = String(j.url || "");
		const topic = j.topic == null ? undefined : String(j.topic);
		const attempts0 = j.attempts == null ? 0 : Number(j.attempts);
		if (!jobId || !userId || !title) continue;

		let claimed = false;
		try {
			const claimRes: any = await db
				.prepare("UPDATE scheduled_jobs SET status = 'running', updated_at = ? WHERE id = ? AND status IN ('pending','retry')")
				.bind(now, jobId)
				.run();
			const changes = (claimRes as any)?.meta?.changes ?? 0;
			claimed = Number(changes) === 1;
		} catch {
			claimed = false;
		}
		if (!claimed) continue;
		totalClaimed += 1;

		const subsRes = await db
			.prepare(
				"SELECT id, endpoint, expiration_time, p256dh, auth FROM push_subscriptions WHERE user_id = ? AND disabled_at IS NULL",
			)
			.bind(userId)
			.all();
		const subs = (subsRes.results || []) as any[];
		if (!subs || subs.length === 0) {
			try {
				await db
					.prepare("UPDATE scheduled_jobs SET status = 'sent', updated_at = ?, last_error = ? WHERE id = ?")
					.bind(Date.now(), "no_subscriptions", jobId)
					.run();
			} catch {
				// ignore
			}
			continue;
		}

		let anyOk = false;
		let anyTransient = false;
		let lastErr: string | null = null;

		for (const s of subs) {
			const subscriptionId = String(s.id || "");
			const endpoint = String(s.endpoint || "");
			const p256dh = String(s.p256dh || "");
			const auth = String(s.auth || "");
			if (!subscriptionId || !endpoint || !p256dh || !auth) continue;

			const deliveryId = crypto.randomUUID();
			const eventKey = `job:${jobId}`;
			let inserted = false;
			try {
				const insertRes: any = await db
					.prepare(
						"INSERT INTO push_deliveries (id, subscription_id, event_key, status, created_at, updated_at) VALUES (?, ?, ?, 'sending', ?, ?) ON CONFLICT(subscription_id, event_key) DO NOTHING",
					)
					.bind(deliveryId, subscriptionId, eventKey, Date.now(), Date.now())
					.run();
				const changes = (insertRes as any)?.meta?.changes ?? 0;
				inserted = Number(changes) === 1;
			} catch {
				inserted = false;
			}
			if (!inserted) continue;
			totalInserted += 1;

			const pushUrl = url0 && url0.startsWith("/") ? (appOrigin ? `${appOrigin}${url0}` : url0) : url0;
			const subObj = {
				id: subscriptionId,
				endpoint,
				expiration_time: s.expiration_time == null ? null : Number(s.expiration_time),
				p256dh,
				auth,
			};

			try {
				const res = await sendPush({ env, sub: subObj, title, body, url: pushUrl, topic });
				const status = res.ok ? "sent" : `error:${res.status}`;
				if (res.ok) {
					anyOk = true;
					totalSendOk += 1;
				} else {
					totalSendErr += 1;
					lastErr = status;
					if (res.status >= 500 || res.status === 429) anyTransient = true;
				}
				await db
					.prepare("UPDATE push_deliveries SET status = ?, updated_at = ? WHERE id = ?")
					.bind(status, Date.now(), deliveryId)
					.run();
				if (!res.ok && (res.status === 404 || res.status === 410)) {
					try {
						await db
							.prepare("UPDATE push_subscriptions SET disabled_at = ?, updated_at = ? WHERE id = ?")
							.bind(Date.now(), Date.now(), subscriptionId)
							.run();
					} catch {
						// ignore
					}
				}
			} catch {
				anyTransient = true;
				totalSendErr += 1;
				lastErr = "error:exception";
				try {
					await db
						.prepare("UPDATE push_deliveries SET status = ?, updated_at = ? WHERE id = ?")
						.bind("error:exception", Date.now(), deliveryId)
						.run();
				} catch {
					// ignore
				}
			}
		}

		const attempts = Number.isFinite(attempts0) ? attempts0 : 0;
		if (anyOk) {
			try {
				await db
					.prepare("UPDATE scheduled_jobs SET status = 'sent', updated_at = ?, last_error = NULL, next_retry_at = NULL WHERE id = ?")
					.bind(Date.now(), jobId)
					.run();
			} catch {
				// ignore
			}
			continue;
		}

		if (anyTransient && attempts + 1 < maxAttempts) {
			const nextAttempts = attempts + 1;
			const backoffMs = Math.min(30 * 60_000, 60_000 * Math.pow(2, nextAttempts));
			try {
				await db
					.prepare(
						"UPDATE scheduled_jobs SET status = 'retry', attempts = ?, next_retry_at = ?, last_error = ?, updated_at = ? WHERE id = ?",
					)
					.bind(nextAttempts, Date.now() + backoffMs, lastErr || "error", Date.now(), jobId)
					.run();
			} catch {
				// ignore
			}
			continue;
		}

		try {
			await db
				.prepare("UPDATE scheduled_jobs SET status = 'dead', attempts = ?, last_error = ?, updated_at = ? WHERE id = ?")
				.bind(Math.min(maxAttempts, attempts + 1), lastErr || "error", Date.now(), jobId)
				.run();
		} catch {
			// ignore
		}
	}

	const activeSubsRes = await db.prepare("SELECT COUNT(1) as c FROM push_subscriptions WHERE disabled_at IS NULL").all();
	const subsCount = Number(((activeSubsRes.results || [])[0] as any)?.c || 0);
	return {
		ok: true,
		reason: "done",
		subs: subsCount,
		jobs: totalJobs,
		inserted: totalInserted,
		sendOk: totalSendOk,
		sendErr: totalSendErr,
		claimed: totalClaimed,
	};
}

async function runBackfill(env: CloudflareEnv, days: number) {
	const db = env.DB;
	const now = Date.now();
	const appOrigin = String(env.APP_ORIGIN || "").replace(/\/$/, "");
	const okSubs = await hasTable(db, "push_subscriptions");
	const okReminders = await hasTable(db, "reminders");
	const okJobs = await hasTable(db, "scheduled_jobs");
	const okTasks = await hasTable(db, "tasks");
	const okHabits = await hasTable(db, "habits");
	if (!okSubs || !okReminders || !okJobs || !okTasks || !okHabits) {
		return { ok: false, error: "missing_tables" };
	}

	const subsRes = await db
		.prepare("SELECT user_id, tz_offset_min FROM push_subscriptions WHERE disabled_at IS NULL")
		.all();
	const subs = (subsRes.results || []) as any[];
	const tzByUser: Record<string, number> = {};
	for (const s of subs) {
		const userId = String((s as any).user_id || "");
		if (!userId) continue;
		if (tzByUser[userId] != null) continue;
		const tzOffsetMin = (s as any).tz_offset_min == null ? 480 : Number((s as any).tz_offset_min);
		if (!Number.isFinite(tzOffsetMin)) continue;
		tzByUser[userId] = tzOffsetMin;
	}

	const users = Object.keys(tzByUser);
	let inserted = 0;
	let scanned = 0;
	for (const userId of users) {
		const tzOffsetMin = tzByUser[userId]!;
		const today = ymdInOffsetMs(now, tzOffsetMin);
		for (let i = 0; i < days; i++) {
			const m = today.match(/^(\d{4})-(\d{2})-(\d{2})$/);
			if (!m) break;
			const y = Number(m[1]);
			const mo = Number(m[2]);
			const d = Number(m[3]);
			const baseUtc = Date.UTC(y, mo - 1, d, 0, 0, 0, 0) + i * 86400_000;
			const ymd = new Date(baseUtc).toISOString().slice(0, 10);

			const taskRowsRes = await db
				.prepare(
					"SELECT r.id as reminder_id, r.anchor, r.offset_min, t.id as task_id, t.title as task_title, t.scope_key as day_ymd, t.start_min, t.end_min, t.status FROM reminders r JOIN tasks t ON t.id = r.target_id WHERE r.user_id = ? AND r.enabled = 1 AND r.target_type = 'task' AND t.scope_type = 'day' AND t.scope_key = ? AND t.status = 'todo' AND r.anchor IN ('task_start','task_end')",
				)
				.bind(userId, ymd)
				.all();
			const taskRows = (taskRowsRes.results || []) as any[];
			for (const r of taskRows) {
				scanned += 1;
				const reminderId = String((r as any).reminder_id || "");
				const taskId = String((r as any).task_id || "");
				const taskTitle = String((r as any).task_title || "");
				const dayYmd = String((r as any).day_ymd || "");
				const anchor = String((r as any).anchor || "");
				const startMin = (r as any).start_min == null ? null : Number((r as any).start_min);
				const endMin = (r as any).end_min == null ? null : Number((r as any).end_min);
				const offsetMin = (r as any).offset_min == null ? 0 : Number((r as any).offset_min);
				const base = utcMsForOffsetMidnight(dayYmd, tzOffsetMin);
				const timeMin = anchor === "task_end" ? endMin : startMin;
				if (!reminderId || !taskId || !taskTitle || !dayYmd) continue;
				if (timeMin == null || !Number.isFinite(timeMin)) continue;
				const runAt = base + (Number(timeMin) + Number(offsetMin)) * 60_000;
				if (!Number.isFinite(runAt) || runAt < now - 6 * 60_000) continue;
				const minuteKey = Math.floor(runAt / 60_000);
				const dedupeKey = `${userId}:${reminderId}:${minuteKey}`;
				const path = `/today?date=${encodeURIComponent(dayYmd)}&focus=task:${encodeURIComponent(taskId)}`;
				const url = appOrigin ? `${appOrigin}${path}` : path;
				const kind = anchor === "task_end" ? "task_end" : "task_start";
				const title = "爱你老己：即将开始";
				const body = taskTitle;
				try {
					const id = crypto.randomUUID();
					const now2 = Date.now();
					const res: any = await db
						.prepare(
							"INSERT INTO scheduled_jobs (id, user_id, kind, target_type, target_id, reminder_id, day_ymd, run_at, tz_offset_min, title, body, url, topic, status, attempts, next_retry_at, last_error, created_at, updated_at, dedupe_key) VALUES (?, ?, ?, 'task', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, ?, ?, ?) ON CONFLICT(dedupe_key) DO NOTHING",
						)
						.bind(
							id,
							userId,
							kind,
							taskId,
							reminderId,
							dayYmd,
							runAt,
							tzOffsetMin,
							title,
							body,
							url,
							`task:${taskId}`,
							now2,
							now2,
							dedupeKey,
						)
						.run();
					const changes = (res as any)?.meta?.changes ?? 0;
					if (Number(changes) === 1) inserted += 1;
				} catch {
					// ignore
				}
			}

			const habitRowsRes = await db
				.prepare(
					"SELECT r.id as reminder_id, r.target_id as habit_id, r.time_min, h.title as habit_title, h.start_date, h.end_date FROM reminders r JOIN habits h ON h.id = r.target_id WHERE r.user_id = ? AND r.enabled = 1 AND r.target_type = 'habit' AND r.anchor = 'habit_time' AND h.active = 1 AND h.start_date <= ? AND (h.end_date IS NULL OR h.end_date = '' OR h.end_date >= ?)",
				)
				.bind(userId, ymd, ymd)
				.all();
			const habitRows = (habitRowsRes.results || []) as any[];
			for (const r of habitRows) {
				scanned += 1;
				const reminderId = String((r as any).reminder_id || "");
				const habitId = String((r as any).habit_id || "");
				const habitTitle = String((r as any).habit_title || "");
				const timeMin = (r as any).time_min == null ? null : Number((r as any).time_min);
				if (!reminderId || !habitId || !habitTitle || timeMin == null || !Number.isFinite(timeMin)) continue;
				const base = utcMsForOffsetMidnight(ymd, tzOffsetMin);
				const runAt = base + Number(timeMin) * 60_000;
				if (!Number.isFinite(runAt) || runAt < now - 6 * 60_000) continue;
				const minuteKey = Math.floor(runAt / 60_000);
				const dedupeKey = `${userId}:${reminderId}:${minuteKey}`;
				const path = `/today?date=${encodeURIComponent(ymd)}&focus=habit:${encodeURIComponent(habitId)}`;
				const url = appOrigin ? `${appOrigin}${path}` : path;
				const title = "爱你老己：习惯提醒";
				const body = habitTitle;
				try {
					const id = crypto.randomUUID();
					const now2 = Date.now();
					const res: any = await db
						.prepare(
							"INSERT INTO scheduled_jobs (id, user_id, kind, target_type, target_id, reminder_id, day_ymd, run_at, tz_offset_min, title, body, url, topic, status, attempts, next_retry_at, last_error, created_at, updated_at, dedupe_key) VALUES (?, ?, 'habit_time', 'habit', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NULL, NULL, ?, ?, ?) ON CONFLICT(dedupe_key) DO NOTHING",
						)
						.bind(
							id,
							userId,
							habitId,
							reminderId,
							ymd,
							runAt,
							tzOffsetMin,
							title,
							body,
							url,
							`habit:${habitId}`,
							now2,
							now2,
							dedupeKey,
						)
						.run();
					const changes = (res as any)?.meta?.changes ?? 0;
					if (Number(changes) === 1) inserted += 1;
				} catch {
					// ignore
				}
			}
		}
	}

	return { ok: true, reason: "backfilled", users: users.length, scanned, inserted };
}

async function sendPush(p: {
	env: CloudflareEnv;
	sub: { id: string; endpoint: string; expiration_time: number | null; p256dh: string; auth: string };
	title: string;
	body: string;
	url: string;
	topic?: string;
}) {
	function base64UrlEncodeBytes(bytes: Uint8Array) {
		let s = "";
		for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
		const b64 = btoa(s);
		return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
	}

	async function toSafeTopic(raw: string) {
		const data = new TextEncoder().encode(raw);
		const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
		const short = digest.slice(0, 15);
		return `t_${base64UrlEncodeBytes(short)}`;
	}

	const subscription: PushSubscription = {
		endpoint: p.sub.endpoint,
		expirationTime: p.sub.expiration_time == null ? null : Number(p.sub.expiration_time),
		keys: {
			p256dh: p.sub.p256dh,
			auth: p.sub.auth,
		},
	};

	const safeTopic = p.topic ? await toSafeTopic(p.topic) : undefined;
	const message = {
		data: JSON.stringify({ title: p.title, body: p.body, url: p.url }),
		options: { topic: safeTopic, ttl: 60 * 60, urgency: "high" as const },
	};

	const payload = await buildPushPayload(message as any, subscription as any, {
		subject: p.env.VAPID_SUBJECT,
		publicKey: p.env.VAPID_SERVER_PUBLIC_KEY,
		privateKey: p.env.VAPID_SERVER_PRIVATE_KEY,
	});

	return fetch(subscription.endpoint, payload as any);
}

export default {
	fetch: async (req, env, ctx) => {
		try {
			const url = new URL(req.url);
			if (url.pathname === "/api/_debug/scheduled") {
				let data: any;
				try {
					const dry = url.searchParams.get("dry") === "1";
					data = dry ? await previewScheduled(env) : await runScheduled(env);
				} catch (e) {
					data = { ok: false, error: String((e as any)?.message || e || "unknown_error") };
				}
				return new Response(JSON.stringify(data), {
					status: 200,
					headers: { "content-type": "application/json; charset=utf-8" },
				});
			}
			if (url.pathname === "/api/_debug/backfill-jobs") {
				const daysRaw = url.searchParams.get("days") || "30";
				const days = Math.max(1, Math.min(60, Number(daysRaw) || 30));
				let data: any;
				try {
					data = await runBackfill(env, days);
				} catch (e) {
					data = { ok: false, error: String((e as any)?.message || e || "unknown_error") };
				}
				return new Response(JSON.stringify(data), {
					status: 200,
					headers: { "content-type": "application/json; charset=utf-8" },
				});
			}
		} catch {
			// ignore
		}
		return handler.fetch(req, env, ctx);
	},
	async scheduled(controller, env, ctx) {
		try {
			const result = await runScheduled(env);
			console.log("[scheduled] done", result);
		} catch (e) {
			console.error("[scheduled] unhandled exception", e);
			return;
		}
	},
} satisfies ExportedHandler<CloudflareEnv>;

// @ts-ignore `.open-next/worker.ts` is generated at build time
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
