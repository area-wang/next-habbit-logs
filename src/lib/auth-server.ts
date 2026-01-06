import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName, getUserBySessionToken, type AuthedUser } from "@/lib/auth";

export async function getAuthedUserFromCookies(): Promise<AuthedUser | null> {
	const token = (await cookies()).get(getSessionCookieName())?.value;
	if (!token) return null;
	return getUserBySessionToken(token);
}

export async function requireUser(): Promise<AuthedUser> {
	const user = await getAuthedUserFromCookies();
	if (!user) redirect("/login");
	return user!;
}
