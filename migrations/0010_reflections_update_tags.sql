PRAGMA foreign_keys = ON;

-- 这个迁移文件原本是为了从 type 字段迁移到 tags 字段
-- 但实际上初始表结构（0009）就已经有 tags 字段了
-- 所以这个迁移实际上不需要做任何事情

-- 确保 tags 字段有默认值（如果表已存在但字段为 NULL）
-- 这是一个安全的操作，不会影响已有数据
UPDATE reflections SET tags = '[]' WHERE tags IS NULL;
