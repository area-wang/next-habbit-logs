PRAGMA foreign_keys = ON;

-- 添加 side_tags 字段用于存储侧边标签
-- 格式: JSON array of {id, text, side, y, angle}
ALTER TABLE reflections ADD COLUMN side_tags TEXT DEFAULT '[]';
