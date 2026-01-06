"use client";

import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

export default function TodayDatePicker({ date }: { date: string }) {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const safeDate = useMemo(() => (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ""), [date]);

	return (
		<div className="flex items-center gap-2">
			<input
				ref={inputRef}
				className="h-10 text-sm rounded-xl border border-black/10 dark:border-white/15 bg-transparent px-3 outline-none"
				type="date"
				value={safeDate}
				onChange={(e) => {
					const v = String(e.target.value || "");
					if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
					router.push(`/today?date=${encodeURIComponent(v)}`);
				}}
			/>
			<button
				className="h-10 px-3 rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
				onClick={() => {
					const el = inputRef.current as any;
					if (!el) return;
					try {
						if (typeof el.showPicker === "function") {
							el.showPicker();
							return;
						}
					} catch {}
					try {
						el.focus();
						el.click();
					} catch {}
				}}
				type="button"
				aria-label="打开日期选择"
			>
				<span className="inline-flex items-center gap-2 text-sm">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-80">
						<path
							d="M7 3v2M17 3v2M4 7h16M6 11h4M6 15h4M14 11h4M14 15h4M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<span>日期</span>
				</span>
			</button>
		</div>
	);
}
