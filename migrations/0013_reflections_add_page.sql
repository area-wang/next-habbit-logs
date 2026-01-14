PRAGMA foreign_keys = ON;

-- 添加 page_number 字段用于支持多页
ALTER TABLE reflections ADD COLUMN page_number INTEGER DEFAULT 1;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_reflections_user_date_page ON reflections(user_id, date_ymd, page_number);
