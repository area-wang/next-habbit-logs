"use client";

import { useEffect, useMemo, useState } from "react";
import { isoWeekKeyInOffset, yInOffset, ymInOffset, ymdInOffset } from "@/lib/date";

type ScopeType = "day" | "week" | "month" | "year";

type Task = {
	id: string;
	title: string;
	description: string | null;
	scope_type: string;
	scope_key: string;
	start_min: number | null;
	end_min: number | null;
	remind_before_min: number | null;
	status: string;
};

function minToHHMM(v: number | null) {
	if (v == null) return "";
	const h = Math.floor(v / 60);
	const m = v % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMin(s: string) {
	if (!s) return null;
	const m = s.match(/^(\d{2}):(\d{2})$/);
	if (!m) return null;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
	return hh * 60 + mm;
}

export default function PlansClient({ tzOffsetMin }: { tzOffsetMin: number }) {
	const [scopeType, setScopeType] = useState<ScopeType>("day");
	const [hydrated, setHydrated] = useState(false);
	const [nowMs, setNowMs] = useState<number>(0);
	useEffect(() => {
		setNowMs(Date.now());
		setHydrated(true);
	}, []);
	const scopeKey = useMemo(() => {
		const d = new Date(nowMs);
		if (scopeType === "day") return ymdInOffset(d, tzOffsetMin);
		if (scopeType === "week") return isoWeekKeyInOffset(d, tzOffsetMin);
		if (scopeType === "month") return ymInOffset(d, tzOffsetMin);
		return yInOffset(d, tzOffsetMin);
	}, [scopeType, tzOffsetMin, nowMs]);

	const [tasks, setTasks] = useState<Task[]>([]);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startHHMM, setStartHHMM] = useState("");
	const [endHHMM, setEndHHMM] = useState("");
	const [remindBeforeMin, setRemindBeforeMin] = useState(5);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editStartHHMM, setEditStartHHMM] = useState("");
	const [editEndHHMM, setEditEndHHMM] = useState("");
	const [editRemindBeforeMin, setEditRemindBeforeMin] = useState(5);

	async function load() {
		const res = await fetch(`/api/tasks?scopeType=${encodeURIComponent(scopeType)}&scopeKey=${encodeURIComponent(scopeKey)}`);
		const data = (await res.json()) as any;
		setTasks((data.tasks || []) as Task[]);
	}

	useEffect(() => {
		if (!hydrated) return;
		load();
	}, [hydrated, scopeType, scopeKey]);

	async function create() {
		setError(null);
		setLoading(true);
		try {
			if (!hydrated) return;
			const startMin = hhmmToMin(startHHMM);
			const endMin = hhmmToMin(endHHMM);
			const rbm = Number.isFinite(remindBeforeMin) ? remindBeforeMin : null;
			const desc = String(description || "").trim();
			const res = await fetch("/api/tasks", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					title,
					description: desc ? desc : null,
					scopeType,
					scopeKey,
					startMin,
					endMin,
					remindBeforeMin: rbm,
				}),
			});
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setError(d?.error || "创建失败");
				return;
			}
			setTitle("");
			setDescription("");
			setStartHHMM("");
			setEndHHMM("");
			await load();
		} finally {
			setLoading(false);
		}
	}

	function beginEdit(task: Task) {
		setEditingId(task.id);
		setEditTitle(task.title);
		setEditDescription(task.description ? String(task.description) : "");
		setEditStartHHMM(minToHHMM(task.start_min));
		setEditEndHHMM(minToHHMM(task.end_min));
		setEditRemindBeforeMin(task.remind_before_min == null ? 5 : Number(task.remind_before_min));
	}

	async function saveEdit(task: Task) {
		const title = String(editTitle).trim();
		if (!title) return;
		const startMin = hhmmToMin(editStartHHMM);
		const endMin = hhmmToMin(editEndHHMM);
		const rbm = Number.isFinite(editRemindBeforeMin) ? editRemindBeforeMin : null;
		const desc = String(editDescription || "").trim();
		setEditingId(null);
		await fetch(`/api/tasks/${task.id}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title, description: desc ? desc : null, startMin, endMin, remindBeforeMin: rbm }),
		});
		await load();
	}

	async function toggleDone(task: Task) {
		const nextStatus = task.status === "done" ? "todo" : "done";
		setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
		await fetch(`/api/tasks/${task.id}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ status: nextStatus }),
		});
	}

	async function deleteTask(task: Task) {
		const ok = window.confirm(`确定删除任务「${task.title}」吗？`);
		if (!ok) return;
		setTasks((prev) => prev.filter((t) => t.id !== task.id));
		await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
	}

	const doneCount = tasks.filter((t) => t.status === "done").length;

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-2">
				{([
					{ k: "day", label: "今日 Todo" },
					{ k: "week", label: "周计划" },
					{ k: "month", label: "月计划" },
					{ k: "year", label: "年计划" },
				] as const).map((x) => (
					<button
						key={x.k}
						className={`text-sm px-3 py-1 rounded-full border transition-colors cursor-pointer ${
							scopeType === x.k ? "bg-black text-white border-black" : "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
						}`}
						onClick={() => setScopeType(x.k)}
						disabled={loading}
					>
						{x.label}
					</button>
				))}
			</div>

			<div className="rounded-2xl border border-black/10 dark:border-white/15 p-4">
				<div className="flex items-end justify-between gap-4">
					<div>
						<div className="font-semibold">新任务</div>
						<div className="text-sm opacity-70 mt-1">范围：{scopeType} / {hydrated ? scopeKey : "-"}</div>
					</div>
					<div className="text-sm opacity-70">已完成 {doneCount}/{tasks.length}</div>
				</div>

				<div className="mt-4 grid gap-3">
					<input
						className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
						placeholder="例如：写 1 页周总结"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						disabled={loading}
					/>
					<textarea
						className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
						placeholder="正文/备注（可选）"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						disabled={loading}
						rows={2}
					/>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<label className="block">
							<div className="text-xs opacity-70 mb-1">开始时间</div>
							<input
								className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
								type="time"
								value={startHHMM}
								onChange={(e) => setStartHHMM(e.target.value)}
								disabled={loading}
							/>
						</label>
						<label className="block">
							<div className="text-xs opacity-70 mb-1">结束时间</div>
							<input
								className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
								type="time"
								value={endHHMM}
								onChange={(e) => setEndHHMM(e.target.value)}
								disabled={loading}
							/>
						</label>
						<label className="block">
							<div className="text-xs opacity-70 mb-1">提前提醒（分钟）</div>
							<input
								className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
								type="number"
								min={0}
								max={1440}
								value={remindBeforeMin}
								onChange={(e) => setRemindBeforeMin(Number(e.target.value))}
								disabled={loading}
							/>
						</label>
					</div>
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
				{tasks.length === 0 ? (
					<div className="text-sm opacity-70">还没有任务。</div>
				) : (
					tasks.map((t) => (
						<div
							key={t.id}
							className={`w-full rounded-xl border px-4 py-3 transition-colors ${
								t.status === "done"
									? "border-black/25 bg-black/5 dark:border-white/25 dark:bg-white/10"
									: "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
							}`}
						>
							<div className="flex items-start justify-between gap-4">
								<label className="flex items-start gap-3 flex-1 cursor-pointer">
									<input
										type="checkbox"
										checked={t.status === "done"}
										onChange={() => toggleDone(t)}
										className="mt-1"
									/>
									<div className="min-w-0">
										<div className={`font-medium truncate ${t.status === "done" ? "line-through opacity-90" : ""}`}>{t.title}</div>
										{t.description ? <div className={`text-sm mt-1 ${t.status === "done" ? "opacity-90" : "opacity-70"}`}>{t.description}</div> : null}
										{t.start_min != null || t.end_min != null ? (
											<div className={`text-sm mt-1 ${t.status === "done" ? "opacity-90" : "opacity-70"}`}>
												{minToHHMM(t.start_min)}{t.end_min != null ? ` - ${minToHHMM(t.end_min)}` : ""}
											</div>
										) : null}
									</div>
								</label>
								<div className="flex items-center gap-2">
									<button
										className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
										onClick={() => (editingId === t.id ? setEditingId(null) : beginEdit(t))}
										aria-label={editingId === t.id ? "取消编辑" : "编辑"}
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
										onClick={() => deleteTask(t)}
										aria-label="删除"
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

							{editingId === t.id ? (
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
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
										<input
											className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
											type="time"
											value={editStartHHMM}
											onChange={(e) => setEditStartHHMM(e.target.value)}
										/>
										<input
											className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
											type="time"
											value={editEndHHMM}
											onChange={(e) => setEditEndHHMM(e.target.value)}
										/>
										<input
											className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
											type="number"
											min={0}
											max={1440}
											value={editRemindBeforeMin}
											onChange={(e) => setEditRemindBeforeMin(Number(e.target.value))}
											placeholder="提前提醒（分钟）"
										/>
									</div>
									<button
										className="rounded-xl bg-black text-white py-2 font-medium disabled:opacity-60"
										onClick={() => saveEdit(t)}
										disabled={!String(editTitle).trim()}
									>
										保存
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
