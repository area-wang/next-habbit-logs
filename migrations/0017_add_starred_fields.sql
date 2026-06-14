-- 添加星标功能
-- 为习惯和任务添加 starred 字段

PRAGMA foreign_keys = ON;

-- 1. 为 habits 表添加 starred 字段
ALTER TABLE habits ADD COLUMN starred INTEGER NOT NULL DEFAULT 0;

-- 2. 为 tasks 表添加 starred 字段
ALTER TABLE tasks ADD COLUMN starred INTEGER NOT NULL DEFAULT 0;

-- 3. 创建索引以优化星标项的查询性能
CREATE INDEX IF NOT EXISTS idx_habits_starred ON habits(user_id, starred, archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_starred ON tasks(user_id, starred, scope_type, scope_key);
