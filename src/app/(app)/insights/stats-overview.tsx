import type { InsightsStats } from "@/lib/types";

interface StatsOverviewProps {
	stats: InsightsStats;
	days: 7 | 30 | 90;
	onDaysChange: (days: 7 | 30 | 90) => void;
}

export default function StatsOverview({ stats, days, onDaysChange }: StatsOverviewProps) {
	const cards = [
		{
			title: "习惯完成率",
			value: `${stats.habitCompletionRate.toFixed(1)}%`,
			subtitle: `最近${days}天`,
			trend: stats.weekHabitRate > stats.habitCompletionRate ? "up" : "down",
		},
		{
			title: "任务完成率",
			value: `${stats.taskCompletionRate.toFixed(1)}%`,
			subtitle: `最近${days}天`,
			trend: stats.weekTaskRate > stats.taskCompletionRate ? "up" : "down",
		},
		{
			title: "反思天数",
			value: stats.reflectionDays,
			subtitle: `最近${days}天`,
		},
	];

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold">统计概览</h3>
				<div className="flex gap-2">
					{([7, 30, 90] as const).map((d) => (
						<button
							key={d}
							onClick={() => onDaysChange(d)}
							className={`px-3 py-1 rounded-lg text-sm transition-colors ${
								days === d
									? "bg-purple-600 text-white"
									: "border border-[color:var(--border-color)] hover:bg-[color:var(--surface-strong)]"
							}`}
						>
							{d}天
						</button>
					))}
				</div>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
				{cards.map((card, index) => (
					<div
						key={index}
						className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--surface)] p-4"
					>
						<div className="text-sm opacity-70 mb-1">{card.title}</div>
						<div className="text-2xl font-semibold mb-1">{card.value}</div>
						<div className="text-xs opacity-50 flex items-center gap-1">
							{card.subtitle}
							{card.trend && (
								<span className={card.trend === "up" ? "text-green-500" : "text-red-500"}>
									{card.trend === "up" ? "↑" : "↓"}
								</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
