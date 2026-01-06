"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { utcMsForOffsetMidnight } from "@/lib/date";

type Task = {
	id: string;
	title: string;
	description?: string | null;
	status: string;
	startMin?: number | null;
	endMin?: number | null;
	remindBeforeMin?: number | null;
};

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

function minToHHMM(v: number | null | undefined) {
	if (v == null) return "";
	const h = Math.floor(v / 60);
	const m = v % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function TaskList({
	initialTasks,
	date,
	tzOffsetMin,
}: {
	initialTasks: Task[];
	date: string;
	tzOffsetMin: number;
}) {
	const [tasks, setTasks] = useState<Task[]>(initialTasks);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startHHMM, setStartHHMM] = useState("");
	const [endHHMM, setEndHHMM] = useState("");
	const [remindBeforeMin, setRemindBeforeMin] = useState(5);
	const [loading, setLoading] = useState(false);
	const [notifEnabled, setNotifEnabled] = useState(false);
	const [supportsNotification, setSupportsNotification] = useState(false);
	const [notifStatus, setNotifStatus] = useState<
		"unsupported" | "unknown" | "default" | "prompting" | "granted" | "denied" | "error"
	>("unknown");
	const [notifMessage, setNotifMessage] = useState<string | null>(null);
	const [scheduleSummary, setScheduleSummary] = useState<string | null>(null);
	const timersRef = useRef<number[]>([]);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editStartHHMM, setEditStartHHMM] = useState("");
	const [editEndHHMM, setEditEndHHMM] = useState("");
	const [editRemindBeforeMin, setEditRemindBeforeMin] = useState(5);

	const doneCount = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);
	const todoCount = tasks.length - doneCount;

	useEffect(() => {
		if (typeof window === "undefined") return;
		const ok = "Notification" in window;
		setSupportsNotification(ok);
		if (!ok) {
			setNotifStatus("unsupported");
			return;
		}
		const perm = Notification.permission;
		setNotifEnabled(perm === "granted");
		setNotifStatus(perm === "granted" ? "granted" : perm === "denied" ? "denied" : "default");
	}, []);

	useEffect(() => {
		if (!notifEnabled) {
			setScheduleSummary(null);
			return;
		}
		if (typeof window === "undefined") return;
		timersRef.current.forEach((id) => window.clearTimeout(id));
		timersRef.current = [];

		const base = utcMsForOffsetMidnight(date, tzOffsetMin);
		const now = Date.now();
		let scheduled = 0;
		let nextAt = Number.POSITIVE_INFINITY;

		for (const t of tasks) {
			if (t.status !== "todo") continue;
			if (t.startMin == null) continue;
			const before = t.remindBeforeMin == null ? 5 : Number(t.remindBeforeMin);
			const at = base + (Number(t.startMin) - before) * 60_000;
			if (!Number.isFinite(at) || at <= now) continue;
			const delay = at - now;
			const id = window.setTimeout(() => {
				try {
					new Notification("爱你老己：即将开始", {
						body: `${t.title}（还有 ${before} 分钟）`,
					});
				} catch {
					// ignore
				}
			}, delay);
			timersRef.current.push(id);
			scheduled += 1;
			if (at < nextAt) nextAt = at;
		}

		if (scheduled === 0) {
			setScheduleSummary("未安排提醒：需要任务处于待办、设置开始时间，且提醒时间在未来");
		} else {
			setScheduleSummary(`已安排 ${scheduled} 个提醒，最近一次：${new Date(nextAt).toLocaleString()}`);
		}

		return () => {
			timersRef.current.forEach((id) => window.clearTimeout(id));
			timersRef.current = [];
		};
	}, [date, tzOffsetMin, notifEnabled, tasks]);

	async function enableNotifications() {
		if (typeof window === "undefined") return;
		setNotifMessage(null);
		if (!("Notification" in window)) {
			setNotifStatus("unsupported");
			setNotifMessage("当前环境不支持系统通知");
			return;
		}
		try {
			setNotifStatus("prompting");
			const perm = await Notification.requestPermission();
			const ok = perm === "granted";
			setNotifEnabled(ok);
			setNotifStatus(ok ? "granted" : perm === "denied" ? "denied" : "default");
			if (ok) {
				try {
					new Notification("提醒已开启", { body: "将在任务开始前按设置时间提醒你" });
				} catch {
					setNotifMessage("已开启，但当前浏览器阻止了测试通知（不影响后续提醒）");
				}
			} else if (perm === "denied") {
				setNotifMessage("通知权限被拒绝：请在浏览器设置中允许通知");
			}
		} catch {
			setNotifStatus("error");
			setNotifEnabled(false);
			setNotifMessage("请求通知权限失败（可能是非 HTTPS 或浏览器限制）");
		}
	}

	async function deleteTask(task: Task) {
		const ok = window.confirm(`确定删除任务「${task.title}」吗？`);
		if (!ok) return;
		setTasks((prev) => prev.filter((t) => t.id !== task.id));
		await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
	}

	function beginEdit(task: Task) {
		setEditingId(task.id);
		setEditTitle(task.title);
		setEditDescription(task.description ? String(task.description) : "");
		setEditStartHHMM(minToHHMM(task.startMin));
		setEditEndHHMM(minToHHMM(task.endMin));
		setEditRemindBeforeMin(task.remindBeforeMin == null ? 5 : Number(task.remindBeforeMin));
	}

	async function saveEdit(task: Task) {
		const title = String(editTitle).trim();
		if (!title) return;
		const startMin = hhmmToMin(editStartHHMM);
		const endMin = hhmmToMin(editEndHHMM);
		const rbm = Number.isFinite(editRemindBeforeMin) ? editRemindBeforeMin : null;
		const desc = String(editDescription || "").trim();

		setTasks((prev) =>
			prev.map((t) =>
				t.id === task.id
					? {
							...t,
							title,
							description: desc ? desc : null,
							startMin,
							endMin,
							remindBeforeMin: rbm,
						}
					: t,
			),
		);

		setEditingId(null);
		await fetch(`/api/tasks/${task.id}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title, description: desc ? desc : null, startMin, endMin, remindBeforeMin: rbm }),
		});
	}

	async function create() {
		if (!title.trim()) return;
		setLoading(true);
		try {
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
					scopeType: "day",
					scopeKey: date,
					startMin,
					endMin,
					remindBeforeMin: rbm,
				}),
			});
			if (res.ok) {
				setTitle("");
				setDescription("");
				setStartHHMM("");
				setEndHHMM("");
				const data = (await res.json().catch(() => null)) as any;
				const id = String(data?.taskId || "");
				if (id)
					setTasks((prev) => [
						{
							id,
							title: title.trim(),
							description: desc ? desc : null,
							status: "todo",
							startMin,
							endMin,
							remindBeforeMin: rbm,
						},
						...prev,
					]);
			}
		} finally {
			setLoading(false);
		}
	}

	async function toggle(task: Task) {
		const next = task.status === "done" ? "todo" : "done";
		setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
		await fetch(`/api/tasks/${task.id}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ status: next }),
		});
	}

	return (
		<div className="space-y-3">
			<div className="flex items-end justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold">今日计划</h2>
					<div className="text-sm opacity-70">轻量 Todo（点击切换完成）。支持时间段与提醒。</div>
				</div>
				<div className="text-sm opacity-70">待办 {todoCount} | 已完成 {doneCount}/{tasks.length}</div>
			</div>

			<div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 dark:border-white/15 px-4 py-3">
				<div className="text-sm">
					<div className="font-medium">提醒</div>
					<div className="text-xs opacity-70 mt-1">开启后，会在任务开始前 N 分钟弹出系统通知。</div>
					<div className="text-xs mt-1 opacity-80">
						{!supportsNotification
							? "状态：不支持"
							: notifStatus === "unknown"
								? "状态：检查中..."
								: notifStatus === "prompting"
									? "状态：正在请求权限..."
									: notifStatus === "granted"
										? "状态：已开启"
										: notifStatus === "denied"
											? "状态：被拒绝"
											: notifStatus === "error"
												? "状态：失败"
												: "状态：未开启"}
					</div>
					{!supportsNotification ? <div className="text-xs mt-1 opacity-80">当前浏览器不支持系统通知</div> : null}
					{notifMessage ? <div className="text-xs mt-1 opacity-80">{notifMessage}</div> : null}
					{scheduleSummary ? <div className="text-xs mt-1 opacity-80">{scheduleSummary}</div> : null}
				</div>
				<button
					className={`text-sm px-3 py-1 rounded-full border transition-colors cursor-pointer ${
						notifEnabled
							? "bg-black text-white border-black"
							: "border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
					}`}
					onClick={enableNotifications}
					disabled={!supportsNotification || notifEnabled || notifStatus === "prompting"}
				>
					{!supportsNotification ? "不支持" : notifEnabled ? "已开启" : notifStatus === "prompting" ? "请求中..." : "开启提醒"}
				</button>
			</div>

			<div className="flex gap-2">
				<input
					className="flex-1 rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
					placeholder="新增一个今日任务..."
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					disabled={loading}
				/>
				<button
					className="rounded-xl bg-black text-white px-4 font-medium disabled:opacity-60"
					onClick={create}
					disabled={loading || !title.trim()}
				>
					添加
				</button>
			</div>

			<textarea
				className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
				placeholder="备注/正文（可选）"
				value={description}
				onChange={(e) => setDescription(e.target.value)}
				disabled={loading}
				rows={2}
			/>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				<input
					className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
					type="time"
					value={startHHMM}
					onChange={(e) => setStartHHMM(e.target.value)}
					disabled={loading}
					placeholder="开始"
				/>
				<input
					className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
					type="time"
					value={endHHMM}
					onChange={(e) => setEndHHMM(e.target.value)}
					disabled={loading}
					placeholder="结束"
				/>
				<input
					className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
					type="number"
					min={0}
					max={1440}
					value={remindBeforeMin}
					onChange={(e) => setRemindBeforeMin(Number(e.target.value))}
					disabled={loading}
					placeholder="提前提醒（分钟）"
				/>
			</div>

			{tasks.length === 0 ? (
				<div className="text-sm opacity-70">还没有今日任务。</div>
			) : (
				<div className="space-y-2">
					{tasks.map((t) => (
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
										onChange={() => toggle(t)}
										className="mt-1"
									/>
									<div className="min-w-0">
										<div className={`font-medium truncate ${t.status === "done" ? "opacity-90" : ""}`}>{t.title}</div>
										{t.description ? (
											<div className={`text-sm mt-1 ${t.status === "done" ? "opacity-90" : "opacity-70"}`}>{t.description}</div>
										) : null}
										{t.startMin != null || t.endMin != null ? (
											<div className={`text-sm mt-1 ${t.status === "done" ? "opacity-90" : "opacity-70"}`}>
												{minToHHMM(t.startMin)}{t.endMin != null ? ` - ${minToHHMM(t.endMin)}` : ""}
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
										className="w-full rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
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
					))}
				</div>
			)}
		</div>
	);
}
