/**
 * 数据库模型类型定义
 */

/**
 * Reminder 数据库模型
 * 表示用户的提醒配置
 */
export interface Reminder {
	/** 提醒 ID，格式：rem:{userId}:{targetType}:{targetId}:{anchor}:{timeMin} */
	id: string;
	/** 用户 ID */
	user_id: string;
	/** 目标类型：'habit' | 'task' */
	target_type: string;
	/** 目标 ID（habitId 或 taskId） */
	target_id: string;
	/** 锚点类型：'habit_time' | 'task_start' | 'task_end' */
	anchor: string;
	/** 偏移分钟数（可选） */
	offset_min: number | null;
	/** 提醒时间（一天中的分钟数，0-1439） */
	time_min: number;
	/** 提醒结束时间（一天中的分钟数，0-1439，可选） */
	end_time_min: number | null;
	/** 是否启用（0 或 1） */
	enabled: number;
	/** 创建时间戳 */
	created_at: number;
	/** 更新时间戳 */
	updated_at: number;
}

/**
 * Habit 数据库模型
 * 表示用户的习惯记录
 */
export interface Habit {
	/** 习惯 ID */
	id: string;
	/** 用户 ID */
	user_id: string;
	/** 习惯标题 */
	title: string;
	/** 习惯描述 */
	description: string | null;
	/** 频率类型：'daily' | 'weekly' */
	frequency_type: string;
	/** 频率数值 */
	frequency_n: number | null;
	/** 是否激活（0 或 1） */
	active: number;
	/** 开始日期（YYYY-MM-DD） */
	start_date: string;
	/** 结束日期（YYYY-MM-DD，可选） */
	end_date: string | null;
	/** 分类 ID */
	category_id: string | null;
	/** 标签（JSON 字符串数组） */
	tags: string | null;
	/** 归档时间戳（NULL 表示未归档） */
	archived_at: number | null;
	/** 创建时间戳 */
	created_at: number;
	/** 更新时间戳 */
	updated_at: number;
}

/**
 * 提醒配置（用于 API 和业务逻辑）
 */
export interface ReminderConfig {
	/** 提醒时间（一天中的分钟数，0-1439） */
	timeMin: number;
	/** 提醒结束时间（一天中的分钟数，0-1439，可选） */
	endTimeMin?: number | null;
	/** 是否启用 */
	enabled?: boolean;
}

/**
 * 提醒验证结果
 */
export interface ReminderValidationResult {
	/** 是否有效 */
	valid: boolean;
	/** 错误信息（如果无效） */
	error?: string;
}

/**
 * Reflection 数据库模型
 * 表示用户的每日反思记录
 */
export interface Reflection {
	/** 反思 ID */
	id: string;
	/** 用户 ID */
	user_id: string;
	/** 日期（YYYY-MM-DD） */
	date_ymd: string;
	/** 主题/标题 */
	title: string | null;
	/** 标签（JSON 字符串） */
	tags: string | null;
	/** 侧边标签（JSON 字符串） */
	side_tags: string | null;
	/** 反思内容 */
	content: string;
	/** 创建时间戳 */
	created_at: number;
	/** 更新时间戳 */
	updated_at: number;
}

/**
 * 反思统计数据
 */
export interface ReflectionStats {
	/** 本周反思天数 */
	weekCount: number;
	/** 本月反思天数 */
	monthCount: number;
	/** 连续反思天数 */
	streakDays: number;
}

/**
 * 洞察统计数据
 */
export interface InsightsStats {
	/** 习惯完成率 */
	habitCompletionRate: number;
	/** 任务完成率 */
	taskCompletionRate: number;
	/** 反思天数 */
	reflectionDays: number;
	/** 当前连续天数 */
	currentStreak: number;
	/** 本周习惯完成率 */
	weekHabitRate: number;
	/** 本月习惯完成率 */
	monthHabitRate: number;
	/** 本周任务完成率 */
	weekTaskRate: number;
	/** 本月任务完成率 */
	monthTaskRate: number;
}

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
	/** 日期 */
	date: string;
	/** 习惯完成率 */
	habitRate: number;
	/** 任务完成率 */
	taskRate: number;
	/** 已完成习惯数 */
	habitDone: number;
	/** 总习惯数 */
	habitTotal: number;
	/** 已完成任务数 */
	taskDone: number;
	/** 总任务数 */
	taskTotal: number;
}

/**
 * 热力图数据点
 */
export interface HeatmapDataPoint {
	/** 日期 */
	date: string;
	/** 完成数量 */
	count: number;
}

/**
 * 时间分布数据点
 */
export interface TimeDistributionPoint {
	/** 小时（0-23） */
	hour: number;
	/** 任务数量 */
	count: number;
}

/**
 * 未完成原因统计
 */
export interface IncompleteReasonStat {
	/** 原因文本 */
	reason: string;
	/** 出现次数 */
	count: number;
	/** 百分比 */
	percentage: number;
	/** 相关项目 */
	items: Array<{
		/** 日期 */
		date: string;
		/** 项目类型 */
		itemType: string;
		/** 项目ID */
		itemId: string;
		/** 项目标题 */
		itemTitle: string;
	}>;
}

/**
 * 关联分析数据点
 */
export interface CorrelationDataPoint {
	/** 日期 */
	date: string;
	/** 习惯完成数 */
	habitCount: number;
	/** 任务完成数 */
	taskCount: number;
}

/**
 * AI洞察结果
 */
export interface AIInsightResult {
	/** 模式识别 */
	patterns: string[];
	/** 优势分析 */
	strengths: string[];
	/** 改进建议 */
	improvements: string[];
	/** 具体行动项 */
	actions: string[];
}

/**
 * 习惯分类模型
 */
export interface HabitCategory {
	/** 分类 ID */
	id: string;
	/** 用户 ID */
	user_id: string;
	/** 分类名称 */
	name: string;
	/** 分类颜色（十六进制） */
	color: string;
	/** 分类图标（可选） */
	icon: string | null;
	/** 排序顺序 */
	sort_order: number;
	/** 创建时间戳 */
	created_at: number;
	/** 更新时间戳 */
	updated_at: number;
}

/**
 * 习惯归档历史模型
 */
export interface HabitArchiveHistory {
	/** 历史记录 ID */
	id: string;
	/** 习惯 ID */
	habit_id: string;
	/** 用户 ID */
	user_id: string;
	/** 操作类型 */
	action: 'archive' | 'restore';
	/** 操作时间戳 */
	timestamp: number;
	/** 备注 */
	note: string | null;
}

/**
 * 带分类信息的习惯
 */
export interface HabitWithCategory extends Habit {
	/** 分类信息 */
	category?: HabitCategory | null;
	/** 解析后的标签数组 */
	parsedTags?: string[];
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
	/** 成功数量 */
	success: number;
	/** 失败数量 */
	failed: number;
	/** 错误详情 */
	errors: Array<{
		/** 习惯 ID */
		habitId: string;
		/** 错误信息 */
		error: string;
	}>;
}

/**
 * 分类统计数据
 */
export interface CategoryStats {
	/** 分类 ID */
	categoryId: string;
	/** 分类名称 */
	categoryName: string;
	/** 分类颜色 */
	categoryColor: string;
	/** 习惯数量 */
	habitCount: number;
	/** 完成率 */
	completionRate: number;
}

/**
 * 标签统计数据
 */
export interface TagStats {
	/** 标签名称 */
	tag: string;
	/** 使用次数 */
	count: number;
	/** 关联的习惯完成率 */
	completionRate?: number;
}
