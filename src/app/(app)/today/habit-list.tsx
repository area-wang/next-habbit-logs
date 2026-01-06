"use client";

import { useMemo, useState } from "react";

export type Habit = {
	id: string;
	title: string;
	description: string | null;
};

export default function HabitList({ habits, checkedHabitIds, date }: { habits: Habit[]; checkedHabitIds: string[]; date: string }) {
	const initialSet = useMemo(() => new Set(checkedHabitIds), [checkedHabitIds]);
	const [checked, setChecked] = useState(initialSet);
	const [loadingId, setLoadingId] = useState<string | null>(null);

	async function toggle(habitId: string) {
		const nextSet = new Set(checked);
		const isChecked = nextSet.has(habitId);
		setLoadingId(habitId);
		try {
			if (isChecked) {
				await fetch(`/api/habits/${habitId}/checkin?date=${encodeURIComponent(date)}`, { method: "DELETE" });
				nextSet.delete(habitId);
			} else {
				await fetch(`/api/habits/${habitId}/checkin`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ date }),
				});
				nextSet.add(habitId);
			}
			setChecked(nextSet);
		} finally {
			setLoadingId(null);
		}
	}

	if (habits.length === 0) {
		return <div className="text-sm opacity-70">还没有习惯。去“习惯”页创建一个吧。</div>;
	}

	return (
		<div className="space-y-2">
			{habits.map((h) => {
				const isChecked = checked.has(h.id);
				return (
					<button
						key={h.id}
						className={`w-full text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer ${
							isChecked
								? "border-black bg-black text-white"
								: "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
						}`}
						onClick={() => toggle(h.id)}
						disabled={loadingId === h.id}
					>
						<div className="flex items-center justify-between gap-4">
							<div className="font-medium truncate">{h.title}</div>
							<div className="text-xs opacity-80">{loadingId === h.id ? "..." : isChecked ? "已完成" : "未完成"}</div>
						</div>
						{h.description ? <div className={`text-sm mt-1 ${isChecked ? "opacity-90" : "opacity-70"}`}>{h.description}</div> : null}
					</button>
				);
			})}
		</div>
	);
}
