"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { TrendDataPoint } from "@/lib/types";

interface TrendChartProps {
	initialDays?: 7 | 30 | 90;
}

export default function TrendChart({ initialDays = 30 }: TrendChartProps) {
	const [timeRange, setTimeRange] = useState<7 | 30 | 90>(initialDays);
	const [data, setData] = useState<TrendDataPoint[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadData();
	}, [timeRange]);

	async function loadData() {
		setLoading(true);
		try {
			const res = await fetch(`/api/insights/trends?days=${timeRange}`);
			if (!res.ok) throw new Error("加载失败");
			const result = (await res.json()) as { data?: TrendDataPoint[] };
			setData(result.data || []);
		} catch (error) {
			console.error("加载趋势数据失败:", error);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--surface)] p-4">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold">完成率趋势</h3>
				<div className="flex gap-2">
					{([7, 30, 90] as const).map((days) => (
						<button
							key={days}
							onClick={() => setTimeRange(days)}
							className={`px-3 py-1 rounded-lg text-sm transition-colors ${
								timeRange === days
									? "bg-purple-600 text-white"
									: "border border-[color:var(--border-color)] hover:bg-[color:var(--surface-strong)]"
							}`}
						>
							{days}天
						</button>
					))}
				</div>
			</div>

			{loading ? (
				<div className="h-64 flex items-center justify-center opacity-70">加载中...</div>
			) : (
				<ResponsiveContainer width="100%" height={300}>
					<LineChart data={data}>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
						<XAxis
							dataKey="date"
							tick={{ fontSize: 12 }}
							tickFormatter={(value) => {
								const date = new Date(value);
								return `${date.getMonth() + 1}/${date.getDate()}`;
							}}
						/>
						<YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
						<Tooltip
							contentStyle={{
								backgroundColor: "var(--surface)",
								border: "1px solid var(--border-color)",
								borderRadius: "8px",
							}}
							formatter={(value: number | undefined, name: string | undefined) => {
								const label = name === "habitRate" ? "习惯" : "任务";
								return [`${(value || 0).toFixed(1)}%`, label];
							}}
							labelFormatter={(label) => `日期: ${label}`}
						/>
						<Legend />
						<Line
							type="monotone"
							dataKey="habitRate"
							stroke="#8b5cf6"
							strokeWidth={2}
							name="习惯完成率"
							dot={{ r: 3 }}
						/>
						<Line
							type="monotone"
							dataKey="taskRate"
							stroke="#06b6d4"
							strokeWidth={2}
							name="任务完成率"
							dot={{ r: 3 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			)}
		</div>
	);
}
