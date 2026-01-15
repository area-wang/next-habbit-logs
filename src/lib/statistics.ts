/**
 * 统计计算模块
 * 提供各种统计指标的计算函数
 */

/**
 * 计算完成率
 * @param done 已完成数量
 * @param total 总数量
 * @returns 完成率（0-100）
 */
export function calculateCompletionRate(done: number, total: number): number {
	if (total === 0) return 0;
	return (done / total) * 100;
}

/**
 * 计算连续天数
 * @param dates 日期数组（YYYY-MM-DD格式，按时间倒序）
 * @returns 连续天数
 */
export function calculateStreak(dates: string[]): number {
	if (dates.length === 0) return 0;

	// 按日期倒序排序
	const sortedDates = [...dates].sort((a, b) => b.localeCompare(a));

	// 获取今天的日期
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayStr = formatDate(today);

	// 获取昨天的日期
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStr = formatDate(yesterday);

	// 如果最近的日期不是今天也不是昨天，连续天数为0
	if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
		return 0;
	}

	let streak = 0;
	let currentDate = sortedDates[0] === todayStr ? today : yesterday;

	for (const dateStr of sortedDates) {
		const expectedDateStr = formatDate(currentDate);
		if (dateStr === expectedDateStr) {
			streak++;
			currentDate.setDate(currentDate.getDate() - 1);
		} else {
			break;
		}
	}

	return streak;
}

/**
 * 计算皮尔逊相关系数
 * @param x 数据集X
 * @param y 数据集Y
 * @returns 相关系数（-1到1之间）
 */
export function calculateCorrelation(x: number[], y: number[]): number {
	if (x.length !== y.length || x.length === 0) {
		return 0;
	}

	const n = x.length;

	// 计算均值
	const meanX = x.reduce((sum, val) => sum + val, 0) / n;
	const meanY = y.reduce((sum, val) => sum + val, 0) / n;

	// 计算协方差和标准差
	let covariance = 0;
	let varianceX = 0;
	let varianceY = 0;

	for (let i = 0; i < n; i++) {
		const diffX = x[i] - meanX;
		const diffY = y[i] - meanY;
		covariance += diffX * diffY;
		varianceX += diffX * diffX;
		varianceY += diffY * diffY;
	}

	// 避免除以零
	if (varianceX === 0 || varianceY === 0) {
		return 0;
	}

	// 计算相关系数
	const correlation = covariance / Math.sqrt(varianceX * varianceY);

	// 确保结果在[-1, 1]范围内（处理浮点数精度问题）
	return Math.max(-1, Math.min(1, correlation));
}

/**
 * 根据相关系数判断强度
 * @param correlation 相关系数
 * @returns 强度分类
 */
export function getCorrelationStrength(correlation: number): "strong" | "moderate" | "weak" {
	const abs = Math.abs(correlation);
	if (abs >= 0.7) return "strong";
	if (abs >= 0.3) return "moderate";
	return "weak";
}

/**
 * 格式化日期为YYYY-MM-DD
 */
function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * 获取日期范围内的所有日期
 * @param startDate 开始日期（YYYY-MM-DD）
 * @param endDate 结束日期（YYYY-MM-DD）
 * @returns 日期数组
 */
export function getDateRange(startDate: string, endDate: string): string[] {
	const dates: string[] = [];
	const start = new Date(startDate);
	const end = new Date(endDate);

	const current = new Date(start);
	while (current <= end) {
		dates.push(formatDate(current));
		current.setDate(current.getDate() + 1);
	}

	return dates;
}

/**
 * 获取N天前的日期
 * @param days 天数
 * @returns 日期字符串（YYYY-MM-DD）
 */
export function getDaysAgo(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return formatDate(date);
}

/**
 * 获取今天的日期
 * @returns 日期字符串（YYYY-MM-DD）
 */
export function getToday(): string {
	return formatDate(new Date());
}

/**
 * 获取本周的开始和结束日期
 * @returns { start: string, end: string }
 */
export function getThisWeek(): { start: string; end: string } {
	const today = new Date();
	const dayOfWeek = today.getDay();
	const start = new Date(today);
	start.setDate(today.getDate() - dayOfWeek);
	const end = new Date(today);
	return { start: formatDate(start), end: formatDate(end) };
}

/**
 * 获取本月的开始和结束日期
 * @returns { start: string, end: string }
 */
export function getThisMonth(): { start: string; end: string } {
	const today = new Date();
	const start = new Date(today.getFullYear(), today.getMonth(), 1);
	const end = new Date(today);
	return { start: formatDate(start), end: formatDate(end) };
}
