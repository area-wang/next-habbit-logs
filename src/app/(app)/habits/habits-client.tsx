"use client";

import * as Popover from "@radix-ui/react-popover";
import * as Select from "@radix-ui/react-select";
import { useEffect, useMemo, useState } from "react";
import TimeSelect from "../today/time-select";
import { DayPicker } from "react-day-picker";

type Habit = {
	id: string;
	title: string;
	description: string | null;
	active: number;
	start_date: string;
	end_date: string | null;
};

function minToHHMM(v: number) {
	const h = Math.floor(v / 60);
	const m = v % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMin(s: string) {
	const m = String(s || "").trim().match(/^(\d{2}):(\d{2})$/);
	if (!m) return null;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
	return hh * 60 + mm;
}

function isValidYmd(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function dateFromYmd(ymd: string) {
	const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!m) return null;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
	return new Date(y, mo - 1, d);
}

function ymdFromDate(d: Date) {
	const y = d.getFullYear();
	const m = d.getMonth() + 1;
	const day = d.getDate();
	return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addMonths(d: Date, delta: number) {
	const y = d.getFullYear();
	const m = d.getMonth();
	return new Date(y, m + delta, 1);
}

function PrettySelect({
	value,
	onValueChange,
	options,
	ariaLabel,
}: {
	value: string;
	onValueChange: (v: string) => void;
	options: Array<{ value: string; label: string }>;
	ariaLabel: string;
}) {
	return (
		<Select.Root value={value} onValueChange={onValueChange}>
			<Select.Trigger
				className="h-8 px-3 rounded-full border border-black/10 dark:border-white/15 bg-transparent text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-2"
				aria-label={ariaLabel}
			>
				<Select.Value />
				<Select.Icon className="opacity-70">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
						<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content
					position="popper"
					sideOffset={8}
					className="z-50 overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur shadow-xl"
				>
					<Select.Viewport className="p-1 max-h-48 overflow-y-auto">
						{options.map((opt) => (
							<Select.Item
								key={opt.value}
								value={opt.value}
								className="relative px-3 py-2 text-sm rounded-xl cursor-pointer outline-none hover:bg-[color:var(--surface-strong)] data-[state=checked]:bg-[color:var(--rdp-accent-background-color)] data-[state=checked]:font-semibold"
							>
								<Select.ItemText>{opt.label}</Select.ItemText>
							</Select.Item>
						))}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	);
}

function YmdPicker({
	value,
	onChange,
	placeholder,
	ariaLabel,
	disabled = false,
	allowClear = true,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	ariaLabel: string;
	disabled?: boolean;
	allowClear?: boolean;
}) {
	const safeValue = useMemo(() => (typeof value === "string" && isValidYmd(value) ? value : ""), [value]);
	const selected = useMemo(() => (safeValue ? dateFromYmd(safeValue) : null), [safeValue]);
	const [viewMonth, setViewMonth] = useState<Date>(() => {
		const d = selected ?? new Date();
		return new Date(d.getFullYear(), d.getMonth(), 1);
	});
	useEffect(() => {
		if (!selected) return;
		setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
	}, [selected?.getFullYear(), selected?.getMonth()]);

	const selectedYear = useMemo(() => String(viewMonth.getFullYear()), [viewMonth]);
	const selectedMonth = useMemo(() => String(viewMonth.getMonth() + 1).padStart(2, "0"), [viewMonth]);
	const yearOptions = useMemo(() => {
		const out: Array<{ value: string; label: string }> = [];
		for (let yy = 1970; yy <= 2100; yy++) out.push({ value: String(yy), label: `${yy}年` });
		return out;
	}, [viewMonth]);
	const monthOptions = useMemo(() => {
		const out: Array<{ value: string; label: string }> = [];
		for (let m = 1; m <= 12; m++) {
			const mm = String(m).padStart(2, "0");
			out.push({ value: mm, label: `${mm}月` });
		}
		return out;
	}, []);

	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<button
					className="w-full h-10 px-3 rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center justify-between gap-2 text-sm disabled:opacity-60"
					type="button"
					aria-label={ariaLabel}
					disabled={disabled}
				>
					<span className="inline-flex items-center gap-2 min-w-0">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
							<path
								d="M7 3v2M17 3v2M4 7h16M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						<span className="opacity-80 truncate">{safeValue || placeholder}</span>
					</span>
					<span className="opacity-60">▾</span>
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					sideOffset={8}
					className="z-50 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur shadow-xl p-3"
				>
					<div className="flex items-center justify-between gap-3">
						<div className="text-xs opacity-70">{ariaLabel}</div>
						{allowClear ? (
							<button
								className="text-xs px-2 py-1 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
								type="button"
								onClick={() => onChange("")}
								disabled={disabled}
							>
								清除
							</button>
						) : null}
					</div>
					<div className="mt-2 flex items-center justify-between gap-2">
						<button
							className="h-8 w-8 inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
							type="button"
							aria-label="上个月"
							onClick={() => setViewMonth((m) => addMonths(m, -1))}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
								<path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
						<div className="flex items-center gap-2">
							<PrettySelect value={selectedYear} onValueChange={(y) => {
								const yy = Number(y);
								if (!Number.isFinite(yy)) return;
								const mm = Number(selectedMonth) - 1;
								setViewMonth(new Date(yy, mm, 1));
							}} options={yearOptions} ariaLabel="选择年份" />
							<PrettySelect value={selectedMonth} onValueChange={(m) => {
								const mm = Number(m);
								if (!Number.isFinite(mm)) return;
								setViewMonth(new Date(viewMonth.getFullYear(), mm - 1, 1));
							}} options={monthOptions} ariaLabel="选择月份" />
						</div>
						<button
							className="h-8 w-8 inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
							type="button"
							aria-label="下个月"
							onClick={() => setViewMonth((m) => addMonths(m, 1))}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
								<path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
					</div>
					<div className="mt-2">
						<DayPicker
							mode="single"
							selected={selected ?? undefined}
							month={viewMonth}
							onMonthChange={setViewMonth}
							onSelect={(d) => {
								if (!d) return;
								const next = ymdFromDate(d);
								if (!isValidYmd(next)) return;
								onChange(next);
							}}
							weekStartsOn={1}
							className="text-sm"
							styles={{
								caption: { display: "none" },
								nav: { display: "none" },
								day: { borderRadius: 12 },
							}}
						/>
					</div>
					<Popover.Arrow className="fill-[color:var(--popover-bg)]" />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}

export default function HabitsClient() {
	const [habits, setHabits] = useState<Habit[]>([]);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editStartDate, setEditStartDate] = useState("");
	const [editEndDate, setEditEndDate] = useState("");
	const [savingId, setSavingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [habitReminders, setHabitReminders] = useState<Record<string, number[]>>({});
	const [remindersLoadingId, setRemindersLoadingId] = useState<string | null>(null);
	const [addRemindHHMM, setAddRemindHHMM] = useState<Record<string, string>>({});
	const [remindersError, setRemindersError] = useState<string | null>(null);

	const habitIdSet = useMemo(() => new Set(habits.map((h) => h.id)), [habits]);
	useEffect(() => {
		setHabitReminders((prev) => {
			const next: Record<string, number[]> = {};
			for (const k of Object.keys(prev)) {
				if (habitIdSet.has(k)) next[k] = prev[k];
			}
			return next;
		});
		setAddRemindHHMM((prev) => {
			const next: Record<string, string> = {};
			for (const k of Object.keys(prev)) {
				if (habitIdSet.has(k)) next[k] = prev[k];
			}
			return next;
		});
	}, [habitIdSet]);

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
				body: JSON.stringify({
					title,
					description: description || null,
					frequencyType: "daily",
					startDate: startDate.trim() ? startDate.trim() : null,
					endDate: endDate.trim() ? endDate.trim() : null,
				}),
			});
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setError(d?.error || "创建失败");
				return;
			}
			setTitle("");
			setDescription("");
			setStartDate("");
			setEndDate("");
			await load();
		} finally {
			setCreating(false);
		}
	}

	function beginEdit(h: Habit) {
		setEditingId(h.id);
		setEditTitle(h.title);
		setEditDescription(h.description ? String(h.description) : "");
		setEditStartDate(h.start_date ? String(h.start_date) : "");
		setEditEndDate(h.end_date ? String(h.end_date) : "");
		void loadHabitReminders(h.id);
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

	async function loadHabitReminders(habitId: string) {
		setRemindersError(null);
		setRemindersLoadingId(habitId);
		try {
			const res = await fetch(`/api/habits/${habitId}/reminders`);
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setRemindersError(d?.error || "加载提醒失败");
				return;
			}
			const data = (await res.json().catch(() => null)) as any;
			const times = ((data?.reminders || []) as any[])
				.map((x) => (x?.timeMin == null ? null : Number(x.timeMin)))
				.filter((x) => x != null && Number.isFinite(x) && x >= 0 && x <= 1439) as number[];
			setHabitReminders((prev) => ({ ...prev, [habitId]: Array.from(new Set(times)).sort((a, b) => a - b) }));
		} finally {
			setRemindersLoadingId(null);
		}
	}

	async function addHabitReminder(habitId: string) {
		setRemindersError(null);
		const hhmm = String(addRemindHHMM[habitId] || "").trim();
		const timeMin = hhmmToMin(hhmm);
		if (timeMin == null) {
			setRemindersError("请输入有效时间（HH:MM）");
			return;
		}
		const res = await fetch(`/api/habits/${habitId}/reminders`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ timeMin }),
		});
		if (!res.ok) {
			const d = (await res.json().catch(() => null)) as any;
			setRemindersError(d?.error || "添加提醒失败");
			return;
		}
		setAddRemindHHMM((prev) => ({ ...prev, [habitId]: "" }));
		await loadHabitReminders(habitId);
	}

	async function deleteHabitReminder(habitId: string, timeMin: number) {
		setRemindersError(null);
		const res = await fetch(`/api/habits/${habitId}/reminders`, {
			method: "DELETE",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ timeMin }),
		});
		if (!res.ok) {
			const d = (await res.json().catch(() => null)) as any;
			setRemindersError(d?.error || "删除提醒失败");
			return;
		}
		await loadHabitReminders(habitId);
	}

	async function saveEdit(h: Habit) {
		const title = String(editTitle).trim();
		if (!title) return;
		const desc = String(editDescription || "").trim();
		const startDate = String(editStartDate || "").trim();
		const endDate = String(editEndDate || "").trim();
		setEditingId(null);
		setError(null);
		setSavingId(h.id);
		try {
			const res = await fetch(`/api/habits/${h.id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					title,
					description: desc ? desc : null,
					startDate,
					endDate: endDate ? endDate : null,
				}),
			});
			if (!res.ok) {
				const d = (await res.json().catch(() => null)) as any;
				setError(d?.error || "保存失败");
				return;
			}
			setHabits((prev) =>
				prev.map((x) =>
					x.id === h.id
						? { ...x, title, description: desc ? desc : null, start_date: startDate, end_date: endDate ? endDate : null }
						: x,
				),
			);
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
						placeholder="描述（可选）"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						disabled={creating}
					/>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<YmdPicker
							value={startDate}
							onChange={setStartDate}
							placeholder="开始日期（默认今天）"
							ariaLabel="开始日期"
							disabled={creating}
							allowClear={true}
						/>
						<YmdPicker
							value={endDate}
							onChange={setEndDate}
							placeholder="结束日期（可选）"
							ariaLabel="结束日期（可选）"
							disabled={creating}
							allowClear={true}
						/>
					</div>
					{error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}
					<button
						className="rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] py-2 font-medium disabled:opacity-60"
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
						<div key={h.id} data-habit-id={h.id} className="rounded-xl border border-black/10 dark:border-white/15 px-4 py-3">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="font-medium truncate">{h.title}</div>
									{h.description ? <div className="text-sm opacity-70 mt-1">{h.description}</div> : null}
									<div className="text-sm opacity-70 mt-1">生效：{h.start_date}{h.end_date ? ` ~ ${h.end_date}` : ""}</div>
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
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										<YmdPicker
											value={editStartDate}
											onChange={setEditStartDate}
											placeholder="开始日期"
											ariaLabel="开始日期"
											allowClear={false}
										/>
										<YmdPicker
											value={editEndDate}
											onChange={setEditEndDate}
											placeholder="结束日期（可选）"
											ariaLabel="结束日期（可选）"
											allowClear={true}
										/>
									</div>

									<div className="mt-2 rounded-xl border border-black/10 dark:border-white/15 p-3">
										<div className="text-sm font-medium">提醒时间</div>
										<div className="text-xs opacity-70 mt-1">可设置多个时间点，到点会推送提醒（关闭页面也可提醒）。</div>
										{remindersError ? <div className="text-xs mt-2 text-red-600 dark:text-red-400">{remindersError}</div> : null}
										<div className="mt-2 flex items-center gap-2">
											<div className="w-48">
												<TimeSelect
													value={addRemindHHMM[h.id] || ""}
													onChange={(v) => setAddRemindHHMM((prev) => ({ ...prev, [h.id]: v }))}
													placeholder="例如：08:30"
													stepMin={5}
												/>
											</div>
											<button
												className="h-10 px-3 rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
												onClick={() => addHabitReminder(h.id)}
												disabled={remindersLoadingId === h.id}
											>
												添加
											</button>
										</div>

										<div className="mt-3 space-y-2">
											{remindersLoadingId === h.id ? <div className="text-xs opacity-70">加载中...</div> : null}
											{(habitReminders[h.id] || []).length === 0 ? (
												<div className="text-xs opacity-70">暂无提醒时间</div>
											) : (
												<div className="flex flex-wrap gap-2">
													{(habitReminders[h.id] || []).map((m) => (
														<div key={m} className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/15 px-3 py-1 text-xs">
															<span>{minToHHMM(m)}</span>
															<button
																className="opacity-70 hover:opacity-100"
																onClick={() => deleteHabitReminder(h.id, m)}
																disabled={remindersLoadingId === h.id}
																aria-label="删除提醒时间"
															>
																×
															</button>
														</div>
													))}
												</div>
											)}
										</div>
									</div>

									<div className="flex items-center gap-2">
										<button
											className="flex-1 h-10 px-3 rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
											onClick={() => setEditingId(null)}
											disabled={savingId === h.id}
											type="button"
										>
											取消
										</button>
										<button
											className="flex-1 rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] py-2 font-medium disabled:opacity-60"
											onClick={() => saveEdit(h)}
											disabled={!String(editTitle).trim() || savingId === h.id}
											type="button"
										>
											{savingId === h.id ? "保存中..." : "保存"}
										</button>
									</div>
								</div>
							) : null}
						</div>
					))
				)}
			</div>
		</div>
	);
}
