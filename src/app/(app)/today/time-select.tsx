"use client";

import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";

function pad2(n: number) {
	return String(n).padStart(2, "0");
}

function minToHHMM(v: number) {
	const h = Math.floor(v / 60);
	const m = v % 60;
	return `${pad2(h)}:${pad2(m)}`;
}

function buildOptions(stepMin: number) {
	const out: Array<{ value: string; label: string }> = [];
	for (let m = 0; m < 24 * 60; m += stepMin) {
		const hhmm = minToHHMM(m);
		out.push({ value: hhmm, label: hhmm });
	}
	return out;
}

function normalizeTime(raw: string) {
	const s = String(raw || "").trim();
	if (!s) return "";
	const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
	if (!m) return "";
	const hh = Number(m[1]);
	const mm = Number(m[2] ?? "0");
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return "";
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
	return `${pad2(hh)}:${pad2(mm)}`;
}

export default function TimeSelect({
	value,
	onChange,
	placeholder,
	stepMin = 15,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	stepMin?: number;
}) {
	const options = useMemo(() => buildOptions(stepMin), [stepMin]);
	const [open, setOpen] = useState(false);
	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Anchor asChild>
				<div className="w-full relative">
					<input
						className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent pl-3 pr-10 outline-none"
						value={value}
						placeholder={placeholder}
						onChange={(e) => {
							const next = String(e.target.value || "")
								.replace(/[^\d:]/g, "")
								.slice(0, 5);
							onChange(next);
						}}
						onBlur={() => {
							const next = normalizeTime(value);
							onChange(next);
						}}
						inputMode="numeric"
						autoComplete="off"
					/>
					<Popover.Trigger asChild>
						<button
							className="absolute right-1 top-1 h-8 w-8 inline-flex items-center justify-center rounded-xl border border-transparent hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
							type="button"
							aria-label={open ? "收起时间选项" : "打开时间选项"}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
								<path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</button>
					</Popover.Trigger>
				</div>
			</Popover.Anchor>
			<Popover.Portal>
				<Popover.Content
					sideOffset={8}
					className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-2xl border border-black/10 dark:border-white/15 bg-white/95 dark:bg-black/80 backdrop-blur shadow-xl"
				>
					<div className="p-1 max-h-[280px] overflow-auto">
						<button
							className="w-full text-center text-sm px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-80"
							onClick={() => {
								onChange("");
								setOpen(false);
							}}
							type="button"
						>
							清除
						</button>
						{options.map((o) => (
							<button
								key={o.value}
								className="w-full text-center text-sm px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
								onClick={() => {
									onChange(o.value);
									setOpen(false);
								}}
								type="button"
							>
								{o.label}
							</button>
						))}
					</div>
					<Popover.Arrow className="fill-white/95 dark:fill-black/80" />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
