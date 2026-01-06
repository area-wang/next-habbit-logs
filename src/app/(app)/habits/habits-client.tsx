"use client";

import { useEffect, useState } from "react";

type Habit = {
	id: string;
	title: string;
	description: string | null;
	active: number;
};

export default function HabitsClient() {
	const [habits, setHabits] = useState<Habit[]>([]);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function load() {
		const res = await fetch("/api/habits");
		const data = (await res.json()) as any;
		setHabits((data.habits || []) as Habit[]);
	}

	useEffect(() => {
		load();
	}, []);

	async function create() {
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/habits", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ title, description: description || null, frequencyType: "daily" }),
			});
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setError(d?.error || "创建失败");
				return;
			}
			setTitle("");
			setDescription("");
			await load();
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-black/10 dark:border-white/15 p-4">
				<h2 className="font-semibold">创建新习惯</h2>
				<div className="mt-3 grid gap-3">
					<input
						className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
						placeholder="例如：英语 20 分钟"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						disabled={loading}
					/>
					<input
						className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
						placeholder="描述（可选）：最低门槛、触发器等"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						disabled={loading}
					/>
					{error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}
					<button
						className="rounded-xl bg-black text-white py-2 font-medium disabled:opacity-60"
						onClick={create}
						disabled={loading || !title.trim()}
					>
						{loading ? "创建中..." : "创建"}
					</button>
				</div>
			</div>

			<div className="space-y-2">
				{habits.length === 0 ? (
					<div className="text-sm opacity-70">还没有习惯。</div>
				) : (
					habits.map((h) => (
						<div key={h.id} className="rounded-xl border border-black/10 dark:border-white/15 px-4 py-3">
							<div className="font-medium">{h.title}</div>
							{h.description ? <div className="text-sm opacity-70 mt-1">{h.description}</div> : null}
						</div>
					))
				)}
			</div>
		</div>
	);
}
