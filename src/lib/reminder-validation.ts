import type { ReminderConfig, ReminderValidationResult } from "./types";

/**
 * 验证提醒配置
 * @param reminder 提醒配置对象
 * @returns 验证结果
 */
export function validateReminder(reminder: ReminderConfig): ReminderValidationResult {
	// 验证 timeMin 范围
	if (!Number.isFinite(reminder.timeMin) || reminder.timeMin < 0 || reminder.timeMin > 1439) {
		return { valid: false, error: "invalid timeMin" };
	}

	// 验证 endTimeMin（如果提供）
	if (reminder.endTimeMin != null) {
		if (!Number.isFinite(reminder.endTimeMin) || reminder.endTimeMin < 0 || reminder.endTimeMin > 1439) {
			return { valid: false, error: "invalid endTimeMin" };
		}

		// endTimeMin 必须大于 timeMin
		if (reminder.endTimeMin <= reminder.timeMin) {
			return { valid: false, error: "endTimeMin must be greater than timeMin" };
		}
	}

	return { valid: true };
}
