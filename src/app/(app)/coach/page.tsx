import { requireUser } from "@/lib/auth-server";

export default async function CoachPage() {
	await requireUser();
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">建议</h1>
			<div className="text-sm opacity-70">这里会聚合：规则建议 + AI 建议（已预留接口）。</div>

			<div className="rounded-2xl border border-black/10 dark:border-white/15 p-4">
				<div className="font-semibold">AI 接口状态</div>
				<div className="text-sm opacity-70 mt-1">POST /api/ai/suggest（当前返回 501，占位）</div>
			</div>
		</div>
	);
}
