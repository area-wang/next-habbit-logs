import { requireUser } from "@/lib/auth-server";

export default async function InsightsPage() {
	await requireUser();
	return (
		<div className="space-y-3">
			<h1 className="text-2xl font-semibold">分析</h1>
			<div className="text-sm opacity-70">图表与洞察即将上线：完成率趋势、热力图、关联分析。</div>
		</div>
	);
}
