"use client";

import * as Popover from "@radix-ui/react-popover";
import { useMemo } from "react";
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

export default function TodayDatePicker({ date }: { date: string }) {
	const router = useRouter();
	const safeDate = useMemo(() => (typeof date === "string" && isValidYmd(date) ? date : ""), [date]);
	const selected = useMemo(() => (safeDate ? dateFromYmd(safeDate) : null), [safeDate]);

	return (
		<Popover.Root>
			<div className="flex items-center gap-2">
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
						<span className="opacity-80">{safeDate || "选择日期"}</span>
					</button>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content
						sideOffset={8}
						className="z-50 rounded-2xl border border-black/10 dark:border-white/15 bg-white/95 dark:bg-black/80 backdrop-blur shadow-xl p-3"
					>
						<DayPicker
							mode="single"
							selected={selected ?? undefined}
							onSelect={(d) => {
								if (!d) return;
								const next = ymdFromDate(d);
								if (!isValidYmd(next)) return;
								router.push(`/today?date=${encodeURIComponent(next)}`);
							}}
							weekStartsOn={1}
							captionLayout="label"
							className="text-sm"
							styles={{
								caption: { color: "inherit" },
								day: { borderRadius: 12 },
							}}
						/>
						<Popover.Arrow className="fill-white/95 dark:fill-black/80" />
					</Popover.Content>
				</Popover.Portal>
			</div>
		</Popover.Root>
	);
}
