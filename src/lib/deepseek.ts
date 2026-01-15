/**
 * AI API 服务模块
 * 提供AI分析和洞察功能，支持多种大模型
 */

interface AIResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

/**
 * 调用AI API（支持多种大模型）
 * @param prompt 提示词
 * @param maxRetries 最大重试次数
 * @returns AI响应内容或错误信息
 */
export async function callAIAPI(
	prompt: string,
	maxRetries = 3
): Promise<{ content?: string; error?: string; message?: string }> {
	// 检查环境变量配置
	const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY; // 兼容旧配置
	const apiUrl = process.env.AI_API_URL || process.env.DEEPSEEK_API_URL || "https://api.deepseek.com";
	const model = process.env.AI_MODEL || "deepseek-chat";

	if (!apiKey) {
		return {
			error: "ai_not_configured",
			message: "AI功能未配置，请在环境变量中设置AI_API_KEY",
		};
	}

	let lastError: Error | null = null;

	// 重试机制
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const response = await fetch(`${apiUrl}/v1/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model: model,
					messages: [{ role: "user", content: prompt }],
					temperature: 0.7,
					max_tokens: 2000,
				}),
				signal: AbortSignal.timeout(30000), // 30秒超时
			});

			if (!response.ok) {
				const errorText = await response.text().catch(() => "Unknown error");
				throw new Error(`API错误 ${response.status}: ${errorText}`);
			}

			const data = (await response.json()) as AIResponse;

			if (!data.choices || !data.choices[0] || !data.choices[0].message) {
				throw new Error("API响应格式错误");
			}

			return {
				content: data.choices[0].message.content,
			};
		} catch (error) {
			lastError = error as Error;

			// 如果是超时错误，不重试
			if (error instanceof Error && error.name === "AbortError") {
				return {
					error: "timeout",
					message: "请求超时，请稍后重试",
				};
			}

			// 如果不是最后一次尝试，等待后重试
			if (attempt < maxRetries - 1) {
				await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
			}
		}
	}

	// 所有重试都失败
	console.error("AI API调用失败:", lastError);
	return {
		error: "api_failed",
		message: "AI分析失败，请稍后重试",
	};
}

/**
 * 构建通用洞察分析的prompt
 */
export function buildGeneralInsightPrompt(data: {
	habitStats: { rate: number; total: number; done: number };
	taskStats: { rate: number; total: number; done: number };
	reflectionDays: number;
	streak: number;
	recentTrends: string;
}): string {
	return `你是一个专业的习惯养成和时间管理教练。请基于以下用户数据提供深入的分析和建议：

**最近30天数据：**
- 习惯完成率：${data.habitStats.rate.toFixed(1)}%（${data.habitStats.done}/${data.habitStats.total}）
- 任务完成率：${data.taskStats.rate.toFixed(1)}%（${data.taskStats.done}/${data.taskStats.total}）
- 反思天数：${data.reflectionDays}天
- 连续打卡：${data.streak}天

**趋势：**
${data.recentTrends}

请提供以下内容（使用JSON格式）：
{
  "patterns": ["识别到的行为模式1", "模式2", "模式3"],
  "strengths": ["优势1", "优势2"],
  "improvements": ["需要改进的方面1", "方面2"],
  "actions": ["具体行动建议1", "建议2", "建议3"]
}

请确保建议具体、可操作，并且积极正面。`;
}

/**
 * 构建未完成原因分析的prompt
 */
export function buildIncompleteReasonsPrompt(reasons: Array<{ reason: string; count: number; percentage: number }>): string {
	const reasonsList = reasons
		.map((r) => `- ${r.reason}（${r.count}次，${r.percentage.toFixed(1)}%）`)
		.join("\n");

	return `你是一个专业的习惯养成和时间管理教练。用户记录了以下未完成习惯和任务的原因：

${reasonsList}

请分析这些未完成原因，找出根本原因和模式，并提供针对性的改进建议和应对策略。

请以友好、鼓励的语气回答，包含：
1. 主要模式识别（2-3个）
2. 根本原因分析
3. 具体的改进建议（3-5个）
4. 应对策略和技巧

回答应该简洁明了，每个建议不超过2句话。`;
}

/**
 * 构建关联分析解读的prompt
 */
export function buildCorrelationPrompt(correlation: number, strength: string): string {
	return `你是一个专业的数据分析师和习惯养成教练。

用户的习惯完成数和任务完成数之间的相关系数是 ${correlation.toFixed(3)}，属于${strength}相关。

请用通俗易懂的语言解释这个相关性意味着什么，以及用户可以如何利用这个发现来改进自己的习惯养成和任务管理。

回答应该：
1. 解释相关性的含义（2-3句话）
2. 提供实际的应用建议（2-3个）
3. 保持积极正面的语气

回答应该简洁明了，总共不超过150字。`;
}

/**
 * 构建报告总结的prompt
 */
export function buildReportSummaryPrompt(reportData: {
	period: string;
	habitRate: number;
	taskRate: number;
	reflectionDays: number;
	bestDay: string;
	improvements: string[];
}): string {
	return `你是一个专业的习惯养成和时间管理教练。请为用户的${reportData.period}表现写一个简短的总结。

**数据：**
- 习惯完成率：${reportData.habitRate.toFixed(1)}%
- 任务完成率：${reportData.taskRate.toFixed(1)}%
- 反思天数：${reportData.reflectionDays}天
- 最佳表现日：${reportData.bestDay}
- 需要改进：${reportData.improvements.join("、")}

请写一个100-150字的总结，包含：
1. 整体评价（积极正面）
2. 亮点表扬
3. 改进方向
4. 鼓励的话

语气要友好、鼓励，让用户感到被支持和激励。`;
}
