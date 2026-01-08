import { requireUser } from "@/lib/auth-server";
import HistoryClient from "./history-client";
import TodayPage from "../today/page";

export default async function HistoryPage({
	searchParams,
}: {
	searchParams?: Promise<{ date?: string | string[] }>;
}) {
	await requireUser();
	const sp = searchParams ? await searchParams : undefined;
	const raw = sp?.date;
	const dateParam = Array.isArray(raw) ? raw[0] : raw;
	if (typeof dateParam === "string" && dateParam) {
		return <TodayPage searchParams={Promise.resolve({ date: dateParam })} showDatePicker={true} />;
	}
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">历史</h1>
				<div className="text-sm opacity-70 mt-1">用日历复盘：习惯打卡 + 计划完成。</div>
			</div>
			<HistoryClient />
		</div>
	);
}
