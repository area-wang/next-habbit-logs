"use client";

import * as Popover from "@radix-ui/react-popover";
import * as Select from "@radix-ui/react-select";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";

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

export default function DatePicker({ 
	date, 
	onDateChange, 
	placeholder = "选择日期" 
}: { 
	date: string;
	onDateChange?: (date: string) => void;
	placeholder?: string;
}) {
	const router = useRouter();
	const safeDate = useMemo(() => (typeof date === "string" && isValidYmd(date) ? date : ""), [date]);
	const selected = useMemo(() => (safeDate ? dateFromYmd(safeDate) : null), [safeDate]);
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
	}, []);
	const monthOptions = useMemo(() => {
		const out: Array<{ value: string; label: string }> = [];
		for (let m = 1; m <= 12; m++) {
			const mm = String(m).padStart(2, "0");
			out.push({ value: mm, label: `${mm}月` });
		}
		return out;
	}, []);

	const handleDateSelect = (d: Date | undefined) => {
		if (!d) return;
		const next = ymdFromDate(d);
		if (!isValidYmd(next)) return;
		
		if (onDateChange) {
			// 如果提供了回调，使用回调（用于筛选）
			onDateChange(next);
		} else {
			// 否则导航到新页面（用于页面导航）
			router.push(`/reflections?date=${encodeURIComponent(next)}`);
		}
	};

	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<button
					className="h-10 px-3 rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-2 text-sm"
					type="button"
					aria-label="选择日期"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
						<path
							d="M7 3v2M17 3v2M4 7h16M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<span className="opacity-80">{safeDate || placeholder}</span>
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					sideOffset={8}
					className="z-50 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur shadow-xl p-3"
				>
					<div className="flex items-center justify-between gap-2">
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
							<PrettySelect
								value={selectedYear}
								onValueChange={(y) => {
									const yy = Number(y);
									if (!Number.isFinite(yy)) return;
									const mm = Number(selectedMonth) - 1;
									setViewMonth(new Date(yy, mm, 1));
								}}
								options={yearOptions}
								ariaLabel="选择年份"
							/>
							<PrettySelect
								value={selectedMonth}
								onValueChange={(m) => {
									const mm = Number(m);
									if (!Number.isFinite(mm)) return;
									setViewMonth(new Date(viewMonth.getFullYear(), mm - 1, 1));
								}}
								options={monthOptions}
								ariaLabel="选择月份"
							/>
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
					<DayPicker
						mode="single"
						selected={selected ?? undefined}
						month={viewMonth}
						onMonthChange={setViewMonth}
						onSelect={handleDateSelect}
						weekStartsOn={1}
						className="text-sm"
						styles={{
							caption: { display: "none" },
							nav: { display: "none" },
							day: { borderRadius: 12 },
						}}
					/>
					<Popover.Arrow className="fill-[color:var(--popover-bg)]" />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
