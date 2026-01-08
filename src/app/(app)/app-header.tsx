"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "./logout-button";

export default function AppHeader({ userLabel }: { userLabel: string }) {
	const [open, setOpen] = useState(false);
	type Theme = "dark" | "butter";
	const [theme, setTheme] = useState<Theme>("dark");

	function applyTheme(t: Theme) {
		const root = document.documentElement;
		if (t === "dark") {
			root.classList.add("dark");
			root.classList.remove("theme-butter");
		} else {
			root.classList.remove("dark");
			root.classList.add("theme-butter");
		}
	}

	useEffect(() => {
		try {
			const stored = window.localStorage.getItem("theme");
			const initial: Theme = stored === "butter" ? "butter" : "dark";
			setTheme(initial);
			applyTheme(initial);
		} catch {
			// ignore
		}
	}, []);

	function toggleTheme() {
		const next: Theme = theme === "dark" ? "butter" : "dark";
		setTheme(next);
		try {
			window.localStorage.setItem("theme", next);
		} catch {
			// ignore
		}
		applyTheme(next);
	}

	return (
		<header className="sticky top-0 z-10 backdrop-blur bg-[color:var(--header-bg)] border-b border-[color:var(--border-color)]">
			<div className="max-w-5xl mx-auto px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0">
						<Link
							href="/today"
							className="font-semibold inline-flex items-center gap-2 min-w-0"
							onClick={() => setOpen(false)}
						>
							<img src={theme === "butter" ? "/logo-black.svg" : "/logo.svg"} alt="爱你老己" className="h-6 w-6 shrink-0" />
							<span className="truncate">爱你老己</span>
						</Link>
						<nav className="hidden sm:flex items-center gap-3 text-sm">
							<Link className="hover:underline" href="/today">
								今日
							</Link>
							<Link className="hover:underline" href="/plans">
								计划
							</Link>
							<Link className="hover:underline" href="/habits">
								习惯
							</Link>
							<Link className="hover:underline" href="/history">
								历史
							</Link>
							<Link className="hover:underline" href="/insights">
								分析
							</Link>
							<Link className="hover:underline" href="/coach">
								建议
							</Link>
						</nav>
					</div>

					<div className="hidden sm:flex items-center gap-3">
						<button
							className="h-9 px-3 inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/15 hover:bg-[color:var(--surface)] transition-colors text-sm"
							onClick={toggleTheme}
							type="button"
							aria-label={theme === "dark" ? "切换到淡黄色主题" : "切换到黑色主题"}
						>
							{theme === "dark" ? "淡黄" : "黑色"}
						</button>
						<div className="text-sm opacity-80 max-w-[160px] truncate">{userLabel}</div>
						<LogoutButton />
					</div>

					<button
						className="sm:hidden h-10 w-10 inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/15 hover:bg-[color:var(--surface)] transition-colors"
						onClick={() => setOpen((v) => !v)}
						aria-label={open ? "收起菜单" : "展开菜单"}
						aria-expanded={open}
						type="button"
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
							<path
								d="M4 7h16M4 12h16M4 17h16"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					</button>
				</div>

				{open ? (
					<div className="sm:hidden mt-3 rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--surface-strong)] overflow-hidden">
						<div className="px-4 py-3 border-b border-[color:var(--border-color)]">
							<div className="text-sm opacity-80 truncate">{userLabel}</div>
						</div>
						<nav className="flex flex-col text-sm">
							<Link className="px-4 py-3 hover:bg-[color:var(--surface)]" href="/today" onClick={() => setOpen(false)}>
								今日
							</Link>
							<Link className="px-4 py-3 hover:bg-[color:var(--surface)]" href="/plans" onClick={() => setOpen(false)}>
								计划
							</Link>
							<Link className="px-4 py-3 hover:bg-[color:var(--surface)]" href="/habits" onClick={() => setOpen(false)}>
								习惯
							</Link>
							<Link className="px-4 py-3 hover:bg-[color:var(--surface)]" href="/history" onClick={() => setOpen(false)}>
								历史
							</Link>
							<Link className="px-4 py-3 hover:bg-[color:var(--surface)]" href="/insights" onClick={() => setOpen(false)}>
								分析
							</Link>
							<Link className="px-4 py-3 hover:bg-[color:var(--surface)]" href="/coach" onClick={() => setOpen(false)}>
								建议
							</Link>
						</nav>
						<div className="px-4 py-3 border-t border-[color:var(--border-color)]">
							<LogoutButton />
						</div>
					</div>
				) : null}
			</div>
		</header>
	);
}
