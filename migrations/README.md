# 数据库迁移指南

本文档说明如何在不同环境中执行数据库迁移。

## 迁移文件列表

所有迁移文件按顺序编号，必须按顺序执行：

1. `0001_init.sql` - 初始化数据库（用户、会话、习惯、打卡、每日状态）
2. `0002_plans_tasks.sql` - 添加任务/计划功能
3. `0003_push_reminders.sql` - 添加推送通知和提醒功能
4. `0004_reminders_unique.sql` - 添加提醒唯一索引
5. `0005_daily_item_notes.sql` - 添加每日项目笔记
6. `0006_habits_date_range.sql` - 为习惯添加日期范围字段
7. `0007_scheduled_jobs.sql` - 添加定时任务表
8. `0008_reminder_end_time.sql` - 为提醒添加结束时间字段
9. `0009_reflections.sql` - 添加反思/日记功能
10. `0010_reflections_update_tags.sql` - 更新反思标签
11. `0011_reflections_add_title.sql` - 为反思添加标题字段
12. `0012_reflections_side_tags.sql` - 添加反思侧边标签
13. `0013_reflections_add_page.sql` - 为反思添加页面字段
14. `0014_remove_page_fields.sql` - 移除页面相关字段
15. `0015_habit_management_enhancement.sql` - 习惯管理增强（分类、归档等）
16. `0016_custom_plan_tabs.sql` - 自定义计划标签页

## 执行迁移

### 方法 1：使用 Wrangler 自动迁移（推荐）

Wrangler 会自动跟踪已执行的迁移，只执行未执行的迁移。

#### 本地开发环境
```bash
npx wrangler d1 migrations apply DB --local
```

#### Dev 环境（远程）
```bash
npx wrangler d1 migrations apply habit_database_dev --env=dev --remote
```

#### 正式环境（远程）
```bash
npx wrangler d1 migrations apply DB --remote
```

### 方法 2：手动执行单个迁移文件

如果需要手动执行特定的迁移文件：

```bash
# 本地环境
npx wrangler d1 execute DB --local --file=./migrations/0001_init.sql

# Dev 环境
npx wrangler d1 execute habit_database_dev --env=dev --remote --file=./migrations/0001_init.sql

# 正式环境
npx wrangler d1 execute DB --remote --file=./migrations/0001_init.sql
```

### 方法 3：执行所有迁移（新环境初始化）

如果是全新的环境，可以使用 `all_migrations.sql` 文件一次性执行所有迁移：

```bash
# 本地环境
npx wrangler d1 execute DB --local --file=./migrations/all_migrations.sql

# Dev 环境
npx wrangler d1 execute habit_database_dev --env=dev --remote --file=./migrations/all_migrations.sql

# 正式环境
npx wrangler d1 execute DB --remote --file=./migrations/all_migrations.sql
```

**注意**：使用 `all_migrations.sql` 后，需要手动更新 `d1_migrations` 表，标记所有迁移为已完成。

## 验证迁移状态

### 查看已执行的迁移
```bash
# 本地环境
npx wrangler d1 execute DB --local --command="SELECT * FROM d1_migrations ORDER BY id;"

# Dev 环境
npx wrangler d1 execute habit_database_dev --env=dev --remote --command="SELECT * FROM d1_migrations ORDER BY id;"

# 正式环境
npx wrangler d1 execute DB --remote --command="SELECT * FROM d1_migrations ORDER BY id;"
```

### 查看所有表
```bash
# 本地环境
npx wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# Dev 环境
npx wrangler d1 execute habit_database_dev --env=dev --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

# 正式环境
npx wrangler d1 execute DB --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

### 查看特定表的结构
```bash
# 例如查看 habits 表的结构
npx wrangler d1 execute DB --remote --command="PRAGMA table_info(habits);"
```

## 常见问题

### 问题 1：迁移失败 - 列已存在

**错误信息**：`duplicate column name: xxx`

**原因**：SQLite 的 `ALTER TABLE ADD COLUMN` 不支持 `IF NOT EXISTS`，如果列已存在会报错。

**解决方案**：
1. 检查列是否已存在：
   ```bash
   npx wrangler d1 execute DB --remote --command="PRAGMA table_info(表名);"
   ```
2. 如果列已存在，手动标记该迁移为已完成：
   ```bash
   npx wrangler d1 execute DB --remote --command="INSERT INTO d1_migrations (id, name, applied_at) VALUES (迁移编号, '迁移文件名.sql', datetime('now'));"
   ```
3. 然后继续执行剩余的迁移

### 问题 2：如何回滚迁移

Wrangler D1 目前不支持自动回滚。如果需要回滚：
1. 手动编写回滚 SQL（删除表、删除列等）
2. 从 `d1_migrations` 表中删除对应的记录
3. 谨慎操作，建议先在本地环境测试

### 问题 3：迁移顺序错误

迁移必须按编号顺序执行。如果跳过了某个迁移，可能会导致后续迁移失败。

**解决方案**：
1. 查看 `d1_migrations` 表，确认哪些迁移已执行
2. 按顺序执行缺失的迁移

## 最佳实践

1. **始终使用 Wrangler 自动迁移**：`npx wrangler d1 migrations apply` 会自动跟踪迁移状态
2. **迁移前备份**：在正式环境执行迁移前，先导出数据备份
3. **先在 Dev 环境测试**：新迁移先在 Dev 环境测试，确认无误后再应用到正式环境
4. **不要修改已执行的迁移文件**：如果需要修改，创建新的迁移文件
5. **使用 `IF NOT EXISTS`**：在 `CREATE TABLE` 和 `CREATE INDEX` 时使用 `IF NOT EXISTS`，使迁移幂等
6. **记录迁移原因**：在迁移文件中添加注释，说明为什么需要这个迁移

## 环境配置

项目中配置了三个数据库环境：

- **本地环境**：使用 `--local` 标志，数据存储在本地 `.wrangler` 目录
- **Dev 环境**：`habit_database_dev` (ID: 3dfc7b58-99bf-4255-bdea-251c78cb5e9b)
- **正式环境**：`habit_database` (ID: 36355db4-979e-45fb-a4e8-ee3f3f404296)

配置文件：`wrangler.jsonc`
