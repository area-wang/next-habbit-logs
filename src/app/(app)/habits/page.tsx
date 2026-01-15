import HabitsClientEnhanced from "./habits-client-enhanced";

export default function HabitsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">习惯</h1>
				<div className="text-sm opacity-70 mt-1">把习惯当作"可执行的最小行动"。支持分类、标签、归档和批量管理。</div>
			</div>
			<HabitsClientEnhanced />
		</div>
	);
}
