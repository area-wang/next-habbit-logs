-- 自定义计划 Tab
CREATE TABLE IF NOT EXISTS custom_plan_tabs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('day', 'week', 'month', 'year', 'custom')),
  scope_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_plan_tabs_user ON custom_plan_tabs(user_id, sort_order);
