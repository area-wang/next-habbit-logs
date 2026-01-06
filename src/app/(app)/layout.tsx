import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import LogoutButton from "./logout-button";
import type { ReactNode } from "react";
import TzOffsetClient from "./tz-offset-client";

export default async function AppLayout({ children }: { children: ReactNode }) {
	const user = await requireUser();

	return (
		<div className="min-h-screen">
			<TzOffsetClient />
			<header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-black/40 border-b border-black/10 dark:border-white/10">
				<div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Link href="/today" className="font-semibold inline-flex items-center gap-2">
							<img src="/logo.svg" alt="爱你老己" className="h-6 w-6" />
							<span>爱你老己</span>
						</Link>
						<nav className="flex items-center gap-3 text-sm">
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
					<div className="flex items-center gap-3">
						<div className="text-sm opacity-80 max-w-[160px] truncate">{user.name || user.email}</div>
						<LogoutButton />
					</div>
				</div>
			</header>
			<main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
		</div>
	);
}
