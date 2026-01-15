# next-habbit-logs 运行与部署说明（开发 / 生产）

本文档说明如何在本地（开发模式）与生产环境运行本项目，以及 Cloudflare D1 数据库的初始化/迁移方式。

## 1. 技术栈概览

- Next.js App Router（`next@16`）
- React 19
- 部署目标：Cloudflare Workers（OpenNext 适配器：`@opennextjs/cloudflare`）
- 数据库：Cloudflare D1（SQLite）
- 鉴权：基于 `sessions` 表 + `session` HttpOnly cookie

## 1.1 提醒能力（前台 vs 后台）

- **前台提醒**：页面打开时，使用 `setTimeout + Notification` 调度（不后台常驻）
- **后台提醒**：页面关闭/后台也能提醒，依赖 **Web Push + Cloudflare Workers Cron Trigger**

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

#### 3.1.1 后台 Push 提醒相关（必须）

后台提醒需要 Web Push 的 VAPID 配置（Worker 运行时读取）：

- **VAPID subject**：`VAPID_SUBJECT`（例如 `mailto:you@example.com` 或 `https://your.domain`）
- **VAPID 公钥**：`VAPID_SERVER_PUBLIC_KEY`（Base64URL）
- **VAPID 私钥**：`VAPID_SERVER_PRIVATE_KEY`（Base64URL）

并且建议配置：

- **站点 Origin**：`APP_ORIGIN`（例如 `https://your-app.workers.dev`），用于推送通知点击跳转

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

如果要在开发环境体验“后台提醒”，也需要在 `.dev.vars` 里提供 VAPID 相关变量。

#### 3.2.1 生成 VAPID Keys

可以用 `web-push` CLI 生成（仅用于生成 key，不会写入仓库）：

```bash
npx web-push generate-vapid-keys
```

输出会包含 `Public Key` 与 `Private Key`，把它们分别填入：

- `VAPID_SERVER_PUBLIC_KEY`
- `VAPID_SERVER_PRIVATE_KEY`

## 4. 开发环境运行（本地）

### 4.1 安装依赖

```bash
npm install
```

### 4.2 初始化/迁移数据库（Cloudflare D1）

本项目使用 Cloudflare D1（SQLite）。迁移 SQL 在 `migrations/` 目录：

- `migrations/0001_init.sql`
- `migrations/0002_plans_tasks.sql`
- `migrations/0003_push_reminders.sql`
- `migrations/0004_reminders_unique.sql`
- `migrations/0005_daily_item_notes.sql`
- `migrations/0006_habits_date_range.sql`

#### 方式 A：直接用 `wrangler d1 execute`（推荐）

1) 确认 `wrangler.jsonc` 中已配置 D1 数据库绑定（示例里为 `habit_database`）。

2) 执行迁移：

```bash
npx wrangler d1 execute habit_database --local --file=./migrations/0001_init.sql
npx wrangler d1 execute habit_database --local --file=./migrations/0002_plans_tasks.sql
npx wrangler d1 execute habit_database --local --file=./migrations/0003_push_reminders.sql
npx wrangler d1 execute habit_database --local --file=./migrations/0004_reminders_unique.sql
npx wrangler d1 execute habit_database --local --file=./migrations/0005_daily_item_notes.sql
npx wrangler d1 execute habit_database --local --file=./migrations/0006_habits_date_range.sql
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
npx wrangler d1 execute habit_database --file=./migrations/0003_push_reminders.sql
npx wrangler d1 execute habit_database --file=./migrations/0004_reminders_unique.sql
npx wrangler d1 execute habit_database --file=./migrations/0005_daily_item_notes.sql
npx wrangler d1 execute habit_database --file=./migrations/0006_habits_date_range.sql
```

### 4.3 配置开发环境变量

创建 `.dev.vars`（示例，值请自行替换）：

```ini
SESSION_SECRET=change-me-in-dev
APP_ORIGIN=http://localhost:8787
VAPID_SUBJECT=mailto:dev@example.com
VAPID_SERVER_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
VAPID_SERVER_PRIVATE_KEY=YOUR_VAPID_PRIVATE_KEY
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

#### 后台提醒（开发）如何验证

`next dev` 下 **不会触发** Cloudflare Worker 的 `scheduled()`，因此后台提醒需要用 Wrangler/Worker 方式运行。

- 方式 A（推荐）：
  - `npm run preview`
  - 然后用 Cloudflare Dashboard 配置 Cron（或生产环境测试）

- 方式 B（本地触发 scheduled，用于调试）：
  - `npm install`
  - `npm run preview`（生成 `.open-next`）
  - 另开终端运行 `npx wrangler dev --test-scheduled`

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
npx wrangler secret put VAPID_SUBJECT
npx wrangler secret put VAPID_SERVER_PUBLIC_KEY
npx wrangler secret put VAPID_SERVER_PRIVATE_KEY
```

`APP_ORIGIN` 建议配置为变量（非 secret），可在 Cloudflare Dashboard 或 wrangler 配置中设置。

#### 5.2.3 初始化/迁移远端 D1

```bash
npx wrangler d1 execute habit_database --file=./migrations/0001_init.sql
npx wrangler d1 execute habit_database --file=./migrations/0002_plans_tasks.sql
npx wrangler d1 execute habit_database --file=./migrations/0003_push_reminders.sql
npx wrangler d1 execute habit_database --file=./migrations/0004_reminders_unique.sql
npx wrangler d1 execute habit_database --file=./migrations/0005_daily_item_notes.sql
npx wrangler d1 execute habit_database --file=./migrations/0006_habits_date_range.sql
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

后台提醒验证：

- 在 Today 页面开启“提醒”（会触发浏览器 Push 订阅并写入 `push_subscriptions`）
- 创建一个 **待办** 任务并设置开始时间 + 提前提醒分钟
- 等待 Cloudflare Cron 每分钟触发（或手动触发 scheduled 进行调试）
- 预期：到点后即使页面关闭也能收到系统通知；点击通知会跳转到对应任务/习惯

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

提醒分为两类：

- 前台提醒：页面打开时用 `setTimeout` 调度 Notification
- 后台提醒：依赖 Web Push + Worker Cron

验证方式：

- 确认浏览器通知权限为 granted
- 任务必须为 todo 且设置开始时间
- 提醒触发时间必须在未来

后台提醒额外检查：

- 是否已经执行了 `0003_push_reminders.sql`
- 是否在页面开启提醒后成功写入 `push_subscriptions`
- Cloudflare Worker 是否启用了 Cron Trigger（`wrangler.jsonc` 已配置 `* * * * *`）
- 是否配置了 `VAPID_*` 与 `APP_ORIGIN`

## 8. 多环境部署（生产 / 开发环境）

本项目支持多环境部署，通过 `wrangler.jsonc` 的 `env` 配置区分生产和开发环境。

### 8.1 环境配置

`wrangler.jsonc` 中定义了两个环境：

| 环境 | Worker 名称 | D1 数据库 | 用途 |
|------|-------------|-----------|------|
| 生产（默认） | `next-habbit-logs` | `habit_database` | main 分支 |
| 开发 | `next-habbit-logs-dev` | `habit_database_dev` | develop 分支 |

### 8.2 创建开发环境 D1 数据库

```bash
npx wrangler d1 create habit_database_dev
```

执行后会返回 `database_id`，更新到 `wrangler.jsonc` 的 `env.dev.d1_databases` 中。

### 8.3 开发环境数据库迁移

**本地迁移**：
```bash
npx wrangler d1 migrations apply DB --env dev
```

**远程迁移**：
```bash
npx wrangler d1 migrations apply DB --env dev --remote
```

### 8.4 开发环境 Secrets 配置

为开发环境设置 secrets：

```bash
npx wrangler secret put APP_ORIGIN --env dev
npx wrangler secret put SESSION_SECRET --env dev
npx wrangler secret put VAPID_SUBJECT --env dev
npx wrangler secret put VAPID_SERVER_PUBLIC_KEY --env dev
npx wrangler secret put VAPID_SERVER_PRIVATE_KEY --env dev
```

**生成新的密钥**：

```bash
# 生成 SESSION_SECRET
openssl rand -base64 32

# 生成 VAPID 密钥对
npx web-push generate-vapid-keys
```

> 注意：开发环境建议使用独立的 VAPID 密钥对，与生产环境隔离。

### 8.5 部署到开发环境

**方式一：使用环境变量**（推荐）
```bash
npx opennextjs-cloudflare build
CLOUDFLARE_ENV=dev npx wrangler deploy
```

### 8.6 Cloudflare Git 集成配置

如果使用 Cloudflare 的 Git 集成自动部署：

**生产分支（main）**：
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx wrangler deploy --env=""`

**非生产分支（develop 等）**：
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `CLOUDFLARE_ENV=dev npx wrangler deploy`

### 8.7 本地开发切换环境

本地开发时，可以创建环境特定的变量文件：

- `.dev.vars` - 默认开发变量
- `.dev.vars.dev` - dev 环境特定变量

启动时指定环境：
```bash
CLOUDFLARE_ENV=dev npm run preview
```

## 9. 命令速查

- 开发：`npm run dev`
- 生产构建：`npm run build`
- 本地预览 Cloudflare Worker（OpenNext）：`npm run preview`
- 部署 Cloudflare（生产）：`npm run deploy`
- 部署 Cloudflare（开发）：`CLOUDFLARE_ENV=dev npx opennextjs-cloudflare deploy`
- 生成 Cloudflare env 类型：`npm run cf-typegen`
- 数据库迁移（开发环境本地）：`npx wrangler d1 migrations apply DB --env dev`
- 数据库迁移（开发环境远程）：`npx wrangler d1 migrations apply DB --env dev --remote`
