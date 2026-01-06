import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { badRequest, unauthorized } from "@/lib/http";
import { createSession, getSessionCookieName, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
	const body = (await req.json().catch(() => null)) as null | {
		email?: string;
		password?: string;
	};
	if (!body?.email || !body.password) return badRequest("email and password are required");

	const email = body.email.trim().toLowerCase();
	const password = String(body.password);

	const res = await getDb()
		.prepare("SELECT id, password_hash FROM users WHERE email = ? LIMIT 1")
		.bind(email)
		.all();
	const row = (res.results?.[0] as any) || null;
	if (!row) return unauthorized();

	const ok = await verifyPassword(password, String(row.password_hash));
	if (!ok) return unauthorized();

	const { token, expiresAt } = await createSession(String(row.id));
	const out = NextResponse.json({ ok: true });
	const secure = new URL(req.url).protocol === "https:";
	out.cookies.set({
		name: getSessionCookieName(),
		value: token,
		httpOnly: true,
		sameSite: "lax",
		secure,
		path: "/",
		expires: new Date(expiresAt),
	});
	return out;
}
