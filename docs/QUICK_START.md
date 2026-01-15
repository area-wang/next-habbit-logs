# 快速开始指南

> 5分钟快速上手 next-habbit-logs 项目

## 🚀 快速启动

### 1. 克隆项目

```bash
git clone <repository-url>
cd next-habbit-logs
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .dev.vars.example .dev.vars

# 编辑 .dev.vars 文件，添加必要的配置
# SESSION_SECRET=your-secret-here
# AI_API_KEY=your-deepseek-api-key
# AI_API_URL=https://api.deepseek.com
# AI_MODEL=deepseek-chat
```

### 4. 初始化数据库

```bash
# 本地数据库迁移
npm run migrate:local
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 开始使用！

---

## 📱 主要功能

### 今日视图
- 查看今天的习惯和任务
- 快速打卡完成习惯
- 管理每日任务

### 习惯管理
- 创建新习惯
- 设置习惯频率（每日/每周）
- 配置提醒时间
- 查看习惯历史

### 计划管理
- 创建周/月/年计划
- 任务分解和管理
- 进度追踪

### 每日反思
- 记录每日思考
- 三种反思类型（自省、感悟、计划）
- 查看历史反思

### 智能分析
- 完成率趋势图
- 习惯热力图
- AI 洞察和建议
- 数据统计报告

---

## 🔧 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器

# 构建
npm run build            # 构建生产版本
npm run preview          # 本地预览生产版本

# 部署
npm run deploy           # 部署到 Cloudflare（生产环境）
npm run deploy:dev       # 部署到 Cloudflare（开发环境）

# 数据库
npm run migrate:local    # 本地数据库迁移
npm run migrate:dev      # 开发环境数据库迁移
npm run migrate:prod     # 生产环境数据库迁移

# 代码检查
npm run lint             # ESLint 检查
npm run check            # 类型检查
```

---

## 🎯 下一步

### 新用户
1. 注册账号并登录
2. 创建第一个习惯
3. 添加今日任务
4. 完成第一次打卡
5. 写一篇反思

### 开发者
1. 阅读 [RUNBOOK.zh-CN.md](./RUNBOOK.zh-CN.md) 了解详细开发流程
2. 查看 [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) 了解功能规划
3. 浏览 `.kiro/specs/` 目录查看功能规格文档
4. 选择一个功能开始开发

### 运维人员
1. 阅读 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解部署流程
2. 配置 Cloudflare Workers 和 D1 数据库
3. 设置环境变量和 Secrets
4. 执行数据库迁移
5. 部署应用

---

## 💡 提示

### AI 功能配置
AI 功能需要配置 API 密钥才能使用：
- DeepSeek（推荐）: https://platform.deepseek.com/
- OpenAI: https://platform.openai.com/
- Moonshot: https://platform.moonshot.cn/

### 推送通知
后台推送通知需要配置 VAPID 密钥：
```bash
# 生成 VAPID 密钥
npx web-push generate-vapid-keys
```

### 多环境部署
项目支持生产和开发两个环境，详见 [RUNBOOK.zh-CN.md](./RUNBOOK.zh-CN.md) 的多环境部署章节。

---

## 🆘 遇到问题？

1. 查看 [RUNBOOK.zh-CN.md](./RUNBOOK.zh-CN.md) 的常见问题章节
2. 检查环境变量配置是否正确
3. 确认数据库迁移是否成功
4. 查看浏览器控制台和服务器日志

---

## 📚 更多文档

- [完整运行手册](./RUNBOOK.zh-CN.md)
- [部署指南](./DEPLOYMENT.md)
- [功能路线图](./FEATURE_ROADMAP.md)
- [更新日志](./CHANGELOG.md)
- [文档索引](./README.md)

---

**祝你使用愉快！** 🎉
