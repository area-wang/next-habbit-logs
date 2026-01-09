"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { utcMsForOffsetMidnight } from "@/lib/date";
import TimeSelect from "./time-select";

type Task = {
	id: string;
	title: string;
	description?: string | null;
	status: string;
	startMin?: number | null;
	endMin?: number | null;
	remindBeforeMin?: number | null;
};

type Habit = {
	id: string;
	title: string;
	description: string | null;
};

function shiftYmd(ymd: string, deltaDays: number) {
	const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return "";
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "";
	const baseUtc = Date.UTC(y, mo - 1, d, 0, 0, 0, 0);
	const next = new Date(baseUtc + deltaDays * 86400_000);
	return next.toISOString().slice(0, 10);
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
	habits,
	habitRemindersByHabitId,
	checkedHabitIds,
	dailyTaskNotesById,
}: {
	initialTasks: Task[];
	date: string;
	tzOffsetMin: number;
	habits?: Habit[];
	habitRemindersByHabitId?: Record<string, number[]>;
	checkedHabitIds?: string[];
	dailyTaskNotesById?: Record<string, string>;
}) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const isHistoryMode = useMemo(() => String(pathname || "").startsWith("/history"), [pathname]);
	const [tasks, setTasks] = useState<Task[]>(initialTasks);
	const [checkedHabitIdSet, setCheckedHabitIdSet] = useState<Set<string>>(() => new Set(checkedHabitIds || []));
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startHHMM, setStartHHMM] = useState("");
	const [endHHMM, setEndHHMM] = useState("");
	const [remindBeforeMin, setRemindBeforeMin] = useState(5);
	const [loading, setLoading] = useState(false);
	const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
	const [notifEnabled, setNotifEnabled] = useState(false);
	const [appNotifEnabled, setAppNotifEnabled] = useState(false);
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
	const [taskDailyNotesById, setTaskDailyNotesById] = useState<Record<string, string>>(dailyTaskNotesById || {});
	const [noteOpenTaskId, setNoteOpenTaskId] = useState<string | null>(null);
	const [noteDraft, setNoteDraft] = useState("");
	const [noteSaving, setNoteSaving] = useState(false);
	const [habitRemindersLiveByHabitId, setHabitRemindersLiveByHabitId] = useState<Record<string, number[]>>(
		habitRemindersByHabitId || {},
	);
	const [copyOpen, setCopyOpen] = useState(false);
	const [copyLoading, setCopyLoading] = useState(false);
	const [copyError, setCopyError] = useState<string | null>(null);
	const [yesterdayTasks, setYesterdayTasks] = useState<any[]>([]);
	const [selectedYesterdayTaskIds, setSelectedYesterdayTaskIds] = useState<Set<string>>(new Set());

	const doneCount = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);
	const todoCount = tasks.length - doneCount;
	const habitTodoCount = useMemo(() => {
		return (habits || []).filter((h) => !checkedHabitIdSet.has(h.id)).length;
	}, [habits, checkedHabitIdSet]);
	const effectiveNotifEnabled = notifEnabled && appNotifEnabled;

	useEffect(() => {
		setTasks(initialTasks);
	}, [initialTasks]);

	const yesterday = useMemo(() => shiftYmd(date, -1), [date]);

	useEffect(() => {
		if (!copyOpen) return;
		if (!yesterday) return;
		if (typeof window === "undefined") return;
		let canceled = false;
		setCopyError(null);
		setCopyLoading(true);
		void (async () => {
			try {
				const res = await fetch(
					`/api/tasks?scopeType=day&scopeKey=${encodeURIComponent(yesterday)}`,
					{ method: "GET", headers: { "content-type": "application/json" } },
				);
				if (!res.ok) {
					const d = (await res.json().catch(() => null)) as any;
					if (canceled) return;
					setCopyError(d?.error || "加载昨天任务失败");
					setYesterdayTasks([]);
					setSelectedYesterdayTaskIds(new Set());
					return;
				}
				const data = (await res.json().catch(() => null)) as any;
				const list = Array.isArray(data?.tasks) ? (data.tasks as any[]) : [];
				if (canceled) return;
				setYesterdayTasks(list);
				setSelectedYesterdayTaskIds(new Set(list.map((t) => String((t as any).id || "")).filter(Boolean)));
			} catch {
				if (canceled) return;
				setCopyError("加载昨天任务失败");
				setYesterdayTasks([]);
				setSelectedYesterdayTaskIds(new Set());
			} finally {
				if (!canceled) setCopyLoading(false);
			}
		})();
		return () => {
			canceled = true;
		};
	}, [copyOpen, yesterday]);

	function toggleSelectYesterdayTaskId(taskId: string) {
		setSelectedYesterdayTaskIds((prev) => {
			const next = new Set(prev);
			if (next.has(taskId)) next.delete(taskId);
			else next.add(taskId);
			return next;
		});
	}

	function selectAllYesterdayTasks() {
		setSelectedYesterdayTaskIds(new Set(yesterdayTasks.map((t) => String((t as any).id || "")).filter(Boolean)));
	}

	function clearAllYesterdayTasks() {
		setSelectedYesterdayTaskIds(new Set());
	}

	async function confirmCopyYesterdayTasks() {
		if (!yesterday) return;
		const ids = Array.from(selectedYesterdayTaskIds);
		if (ids.length === 0) {
			setCopyError("请先选择要复制的任务");
			return;
		}
		setCopyError(null);
		setCopyLoading(true);
		try {
			const res = await fetch("/api/tasks/copy", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ fromScopeKey: yesterday, toScopeKey: date, taskIds: ids }),
			});
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setCopyError(d?.error || "复制失败");
				return;
			}
			const data = (await res.json().catch(() => null)) as any;
			const created = Array.isArray(data?.createdTasks) ? (data.createdTasks as any[]) : [];
			const mapped: Task[] = created
				.map((t) => ({
					id: String((t as any).id),
					title: String((t as any).title || ""),
					description: (t as any).description == null ? null : String((t as any).description),
					status: String((t as any).status || "todo"),
					startMin: (t as any).start_min == null ? null : Number((t as any).start_min),
					endMin: (t as any).end_min == null ? null : Number((t as any).end_min),
					remindBeforeMin: (t as any).remind_before_min == null ? null : Number((t as any).remind_before_min),
				}))
				.filter((t) => t.id && t.title.trim());
			setTasks((prev) => [...mapped, ...prev]);
			setCopyOpen(false);
		} finally {
			setCopyLoading(false);
		}
	}

	useEffect(() => {
		if (typeof window === "undefined") return;
		function onHabitCheckinChanged(ev: Event) {
			const e = ev as CustomEvent<{ habitId?: string; checked?: boolean; date?: string }>;
			const habitId = String(e?.detail?.habitId || "");
			if (!habitId) return;
			const eventDate = e?.detail?.date;
			if (eventDate && String(eventDate) !== String(date)) return;
			const checked = e?.detail?.checked === true;
			setCheckedHabitIdSet((prev) => {
				const next = new Set(prev);
				if (checked) next.add(habitId);
				else next.delete(habitId);
				return next;
			});
		}
		window.addEventListener("habit-checkin-changed", onHabitCheckinChanged);
		return () => window.removeEventListener("habit-checkin-changed", onHabitCheckinChanged);
	}, [date]);

	useEffect(() => {
		setTaskDailyNotesById(dailyTaskNotesById || {});
	}, [dailyTaskNotesById]);

	useEffect(() => {
		setHabitRemindersLiveByHabitId(habitRemindersByHabitId || {});
	}, [habitRemindersByHabitId]);

	useEffect(() => {
		if (!effectiveNotifEnabled) return;
		if (typeof window === "undefined") return;
		const hs = habits || [];
		if (hs.length === 0) return;

		let canceled = false;
		void (async () => {
			try {
				const results = await Promise.all(
					hs.map(async (h) => {
						const habitId = String((h as any).id || "");
						if (!habitId) return { habitId: "", times: [] as number[] };
						const res = await fetch(`/api/habits/${encodeURIComponent(habitId)}/reminders`, {
							method: "GET",
							headers: { "content-type": "application/json" },
						});
						if (!res.ok) return { habitId, times: [] as number[] };
						const data = (await res.json().catch(() => null)) as any;
						const times = ((data?.reminders || []) as any[])
							.filter((x) => x && x.enabled !== false)
							.map((x) => (x?.timeMin == null ? null : Number(x.timeMin)))
							.filter((x) => x != null && Number.isFinite(x) && x >= 0 && x <= 1439) as number[];
						return { habitId, times: Array.from(new Set(times)).sort((a, b) => a - b) };
					}),
				);
				if (canceled) return;
				setHabitRemindersLiveByHabitId((prev) => {
					const next: Record<string, number[]> = { ...prev };
					for (const r of results) {
						if (!r.habitId) continue;
						next[r.habitId] = r.times;
					}
					return next;
				});
			} catch {
				// ignore
			}
		})();

		return () => {
			canceled = true;
		};
	}, [effectiveNotifEnabled, habits]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const focus = searchParams.get("focus") || "";
		if (!focus.startsWith("task:")) return;
		const taskId = focus.slice("task:".length);
		if (!taskId) return;
		setHighlightTaskId(taskId);

		let tries = 0;
		function esc(v: string) {
			try {
				return (window as any).CSS?.escape ? (window as any).CSS.escape(v) : v.replace(/"/g, "\\\"");
			} catch {
				return v;
			}
		}
		function tryScroll() {
			const el = document.querySelector(`[data-task-id="${esc(taskId)}"]`) as HTMLElement | null;
			if (el) {
				el.scrollIntoView({ behavior: "smooth", block: "center" });
				return;
			}
			if (tries++ < 12) window.requestAnimationFrame(tryScroll);
		}
		tryScroll();

		const id = window.setTimeout(() => setHighlightTaskId(null), 2500);
		return () => window.clearTimeout(id);
	}, [searchParams]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const ok = "Notification" in window;
		setSupportsNotification(ok);
		if (!ok) {
			setNotifStatus("unsupported");
			return;
		}
		const perm = Notification.permission;
		const granted = perm === "granted";
		setNotifEnabled(granted);
		setNotifStatus(perm === "granted" ? "granted" : perm === "denied" ? "denied" : "default");
		try {
			const raw = window.localStorage.getItem("front_notif_enabled");
			if (raw === "1") setAppNotifEnabled(true);
			else if (raw === "0") setAppNotifEnabled(false);
			else setAppNotifEnabled(granted);
		} catch {
			setAppNotifEnabled(granted);
		}
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			window.localStorage.setItem("front_notif_enabled", appNotifEnabled ? "1" : "0");
		} catch {
			// ignore
		}
	}, [appNotifEnabled]);

	useEffect(() => {
		if (!effectiveNotifEnabled) {
			setScheduleSummary(null);
			return;
		}
		if (typeof window === "undefined") return;
		timersRef.current.forEach((id) => window.clearTimeout(id));
		timersRef.current = [];

		const base = utcMsForOffsetMidnight(date, tzOffsetMin);
		const now = Date.now();
		let scheduled = 0;
		let scheduledTasks = 0;
		let scheduledHabits = 0;
		let nextAt = Number.POSITIVE_INFINITY;

		for (const t of tasks) {
			if (t.status !== "todo") continue;
			if (t.startMin == null) continue;
			const before = t.remindBeforeMin == null ? 5 : Number(t.remindBeforeMin);
			const at = base + (Number(t.startMin) - before) * 60_000;
			if (!Number.isFinite(at) || at <= now) continue;
			const delay = at - now;
			const id = window.setTimeout(() => {
				const basePath = isHistoryMode ? "/history" : "/today";
				const url = `${basePath}?date=${encodeURIComponent(date)}&focus=task:${encodeURIComponent(t.id)}`;
				const title = "爱你老己：即将开始";
				const body = `${t.title}（还有 ${before} 分钟）`;
				const browserOptions = {
					body,
				} as NotificationOptions;
				const swOptions = {
					body,
					data: { url },
				} as NotificationOptions;
				void (async () => {
					try {
						const n = new Notification(title, browserOptions);
						n.onclick = () => {
							try {
								window.location.assign(url);
							} catch {
								// ignore
							}
						};
						return;
					} catch {
						// ignore
					}
					try {
						const reg = await withTimeout(getReadyServiceWorker(), 15_000, "service_worker_ready_timeout");
						await reg.showNotification(title, swOptions);
						return;
					} catch {
						// ignore
					}
				})();
			}, delay);
			timersRef.current.push(id);
			scheduled += 1;
			scheduledTasks += 1;
			if (at < nextAt) nextAt = at;
		}

		for (const h of habits || []) {
			if (checkedHabitIdSet.has(h.id)) continue;
			const times = (habitRemindersLiveByHabitId && habitRemindersLiveByHabitId[h.id]) || [];
			for (const timeMin of times) {
				const at = base + Number(timeMin) * 60_000;
				if (!Number.isFinite(at) || at <= now) continue;
				const delay = at - now;
				const id = window.setTimeout(() => {
					const basePath = isHistoryMode ? "/history" : "/today";
					const url = `${basePath}?date=${encodeURIComponent(date)}&focus=habit:${encodeURIComponent(h.id)}`;
					const title = "爱你老己：习惯提醒";
					const body = h.title;
					const browserOptions = {
						body,
					} as NotificationOptions;
					const swOptions = {
						body,
						data: { url },
					} as NotificationOptions;
					void (async () => {
						try {
							const n = new Notification(title, browserOptions);
							n.onclick = () => {
								try {
									window.location.assign(url);
								} catch {
									// ignore
								}
							};
							return;
						} catch {
							// ignore
						}
						try {
							const reg = await withTimeout(getReadyServiceWorker(), 15_000, "service_worker_ready_timeout");
							await reg.showNotification(title, swOptions);
							return;
						} catch {
							// ignore
						}
					})();
				}, delay);
				timersRef.current.push(id);
				scheduled += 1;
				scheduledHabits += 1;
				if (at < nextAt) nextAt = at;
			}
		}

		if (scheduled === 0) {
			setScheduleSummary("未安排提醒：需要任务处于待办、设置开始时间，且提醒时间在未来");
		} else {
			setScheduleSummary(
				`已安排 ${scheduled} 个提醒（任务 ${scheduledTasks} | 习惯 ${scheduledHabits}），最近一次：${new Date(nextAt).toLocaleString()}`,
			);
		}

		return () => {
			timersRef.current.forEach((id) => window.clearTimeout(id));
			timersRef.current = [];
		};
	}, [date, tzOffsetMin, effectiveNotifEnabled, tasks, habits, habitRemindersLiveByHabitId, checkedHabitIdSet, isHistoryMode]);

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
			setAppNotifEnabled(ok);
			setNotifStatus(ok ? "granted" : perm === "denied" ? "denied" : "default");
			if (ok) {
				try {
					new Notification("提醒已开启", { body: "将在设置时间弹出系统通知" });
				} catch {
					setNotifMessage("已开启，但当前浏览器阻止了测试通知（不影响后续提醒）");
				}
			} else if (perm === "denied") {
				setNotifMessage("通知权限被拒绝：请在浏览器设置中允许通知");
			}
		} catch {
			setNotifStatus("error");
			setNotifEnabled(false);
			setAppNotifEnabled(false);
			setNotifMessage("请求通知权限失败（可能是非 HTTPS 或浏览器限制）");
		}
	}

	async function toggleNotifications() {
		if (typeof window === "undefined") return;
		setNotifMessage(null);
		if (!supportsNotification) return;
		if (notifStatus === "prompting") return;
		if (effectiveNotifEnabled) {
			setAppNotifEnabled(false);
			setNotifMessage("已关闭前台提醒（浏览器通知权限仍为允许）");
			return;
		}
		if (notifEnabled) {
			setAppNotifEnabled(true);
			return;
		}
		await enableNotifications();
	}

	function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const id = window.setTimeout(() => reject(new Error(label)), ms);
			p.then(
				(v) => {
					window.clearTimeout(id);
					resolve(v);
				},
				(e) => {
					window.clearTimeout(id);
					reject(e);
				},
			);
		});
	}

	async function getReadyServiceWorker() {
		const existing = await navigator.serviceWorker.getRegistration();
		if (!existing) {
			await navigator.serviceWorker.register("/sw.js");
		}
		return navigator.serviceWorker.ready;
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
		const title = String(editTitle).trim().slice(0, 50);
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
		const safeTitle = String(title).trim().slice(0, 50);
		if (!safeTitle) return;
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
					title: safeTitle,
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
							title: safeTitle,
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
		await fetch(`/api/tasks/${task.id}` , {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ status: next }),
		});
	}

	function openNote(taskId: string) {
		setNoteOpenTaskId(taskId);
		setNoteDraft(taskDailyNotesById[taskId] || "");
	}

	async function saveNote() {
		if (!noteOpenTaskId) return;
		setNoteSaving(true);
		try {
			const itemId = noteOpenTaskId;
			const res = await fetch("/api/daily-item-notes", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ date, itemType: "task", itemId, note: noteDraft }),
			});
			if (res.ok) {
				const next = String(noteDraft || "").trim();
				setTaskDailyNotesById((prev) => {
					const copy = { ...prev };
					if (!next) delete copy[itemId];
					else copy[itemId] = next;
					return copy;
				});
				setNoteOpenTaskId(null);
			}
		} finally {
			setNoteSaving(false);
		}
	}

	return (
		<div className="space-y-3">
			<div className="flex justify-between sm:items-end sm:justify-between">
				<div>
					<h2 className="text-lg font-semibold">{isHistoryMode ? "当日计划" : "今日计划"}</h2>
					<div className="text-sm opacity-70">轻量Todo 支持时间段与提醒</div>
				</div>
				<div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
					{!isHistoryMode ? (
						<Dialog.Root open={copyOpen} onOpenChange={setCopyOpen}>
							<Dialog.Trigger asChild>
								<button
									className="text-sm px-3 py-1 rounded-full border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors cursor-pointer"
									type="button"
								>
									复制昨天计划
								</button>
							</Dialog.Trigger>
							<Dialog.Portal>
								<Dialog.Overlay className="fixed inset-0 bg-black/60" />
								<Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--background)] shadow-xl p-4">
									<Dialog.Title className="font-semibold">复制昨天计划</Dialog.Title>
									<div className="text-sm opacity-70 mt-1">选择要复制到今天（{date}）的任务</div>
									<div className="text-sm opacity-70 mt-1">来源日期：{yesterday || "-"}</div>

									<div className="mt-4 flex items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<button
												className="h-9 px-3 rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors"
												onClick={selectAllYesterdayTasks}
												type="button"
												disabled={copyLoading || yesterdayTasks.length === 0}
											>
												全选
											</button>
											<button
												className="h-9 px-3 rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors"
												onClick={clearAllYesterdayTasks}
												type="button"
												disabled={copyLoading || yesterdayTasks.length === 0}
											>
												全不选
											</button>
										</div>
										<div className="text-xs opacity-70">
											已选 {selectedYesterdayTaskIds.size}/{yesterdayTasks.length}
										</div>
									</div>

									{copyError ? <div className="text-sm text-red-600 dark:text-red-400 mt-3">{copyError}</div> : null}

									<div className="mt-3 max-h-[45vh] overflow-auto rounded-xl border border-[color:var(--border-color)]">
										{copyLoading ? (
											<div className="p-4 text-sm opacity-70">加载中...</div>
										) : yesterdayTasks.length === 0 ? (
											<div className="p-4 text-sm opacity-70">昨天没有任务可复制</div>
										) : (
											<div className="divide-y divide-[color:var(--border-color)]">
												{yesterdayTasks.map((t) => {
													const id = String((t as any).id || "");
													const title = String((t as any).title || "");
													const status = String((t as any).status || "todo");
													const startMin = (t as any).start_min == null ? null : Number((t as any).start_min);
													const endMin = (t as any).end_min == null ? null : Number((t as any).end_min);
													const rbm = (t as any).remind_before_min == null ? null : Number((t as any).remind_before_min);
													const checked = !!id && selectedYesterdayTaskIds.has(id);
													return (
														<label key={id} className="flex items-start gap-3 p-3 cursor-pointer">
															<input
																type="checkbox"
																checked={checked}
																onChange={() => toggleSelectYesterdayTaskId(id)}
																disabled={!id || copyLoading}
																className="mt-1"
															/>
															<div className="min-w-0 flex-1">
																<div className="font-medium truncate">
																	{title}
																	{status === "done" ? <span className="text-xs opacity-60">（昨天已完成）</span> : null}
																</div>
																{startMin != null || endMin != null ? (
																	<div className="text-sm opacity-70 mt-1">
																		{minToHHMM(startMin)}{endMin != null ? ` - ${minToHHMM(endMin)}` : ""}
																		{rbm != null ? <span>{` | 提前 ${rbm} 分钟`}</span> : null}
																	</div>
																) : null}
															</div>
														</label>
													);
												})}
											</div>
										)}
									</div>

									<div className="mt-4 flex items-center justify-end gap-2">
										<Dialog.Close asChild>
											<button
												className="h-10 px-3 rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors"
												disabled={copyLoading}
												type="button"
											>
												取消
											</button>
										</Dialog.Close>
										<button
											className="h-10 px-3 rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] border border-[color:var(--foreground)] hover:opacity-90 transition-opacity disabled:opacity-60"
											onClick={confirmCopyYesterdayTasks}
											disabled={copyLoading || selectedYesterdayTaskIds.size === 0}
											type="button"
										>
											{copyLoading ? "复制中..." : "复制到今天"}
										</button>
									</div>
								</Dialog.Content>
							</Dialog.Portal>
						</Dialog.Root>
					) : null}
					<div className="text-sm opacity-70 leading-tight sm:text-right">
						待办 {todoCount + habitTodoCount}
						{habits && habits.length > 0 ? `（任务 ${todoCount} | 习惯 ${habitTodoCount}）` : ""}
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border-color)] px-4 py-3">
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
										? effectiveNotifEnabled
											? "状态：已开启"
											: "状态：已关闭"
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
				<div className="flex flex-shrink-0 flex-col gap-2 items-end">
					<button
						className={`flex-shrink-0 text-sm px-3 py-1 rounded-full border transition-colors cursor-pointer ${
							effectiveNotifEnabled
								? "bg-[color:var(--foreground)] text-[color:var(--background)] border-[color:var(--foreground)]"
								: "border-[color:var(--border-color)] hover:bg-[color:var(--surface)]"
						}`}
						onClick={toggleNotifications}
						disabled={!supportsNotification || notifStatus === "prompting"}
					>
						{!supportsNotification
							? "不支持"
							: notifStatus === "prompting"
								? "请求中..."
								: effectiveNotifEnabled
									? "关闭提醒"
									: "开启提醒"}
					</button>
				</div>
			</div>

			<div className="flex gap-2">
				<input
					className="flex-1 rounded-xl border border-[color:var(--border-color)] bg-transparent px-3 py-2 outline-none"
					placeholder={isHistoryMode ? "新增一个任务..." : "新增一个今日任务..."}
					value={title}
					onChange={(e) => setTitle(e.target.value.slice(0, 50))}
					maxLength={50}
					disabled={loading}
				/>
				<button
					className="rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] px-4 font-medium disabled:opacity-60"
					onClick={create}
					disabled={loading || !title.trim()}
				>
					添加
				</button>
			</div>

			<textarea
				className="w-full rounded-xl border border-[color:var(--border-color)] bg-transparent px-3 py-2 outline-none"
				placeholder="备注/正文（可选）"
				value={description}
				onChange={(e) => setDescription(e.target.value)}
				disabled={loading}
				rows={2}
			/>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				<TimeSelect value={startHHMM} onChange={setStartHHMM} placeholder="开始" />
				<TimeSelect value={endHHMM} onChange={setEndHHMM} placeholder="结束" />
				<input
					className="w-full h-10 text-sm rounded-xl border border-[color:var(--border-color)] bg-transparent px-3 outline-none"
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
				<div className="text-sm opacity-70">{isHistoryMode ? "还没有任务。" : "还没有今日任务。"}</div>
			) : (
				<div className="space-y-2">
					{tasks.map((t) => (
						<div
							key={t.id}
							data-task-id={t.id}
							className={`w-full rounded-xl border border-[color:var(--border-color)] px-4 py-3 transition-colors ${
								t.status === "done" ? "bg-[color:var(--surface-strong)]" : "hover:bg-[color:var(--surface)]"
							} ${highlightTaskId === t.id ? "ring-2 ring-violet-500/80" : ""}`}
						>
							<div className="flex items-start justify-between gap-4">
								<label className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
									<input
										type="checkbox"
										checked={t.status === "done"}
										onChange={() => toggle(t)}
										className="mt-1"
									/>
									<div className="min-w-0 flex-1">
										<div className={`font-medium break-words whitespace-normal ${t.status === "done" ? "opacity-90" : ""}`}>{t.title}</div>
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
								<div className="flex items-center gap-2 flex-shrink-0 ml-auto">
									{t.status !== "done" || taskDailyNotesById[t.id] ? (
										<button
											className={`h-9 w-9 inline-flex items-center justify-center rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors cursor-pointer ${
												taskDailyNotesById[t.id] ? "bg-[color:var(--surface)]" : ""
											}`}
											onClick={() => openNote(t.id)}
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
										className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors cursor-pointer"
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
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
										<TimeSelect value={editStartHHMM} onChange={setEditStartHHMM} placeholder="开始" />
										<TimeSelect value={editEndHHMM} onChange={setEditEndHHMM} placeholder="结束" />
										<input
											className="w-full h-10 text-sm rounded-xl border border-[color:var(--border-color)] bg-transparent px-3 outline-none"
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
											className="flex-1 h-10 px-3 rounded-xl border border-[color:var(--border-color)] hover:bg-[color:var(--surface)] transition-colors"
											onClick={() => setEditingId(null)}
											type="button"
										>
											取消
										</button>
										<button
											className="flex-1 rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] py-2 font-medium disabled:opacity-60"
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
					))}
				</div>
			)}

			<Dialog.Root open={!!noteOpenTaskId} onOpenChange={(open) => (!open ? setNoteOpenTaskId(null) : null)}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/60" />
					<Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--background)] shadow-xl p-4">
						<Dialog.Title className="font-semibold">未完成原因/备注</Dialog.Title>
						<div className="text-sm opacity-70 mt-1">只和当天的任务关联，不会修改任务本身的描述。</div>
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
								className="h-10 px-3 rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] border border-[color:var(--foreground)] hover:opacity-90 transition-opacity disabled:opacity-60"
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
