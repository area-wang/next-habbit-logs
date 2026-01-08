"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export type Habit = {
	id: string;
	title: string;
	description: string | null;
};

export default function HabitList({ habits, checkedHabitIds, date }: { habits: Habit[]; checkedHabitIds: string[]; date: string }) {
	const searchParams = useSearchParams();
	const [items, setItems] = useState<Habit[]>(habits);
	const initialSet = useMemo(() => new Set(checkedHabitIds), [checkedHabitIds]);
	const [checked, setChecked] = useState(initialSet);
	const [loadingId, setLoadingId] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [highlightHabitId, setHighlightHabitId] = useState<string | null>(null);

	useEffect(() => {
		setItems(habits);
	}, [habits]);

	useEffect(() => {
		setChecked(new Set(checkedHabitIds));
	}, [checkedHabitIds]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const focus = searchParams.get("focus") || "";
		if (!focus.startsWith("habit:")) return;
		const habitId = focus.slice("habit:".length);
		if (!habitId) return;
		setHighlightHabitId(habitId);

		let tries = 0;
		function esc(v: string) {
			try {
				return (window as any).CSS?.escape ? (window as any).CSS.escape(v) : v.replace(/"/g, "\\\"");
			} catch {
				return v;
			}
		}
		function tryScroll() {
			const el = document.querySelector(`[data-habit-id=\"${esc(habitId)}\"]`) as HTMLElement | null;
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "center" });
				return;
			}
			if (tries++ < 12) window.requestAnimationFrame(tryScroll);
		}
		tryScroll();

		const id = window.setTimeout(() => setHighlightHabitId(null), 2500);
		return () => window.clearTimeout(id);
	}, [searchParams]);

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
		const res = await fetch(`/api/habits/${h.id}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title, description: desc ? desc : null }),
		});
		if (res.ok) {
			setItems((prev) => prev.map((x) => (x.id === h.id ? { ...x, title, description: desc ? desc : null } : x)));
		}
	}

	if (items.length === 0) {
		return <div className="text-sm opacity-70">还没有习惯。去“习惯”页创建一个吧。</div>;
	}

	return (
		<div className="space-y-2">
			{items.map((h) => {
				const isChecked = checked.has(h.id);
				return (
					<div
						key={h.id}
						data-habit-id={h.id}
						className={`w-full rounded-xl border border-[color:var(--border-color)] px-4 py-3 transition-colors ${
							highlightHabitId === h.id
								? "border-yellow-500/60 bg-yellow-500/10"
								: isChecked
								? "bg-[color:var(--surface-strong)]"
								: "hover:bg-[color:var(--surface)]"
						}`}
					>
						<div className="flex items-start justify-between gap-4">
							<label className="flex items-start gap-3 cursor-pointer flex-1">
								<input
									type="checkbox"
									checked={isChecked}
									onChange={() => toggle(h.id)}
									disabled={loadingId === h.id}
									className="mt-1"
								/>
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between gap-4">
										<div className={`font-medium truncate ${isChecked ? "line-through opacity-90" : ""}`}>{h.title}</div>
										{loadingId === h.id ? <div className="text-xs opacity-70">...</div> : null}
									</div>
									{h.description ? (
										<div className={`text-sm mt-1 ${isChecked ? "opacity-90" : "opacity-70"}`}>{h.description}</div>
									) : null}
								</div>
							</label>
							<button
								className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors cursor-pointer"
								onClick={() => (editingId === h.id ? setEditingId(null) : beginEdit(h))}
								aria-label={editingId === h.id ? "取消编辑" : "编辑"}
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
						</div>

						{editingId === h.id ? (
							<div className="mt-3 grid gap-2">
								<input
									className="w-full rounded-xl border border-[color:var(--border-color)] bg-transparent px-3 py-2 outline-none"
									value={editTitle}
									onChange={(e) => setEditTitle(e.target.value)}
									placeholder="标题"
								/>
								<textarea
									className="w-full rounded-xl border border-[color:var(--border-color)] bg-transparent px-3 py-2 outline-none"
									value={editDescription}
									onChange={(e) => setEditDescription(e.target.value)}
									placeholder="正文/备注（可选）"
									rows={2}
								/>
								<button
									className="rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] py-2 font-medium disabled:opacity-60"
									onClick={() => saveEdit(h)}
									disabled={!String(editTitle).trim()}
								>
									保存
								</button>
							</div>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
