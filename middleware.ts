import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookieName } from "@/lib/auth";

const PROTECTED_PREFIXES = ["/today", "/habits", "/insights", "/coach"];

export function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
	const isLogin = pathname === "/login";

	const token = req.cookies.get(getSessionCookieName())?.value;

	if (isProtected && !token) {
		const url = req.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set("next", pathname);
		return NextResponse.redirect(url);
	}

	if (isLogin && token) {
		const url = req.nextUrl.clone();
		url.pathname = "/today";
		url.search = "";
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/today/:path*", "/habits/:path*", "/insights/:path*", "/coach/:path*", "/login"],
};
