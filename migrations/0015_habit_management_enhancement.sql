-- 习惯管理增强功能迁移
-- 添加分类、标签和归档功能

PRAGMA foreign_keys = ON;

-- 1. 扩展 habits 表，添加新字段
ALTER TABLE habits ADD COLUMN category_id TEXT;
ALTER TABLE habits ADD COLUMN tags TEXT;  -- JSON 数组格式: ["标签1", "标签2"]
ALTER TABLE habits ADD COLUMN archived_at INTEGER;  -- 归档时间戳，NULL 表示未归档

-- 2. 创建习惯分类表
CREATE TABLE IF NOT EXISTS habit_categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,  -- 十六进制颜色值，如 #FF5733
  icon TEXT,  -- 可选的图标名称或 emoji
  sort_order INTEGER NOT NULL DEFAULT 0,  -- 排序顺序
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, name)  -- 同一用户的分类名称唯一
);

-- 3. 创建习惯归档历史表
CREATE TABLE IF NOT EXISTS habit_archive_history (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'archive' 或 'restore'
  timestamp INTEGER NOT NULL,
  note TEXT,  -- 可选的备注信息
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 创建索引以优化查询性能

-- habits 表索引
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(category_id);
CREATE INDEX IF NOT EXISTS idx_habits_archived ON habits(archived_at);
CREATE INDEX IF NOT EXISTS idx_habits_user_archived ON habits(user_id, archived_at);

-- habit_categories 表索引
CREATE INDEX IF NOT EXISTS idx_habit_categories_user ON habit_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_categories_sort ON habit_categories(user_id, sort_order);

-- habit_archive_history 表索引
CREATE INDEX IF NOT EXISTS idx_archive_history_habit ON habit_archive_history(habit_id);
CREATE INDEX IF NOT EXISTS idx_archive_history_user ON habit_archive_history(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_archive_history_user_habit ON habit_archive_history(user_id, habit_id);

-- 5. 为每个现有用户创建默认分类
-- 注意：这部分需要在应用层执行，因为需要生成 UUID
-- 默认分类：健康、学习、工作、生活、其他
