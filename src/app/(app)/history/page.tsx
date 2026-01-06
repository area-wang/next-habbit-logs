import { requireUser } from "@/lib/auth-server";
import HistoryClient from "./history-client";

export default async function HistoryPage() {
	await requireUser();
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
