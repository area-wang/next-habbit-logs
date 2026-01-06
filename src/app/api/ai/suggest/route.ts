import type { NextRequest } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized } from "@/lib/http";

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	const _body = await req.json().catch(() => null);
	return json(
		{
			error: "ai_provider_not_configured",
			message: "AI 接口已预留。后续可在 Cloudflare 环境变量中配置模型 Provider 后启用。",
		},
		{ status: 501 },
	);
}
