"use client";

import { useState, useEffect } from "react";
import StatsOverview from "./stats-overview";
import TrendChart from "./trend-chart";
import HeatmapView from "./heatmap-view";
import TimeDistribution from "./time-distribution";
import IncompleteReasons from "./incomplete-reasons";
import HabitStreaks from "./habit-streaks";
import ReportGenerator from "./report-generator";
import AIInsights from "./ai-insights";
import type { InsightsStats } from "@/lib/types";

export default function InsightsClient() {
	const [stats, setStats] = useState<InsightsStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>("");
	const [days, setDays] = useState<7 | 30 | 90>(30);

	useEffect(() => {
		loadStats();
	}, [days]);

	async function loadStats() {
		setLoading(true);
		setError("");
		try {
			const res = await fetch(`/api/insights/stats?days=${days}`);
			if (!res.ok) throw new Error("加载统计数据失败");
			const data = (await res.json()) as InsightsStats;
			setStats(data);
		} catch (error) {
			console.error("加载统计数据失败:", error);
			setError("加载数据失败，请刷新页面重试");
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-3">
				<h1 className="text-2xl font-semibold">分析</h1>
				<div className="text-center py-12 opacity-70">加载中...</div>
			</div>
		);
	}

	if (error || !stats) {
		return (
			<div className="space-y-3">
				<h1 className="text-2xl font-semibold">分析</h1>
				<div className="text-center py-12">
					<div className="text-red-600 mb-4">{error || "加载失败"}</div>
					<button
						onClick={loadStats}
						className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
					>
						重试
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">分析</h1>
				<div className="text-sm opacity-70 mt-1">数据驱动的习惯养成洞察</div>
			</div>

			{/* 统计概览 */}
			<StatsOverview stats={stats} days={days} onDaysChange={setDays} />

			{/* 习惯连续打卡 */}
			<HabitStreaks />

			{/* AI智能洞察 */}
			<AIInsights
				habitStats={{
					rate: stats.habitCompletionRate,
					total: 100,
					done: Math.round(stats.habitCompletionRate),
				}}
				taskStats={{
					rate: stats.taskCompletionRate,
					total: 100,
					done: Math.round(stats.taskCompletionRate),
				}}
				reflectionDays={stats.reflectionDays}
				streak={stats.currentStreak}
			/>

			{/* 趋势图 */}
			<TrendChart initialDays={days} />

			{/* 热力图 */}
			<HeatmapView />

			{/* 时间分布 */}
			<TimeDistribution />

			{/* 未完成原因分析 */}
			<IncompleteReasons />

			{/* 报告生成 */}
			<ReportGenerator />
		</div>
	);
}
