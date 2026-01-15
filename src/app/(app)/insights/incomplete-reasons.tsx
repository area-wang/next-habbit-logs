"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { IncompleteReasonStat } from "@/lib/types";

export default function IncompleteReasons() {
	const [reasons, setReasons] = useState<IncompleteReasonStat[]>([]);
	const [loading, setLoading] = useState(true);
	const [analyzing, setAnalyzing] = useState(false);
	const [aiAnalysis, setAiAnalysis] = useState<string>("");
	const [selectedReason, setSelectedReason] = useState<IncompleteReasonStat | null>(null);

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		try {
			const res = await fetch("/api/insights/incomplete-reasons");
			if (!res.ok) throw new Error("加载失败");
			const result = (await res.json()) as { reasons?: IncompleteReasonStat[]; total?: number };
			setReasons(result.reasons || []);
		} catch (error) {
			console.error("加载未完成原因数据失败:", error);
		} finally {
			setLoading(false);
		}
	}

	async function handleAIAnalyze() {
		if (reasons.length === 0) return;

		setAnalyzing(true);
		try {
			const res = await fetch("/api/insights/ai-analyze", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: "incomplete-reasons",
					data: { reasons: reasons.slice(0, 10) }, // 只发送前10个
				}),
			});

			if (!res.ok) throw new Error("AI分析失败");
			const result = (await res.json()) as { analysis?: string };
			setAiAnalysis(result.analysis || "");
		} catch (error) {
			console.error("AI分析失败:", error);
			alert("AI分析失败，请稍后重试");
		} finally {
			setAnalyzing(false);
		}
	}

	const chartData = reasons.slice(0, 10).map((r) => ({
		reason: r.reason.length > 15 ? r.reason.substring(0, 15) + "..." : r.reason,
		count: r.count,
		fullReason: r.reason,
	}));

	const colors = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"];

	return (
		<div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--surface)] p-4">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold">未完成原因分析</h3>
				<button
					onClick={handleAIAnalyze}
					disabled={analyzing || reasons.length === 0}
					className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
				>
					{analyzing ? "分析中..." : "AI分析原因"}
				</button>
			</div>

			{loading ? (
				<div className="h-64 flex items-center justify-center opacity-70">加载中...</div>
			) : reasons.length === 0 ? (
				<div className="h-64 flex items-center justify-center opacity-70">
					暂无未完成原因记录
				</div>
			) : (
				<>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={chartData} layout="vertical">
							<CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
							<XAxis type="number" tick={{ fontSize: 12 }} />
							<YAxis dataKey="reason" type="category" tick={{ fontSize: 12 }} width={120} />
							<Tooltip
								contentStyle={{
									backgroundColor: "var(--surface)",
									border: "1px solid var(--border-color)",
									borderRadius: "8px",
								}}
								formatter={(value: number | undefined) => {
									if (value === undefined) return ["0 次", ""];
									return [`${value} 次`, ""];
								}}
								labelFormatter={(label: string) => {
									const item = chartData.find((d) => d.reason === label);
									return item?.fullReason || label;
								}}
							/>
							<Bar dataKey="count" radius={[0, 4, 4, 0]}>
								{chartData.map((entry, index) => (
									<Cell
										key={`cell-${index}`}
										fill={colors[index % colors.length]}
										onClick={() => {
											const reason = reasons.find((r) => r.reason === entry.fullReason);
											setSelectedReason(reason || null);
										}}
										style={{ cursor: "pointer" }}
									/>
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>

					{aiAnalysis && (
						<div className="mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200">
							<div className="font-semibold mb-2 text-purple-900">
								AI分析结果
							</div>
							<div className="text-sm opacity-90 whitespace-pre-wrap">{aiAnalysis}</div>
						</div>
					)}

					{selectedReason && (
						<div className="mt-4 p-4 rounded-xl border border-[color:var(--border-color)]">
							<div className="flex items-center justify-between mb-2">
								<div className="font-semibold">{selectedReason.reason}</div>
								<button
									onClick={() => setSelectedReason(null)}
									className="text-sm opacity-70 hover:opacity-100"
								>
									关闭
								</button>
							</div>
							<div className="text-sm opacity-70 mb-2">
								出现 {selectedReason.count} 次（{selectedReason.percentage.toFixed(1)}%）
							</div>
							<div className="space-y-1">
								{selectedReason.items.slice(0, 5).map((item, index) => (
									<div key={index} className="text-sm opacity-70">
										{item.date} - {item.itemTitle}
									</div>
								))}
								{selectedReason.items.length > 5 && (
									<div className="text-sm opacity-50">
										还有 {selectedReason.items.length - 5} 条记录...
									</div>
								)}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
