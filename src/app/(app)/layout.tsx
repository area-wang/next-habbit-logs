import { requireUser } from "@/lib/auth-server";
import type { ReactNode } from "react";
import TzOffsetClient from "./tz-offset-client";
import AppHeader from "./app-header";
import PullToRefresh from "./pull-to-refresh";

export default async function AppLayout({ children }: { children: ReactNode }) {
	const user = await requireUser();

	return (
		<div className="min-h-screen">
			<TzOffsetClient />
			<PullToRefresh />
			<AppHeader userLabel={user.name || user.email} />
			<main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
		</div>
	);
}
