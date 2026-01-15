# 部署指南

## 快速开始

### 1. 配置 GitHub Secrets

在 GitHub 仓库设置中添加：
- `CLOUDFLARE_API_TOKEN` - Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare Account ID

详细步骤见 [.github/SETUP.md](.github/SETUP.md)

### 2. 分支策略

```
main (生产环境 - Cloudflare Pages 自动部署)
  ↑
develop (开发环境 - GitHub Actions 自动部署)
  ↑
feature/* (功能分支)
```

### 3. 部署流程

#### 开发环境部署
```bash
# 1. 创建功能分支
git checkout -b feature/your-feature

# 2. 开发完成后合并到 develop
git checkout develop
git merge feature/your-feature
git push origin develop

# 3. GitHub Actions 自动部署到开发环境
```

#### 生产环境部署
```bash
# 1. 从 develop 合并到 main
git checkout main
git merge develop
git push origin main

# 2. Cloudflare Pages 自动部署到生产环境（已关联 Git）
```

### 4. 数据库迁移

#### 本地测试
```bash
npm run migrate:local
```

#### 开发环境
```bash
# 方式1：使用 npm script
npm run migrate:dev

# 方式2：使用 GitHub Actions（推荐）
# 前往 GitHub Actions → Database Migrations → Run workflow → 选择 dev
```

#### 生产环境
```bash
# 使用 GitHub Actions（推荐）
# 前往 GitHub Actions → Database Migrations → Run workflow → 选择 production

# 或者本地执行（需要权限）
npm run migrate:prod
```

## 常用命令

```bash
# 本地开发
npm run dev

# 构建
npm run build

# 类型检查
npm run check

# 代码检查
npm run lint

# 本地预览（开发环境配置）
npm run preview:dev

# 本地预览（生产环境配置）
npm run preview

# 数据库迁移
npm run migrate:local   # 本地数据库
npm run migrate:dev     # 开发环境
npm run migrate:prod    # 生产环境
```

## 环境变量

### 必需的环境变量

| 环境 | 部署方式 | Worker 名称 | 数据库 |
|------|---------|------------|--------|
| 生产 | Cloudflare Pages (Git 自动部署) | next-habbit-logs | habit_database |
| 开发 | GitHub Actions | next-habbit-logs-dev | habit_database_dev |

### AI 配置（可选）

分析页面的AI功能需要配置大模型API：

1. **获取API密钥**：
   
   支持的大模型：
   - **DeepSeek**：访问 [DeepSeek官网](https://platform.deepseek.com/) 注册并获取API密钥
   - **OpenAI**：访问 [OpenAI官网](https://platform.openai.com/) 获取API密钥
   - **其他兼容OpenAI格式的大模型**：如Moonshot、智谱AI等

2. **配置环境变量**：
   
   在Cloudflare Dashboard中配置：
   - 进入 Workers & Pages → 选择你的项目 → Settings → Environment Variables
   - 添加以下变量：
     - `AI_API_KEY`：你的大模型API密钥（必需）
     - `AI_API_URL`：API地址（可选，默认为 https://api.deepseek.com）
     - `AI_MODEL`：模型名称（可选，默认为 deepseek-chat）

3. **本地开发配置**：
   
   创建 `.dev.vars` 文件（已在 .gitignore 中）：
   ```
   AI_API_KEY=your_api_key_here
   AI_API_URL=https://api.deepseek.com
   AI_MODEL=deepseek-chat
   ```

4. **不同大模型配置示例**：
   
   **DeepSeek**（默认）：
   ```
   AI_API_KEY=sk-xxx
   AI_API_URL=https://api.deepseek.com
   AI_MODEL=deepseek-chat
   ```
   
   **OpenAI**：
   ```
   AI_API_KEY=sk-xxx
   AI_API_URL=https://api.openai.com
   AI_MODEL=gpt-4
   ```
   
   **Moonshot**：
   ```
   AI_API_KEY=sk-xxx
   AI_API_URL=https://api.moonshot.cn
   AI_MODEL=moonshot-v1-8k
   ```

5. **功能说明**：
   - 如果未配置API密钥，AI功能将显示配置提示
   - 其他分析功能（图表、统计）不受影响
   - AI功能包括：智能洞察、未完成原因分析、关联分析解读、报告总结

6. **兼容性说明**：
   - 为了向后兼容，系统仍支持旧的环境变量名：
     - `DEEPSEEK_API_KEY` → `AI_API_KEY`
     - `DEEPSEEK_API_URL` → `AI_API_URL`
   - 建议使用新的环境变量名以支持多种大模型

## 注意事项

1. **数据库迁移顺序**：
   - ✅ 先运行迁移
   - ✅ 再部署代码

2. **生产环境部署**：
   - 生产环境通过 Cloudflare Pages 自动部署（已关联 Git）
   - 只需推送到 main 分支即可
   - 先在开发环境测试
   - 确认无误后再合并到 main

3. **开发环境部署**：
   - 通过 GitHub Actions 自动部署
   - 推送到 develop 分支即可

4. **回滚**：
   - 代码回滚：回退 commit 并重新推送
   - 数据库回滚：需要手动处理（迁移不可逆）

5. **监控**：
   - 部署后检查 Cloudflare Dashboard 的日志
   - 确认应用正常运行
