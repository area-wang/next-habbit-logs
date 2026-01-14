PRAGMA foreign_keys = ON;

-- 添加 end_time_min 字段到 reminders 表（如果不存在）
-- SQLite 不支持 IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- 所以我们需要检查并处理错误
-- 如果字段已存在，这个语句会失败，但不会影响数据

-- 尝试添加字段（如果已存在会失败，但可以忽略）
ALTER TABLE reminders ADD COLUMN end_time_min INTEGER;

-- 为 end_time_min 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_reminders_end_time 
ON reminders(user_id, target_type, target_id, end_time_min);
