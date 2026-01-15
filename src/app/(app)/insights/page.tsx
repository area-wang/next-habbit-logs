import { requireUser } from "@/lib/auth-server";
import InsightsClient from "./insights-client";

export default async function InsightsPage() {
	await requireUser();
	return <InsightsClient />;
}
