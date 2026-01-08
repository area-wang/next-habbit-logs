"use client";

import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";

function pad2(n: number) {
	return String(n).padStart(2, "0");
}

function buildHourOptions() {
	const out: Array<{ value: number; label: string }> = [];
	for (let h = 0; h < 24; h++) out.push({ value: h, label: pad2(h) });
	return out;
}

function buildMinuteOptions(stepMin: number) {
	const step = Math.max(1, Math.floor(stepMin));
	const out: Array<{ value: number; label: string }> = [];
	for (let m = 0; m < 60; m += step) out.push({ value: m, label: pad2(m) });
	return out;
}

function parseHHMM(raw: string) {
	const s = String(raw || "").trim();
	if (!s) return { hour: null as number | null, minute: null as number | null };
	const m = s.match(/^(\d{1,2})(?::(\d{0,2}))?$/);
	if (!m) return { hour: null as number | null, minute: null as number | null };
	const hh = Number(m[1]);
	const mm = m[2] ? Number(m[2]) : 0;
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return { hour: null as number | null, minute: null as number | null };
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return { hour: null as number | null, minute: null as number | null };
	return { hour: hh, minute: mm };
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
	stepMin = 5,
	disabled = false,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	stepMin?: number;
	disabled?: boolean;
}) {
	const hours = useMemo(() => buildHourOptions(), []);
	const minutes = useMemo(() => buildMinuteOptions(stepMin), [stepMin]);
	const parts = useMemo(() => parseHHMM(value), [value]);
	const [open, setOpen] = useState(false);

	function setParts(next: { hour?: number | null; minute?: number | null; close?: boolean }) {
		const close = next.close ?? true;
		const nextHour = next.hour ?? parts.hour;
		const nextMinute = next.minute ?? parts.minute;
		if (nextHour == null && nextMinute == null) {
			onChange("");
			setOpen(false);
			return;
		}
		const hh = nextHour == null ? 0 : nextHour;
		const mm = nextMinute == null ? 0 : nextMinute;
		onChange(`${pad2(hh)}:${pad2(mm)}`);
		if (close) setOpen(false);
	}

	return (
		<Popover.Root
			open={open}
			onOpenChange={(next) => {
				if (disabled) {
					setOpen(false);
					return;
				}
				setOpen(next);
			}}
		>
			<Popover.Anchor asChild>
				<div className="w-full relative">
					<input
						className="w-full h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent pl-3 pr-10 outline-none disabled:opacity-60"
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
						disabled={disabled}
					/>
					<Popover.Trigger asChild>
						<button
							className="absolute right-1 top-1 h-8 w-8 inline-flex items-center justify-center rounded-xl border border-transparent hover:bg-[color:var(--surface)] transition-colors disabled:opacity-60"
							type="button"
							aria-label={open ? "收起时间选项" : "打开时间选项"}
							disabled={disabled}
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
					className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[240px] overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--popover-bg)] backdrop-blur shadow-xl"
				>
					<div className="p-1">
						<button
							className="w-full text-center text-sm px-3 py-2 rounded-xl hover:bg-[color:var(--surface-strong)] transition-colors opacity-80"
							onClick={() => setParts({ hour: null, minute: null })}
							type="button"
						>
							清除
						</button>
						<div className="mt-1 grid grid-cols-2 gap-1">
							<div className="max-h-[240px] overflow-auto">
								{hours.map((h) => (
									<button
										key={h.value}
										className={`w-full text-center text-sm px-3 py-2 rounded-xl hover:bg-[color:var(--surface-strong)] transition-colors ${
											parts.hour === h.value ? "bg-[color:var(--surface-strong)] font-semibold" : ""
										}`}
										onClick={() => setParts({ hour: h.value, close: false })}
										type="button"
									>
										{h.label}
									</button>
								))}
							</div>
							<div className="max-h-[240px] overflow-auto">
								{minutes.map((m) => (
									<button
										key={m.value}
										className={`w-full text-center text-sm px-3 py-2 rounded-xl hover:bg-[color:var(--surface-strong)] transition-colors ${
											parts.minute === m.value ? "bg-[color:var(--surface-strong)] font-semibold" : ""
										}`}
										onClick={() => setParts({ minute: m.value, close: true })}
										type="button"
									>
										{m.label}
									</button>
								))}
							</div>
						</div>
					</div>
					<Popover.Arrow className="fill-[color:var(--popover-bg)]" />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
