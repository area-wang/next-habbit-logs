import HabitsClient from "./habits-client";

export default function HabitsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">习惯</h1>
				<div className="text-sm opacity-70 mt-1">把习惯当作“可执行的最小行动”。</div>
			</div>
			<HabitsClient />
		</div>
	);
}
