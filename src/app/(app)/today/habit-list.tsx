"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export type Habit = {
	id: string;
	title: string;
	description: string | null;
};

export default function HabitList({
	habits,
	checkedHabitIds,
	date,
	dailyHabitNotesById,
}: {
	habits: Habit[];
	checkedHabitIds: string[];
	date: string;
	dailyHabitNotesById?: Record<string, string>;
}) {
	const searchParams = useSearchParams();
	const [items, setItems] = useState<Habit[]>(habits);
	const initialSet = useMemo(() => new Set(checkedHabitIds), [checkedHabitIds]);
	const [checked, setChecked] = useState(initialSet);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [highlightHabitId, setHighlightHabitId] = useState<string | null>(null);
	const [habitDailyNotesById, setHabitDailyNotesById] = useState<Record<string, string>>(dailyHabitNotesById || {});
	const [noteOpenHabitId, setNoteOpenHabitId] = useState<string | null>(null);
	const [noteDraft, setNoteDraft] = useState("");
	const [noteSaving, setNoteSaving] = useState(false);

	useEffect(() => {
		setItems(habits);
	}, [habits]);

	useEffect(() => {
		setChecked(new Set(checkedHabitIds));
	}, [checkedHabitIds]);

	useEffect(() => {
		setHabitDailyNotesById(dailyHabitNotesById || {});
	}, [dailyHabitNotesById]);

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
		const prevSet = checked;
		const nextSet = new Set(prevSet);
		const isChecked = nextSet.has(habitId);
		if (isChecked) nextSet.delete(habitId);
		else nextSet.add(habitId);

		setChecked(nextSet);
		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("habit-checkin-changed", {
						detail: { habitId, checked: nextSet.has(habitId), date },
					}),
				);
			}
		} catch {
			// ignore
		}

		try {
			if (isChecked) {
				await fetch(`/api/habits/${habitId}/checkin?date=${encodeURIComponent(date)}`, { method: "DELETE" });
			} else {
				await fetch(`/api/habits/${habitId}/checkin`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ date }),
				});
			}
		} catch (err) {
			console.error(err);
			setChecked(prevSet);
			try {
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("habit-checkin-changed", {
							detail: { habitId, checked: prevSet.has(habitId), date },
						}),
					);
				}
			} catch {
				// ignore
			}
		}
	}

	function openNote(habitId: string) {
		setNoteOpenHabitId(habitId);
		setNoteDraft(habitDailyNotesById[habitId] || "");
	}

	async function saveNote() {
		if (!noteOpenHabitId) return;
		setNoteSaving(true);
		try {
			const itemId = noteOpenHabitId;
			const res = await fetch("/api/daily-item-notes", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ date, itemType: "habit", itemId, note: noteDraft }),
			});
			if (res.ok) {
				const next = String(noteDraft || "").trim();
				setHabitDailyNotesById((prev) => {
					const copy = { ...prev };
					if (!next) delete copy[itemId];
					else copy[itemId] = next;
					return copy;
				});
				setNoteOpenHabitId(null);
			}
		} finally {
			setNoteSaving(false);
		}
	}

	function beginEdit(h: Habit) {
		setEditingId(h.id);
		setEditTitle(h.title);
		setEditDescription(h.description ? String(h.description) : "");
		if (typeof window !== "undefined") {
			let tries = 0;
			function esc(v: string) {
				try {
					return (window as any).CSS?.escape ? (window as any).CSS.escape(v) : v.replace(/"/g, "\\\"");
				} catch {
					return v;
				}
			}
			function tryScroll() {
				const el = document.querySelector(`[data-habit-id=\"${esc(h.id)}\"]`) as HTMLElement | null;
				if (el) {
					el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
					return;
				}
				if (tries++ < 12) window.requestAnimationFrame(tryScroll);
			}
			window.requestAnimationFrame(tryScroll);
		}
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
							<label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
								<input
									type="checkbox"
									checked={isChecked}
									onChange={() => toggle(h.id)}
									className="mt-1"
								/>
								<div className="min-w-0 flex-1">
									<div className={`font-medium break-words whitespace-normal ${isChecked ? "line-through opacity-90" : ""}`}>{h.title}</div>
									{h.description ? (
										<div className={`text-sm mt-1 ${isChecked ? "opacity-90" : "opacity-70"}`}>{h.description}</div>
									) : null}
								</div>
							</label>
							<div className="flex items-center gap-2 flex-shrink-0 ml-auto">
								{!isChecked || habitDailyNotesById[h.id] ? (
									<button
										className={`h-9 w-9 inline-flex items-center justify-center rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors cursor-pointer ${
											habitDailyNotesById[h.id] ? "bg-[color:var(--surface)]" : ""
										}`}
										onClick={() => openNote(h.id)}
										aria-label="未完成原因/备注"
									>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
											<path
												d="M4 4h16v16H4V4zm4 4h8M8 12h8M8 16h6"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</button>
								) : null}
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
						</div>

						{editingId === h.id ? (
							<div className="mt-3 grid gap-2">
								<input
									className="w-full rounded-xl border border-[color:var(--border-color)] bg-transparent px-3 py-2 outline-none"
									value={editTitle}
									onChange={(e) => setEditTitle(e.target.value.slice(0, 50))}
									placeholder="标题"
									maxLength={50}
								/>
								<textarea
									className="w-full rounded-xl border border-[color:var(--border-color)] bg-transparent px-3 py-2 outline-none"
									value={editDescription}
									onChange={(e) => setEditDescription(e.target.value)}
									placeholder="正文/备注（可选）"
									rows={2}
								/>
								<div className="flex items-center gap-2">
									<button
										className="flex-1 h-10 px-3 rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors"
										onClick={() => setEditingId(null)}
										type="button"
									>
										取消
									</button>
									<button
										className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
										onClick={() => saveEdit(h)}
										disabled={!String(editTitle).trim()}
										type="button"
									>
										保存
									</button>
								</div>
							</div>
						) : null}
					</div>
				);
			})}

			<Dialog.Root open={!!noteOpenHabitId} onOpenChange={(open) => (!open ? setNoteOpenHabitId(null) : null)}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/60" />
					<Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--background)] shadow-xl p-4">
						<Dialog.Title className="font-semibold">未完成原因/备注</Dialog.Title>
						<div className="text-sm opacity-70 mt-1">只和当天的习惯关联，不会修改习惯本身的描述。</div>
						<textarea
							className="w-full mt-4 rounded-xl border border-[color:var(--border-color)] bg-transparent px-3 py-2 outline-none"
							value={noteDraft}
							onChange={(e) => setNoteDraft(e.target.value)}
							rows={4}
							placeholder="例如：今天临时加班 / 状态不好 / 改到明天..."
							disabled={noteSaving}
						/>
						<div className="mt-4 flex items-center justify-end gap-2">
							<Dialog.Close asChild>
								<button
									className="h-10 px-3 rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors"
									disabled={noteSaving}
								>
									取消
								</button>
							</Dialog.Close>
							<button
								className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
								onClick={saveNote}
								disabled={noteSaving}
								type="button"
							>
								{noteSaving ? "保存中..." : "保存"}
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
