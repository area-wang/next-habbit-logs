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
