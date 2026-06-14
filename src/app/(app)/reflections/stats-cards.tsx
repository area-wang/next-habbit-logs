"use client";

interface Stats {
	weekCount: number;
	monthCount: number;
	streakDays: number;
}

export default function StatsCards({ stats }: { stats: Stats }) {
	return (
		<div className="grid grid-cols-3 gap-2">
			<div className="border border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-lg p-2 text-center">
				<div className="text-lg font-semibold">{stats.weekCount}</div>
				<div className="text-xs opacity-70">本周</div>
			</div>
			<div className="border border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-lg p-2 text-center">
				<div className="text-lg font-semibold">{stats.monthCount}</div>
				<div className="text-xs opacity-70">本月</div>
			</div>
			<div className="border border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-lg p-2 text-center">
				<div className="text-lg font-semibold">{stats.streakDays}</div>
				<div className="text-xs opacity-70">连续</div>
			</div>
		</div>
	);
}
