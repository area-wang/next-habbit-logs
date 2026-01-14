"use client";

interface Stats {
	weekCount: number;
	monthCount: number;
	streakDays: number;
}

export default function StatsCards({ stats }: { stats: Stats }) {
	return (
		<div className="grid grid-cols-3 gap-3">
			<div className="border border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-2xl p-4 text-center">
				<div className="text-2xl font-semibold">{stats.weekCount}</div>
				<div className="text-xs opacity-70 mt-1">本周</div>
			</div>
			<div className="border border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-2xl p-4 text-center">
				<div className="text-2xl font-semibold">{stats.monthCount}</div>
				<div className="text-xs opacity-70 mt-1">本月</div>
			</div>
			<div className="border border-[color:var(--border-color)] bg-[color:var(--surface)] rounded-2xl p-4 text-center">
				<div className="text-2xl font-semibold">{stats.streakDays}</div>
				<div className="text-xs opacity-70 mt-1">连续</div>
			</div>
		</div>
	);
}
