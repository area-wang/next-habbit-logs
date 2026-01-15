"use client";

import { useState } from "react";

interface ReportData {
	period: string;
	stats: {
		habitCompletionRate: number;
		taskCompletionRate: number;
		reflectionDays: number;
		bestDay: string;
		improvements: string[];
	};
	aiSummary?: string;
}

export default function ReportGenerator() {
	const [reportType, setReportType] = useState<"week" | "month">("week");
	const [generating, setGenerating] = useState(false);
	const [report, setReport] = useState<ReportData | null>(null);

	async function handleGenerate(includeAI: boolean) {
		setGenerating(true);
		try {
			const res = await fetch("/api/insights/report", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: reportType,
					includeAI,
				}),
			});

			if (!res.ok) throw new Error("生成报告失败");
			const result = (await res.json()) as ReportData;
			setReport(result);
		} catch (error) {
			console.error("生成报告失败:", error);
			alert("生成报告失败，请稍后重试");
		} finally {
			setGenerating(false);
		}
	}

	function handleExport() {
		if (!report) return;

		const text = `
${report.period}报告

统计数据：
- 习惯完成率：${report.stats.habitCompletionRate.toFixed(1)}%
- 任务完成率：${report.stats.taskCompletionRate.toFixed(1)}%
- 反思天数：${report.stats.reflectionDays}天
- 最佳表现日：${report.stats.bestDay}

${report.stats.improvements.length > 0 ? `需要改进：\n${report.stats.improvements.map((i) => `- ${i}`).join("\n")}` : ""}

${report.aiSummary ? `\nAI总结：\n${report.aiSummary}` : ""}
		`.trim();

		const blob = new Blob([text], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${report.period}报告.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--surface)] p-4">
			<h3 className="text-lg font-semibold mb-4">报告生成</h3>

			<div className="flex gap-3 mb-4">
				<button
					onClick={() => setReportType("week")}
					className={`px-4 py-2 rounded-xl transition-colors ${
						reportType === "week"
							? "bg-purple-600 text-white"
							: "border border-[color:var(--border-color)] hover:bg-[color:var(--surface-strong)]"
					}`}
				>
					周报
				</button>
				<button
					onClick={() => setReportType("month")}
					className={`px-4 py-2 rounded-xl transition-colors ${
						reportType === "month"
							? "bg-purple-600 text-white"
							: "border border-[color:var(--border-color)] hover:bg-[color:var(--surface-strong)]"
					}`}
				>
					月报
				</button>
			</div>

			<div className="flex gap-3 mb-4">
				<button
					onClick={() => handleGenerate(false)}
					disabled={generating}
					className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{generating ? "生成中..." : "生成报告"}
				</button>
				<button
					onClick={() => handleGenerate(true)}
					disabled={generating}
					className="px-4 py-2 border border-purple-600 text-purple-600 rounded-xl hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{generating ? "生成中..." : "生成报告（含AI总结）"}
				</button>
			</div>

			{report && (
				<div className="space-y-4">
					<div className="p-4 rounded-xl border border-[color:var(--border-color)]">
						<div className="font-semibold mb-3">{report.period}报告</div>

						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="opacity-70">习惯完成率</span>
								<span className="font-medium">
									{report.stats.habitCompletionRate.toFixed(1)}%
								</span>
							</div>
							<div className="flex justify-between">
								<span className="opacity-70">任务完成率</span>
								<span className="font-medium">
									{report.stats.taskCompletionRate.toFixed(1)}%
								</span>
							</div>
							<div className="flex justify-between">
								<span className="opacity-70">反思天数</span>
								<span className="font-medium">{report.stats.reflectionDays}天</span>
							</div>
							<div className="flex justify-between">
								<span className="opacity-70">最佳表现日</span>
								<span className="font-medium">{report.stats.bestDay}</span>
							</div>

							{report.stats.improvements.length > 0 && (
								<div className="mt-3 pt-3 border-t border-[color:var(--border-color)]">
									<div className="opacity-70 mb-1">需要改进：</div>
									<ul className="list-disc list-inside space-y-1">
										{report.stats.improvements.map((improvement, index) => (
											<li key={index}>{improvement}</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</div>

					{report.aiSummary && (
						<div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
							<div className="font-semibold mb-2 text-purple-900">
								AI总结
							</div>
							<div className="text-sm opacity-90 whitespace-pre-wrap">
								{report.aiSummary}
							</div>
						</div>
					)}

					<button
						onClick={handleExport}
						className="w-full px-4 py-2 border border-[color:var(--border-color)] rounded-xl hover:bg-[color:var(--surface-strong)] transition-colors"
					>
						导出为文本
					</button>
				</div>
			)}
		</div>
	);
}
