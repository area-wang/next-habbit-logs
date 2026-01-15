"use client";

import { useState, useEffect } from "react";
import type { HeatmapDataPoint } from "@/lib/types";

export default function HeatmapView() {
	const [data, setData] = useState<HeatmapDataPoint[]>([]);
	const [loading, setLoading] = useState(true);
	const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number } | null>(null);

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		try {
			const res = await fetch("/api/insights/heatmap");
			if (!res.ok) throw new Error("加载失败");
			const result = (await res.json()) as { data?: HeatmapDataPoint[] };
			setData(result.data || []);
		} catch (error) {
			console.error("加载热力图数据失败:", error);
		} finally {
			setLoading(false);
		}
	}

	// 获取颜色
	function getColor(count: number): string {
		if (count === 0) return "rgb(235, 237, 240)";
		if (count === 1) return "rgb(155, 233, 168)";
		if (count === 2) return "rgb(64, 196, 99)";
		if (count === 3) return "rgb(48, 161, 78)";
		return "rgb(33, 110, 57)";
	}

	// 将数据按周分组
	const weeks: HeatmapDataPoint[][] = [];
	for (let i = 0; i < data.length; i += 7) {
		weeks.push(data.slice(i, i + 7));
	}

	return (
		<div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--surface)] p-4">
			<h3 className="text-lg font-semibold mb-4">习惯打卡热力图</h3>

			{loading ? (
				<div className="h-32 flex items-center justify-center opacity-70">加载中...</div>
			) : (
				<div className="relative">
					<div className="flex gap-1 overflow-x-auto pb-2">
						{weeks.map((week, weekIndex) => (
							<div key={weekIndex} className="flex flex-col gap-1">
								{week.map((day, dayIndex) => (
									<div
										key={dayIndex}
										className="w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-125"
										style={{ backgroundColor: getColor(day.count) }}
										onMouseEnter={() => setHoveredCell({ date: day.date, count: day.count })}
										onMouseLeave={() => setHoveredCell(null)}
									/>
								))}
							</div>
						))}
					</div>

					{hoveredCell && (
						<div className="absolute top-0 left-0 bg-[color:var(--surface)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm shadow-lg pointer-events-none z-10">
							<div className="font-medium">{hoveredCell.date}</div>
							<div className="opacity-70">{hoveredCell.count} 个习惯</div>
						</div>
					)}

					<div className="flex items-center gap-2 mt-4 text-xs opacity-70">
						<span>少</span>
						<div className="flex gap-1">
							{[0, 1, 2, 3, 4].map((level) => (
								<div
									key={level}
									className="w-3 h-3 rounded-sm"
									style={{ backgroundColor: getColor(level) }}
								/>
							))}
						</div>
						<span>多</span>
					</div>
				</div>
			)}
		</div>
	);
}
