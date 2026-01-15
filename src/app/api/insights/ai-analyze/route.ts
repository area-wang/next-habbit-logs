import type { NextRequest } from "next/server";
import { getAuthedUserFromRequest } from "@/lib/auth-request";
import { json, unauthorized, badRequest } from "@/lib/http";
import {
	callAIAPI,
	buildGeneralInsightPrompt,
	buildIncompleteReasonsPrompt,
	buildCorrelationPrompt,
	buildReportSummaryPrompt,
} from "@/lib/deepseek";
import type { AIInsightResult } from "@/lib/types";

export async function POST(req: NextRequest) {
	const user = await getAuthedUserFromRequest(req);
	if (!user) return unauthorized();

	try {
		const body = (await req.json()) as { type?: string; data?: any };
		const { type, data } = body;

		if (!type || !data) {
			return badRequest("缺少必需参数：type和data");
		}

		let prompt: string;
		let parseAsJSON = false;

		switch (type) {
			case "general": {
				// 通用洞察分析
				prompt = buildGeneralInsightPrompt(data);
				parseAsJSON = true;
				break;
			}

			case "incomplete-reasons": {
				// 未完成原因分析
				if (!Array.isArray(data.reasons)) {
					return badRequest("data.reasons必须是数组");
				}
				prompt = buildIncompleteReasonsPrompt(data.reasons);
				break;
			}

			case "correlation": {
				// 关联分析解读
				if (typeof data.correlation !== "number" || typeof data.strength !== "string") {
					return badRequest("data必须包含correlation和strength");
				}
				prompt = buildCorrelationPrompt(data.correlation, data.strength);
				break;
			}

			case "report": {
				// 报告总结
				prompt = buildReportSummaryPrompt(data);
				break;
			}

			default:
				return badRequest("不支持的分析类型");
		}

		// 调用AI API
		const result = await callAIAPI(prompt);

		if (result.error) {
			return json(
				{
					error: result.error,
					message: result.message,
				},
				{ status: 503 }
			);
		}

		// 解析响应
		let analysis = result.content || "";
		let insights: AIInsightResult | undefined;

		if (parseAsJSON && analysis) {
			try {
				// 尝试提取JSON部分
				const jsonMatch = analysis.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					insights = JSON.parse(jsonMatch[0]) as AIInsightResult;
				}
			} catch (error) {
				console.error("解析AI响应JSON失败:", error);
				// 如果解析失败，保持原始文本
			}
		}

		return json({
			analysis,
			insights,
		});
	} catch (error) {
		console.error("AI分析失败:", error);
		return json({ error: "AI分析失败" }, { status: 500 });
	}
}
