# Next.js Framework Starter

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/next-starter-template)

<!-- dash-content-start -->

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). It's deployed on Cloudflare Workers as a [static website](https://developers.cloudflare.com/workers/static-assets/).

This template uses [OpenNext](https://opennext.js.org/) via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare), which works by taking the Next.js build output and transforming it, so that it can run in Cloudflare Workers.

<!-- dash-content-end -->

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/next-starter-template
```

A live public deployment of this template is available at [https://next-starter-template.templates.workers.dev](https://next-starter-template.templates.workers.dev)

## Getting Started

First, run:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### Configure AI (Optional)

The insights page includes AI-powered features. To enable them:

1. Copy `.dev.vars.example` to `.dev.vars`:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edit `.dev.vars` and add your AI API credentials:
   ```
   AI_API_KEY=your_api_key_here
   AI_API_URL=https://api.deepseek.com
   AI_MODEL=deepseek-chat
   ```

3. Supported AI providers:
   - **DeepSeek** (default): https://platform.deepseek.com/
   - **OpenAI**: https://platform.openai.com/
   - **Moonshot**: https://platform.moonshot.cn/
   - **Any OpenAI-compatible API**

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production configuration.

Then run the development server (using the package manager of your choice):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Deploying To Production

| Command                           | Action                                       |
| :-------------------------------- | :------------------------------------------- |
| `npm run build`                   | Build your production site                   |
| `npm run preview`                 | Preview your build locally, before deploying |
| `npm run build && npm run deploy` | Deploy your production site to Cloudflare    |
| `npm wrangler tail`               | View real-time logs for all Workers          |

## 📚 Documentation

- **[docs/RUNBOOK.zh-CN.md](docs/RUNBOOK.zh-CN.md)** - 完整的运行手册（中文）
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - 生产环境部署指南
- **[docs/FEATURE_ROADMAP.md](docs/FEATURE_ROADMAP.md)** - 功能路线图与改进建议
- **[docs/README.md](docs/README.md)** - 文档索引

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!
