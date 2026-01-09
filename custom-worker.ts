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

async function runScheduled(env: CloudflareEnv) {
	const db = env.DB;
	const now = Date.now();
	const lookbackMs = 30_000;
	const lookaheadMs = 90_000;
	const appOrigin = String(env.APP_ORIGIN || "").replace(/\/$/, "");
	const subscriptionStaleTtlMs = 1 * 24 * 60 * 60 * 1000;

	const okSubs = await hasTable(db, "push_subscriptions");
	const okReminders = await hasTable(db, "reminders");
	const okDeliveries = await hasTable(db, "push_deliveries");
	if (!okSubs || !okReminders || !okDeliveries) {
		return {
			ok: true,
			reason: "missing_tables",
			tables: {
				push_subscriptions: okSubs,
				reminders: okReminders,
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

	const subsRes = await db
		.prepare(
			"SELECT id, user_id, endpoint, expiration_time, p256dh, auth, tz_offset_min FROM push_subscriptions WHERE disabled_at IS NULL",
		)
		.all();
	const subs = (subsRes.results || []) as any[];
	if (subs.length === 0) {
		return { ok: true, reason: "no_subscriptions", subs: 0 };
	}

	let totalJobs = 0;
	let totalInserted = 0;
	let totalSendOk = 0;
	let totalSendErr = 0;

	for (const s of subs) {
		const subscriptionId = String(s.id || "");
		const userId = String(s.user_id || "");
		const endpoint = String(s.endpoint || "");
		const p256dh = String(s.p256dh || "");
		const auth = String(s.auth || "");
		const tzOffsetMin = s.tz_offset_min == null ? 480 : Number(s.tz_offset_min);
		if (!subscriptionId || !userId || !endpoint || !p256dh || !auth || !Number.isFinite(tzOffsetMin)) continue;

		const ymdNow = ymdInOffsetMs(now, tzOffsetMin);
		const ymdNext = ymdInOffsetMs(now + lookaheadMs, tzOffsetMin);
		const ymds = ymdNext !== ymdNow ? [ymdNow, ymdNext] : [ymdNow];

		const taskRows: any[] = [];
		for (const ymd of ymds) {
			const r = await db
				.prepare(
					"SELECT r.id as reminder_id, r.anchor, r.offset_min, t.id as task_id, t.title as task_title, t.scope_key as day_ymd, t.start_min, t.end_min, t.status FROM reminders r JOIN tasks t ON t.id = r.target_id WHERE r.user_id = ? AND r.enabled = 1 AND r.target_type = 'task' AND t.scope_type = 'day' AND t.scope_key = ? AND t.status = 'todo' AND r.anchor IN ('task_start','task_end')",
				)
				.bind(userId, ymd)
				.all();
			taskRows.push(...((r.results || []) as any[]));
		}

		const habitRowsRes = await db
			.prepare(
				"SELECT r.id as reminder_id, r.target_id as habit_id, r.time_min, h.title as habit_title FROM reminders r JOIN habits h ON h.id = r.target_id WHERE r.user_id = ? AND r.enabled = 1 AND r.target_type = 'habit' AND r.anchor = 'habit_time' AND h.active = 1 AND h.start_date <= ? AND (h.end_date IS NULL OR h.end_date = '' OR h.end_date >= ?)",
			)
			.bind(userId, ymdInOffsetMs(now, tzOffsetMin), ymdInOffsetMs(now, tzOffsetMin))
			.all();
		const habitRows = (habitRowsRes.results || []) as any[];

		const sendJobs: Array<{ eventKey: string; title: string; body: string; url: string; topic?: string }> = [];

		for (const r of taskRows) {
			const reminderId = String((r as any).reminder_id || "");
			const taskId = String((r as any).task_id || "");
			const taskTitle = String((r as any).task_title || "");
			const dayYmd = String((r as any).day_ymd || "");
			const anchor = String((r as any).anchor || "");
			const startMin = (r as any).start_min == null ? null : Number((r as any).start_min);
			const endMin = (r as any).end_min == null ? null : Number((r as any).end_min);
			const offsetMin = (r as any).offset_min == null ? 0 : Number((r as any).offset_min);
			if (!reminderId || !taskId || !taskTitle || !dayYmd) continue;

			const base = utcMsForOffsetMidnight(dayYmd, tzOffsetMin);
			const timeMin = anchor === "task_end" ? endMin : startMin;
			if (timeMin == null || !Number.isFinite(timeMin)) continue;

			const at = base + (Number(timeMin) + Number(offsetMin)) * 60_000;
			if (!Number.isFinite(at)) continue;
			if (at < now - lookbackMs || at > now + lookaheadMs) continue;

			const minuteKey = Math.floor(at / 60_000);
			const eventKey = `${reminderId}:${minuteKey}`;
			const path = `/today?date=${encodeURIComponent(dayYmd)}&focus=task:${encodeURIComponent(taskId)}`;
			const url = appOrigin ? `${appOrigin}${path}` : path;
			const title = "爱你老己：即将开始";
			const body = taskTitle;
			sendJobs.push({ eventKey, url, title, body, topic: `task:${taskId}` });
		}

		for (const r of habitRows) {
			const reminderId = String((r as any).reminder_id || "");
			const habitId = String((r as any).habit_id || "");
			const habitTitle = String((r as any).habit_title || "");
			const timeMin = (r as any).time_min == null ? null : Number((r as any).time_min);
			if (!reminderId || !habitId || !habitTitle || timeMin == null || !Number.isFinite(timeMin)) continue;

			const ymd = ymdInOffsetMs(now, tzOffsetMin);
			const base = utcMsForOffsetMidnight(ymd, tzOffsetMin);
			const at = base + Number(timeMin) * 60_000;
			if (!Number.isFinite(at)) continue;
			if (at < now - lookbackMs || at > now + lookaheadMs) continue;

			const minuteKey = Math.floor(at / 60_000);
			const eventKey = `${reminderId}:${minuteKey}`;
			const path = `/today?date=${encodeURIComponent(ymd)}&focus=habit:${encodeURIComponent(habitId)}`;
			const url = appOrigin ? `${appOrigin}${path}` : path;
			const title = "爱你老己：习惯提醒";
			const body = habitTitle;
			sendJobs.push({ eventKey, url, title, body, topic: `habit:${habitId}` });
		}

		totalJobs += sendJobs.length;
		if (sendJobs.length === 0) continue;

		const subObj = {
			id: subscriptionId,
			endpoint,
			expiration_time: s.expiration_time == null ? null : Number(s.expiration_time),
			p256dh,
			auth,
		};

		for (const job of sendJobs) {
			const now2 = Date.now();
			const deliveryId = crypto.randomUUID();
			let inserted = false;
			try {
				const insertRes: any = await db
					.prepare(
						"INSERT INTO push_deliveries (id, subscription_id, event_key, status, created_at, updated_at) VALUES (?, ?, ?, 'sending', ?, ?) ON CONFLICT(subscription_id, event_key) DO NOTHING",
					)
					.bind(deliveryId, subscriptionId, job.eventKey, now2, now2)
					.run();
				const changes = (insertRes as any)?.meta?.changes ?? 0;
				inserted = Number(changes) === 1;
			} catch {
				inserted = false;
			}
			if (!inserted) continue;
			totalInserted += 1;

			try {
				const res = await sendPush({ env, sub: subObj, title: job.title, body: job.body, url: job.url, topic: job.topic });
				const status = res.ok ? "sent" : `error:${res.status}`;
				if (res.ok) totalSendOk += 1;
				else totalSendErr += 1;
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
				totalSendErr += 1;
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
	}

	return {
		ok: true,
		reason: "done",
		subs: subs.length,
		jobs: totalJobs,
		inserted: totalInserted,
		sendOk: totalSendOk,
		sendErr: totalSendErr,
	};
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
					data = await runScheduled(env);
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
