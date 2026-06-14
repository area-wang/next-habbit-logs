-- 习惯动力和行动记录功能
-- 添加动力（Why）和行动记录（Progress）功能

PRAGMA foreign_keys = ON;

-- 1. 习惯动力表
CREATE TABLE IF NOT EXISTS habit_motivations (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. 习惯行动记录表
CREATE TABLE IF NOT EXISTS habit_action_logs (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  mood INTEGER, -- 1=困难, 2=一般, 3=顺利
  is_milestone INTEGER NOT NULL DEFAULT 0, -- 0或1
  linked_date TEXT, -- 关联的打卡日期 YYYY-MM-DD
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 计划动力表
CREATE TABLE IF NOT EXISTS task_motivations (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 计划行动记录表
CREATE TABLE IF NOT EXISTS task_action_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  mood INTEGER,
  is_milestone INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_habit_motivations_habit ON habit_motivations(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_motivations_user ON habit_motivations(user_id, habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_motivations_sort ON habit_motivations(habit_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_habit_action_logs_habit ON habit_action_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_action_logs_user ON habit_action_logs(user_id, habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_action_logs_date ON habit_action_logs(habit_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_habit_action_logs_milestone ON habit_action_logs(habit_id, is_milestone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_motivations_task ON task_motivations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_motivations_user ON task_motivations(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_task_motivations_sort ON task_motivations(task_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_task_action_logs_task ON task_action_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_action_logs_user ON task_action_logs(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_task_action_logs_date ON task_action_logs(task_id, created_at DESC);
