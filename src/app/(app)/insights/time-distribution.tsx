"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TimeDistributionPoint } from "@/lib/types";

export default function TimeDistribution() {
	const [data, setData] = useState<TimeDistributionPoint[]>([]);
	const [unsetCount, setUnsetCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	useEffect(() => {
		// 设置默认日期范围（最近30天）
		const today = new Date();
		const thirtyDaysAgo = new Date(today);
		thirtyDaysAgo.setDate(today.getDate() - 29);

		setEndDate(formatDate(today));
		setStartDate(formatDate(thirtyDaysAgo));
	}, []);

	useEffect(() => {
		if (startDate && endDate) {
			loadData();
		}
	}, [startDate, endDate]);

	function formatDate(date: Date): string {
		return date.toISOString().split("T")[0];
	}

	async function loadData() {
		setLoading(true);
		try {
			const params = new URLSearchParams({ startDate, endDate });
			const res = await fetch(`/api/insights/time-distribution?${params}`);
			if (!res.ok) throw new Error("加载失败");
			const result = (await res.json()) as { data?: TimeDistributionPoint[]; unsetCount?: number };
			setData(result.data || []);
			setUnsetCount(result.unsetCount || 0);
		} catch (error) {
			console.error("加载时间分布数据失败:", error);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--surface)] p-4">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold">任务时间分布</h3>
				<div className="flex gap-2 items-center text-sm">
					<input
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						className="px-2 py-1 border border-[color:var(--border-color)] rounded-lg bg-[color:var(--surface)]"
					/>
					<span className="opacity-70">至</span>
					<input
						type="date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						className="px-2 py-1 border border-[color:var(--border-color)] rounded-lg bg-[color:var(--surface)]"
					/>
				</div>
			</div>

			{loading ? (
				<div className="h-64 flex items-center justify-center opacity-70">加载中...</div>
			) : (
				<>
					<ResponsiveContainer width="100%" height={300}>
						<BarChart data={data}>
							<CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
							<XAxis
								dataKey="hour"
								tick={{ fontSize: 12 }}
								tickFormatter={(value) => `${value}:00`}
							/>
							<YAxis tick={{ fontSize: 12 }} />
							<Tooltip
								contentStyle={{
									backgroundColor: "var(--surface)",
									border: "1px solid var(--border-color)",
									borderRadius: "8px",
								}}
								formatter={(value: number | undefined) => [`${value || 0} 个任务`, "数量"]}
								labelFormatter={(label) => `${label}:00 - ${label}:59`}
							/>
							<Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>

					{unsetCount > 0 && (
						<div className="mt-4 text-sm opacity-70">
							未设置时间的任务：{unsetCount} 个
						</div>
					)}
				</>
			)}
		</div>
	);
}
