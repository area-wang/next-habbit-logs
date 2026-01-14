-- 移除分页相关的多余字段
-- 注意：SQLite 不支持直接 DROP COLUMN，需要重建表

PRAGMA foreign_keys = OFF;

-- 删除旧索引
DROP INDEX IF EXISTS idx_reflections_user_date_page;
DROP INDEX IF EXISTS idx_reflections_user_date;
DROP INDEX IF EXISTS idx_reflections_date;
DROP INDEX IF EXISTS idx_reflections_created;

-- 创建新表（不包含 page_number 字段）
CREATE TABLE reflections_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date_ymd TEXT NOT NULL,
    title TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    side_tags TEXT NOT NULL DEFAULT '[]',
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 复制数据（保留所有记录）
INSERT INTO reflections_new (id, user_id, date_ymd, title, tags, side_tags, content, created_at, updated_at)
SELECT id, user_id, date_ymd, title, tags, side_tags, content, created_at, updated_at
FROM reflections;

-- 删除旧表
DROP TABLE reflections;

-- 重命名新表
ALTER TABLE reflections_new RENAME TO reflections;

-- 重建索引
CREATE INDEX idx_reflections_user_date ON reflections(user_id, date_ymd);
CREATE INDEX idx_reflections_created ON reflections(created_at);

PRAGMA foreign_keys = ON;
