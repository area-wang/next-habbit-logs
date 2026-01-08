import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const { searchParams } = new URL(req.url);
	const date = String(searchParams.get("date") || "");
	if (!isValidYmd(date)) return badRequest("invalid date");

	const res = await getDb()
		.prepare("SELECT item_type, item_id, note FROM daily_item_notes WHERE user_id = ? AND date_ymd = ?")
		.bind(user.id, date)
		.all();

	return json({ ok: true, date, notes: res.results || [] });
}

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const body = (await req.json().catch(() => null)) as null | {
		date?: string;
		itemType?: string;
		itemId?: string;
		note?: string | null;
	};

	const date = body?.date ? String(body.date) : "";
	if (!isValidYmd(date)) return badRequest("invalid date");

	const itemType = body?.itemType ? String(body.itemType) : "";
	if (!/^(task|habit)$/.test(itemType)) return badRequest("invalid itemType");

	const itemId = body?.itemId ? String(body.itemId) : "";
	if (!itemId) return badRequest("itemId is required");

	const note = body?.note == null ? "" : String(body.note);
	const trimmed = note.trim();
	const now = Date.now();
	const id = `din:${user.id}:${date}:${itemType}:${itemId}`;

	if (!trimmed) {
		await getDb()
			.prepare("DELETE FROM daily_item_notes WHERE user_id = ? AND date_ymd = ? AND item_type = ? AND item_id = ?")
			.bind(user.id, date, itemType, itemId)
			.run();
		return json({ ok: true, cleared: true });
	}

	await getDb()
		.prepare(
			"INSERT INTO daily_item_notes (id, user_id, date_ymd, item_type, item_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, date_ymd, item_type, item_id) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at",
		)
		.bind(id, user.id, date, itemType, itemId, trimmed, now, now)
		.run();

	return json({ ok: true, cleared: false });
}
