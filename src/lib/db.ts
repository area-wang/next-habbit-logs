import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getEnv(): CloudflareEnv {
	return getCloudflareContext().env as CloudflareEnv;
}

export function getDb() {
	return getEnv().DB;
}
