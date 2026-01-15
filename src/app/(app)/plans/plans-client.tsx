"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { isoWeekKeyInOffset, yInOffset, ymInOffset, ymdInOffset } from "@/lib/date";
import TimeSelect from "../today/time-select";
import ConfirmDialog from "@/components/confirm-dialog";

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
	const [showCreateForm, setShowCreateForm] = useState(false);
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
	const [confirmDeleteTask, setConfirmDeleteTask] = useState<Task | null>(null);
	const createFormRef = useRef<HTMLDivElement>(null);
	const editFormRefs = useRef<Record<string, HTMLDivElement | null>>({});

	// 点击外部关闭表单
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			
			// 检查创建表单
			if (showCreateForm && createFormRef.current && !createFormRef.current.contains(target)) {
				const isPortalClick = (target as Element).closest('[role="dialog"], [role="listbox"]');
				if (!isPortalClick) {
					setShowCreateForm(false);
					setTitle("");
					setDescription("");
					setStartHHMM("");
					setEndHHMM("");
					setRemindBeforeMin(5);
				}
			}
			
			// 检查编辑表单
			if (editingId) {
				const editFormRef = editFormRefs.current[editingId];
				if (editFormRef && !editFormRef.contains(target)) {
					const isPortalClick = (target as Element).closest('[role="dialog"], [role="listbox"]');
					if (!isPortalClick) {
						setEditingId(null);
					}
				}
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showCreateForm, editingId]);

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
			setShowCreateForm(false); // 创建成功后收起表单
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
				const el = document.querySelector(`[data-task-id=\"${esc(task.id)}\"]`) as HTMLElement | null;
				if (el) {
					el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
					return;
				}
				if (tries++ < 12) window.requestAnimationFrame(tryScroll);
			}
			window.requestAnimationFrame(tryScroll);
		}
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
		setTasks((prev) => prev.filter((t) => t.id !== task.id));
		await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
		setConfirmDeleteTask(null);
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
							scopeType === x.k
								? "bg-purple-600 text-white border-purple-600"
								: "border-black/10 hover:bg-black/5"
						}`}
						onClick={() => setScopeType(x.k)}
						disabled={loading}
					>
						{x.label}
					</button>
				))}
			</div>

			<div>
				{!showCreateForm ? (
					<button
						className="w-full px-4 py-3 rounded-2xl border border-dashed border-black/20 hover:border-purple-400 hover:bg-purple-50 transition-colors text-sm font-medium text-purple-600 flex items-center justify-center gap-2"
						onClick={() => setShowCreateForm(true)}
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
							<path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						新增计划
					</button>
				) : (
					<div ref={createFormRef} className="rounded-2xl border-2 border-purple-400 p-4 bg-purple-50/30">
						<div className="flex items-end justify-between gap-4">
							<div>
								<div className="font-semibold text-purple-700">新任务</div>
								<div className="text-sm opacity-70 mt-1">范围：{scopeType} / {hydrated ? scopeKey : "-"}</div>
							</div>
							<div className="text-sm opacity-70">已完成 {doneCount}/{tasks.length}</div>
						</div>

						<div className="mt-4 grid gap-3">
							<input
								className="w-full h-10 text-sm rounded-xl border border-black/10 bg-transparent px-3 outline-none"
								placeholder="例如：写 1 页周总结"
								value={title}
								onChange={(e) => setTitle(e.target.value.slice(0, 50))}
								maxLength={50}
								disabled={loading}
							/>
							<textarea
								className="w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none"
								placeholder="正文/备注（可选）"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								disabled={loading}
								rows={2}
							/>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								<label className="block">
									<div className="text-xs opacity-70 mb-1">开始时间</div>
									<TimeSelect value={startHHMM} onChange={setStartHHMM} placeholder="例如：09:00" stepMin={5} disabled={loading} />
								</label>
								<label className="block">
									<div className="text-xs opacity-70 mb-1">结束时间</div>
									<TimeSelect value={endHHMM} onChange={setEndHHMM} placeholder="例如：18:00" stepMin={5} disabled={loading} />
								</label>
								<label className="block">
									<div className="text-xs opacity-70 mb-1">提前提醒（分钟）</div>
									<input
										className="w-full h-10 text-sm rounded-xl border border-black/10 bg-transparent px-3 outline-none"
										type="number"
										min={0}
										max={1440}
										value={remindBeforeMin}
										onChange={(e) => setRemindBeforeMin(Number(e.target.value))}
										disabled={loading}
									/>
								</label>
							</div>
							{error ? <div className="text-sm text-red-600">{error}</div> : null}
							<div className="flex gap-2">
								<button
									className="flex-1 h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors text-sm"
									onClick={() => {
										setShowCreateForm(false);
										setTitle("");
										setDescription("");
										setStartHHMM("");
										setEndHHMM("");
										setRemindBeforeMin(5);
									}}
									disabled={loading}
								>
									取消
								</button>
								<button
									className="flex-1 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
									onClick={create}
									disabled={loading || !title.trim()}
								>
									{loading ? "创建中..." : "创建"}
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="space-y-2">
				{tasks.length === 0 ? (
					<div className="text-sm opacity-70">还没有任务。</div>
				) : (
					tasks.map((t) => (
						<div
							key={t.id}
							data-task-id={t.id}
							className={`w-full rounded-xl border px-4 py-3 transition-colors ${
								t.status === "done"
									? "border-black/25 bg-black/5"
									: "border-black/10 hover:bg-black/5"
							}`}
						>
							<div className="flex items-start justify-between gap-4">
								<label className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
									<input
										type="checkbox"
										checked={t.status === "done"}
										onChange={() => toggleDone(t)}
										className="mt-1"
									/>
									<div className="min-w-0 flex-1">
										<div className={`font-medium break-words whitespace-normal ${t.status === "done" ? "line-through opacity-90" : ""}`}>{t.title}</div>
										{t.description ? <div className={`text-sm mt-1 ${t.status === "done" ? "opacity-90" : "opacity-70"}`}>{t.description}</div> : null}
										{t.start_min != null || t.end_min != null ? (
											<div className={`text-sm mt-1 ${t.status === "done" ? "opacity-90" : "opacity-70"}`}>
												{minToHHMM(t.start_min)}{t.end_min != null ? ` - ${minToHHMM(t.end_min)}` : ""}
											</div>
										) : null}
									</div>
								</label>
								<div className="flex items-center gap-2 flex-shrink-0 ml-auto">
									<button
										className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 transition-colors cursor-pointer"
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
										className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-black/10 hover:bg-black/5 transition-colors cursor-pointer"
										onClick={() => setConfirmDeleteTask(t)}
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
								<div ref={(el) => { if (el) editFormRefs.current[t.id] = el; }} className="mt-3 grid gap-2 p-3 rounded-xl border-2 border-purple-400 bg-purple-50/30">
									<input
										className="w-full h-10 text-sm rounded-xl border border-black/10 bg-transparent px-3 outline-none"
										value={editTitle}
										onChange={(e) => setEditTitle(e.target.value.slice(0, 50))}
										placeholder="标题"
										maxLength={50}
									/>
									<textarea
										className="w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 outline-none"
										value={editDescription}
										onChange={(e) => setEditDescription(e.target.value)}
										placeholder="正文/备注（可选）"
										rows={2}
									/>
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
										<TimeSelect value={editStartHHMM} onChange={setEditStartHHMM} placeholder="开始时间" stepMin={5} />
										<TimeSelect value={editEndHHMM} onChange={setEditEndHHMM} placeholder="结束时间" stepMin={5} />
										<input
											className="w-full h-10 text-sm rounded-xl border border-black/10 bg-transparent px-3 outline-none"
											type="number"
											min={0}
											max={1440}
											value={editRemindBeforeMin}
											onChange={(e) => setEditRemindBeforeMin(Number(e.target.value))}
											placeholder="提前提醒（分钟）"
										/>
									</div>
									<div className="flex items-center gap-2">
										<button
											className="flex-1 h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors"
											onClick={() => setEditingId(null)}
											type="button"
										>
											取消
										</button>
										<button
											className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
											onClick={() => saveEdit(t)}
											disabled={!String(editTitle).trim()}
											type="button"
										>
											保存
										</button>
									</div>
								</div>
							) : null}
						</div>
					))
				)}
			</div>

			<ConfirmDialog
				open={confirmDeleteTask !== null}
				onOpenChange={(open) => !open && setConfirmDeleteTask(null)}
				title="确认删除"
				description={`确定删除任务「${confirmDeleteTask?.title}」吗？`}
				confirmText="删除"
				onConfirm={() => confirmDeleteTask && deleteTask(confirmDeleteTask)}
				variant="danger"
			/>
		</div>
	);
}
