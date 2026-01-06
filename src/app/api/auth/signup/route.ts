import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { badRequest, json } from "@/lib/http";
import { createSession, getSessionCookieName, hashPassword } from "@/lib/auth";

function isValidEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
	const body = (await req.json().catch(() => null)) as null | {
		email?: string;
		password?: string;
		name?: string;
	};
	if (!body?.email || !body.password) return badRequest("email and password are required");

	const email = body.email.trim().toLowerCase();
	const password = String(body.password);
	const name = body.name ? String(body.name).trim() : null;

	if (!isValidEmail(email)) return badRequest("invalid email");
	if (password.length < 8) return badRequest("password must be at least 8 characters");

	const userId = crypto.randomUUID();
	const now = Date.now();
	const passwordHash = await hashPassword(password);

	try {
		await getDb()
			.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)")
			.bind(userId, email, passwordHash, name, now)
			.run();
	} catch {
		return json({ error: "email already exists" }, { status: 409 });
	}

	const { token, expiresAt } = await createSession(userId);
	const res = NextResponse.json({ ok: true });
	const secure = new URL(req.url).protocol === "https:";
	res.cookies.set({
		name: getSessionCookieName(),
		value: token,
		httpOnly: true,
		sameSite: "lax",
		secure,
		path: "/",
		expires: new Date(expiresAt),
	});
	return res;
}
