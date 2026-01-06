# next-habbit-logs 运行与部署说明（开发 / 生产）

本文档说明如何在本地（开发模式）与生产环境运行本项目，以及 Cloudflare D1 数据库的初始化/迁移方式。

## 1. 技术栈概览

- Next.js App Router（`next@16`）
- React 19
- 部署目标：Cloudflare Workers（OpenNext 适配器：`@opennextjs/cloudflare`）
- 数据库：Cloudflare D1（SQLite）
- 鉴权：基于 `sessions` 表 + `session` HttpOnly cookie

## 2. 目录结构（关键部分）

- `src/app/`：Next.js App Router
- `src/app/(app)/`：登录后页面（Today / Plans / Habits / History 等）
- `src/app/api/*`：API Routes（任务、习惯、历史、登录等）
- `src/lib/db.ts`：从 Cloudflare runtime env 中获取 D1 绑定（`DB`）
- `migrations/`：D1 SQL 迁移文件
- `wrangler.jsonc`：Cloudflare Workers + D1 绑定配置

## 3. 环境变量 / 运行时配置

### 3.1 Cloudflare 环境绑定（必须）

本项目通过 OpenNext 的 Cloudflare runtime 获取环境变量/绑定：

- **D1 数据库绑定**：`DB`
- **会话密钥**：`SESSION_SECRET`

对应类型定义见 `env.d.ts`，其中包含：

- `DB: D1Database`
- `SESSION_SECRET: string`

> 注意：当前代码里 `SESSION_SECRET` 主要用于确保 env 存在（`void getEnv()`），会话 token hash 使用的是 SHA-256（不依赖 secret）。但**生产环境仍然建议设置一个强随机的 `SESSION_SECRET`**，作为未来扩展/加固的基础。

### 3.2 `.dev.vars` / `.env` 文件

仓库的 `.gitignore` 会忽略：

- `.env*`
- `.dev.vars*`

因此你需要在本地自行创建这些文件。

推荐：

- **开发环境**：使用 `.dev.vars`
- **生产环境**：使用 `wrangler secret put` 配置 secret（不要把 secret 写进仓库）

## 4. 开发环境运行（本地）

### 4.1 安装依赖

```bash
npm install
```

### 4.2 初始化/迁移数据库（Cloudflare D1）

本项目使用 Cloudflare D1（SQLite）。迁移 SQL 在 `migrations/` 目录：

- `migrations/0001_init.sql`
- `migrations/0002_plans_tasks.sql`

#### 方式 A：直接用 `wrangler d1 execute`（推荐）

1) 确认 `wrangler.jsonc` 中已配置 D1 数据库绑定（示例里为 `habit_database`）。

2) 执行迁移：

```bash
npx wrangler d1 execute habit_database --local --file=./migrations/0001_init.sql
npx wrangler d1 execute habit_database --local --file=./migrations/0002_plans_tasks.sql
```

- `--local` 会在本地创建/使用 D1 的本地数据库文件（由 wrangler 管理）。
- 如果你想对远端数据库执行（谨慎），去掉 `--local`。

> 说明：本项目目前没有做“迁移版本表”，所以迁移是以“SQL 可重复执行”为前提（`CREATE TABLE IF NOT EXISTS`）。

#### 方式 B：Cloudflare Dashboard 创建 D1 + 远端执行

1) 在 Cloudflare Dashboard 创建一个 D1 数据库。
2) 把 `wrangler.jsonc` 的 `database_name`/`database_id` 更新为你的数据库。
3) 执行：

```bash
npx wrangler d1 execute habit_database --file=./migrations/0001_init.sql
npx wrangler d1 execute habit_database --file=./migrations/0002_plans_tasks.sql
```

### 4.3 配置开发环境变量

创建 `.dev.vars`（示例，值请自行替换）：

```ini
SESSION_SECRET=change-me-in-dev
```

> D1 的 `DB` 绑定来自 `wrangler.jsonc` 的 `d1_databases` 配置，不需要在 `.dev.vars` 里声明。

### 4.4 启动开发服务器

```bash
npm run dev
```

打开：

- http://localhost:3000

#### 开发环境注意事项

- `next.config.ts` 内调用了 `initOpenNextCloudflareForDev()`，用于在 `next dev` 下支持 `getCloudflareContext()`。
- 如果你同时启用了 PWA/Service Worker，开发环境建议不要注册 SW（本项目已处理 dev 下自动卸载 SW），否则容易出现资源缓存导致的 hydration mismatch。

## 5. 生产环境运行（两种方式）

### 5.1 方式 A：本地以 Next 生产模式运行（`next build && next start`）

适合：仅在本机/自建服务器上跑 Node（不走 Cloudflare）。

```bash
npm run build
npm start
```

注意：

- 本项目的数据层依赖 Cloudflare runtime 的 `getCloudflareContext().env.DB`。
- 因此 **`next start` 在非 Cloudflare 环境下通常无法使用真实 D1**。
- 你目前能跑起来的原因可能是：某些页面没有触发 DB 调用，或你的运行方式仍在 Cloudflare 兼容层内。若要在纯 Node 生产环境使用，需要改造数据库层（不在本文范围）。

### 5.2 方式 B：部署到 Cloudflare Workers（推荐，项目原生目标）

#### 5.2.1 准备 Wrangler

- 确保你已登录 Cloudflare：

```bash
npx wrangler login
```

#### 5.2.2 配置生产 Secret

```bash
npx wrangler secret put SESSION_SECRET
```

#### 5.2.3 初始化/迁移远端 D1

```bash
npx wrangler d1 execute habit_database --file=./migrations/0001_init.sql
npx wrangler d1 execute habit_database --file=./migrations/0002_plans_tasks.sql
```

#### 5.2.4 构建并部署

项目 scripts 已提供：

```bash
npm run deploy
```

它等价于：

- `opennextjs-cloudflare build`
- `opennextjs-cloudflare deploy`

#### 5.2.5 部署后验证

- 打开部署 URL
- 注册账号/登录
- 在 Today/Plans 创建任务，刷新页面确认 session cookie 正常

## 6. 数据库表说明（摘要）

迁移文件包含以下主要表：

- `users`
- `sessions`
- `habits`
- `habit_checkins`
- `daily_states`
- `tasks`

其中：

- `sessions.token_hash`：保存会话 token 的 hash
- `habit_checkins`：按 `habit_id + date_ymd` 唯一
- `tasks`：按 `user_id + scope_type + scope_key` 查询（day/week/month/year）

## 7. 常见问题（排查）

### 7.1 Hydration Recoverable Error（开发环境普通刷新才出现）

常见原因是 Service Worker/缓存导致 HTML 与 JS 版本不一致。建议：

- 开发环境不要注册 SW
- DevTools -> Application 清掉站点缓存/卸载 SW

### 7.2 通知提醒不生效

提醒目前是“页面打开时用 `setTimeout` 调度 Notification”，不是后台常驻。

验证方式：

- 确认浏览器通知权限为 granted
- 任务必须为 todo 且设置开始时间
- 提醒触发时间必须在未来

## 8. 命令速查

- 开发：`npm run dev`
- 生产构建：`npm run build`
- 本地预览 Cloudflare Worker（OpenNext）：`npm run preview`
- 部署 Cloudflare：`npm run deploy`
- 生成 Cloudflare env 类型：`npm run cf-typegen`
