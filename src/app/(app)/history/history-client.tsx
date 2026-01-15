"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { useEffect, useMemo, useRef, useState } from "react";
import type { UIEvent } from "react";
import { useRouter } from "next/navigation";
import { ymdInOffset, ymInOffset } from "@/lib/date";

type Day = { date: string; habitDoneCount: number; habitTotalCount: number; taskDoneCount: number; taskTotalCount: number };

type ApiRes = { month: string; days: Day[] };

function addMonths(ym: string, delta: number) {
	const [y, m] = ym.split("-").map((x) => Number(x));
	const total = y * 12 + (m - 1) + delta;
	let ny = Math.floor(total / 12);
	let nm0 = total - ny * 12;
	if (nm0 < 0) {
		nm0 += 12;
		ny -= 1;
	}
	const nm = nm0 + 1;
	return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}`;
}

function weekdayOfFirstDay(ym: string) {
	const [y, m] = ym.split("-").map((x) => Number(x));
	const d = new Date(Date.UTC(y, m - 1, 1));
	return d.getUTCDay();
}

function daysInMonth(ym: string) {
	const [y, m] = ym.split("-").map((x) => Number(x));
	const d = new Date(Date.UTC(y, m, 0));
	return d.getUTCDate();
}

function PrettySelect({
	value,
	onValueChange,
	options,
	ariaLabel,
	renderValue,
	viewportRef,
	onViewportScroll,
}: {
	value: string;
	onValueChange: (v: string) => void;
	options: Array<{ value: string; label: string }>;
	ariaLabel: string;
	renderValue?: (v: string) => string;
	viewportRef?: { current: HTMLDivElement | null };
	onViewportScroll?: (e: UIEvent<HTMLDivElement>) => void;
}) {
	return (
		<Select.Root value={value} onValueChange={onValueChange}>
			<Select.Trigger
				className="h-9 px-3 rounded-full border border-black/10 bg-transparent text-sm font-semibold hover:bg-black/5 transition-colors cursor-pointer inline-flex items-center gap-2"
				aria-label={ariaLabel}
			>
				<Select.Value>{renderValue ? renderValue(value) : value}</Select.Value>
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
					<Select.Viewport
						ref={viewportRef as any}
						onScroll={onViewportScroll as any}
						className="p-1 max-h-48 overflow-y-auto"
					>
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

export default function HistoryClient() {
	const router = useRouter();
	const [month, setMonth] = useState("");
	const [data, setData] = useState<ApiRes | null>(null);
	const [isMobile, setIsMobile] = useState(false);
	const [selectedDay, setSelectedDay] = useState<
		null | { date: string; dayNum: number; habitDoneCount: number; habitTotalCount: number; taskDoneCount: number; taskTotalCount: number }
	>(null);
	const todayYmd = useMemo(() => {
		try {
			const d = new Date();
			const offsetMinutes = -d.getTimezoneOffset();
			return ymdInOffset(d, offsetMinutes);
		} catch {
			return "";
		}
	}, []);

	const dayMap = useMemo(() => {
		const m = new Map<string, Day>();
		for (const d of data?.days || []) m.set(d.date, d);
		return m;
	}, [data]);

	useEffect(() => {
		try {
			const d = new Date();
			const offsetMinutes = -d.getTimezoneOffset();
			const next = ymInOffset(d, offsetMinutes);
			if (typeof next === "string" && next) setMonth(next);
		} catch {}
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const mql = window.matchMedia("(max-width: 639px)");
		const apply = () => setIsMobile(Boolean(mql.matches));
		apply();
		try {
			mql.addEventListener("change", apply);
			return () => mql.removeEventListener("change", apply);
		} catch {
			mql.addListener(apply);
			return () => mql.removeListener(apply);
		}
	}, []);

	useEffect(() => {
		if (!month) return;
		let cancelled = false;
		(async () => {
			const res = await fetch(`/api/history?month=${encodeURIComponent(month)}`);
			const json = (await res.json()) as ApiRes;
			if (!cancelled) setData(json);
		})();
		return () => {
			cancelled = true;
		};
	}, [month]);

	const selectedYear = useMemo(() => String(month || "").slice(0, 4), [month]);
	const baseYear = useMemo(() => {
		const isValidYear = /^\d{4}$/.test(selectedYear);
		const y = isValidYear ? Number(selectedYear) : NaN;
		return Number.isFinite(y) ? y : new Date().getFullYear();
	}, [selectedYear]);
	const [yearRange, setYearRange] = useState<{ start: number; end: number }>(() => {
		const base = new Date().getFullYear();
		return { start: base - 5, end: base + 5 };
	});
	const yearViewportRef = useRef<HTMLDivElement | null>(null);
	const yearExtendLockRef = useRef(false);
	const yearPendingAdjustRef = useRef<number | null>(null);

	useEffect(() => {
		setYearRange((r) => {
			let start = r.start;
			let end = r.end;
			if (baseYear < start) start = baseYear - 5;
			if (baseYear > end) end = baseYear + 5;
			if (start === r.start && end === r.end) return r;
			return { start, end };
		});
	}, [baseYear]);

	const yearOptions = useMemo(() => {
		const years: string[] = [];
		for (let yy = yearRange.start; yy <= yearRange.end; yy++) years.push(String(yy).padStart(4, "0"));
		return years;
	}, [yearRange]);
	const monthOptions = useMemo(() => {
		const ms: string[] = [];
		for (let m = 1; m <= 12; m++) ms.push(String(m).padStart(2, "0"));
		return ms;
	}, []);
	const selectedMonth = useMemo(() => String(month || "").slice(5, 7), [month]);

	function extendYears(dir: "prev" | "next") {
		if (yearExtendLockRef.current) return;
		yearExtendLockRef.current = true;
		try {
			window.setTimeout(() => {
				yearExtendLockRef.current = false;
			}, 180);
		} catch {
			yearExtendLockRef.current = false;
		}
		const el = yearViewportRef.current;
		if (dir === "prev" && el) yearPendingAdjustRef.current = el.scrollHeight;
		setYearRange((r) => (dir === "prev" ? { start: r.start - 10, end: r.end } : { start: r.start, end: r.end + 10 }));
	}

	function onYearViewportScroll(e: UIEvent<HTMLDivElement>) {
		const el = e.currentTarget;
		if (!el) return;
		if (el.scrollTop < 16) {
			extendYears("prev");
			return;
		}
		const remain = el.scrollHeight - el.scrollTop - el.clientHeight;
		if (remain < 16) {
			extendYears("next");
		}
	}

	useEffect(() => {
		const prevScrollHeight = yearPendingAdjustRef.current;
		if (prevScrollHeight == null) return;
		const el = yearViewportRef.current;
		if (!el) return;
		const delta = el.scrollHeight - prevScrollHeight;
		el.scrollTop = el.scrollTop + delta;
		yearPendingAdjustRef.current = null;
	}, [yearRange]);

	if (!month) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<button
						className="text-sm px-3 py-1 rounded-full border border-black/10 opacity-50"
						disabled
					>
						上个月
					</button>
					<div className="font-semibold">-</div>
					<button
						className="text-sm px-3 py-1 rounded-full border border-black/10 opacity-50"
						disabled
					>
						下个月
					</button>
				</div>
				<div className="text-sm opacity-70">加载中...</div>
			</div>
		);
	}

	const firstWday = weekdayOfFirstDay(month);
	const dim = daysInMonth(month);
	const cells: Array<{
		date: string | null;
		dayNum: number | null;
		habitDoneCount: number;
		habitTotalCount: number;
		taskDoneCount: number;
		taskTotalCount: number;
	}> = [];
	for (let i = 0; i < firstWday; i++) {
		cells.push({
			date: null,
			dayNum: null,
			habitDoneCount: 0,
			habitTotalCount: 0,
			taskDoneCount: 0,
			taskTotalCount: 0,
		});
	}
	for (let d = 1; d <= dim; d++) {
		const dd = String(d).padStart(2, "0");
		const date = `${month}-${dd}`;
		const v = dayMap.get(date);
		cells.push({
			date,
			dayNum: d,
			habitDoneCount: v?.habitDoneCount || 0,
			habitTotalCount: v?.habitTotalCount || 0,
			taskDoneCount: v?.taskDoneCount || 0,
			taskTotalCount: v?.taskTotalCount || 0,
		});
	}
	while (cells.length % 7 !== 0) {
		cells.push({
			date: null,
			dayNum: null,
			habitDoneCount: 0,
			habitTotalCount: 0,
			taskDoneCount: 0,
			taskTotalCount: 0,
		});
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<button
					className="text-sm px-3 py-1 rounded-full border border-black/10 hover:bg-black/5 transition-colors"
					onClick={() => setMonth((m) => addMonths(m, -1))}
					disabled={!month}
				>
					上个月
				</button>
				<div className="flex items-center gap-2">
					<PrettySelect
						value={selectedYear}
						onValueChange={(y) => {
							const m = selectedMonth || "01";
							if (!y || !m) return;
							setMonth(`${y}-${m}`);
						}}
						options={yearOptions.map((y) => ({ value: y, label: `${y}年` }))}
						ariaLabel="选择年份"
						viewportRef={yearViewportRef}
						onViewportScroll={onYearViewportScroll}
					/>
					<PrettySelect
						value={selectedMonth}
						onValueChange={(m) => {
							const y = selectedYear || String(new Date().getFullYear());
							if (!y || !m) return;
							setMonth(`${y}-${m}`);
						}}
						options={monthOptions.map((m) => ({ value: m, label: `${m}月` }))}
						ariaLabel="选择月份"
					/>
				</div>
				<button
					className="text-sm px-3 py-1 rounded-full border border-black/10 hover:bg-black/5 transition-colors"
					onClick={() => setMonth((m) => addMonths(m, 1))}
					disabled={!month}
				>
					下个月
				</button>
			</div>

			<div className="grid grid-cols-7 gap-2 text-xs opacity-70">
				<div>日</div>
				<div>一</div>
				<div>二</div>
				<div>三</div>
				<div>四</div>
				<div>五</div>
				<div>六</div>
			</div>

			<div className="grid grid-cols-7 gap-2">
				{cells.map((c, idx) => {
					if (!c.dayNum) {
						return <div key={idx} className="h-16 sm:h-20 rounded-xl border border-transparent" />;
					}
					const isTodayCell = Boolean(c.date) && String(c.date) === todayYmd;
					const habitDone = c.habitDoneCount;
					const habitTotal = c.habitTotalCount;
					const taskDone = c.taskDoneCount;
					const taskTotal = c.taskTotalCount;
					const total = habitDone + taskDone;
					return (
						<button
							key={c.date}
							className={`h-16 sm:h-20 rounded-xl border px-2 py-2 text-left cursor-pointer transition-colors ${
								total > 0
									? "border-black/20 hover:bg-black/5"
									: "border-black/10 hover:bg-black/5"
							} ${isTodayCell ? "bg-violet-500/10 border-violet-500/50" : ""}`}
							onClick={() => {
								const date = String(c.date);
								if (isMobile) {
									setSelectedDay({
										date,
										dayNum: Number(c.dayNum),
										habitDoneCount: habitDone,
										habitTotalCount: habitTotal,
										taskDoneCount: taskDone,
										taskTotalCount: taskTotal,
									});
									return;
								}
								router.push(`/history?date=${encodeURIComponent(date)}`);
							}}
						>
							<div className="flex items-center justify-between">
								<div className="text-sm font-medium">{c.dayNum}</div>
								{total > 0 ? <div className="text-[11px] opacity-70">+{total}</div> : null}
							</div>
							<div className="mt-2 space-y-1 hidden sm:block">
								<div className="text-[11px] opacity-70">习惯 {habitDone}/{habitTotal}</div>
								<div className="text-[11px] opacity-70">任务 {taskDone}/{taskTotal}</div>
							</div>
						</button>
					);
				})}
			</div>

			<Dialog.Root open={!!selectedDay} onOpenChange={(open) => (!open ? setSelectedDay(null) : null)}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 bg-black/60" />
					<Dialog.Content className="fixed left-1/2 top-1/2 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/10 bg-white/95 backdrop-blur shadow-xl p-4">
						<Dialog.Title className="font-semibold">{selectedDay?.date}</Dialog.Title>
						<div className="text-sm opacity-70 mt-1">当日完成情况</div>
						<div className="mt-4 grid gap-2 text-sm">
							<div className="flex items-center justify-between rounded-xl border border-black/10 px-3 py-2">
								<div className="opacity-80">习惯</div>
								<div className="font-medium">
									{selectedDay?.habitDoneCount ?? 0}/{selectedDay?.habitTotalCount ?? 0}
								</div>
							</div>
							<div className="flex items-center justify-between rounded-xl border border-black/10 px-3 py-2">
								<div className="opacity-80">任务</div>
								<div className="font-medium">
									{selectedDay?.taskDoneCount ?? 0}/{selectedDay?.taskTotalCount ?? 0}
								</div>
							</div>
						</div>

						<div className="mt-4 flex items-center justify-end gap-2">
							<Dialog.Close asChild>
								<button className="h-10 px-3 rounded-xl border border-black/10 hover:bg-black/5 transition-colors">
									关闭
								</button>
							</Dialog.Close>
							<button
								className="h-10 px-3 rounded-xl bg-[color:var(--foreground)] text-[color:var(--background)] border border-[color:var(--foreground)] hover:opacity-90 transition-opacity"
								onClick={() => {
									const d = selectedDay?.date;
									if (!d) return;
									router.push(`/history?date=${encodeURIComponent(d)}`);
								}}
								type="button"
							>
								查看详情
							</button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
