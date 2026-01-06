import { requireUser } from "@/lib/auth-server";
import PlansClient from "./plans-client";
import { cookies } from "next/headers";
import { DEFAULT_TZ_OFFSET_MINUTES } from "@/lib/date";

export default async function PlansPage() {
	await requireUser();
	const cookieStore = await cookies();
	const tzRaw = cookieStore.get("tzOffsetMin")?.value;
	const tz = tzRaw != null && /^-?\d+$/.test(String(tzRaw)) ? Number(tzRaw) : DEFAULT_TZ_OFFSET_MINUTES;
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">计划</h1>
				<div className="text-sm opacity-70 mt-1">把目标拆成可执行的任务，并安排到时间段。</div>
			</div>
			<PlansClient tzOffsetMin={tz} />
		</div>
	);
}
