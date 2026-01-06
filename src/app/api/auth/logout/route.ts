import { NextResponse, type NextRequest } from "next/server";
import { deleteSessionByToken, getSessionCookieName } from "@/lib/auth";

export async function POST(req: NextRequest) {
	const token = req.cookies.get(getSessionCookieName())?.value;
	if (token) {
		await deleteSessionByToken(token);
	}
	const res = NextResponse.json({ ok: true });
	res.cookies.set({
		name: getSessionCookieName(),
		value: "",
		httpOnly: true,
		sameSite: "lax",
		secure: new URL(req.url).protocol === "https:",
		path: "/",
		maxAge: 0,
	});
	return res;
}
