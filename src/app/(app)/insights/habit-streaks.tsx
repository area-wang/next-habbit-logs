"use client";

import { useState, useEffect } from "react";

interface HabitStreak {
	habitId: string;
	habitTitle: string;
	currentStreak: number;
	longestStreak: number;
}

export default function HabitStreaks() {
	const [streaks, setStreaks] = useState<HabitStreak[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadData();
	}, []);

	async function loadData() {
		setLoading(true);
		try {
			const res = await fetch("/api/insights/habit-streaks");
			if (!res.ok) throw new Error("加载失败");
			const result = (await res.json()) as { streaks?: HabitStreak[] };
			setStreaks(result.streaks || []);
		} catch (error) {
			console.error("加载习惯连续打卡数据失败:", error);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--surface)] p-4">
			<h3 className="text-lg font-semibold mb-4">习惯连续打卡</h3>

			{loading ? (
				<div className="h-32 flex items-center justify-center opacity-70">加载中...</div>
			) : streaks.length === 0 ? (
				<div className="h-32 flex items-center justify-center opacity-70">暂无习惯数据</div>
			) : (
				<div className="space-y-3">
					{streaks.map((streak) => (
						<div
							key={streak.habitId}
							className="flex items-center justify-between p-3 rounded-xl border border-[color:var(--border-color)]"
						>
							<div className="flex-1">
								<div className="font-medium">{streak.habitTitle}</div>
								<div className="text-xs opacity-50 mt-1">
									最长连续: {streak.longestStreak}天
								</div>
							</div>
							<div className="text-right">
								<div className="text-2xl font-semibold text-purple-600">
									{streak.currentStreak}
								</div>
								<div className="text-xs opacity-50">当前连续</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
