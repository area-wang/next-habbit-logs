"use client";

import { useState } from "react";
import type { AIInsightResult } from "@/lib/types";

interface AIInsightsProps {
	habitStats: { rate: number; total: number; done: number };
	taskStats: { rate: number; total: number; done: number };
	reflectionDays: number;
	streak: number;
}

export default function AIInsights({
	habitStats,
	taskStats,
	reflectionDays,
	streak,
}: AIInsightsProps) {
	const [generating, setGenerating] = useState(false);
	const [insights, setInsights] = useState<AIInsightResult | null>(null);
	const [error, setError] = useState<string>("");

	async function handleGenerate() {
		setGenerating(true);
		setError("");
		try {
			const res = await fetch("/api/insights/ai-analyze", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "general",
					data: {
						habitStats,
						taskStats,
						reflectionDays,
						streak,
						recentTrends: `习惯完成率${habitStats.rate.toFixed(1)}%，任务完成率${taskStats.rate.toFixed(1)}%`,
					},
				}),
			});

			if (!res.ok) {
				const errorData = (await res.json()) as { message?: string };
				throw new Error(errorData.message || "AI分析失败");
			}

			const result = (await res.json()) as { insights?: AIInsightResult; analysis?: string };
			if (result.insights) {
				setInsights(result.insights);
			} else {
				setError("AI响应格式错误，请重试");
			}
		} catch (error) {
			console.error("AI分析失败:", error);
			setError(error instanceof Error ? error.message : "AI分析失败，请稍后重试");
		} finally {
			setGenerating(false);
		}
	}

	return (
		<div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--surface)] p-4">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold">AI智能洞察</h3>
				<button
					onClick={handleGenerate}
					disabled={generating}
					className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{generating ? "生成中..." : "生成AI洞察"}
				</button>
			</div>

			{generating && (
				<div className="flex items-center justify-center py-8 opacity-70">
					<div className="text-center">
						<div className="mb-2">正在分析您的数据...</div>
						<div className="text-sm">这可能需要几秒钟</div>
					</div>
				</div>
			)}

			{error && (
				<div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900">
					{error}
				</div>
			)}

			{insights && !generating && (
				<div className="space-y-4">
					{insights.patterns && insights.patterns.length > 0 && (
						<div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
							<div className="font-semibold mb-2 text-blue-900">
								🔍 模式识别
							</div>
							<ul className="space-y-1 text-sm">
								{insights.patterns.map((pattern, index) => (
									<li key={index} className="opacity-90">
										• {pattern}
									</li>
								))}
							</ul>
						</div>
					)}

					{insights.strengths && insights.strengths.length > 0 && (
						<div className="p-4 rounded-xl bg-green-50 border border-green-200">
							<div className="font-semibold mb-2 text-green-900">
								💪 优势分析
							</div>
							<ul className="space-y-1 text-sm">
								{insights.strengths.map((strength, index) => (
									<li key={index} className="opacity-90">
										• {strength}
									</li>
								))}
							</ul>
						</div>
					)}

					{insights.improvements && insights.improvements.length > 0 && (
						<div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
							<div className="font-semibold mb-2 text-yellow-900">
								📈 改进建议
							</div>
							<ul className="space-y-1 text-sm">
								{insights.improvements.map((improvement, index) => (
									<li key={index} className="opacity-90">
										• {improvement}
									</li>
								))}
							</ul>
						</div>
					)}

					{insights.actions && insights.actions.length > 0 && (
						<div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
							<div className="font-semibold mb-2 text-purple-900">
								✅ 具体行动项
							</div>
							<ul className="space-y-1 text-sm">
								{insights.actions.map((action, index) => (
									<li key={index} className="opacity-90">
										• {action}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}

			{!insights && !generating && !error && (
				<div className="text-center py-8 opacity-70">
					点击"生成AI洞察"按钮，获取基于您数据的个性化分析和建议
				</div>
			)}
		</div>
	);
}
