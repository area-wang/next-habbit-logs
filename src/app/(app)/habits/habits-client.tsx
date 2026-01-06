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
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [savingId, setSavingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

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
		setCreating(true);
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
			setCreating(false);
		}
	}

	function beginEdit(h: Habit) {
		setEditingId(h.id);
		setEditTitle(h.title);
		setEditDescription(h.description ? String(h.description) : "");
	}

	async function saveEdit(h: Habit) {
		const title = String(editTitle).trim();
		if (!title) return;
		const desc = String(editDescription || "").trim();
		setEditingId(null);
		setError(null);
		setSavingId(h.id);
		try {
			const res = await fetch(`/api/habits/${h.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ title, description: desc ? desc : null }),
			});
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setError(d?.error || "保存失败");
				return;
			}
			setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, title, description: desc ? desc : null } : x)));
		} finally {
			setSavingId(null);
		}
	}

	async function deleteHabit(h: Habit) {
		const ok = window.confirm(`确定删除习惯「${h.title}」吗？`);
		if (!ok) return;
		setError(null);
		setDeletingId(h.id);
		try {
			const res = await fetch(`/api/habits/${h.id}`, { method: "DELETE" });
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setError(d?.error || "删除失败");
				return;
			}
			setHabits((prev) => prev.filter((x) => x.id !== h.id));
			if (editingId === h.id) setEditingId(null);
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-black/10 dark:border-white/15 p-4">
				<h2 className="font-semibold">创建新习惯</h2>
				<div className="mt-3 grid gap-3">
					<input
						className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
						placeholder="例如：英语 20 分钟"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						disabled={creating}
					/>
					<input
						className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
						placeholder="描述（可选）：最低门槛、触发器等"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						disabled={creating}
					/>
					{error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}
					<button
						className="rounded-xl bg-black text-white py-2 font-medium disabled:opacity-60"
						onClick={create}
						disabled={creating || !title.trim()}
					>
						{creating ? "创建中..." : "创建"}
					</button>
				</div>
			</div>

			<div className="space-y-2">
				{habits.length === 0 ? (
					<div className="text-sm opacity-70">还没有习惯。</div>
				) : (
					habits.map((h) => (
						<div key={h.id} className="rounded-xl border border-black/10 dark:border-white/15 px-4 py-3">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="font-medium truncate">{h.title}</div>
									{h.description ? <div className="text-sm opacity-70 mt-1">{h.description}</div> : null}
								</div>
								<div className="flex items-center gap-2">
									<button
										className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
										onClick={() => (editingId === h.id ? setEditingId(null) : beginEdit(h))}
										aria-label={editingId === h.id ? "取消编辑" : "编辑"}
										disabled={savingId === h.id || deletingId === h.id}
									>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
											<path
												d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</button>
									<button
										className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
										onClick={() => deleteHabit(h)}
										aria-label="删除"
										disabled={savingId === h.id || deletingId === h.id}
									>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
											<path
												d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</button>
								</div>
							</div>

							{editingId === h.id ? (
								<div className="mt-3 grid gap-2">
									<input
										className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
										value={editTitle}
										onChange={(e) => setEditTitle(e.target.value)}
										placeholder="标题"
									/>
									<textarea
										className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
										value={editDescription}
										onChange={(e) => setEditDescription(e.target.value)}
										placeholder="正文/备注（可选）"
										rows={2}
									/>
									<button
										className="rounded-xl bg-black text-white py-2 font-medium disabled:opacity-60"
										onClick={() => saveEdit(h)}
										disabled={!String(editTitle).trim() || savingId === h.id}
									>
										{savingId === h.id ? "保存中..." : "保存"}
									</button>
								</div>
							) : null}
						</div>
					))
				)}
			</div>
		</div>
	);
}
