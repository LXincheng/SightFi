# SightFi

简约、直觉、极客感的 AI 金融监控与研究辅助 Web App。

## 本地开发

```bash
cp .env.example .env
pnpm install
pnpm dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- 健康检查: `http://localhost:3000/health`
- `pnpm dev` 行为：先启动 API，健康检查通过后再启动 Web
- 统一日志前缀：`[api]`、`[web]`、`[monitor]`、`[dev]`

## 质量检查

```bash
pnpm db:check
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

- `pnpm db:check`：验证 Prisma 与 Supabase 的双向读写一致性

## 一键部署（Docker）

```bash
cp .env.production.example .env.production
pnpm deploy:up
```

- Web: `http://localhost:8080`
- API: `http://localhost:3000`
- 查看日志: `pnpm deploy:logs`
- 停止服务: `pnpm deploy:down`

## Monorepo 结构

```text
apps/
  web/
    src/
      app/                # 应用入口与路由装配（含 layout）
      features/           # 按业务域拆分页面
      shared/             # hooks/services/constants/ui 共享层
  api/
    src/
      core/               # config/env/database/integrations 基础设施层
      modules/            # ai/news/market/system/health/mock 业务模块
packages/
  shared/     # 前后端共享类型
  config/     # 共享 TypeScript 配置
docs/         # 产品与工程文档（从 docs/README.md 进入）
scripts/      # 开发编排脚本
```

## 文档入口

所有产品与工程文档统一放在 `docs/`，从 `docs/README.md` 进入即可。
