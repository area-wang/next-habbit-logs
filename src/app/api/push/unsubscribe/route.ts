import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { badRequest, json, unauthorized } from "@/lib/http";

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const body = (await req.json().catch(() => null)) as any;
	const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
	if (!endpoint) return badRequest("endpoint is required");

	const now = Date.now();
	await getDb()
		.prepare("UPDATE push_subscriptions SET disabled_at = ?, updated_at = ? WHERE user_id = ? AND endpoint = ?")
		.bind(now, now, user.id, endpoint)
		.run();

	return json({ ok: true });
}
