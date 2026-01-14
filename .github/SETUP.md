# GitHub Actions 设置指南

## 需要配置的 Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. **CLOUDFLARE_API_TOKEN**
   - 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
   - 创建一个新的 API Token
   - 权限需要包括：
     - Account > Cloudflare Pages > Edit
     - Account > D1 > Edit
     - Account > Workers Scripts > Edit

2. **CLOUDFLARE_ACCOUNT_ID**
   - 在 Cloudflare Dashboard 右侧可以找到你的 Account ID
   - 或者运行 `npx wrangler whoami` 查看

## 部署流程

### 自动部署

- **推送到 `main` 分支** → Cloudflare Pages 自动部署到生产环境（已关联 Git）
- **推送到 `develop` 分支** → GitHub Actions 自动部署到开发环境

### 数据库迁移

数据库迁移需要手动触发：

1. 前往 GitHub 仓库的 **Actions** 标签页
2. 选择 **Database Migrations** 工作流
3. 点击 **Run workflow**
4. 选择环境（dev 或 production）
5. 点击 **Run workflow** 确认

## 本地开发

```bash
# 开发环境
npm run dev

# 本地数据库迁移
npx wrangler d1 migrations apply DB --env dev --local

# 远程开发环境迁移
npx wrangler d1 migrations apply DB --env dev --remote

# 生产环境迁移（谨慎操作）
npx wrangler d1 migrations apply DB --remote
```

## 环境说明

| 环境 | 分支 | 部署方式 | Worker 名称 | 数据库 |
|------|------|---------|------------|--------|
| 生产 | main | Cloudflare Pages (Git 自动部署) | next-habbit-logs | habit_database |
| 开发 | develop | GitHub Actions | next-habbit-logs-dev | habit_database_dev |

## 注意事项

1. **数据库迁移**：
   - 迁移是不可逆的，请在生产环境执行前先在开发环境测试
   - 建议在低峰期执行生产环境迁移
   - 执行前建议备份数据

2. **部署顺序**：
   - 如果有数据库变更，先运行迁移，再部署代码
   - 确保代码兼容新旧数据库结构

3. **回滚**：
   - 如果部署出现问题，可以回滚到之前的 commit 并重新推送
   - 数据库迁移无法自动回滚，需要手动处理
