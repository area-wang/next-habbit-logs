/**
 * 习惯管理工具函数
 */

/**
 * 解析标签 JSON 字符串为数组
 */
export function parseTags(tagsStr: string | null | undefined): string[] {
	if (!tagsStr) return [];
	try {
		const tags = JSON.parse(tagsStr);
		if (Array.isArray(tags)) {
			return tags.filter((tag) => typeof tag === "string" && tag.trim().length > 0);
		}
	} catch (e) {
		console.error("Failed to parse tags:", e);
	}
	return [];
}

/**
 * 序列化标签数组为 JSON 字符串
 */
export function serializeTags(tags: string[]): string {
	const uniqueTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)));
	return JSON.stringify(uniqueTags);
}

/**
 * 验证标签数组
 */
export function validateTags(tags: string[]): { valid: boolean; error?: string } {
	if (tags.length > 10) {
		return { valid: false, error: "标签数量不能超过10个" };
	}
	
	for (const tag of tags) {
		if (tag.length > 20) {
			return { valid: false, error: "标签长度不能超过20个字符" };
		}
		if (tag.trim().length === 0) {
			return { valid: false, error: "标签不能为空" };
		}
	}
	
	return { valid: true };
}

/**
 * 检查习惯是否匹配标签筛选
 * @param habitTags 习惯的标签数组
 * @param searchTags 搜索的标签数组
 * @param matchMode 匹配模式：'any' 或 'all'
 */
export function matchesTags(
	habitTags: string[],
	searchTags: string[],
	matchMode: "any" | "all" = "any"
): boolean {
	if (searchTags.length === 0) return true;
	if (habitTags.length === 0) return false;
	
	const normalizedHabitTags = habitTags.map((tag) => tag.trim().toLowerCase());
	const normalizedSearchTags = searchTags.map((tag) => tag.trim().toLowerCase());
	
	if (matchMode === "all") {
		// 必须包含所有搜索标签
		return normalizedSearchTags.every((searchTag) => normalizedHabitTags.includes(searchTag));
	} else {
		// 包含任一搜索标签
		return normalizedSearchTags.some((searchTag) => normalizedHabitTags.includes(searchTag));
	}
}

/**
 * 生成分类颜色（如果没有指定颜色）
 */
export function generateCategoryColor(index: number): string {
	const colors = [
		"#FF6B6B", // 红色
		"#4ECDC4", // 青色
		"#45B7D1", // 蓝色
		"#FFA07A", // 橙色
		"#98D8C8", // 绿色
		"#F7DC6F", // 黄色
		"#BB8FCE", // 紫色
		"#85C1E2", // 浅蓝
		"#F8B88B", // 浅橙
		"#ABEBC6", // 浅绿
	];
	return colors[index % colors.length];
}

/**
 * 获取默认分类列表
 */
export function getDefaultCategories(): Array<{ name: string; color: string; icon?: string }> {
	return [
		{ name: "健康", color: "#FF6B6B", icon: "💪" },
		{ name: "学习", color: "#4ECDC4", icon: "📚" },
		{ name: "工作", color: "#45B7D1", icon: "💼" },
		{ name: "生活", color: "#FFA07A", icon: "🏠" },
		{ name: "其他", color: "#98D8C8", icon: "📌" },
	];
}

/**
 * 格式化时间分钟数为 HH:MM
 */
export function formatTimeMin(timeMin: number): string {
	const hours = Math.floor(timeMin / 60);
	const minutes = timeMin % 60;
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * 解析 HH:MM 为分钟数
 */
export function parseTimeMin(timeStr: string): number | null {
	const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;
	
	const hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);
	
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
		return null;
	}
	
	return hours * 60 + minutes;
}
