import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionCookieName } from "@/lib/auth";

export default async function Home() {
	const token = (await cookies()).get(getSessionCookieName())?.value;
	redirect(token ? "/today" : "/login");
}
