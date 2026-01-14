import { requireUser } from "@/lib/auth-server";
import { DEFAULT_TZ_OFFSET_MINUTES, ymdInOffset } from "@/lib/date";
import { cookies } from "next/headers";
import ReflectionsClient from "./reflections-client";

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function ReflectionsPage({
	searchParams,
}: {
	searchParams?: Promise<{ date?: string | string[] }>;
}) {
	await requireUser();
	const sp = searchParams ? await searchParams : undefined;
	const raw = sp?.date;
	const cookieStore = await cookies();
	const tzRaw = cookieStore.get("tzOffsetMin")?.value;
	const tz = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
	const dateParam = Array.isArray(raw) ? raw[0] : raw;
	const today = ymdInOffset(new Date(), tz);
	const date = dateParam && isValidYmd(dateParam) ? dateParam : today;

	return <ReflectionsClient initialDate={date} />;
}
