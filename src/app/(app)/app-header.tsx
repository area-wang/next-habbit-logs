"use client";

import Link from "next/link";
import { useState } from "react";
import LogoutButton from "./logout-button";

export default function AppHeader({ userLabel }: { userLabel: string }) {
	const [open, setOpen] = useState(false);

	return (
		<header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-black/40 border-b border-black/10 dark:border-white/10">
			<div className="max-w-5xl mx-auto px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0">
						<Link
							href="/today"
							className="font-semibold inline-flex items-center gap-2 min-w-0"
							onClick={() => setOpen(false)}
						>
							<img src="/logo.svg" alt="爱你老己" className="h-6 w-6 shrink-0" />
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
						<div className="text-sm opacity-80 max-w-[160px] truncate">{userLabel}</div>
						<LogoutButton />
					</div>

					<button
						className="sm:hidden h-10 w-10 inline-flex items-center justify-center rounded-xl border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
					<div className="sm:hidden mt-3 rounded-2xl border border-black/10 dark:border-white/15 bg-white/70 dark:bg-black/30 overflow-hidden">
						<div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
							<div className="text-sm opacity-80 truncate">{userLabel}</div>
						</div>
						<nav className="flex flex-col text-sm">
							<Link className="px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10" href="/today" onClick={() => setOpen(false)}>
								今日
							</Link>
							<Link className="px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10" href="/plans" onClick={() => setOpen(false)}>
								计划
							</Link>
							<Link className="px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10" href="/habits" onClick={() => setOpen(false)}>
								习惯
							</Link>
							<Link className="px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10" href="/history" onClick={() => setOpen(false)}>
								历史
							</Link>
							<Link className="px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10" href="/insights" onClick={() => setOpen(false)}>
								分析
							</Link>
							<Link className="px-4 py-3 hover:bg-black/5 dark:hover:bg-white/10" href="/coach" onClick={() => setOpen(false)}>
								建议
							</Link>
						</nav>
						<div className="px-4 py-3 border-t border-black/10 dark:border-white/10">
							<LogoutButton />
						</div>
					</div>
				) : null}
			</div>
		</header>
	);
}
