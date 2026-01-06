import type { NextRequest } from "next/server";
import { getSessionCookieName, getUserBySessionToken } from "@/lib/auth";

export async function getAuthedUserFromRequest(req: NextRequest) {
	const token = req.cookies.get(getSessionCookieName())?.value;
	if (!token) return null;
	return getUserBySessionToken(token);
}
