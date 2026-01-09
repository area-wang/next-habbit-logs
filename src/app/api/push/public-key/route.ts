import { getEnv } from "@/lib/db";
import { json } from "@/lib/http";

export async function GET() {
	const env = getEnv();
	return json({ publicKey: env.VAPID_SERVER_PUBLIC_KEY });
}
