# SightFi 变更日志（Log）

> 目标：让每次架构与需求决策可追溯、可回放、可审计。  
> 更新时间：2026-03-03

## 1. 快速概览

| ID      | 日期       | 类型     | 主题                                | 影响范围                                 | 状态        |
| ------- | ---------- | -------- | ----------------------------------- | ---------------------------------------- | ----------- |
| LOG-001 | 2026-03-02 | Decision | 建立 docs 文档基线                  | `docs/*`、README                         | Done        |
| LOG-002 | 2026-03-02 | Decision | 采用轻量 Monorepo                   | `apps/*`、`packages/*`                   | Done        |
| LOG-003 | 2026-03-02 | Decision | AI 输出采用证据化结构               | API 输出契约、前端展示                   | Done        |
| LOG-004 | 2026-03-02 | Decision | Figma MCP 拉取验证通过              | UI 信息架构约束                          | Done        |
| LOG-005 | 2026-03-02 | Change   | Phase 0 骨架落地                    | Web/API/Shared/Config                    | Done        |
| LOG-006 | 2026-03-02 | Change   | Dev 启动编排与监控                  | `scripts/dev.mjs`、根脚本                | Done        |
| LOG-007 | 2026-03-02 | Change   | P0-04 数据层与接口预留推进          | Prisma/Supabase/AI 接口                  | In Progress |
| LOG-008 | 2026-03-02 | Change   | 常量/文案/提示词抽离与配置集中      | Web/API 配置层、i18n、docs               | Done        |
| LOG-009 | 2026-03-02 | Change   | 生产部署骨架与主备 AI 配置落地      | Docker/Compose/.env/AI 路由              | Done        |
| LOG-010 | 2026-03-02 | Change   | PRD 约束映射到执行计划              | plan 任务、质量闸门、回归清单            | Done        |
| LOG-011 | 2026-03-02 | Change   | Phase 0 全流程闭环验收              | Prisma/Supabase/PWA/CI/质量闸门          | Done        |
| LOG-012 | 2026-03-02 | Change   | Phase 1 启动：多数据源适配与文档化  | 行情/新闻 Provider、配置、文档           | Done        |
| LOG-013 | 2026-03-03 | Change   | Phase 1 联动：事实提取+SSE 实时行情 | BFF 提取层、SSE、前端实时看板            | Done        |
| LOG-014 | 2026-03-03 | Change   | 工程结构重构与常量集中治理          | 前后端目录分层、页面拆分、copy 常量      | Done        |
| LOG-015 | 2026-03-03 | Change   | 冗余清理与前端继续解耦              | 空目录清理、App 壳拆分、依赖精简         | Done        |
| LOG-016 | 2026-03-03 | Change   | 前端视觉重建（基于 figma-proto）    | 新仪表盘、地图视图、中英切换、主题响应式 | Done        |
| LOG-017 | 2026-03-03 | Change   | Figma 原型高保真复原与样式重整      | 布局壳层、页面复刻、依赖清理、响应式修正 | Done        |
| LOG-018 | 2026-03-03 | Change   | 地图仿真重构与跨页视觉统一收口      | 真实世界底图、金融区筛选、News/Portfolio 顶栏统一 | Done        |
| LOG-019 | 2026-03-03 | Change   | 可读性与信息密度收口（继续）        | 地图移动端、来源日期、系统页简化、表格样式与浅色对比 | Done        |
| LOG-020 | 2026-03-03 | Change   | 真实新闻源强制与 AI 连通性增强      | 新闻 provider 策略、AI 双协议调用、地图/移动表格优化 | Done        |
| LOG-021 | 2026-03-03 | Change   | Intel 页面重做（Apple 简约 + 全量 i18n） | Intel 布局重排、AI 简报要点化、文案字典化 | Done        |
| LOG-022 | 2026-03-03 | Change   | 文档与 UI 链路治理（二次收敛）      | docs 精简、新闻时区化、地图事实驱动、壳层伪数据清理 | Done        |
| LOG-023 | 2026-03-03 | Change   | 数据源扩展与新闻翻译链路增强        | 行情 hybrid、新闻 RSS 扩展、`lang` 翻译、地图区域归类修正 | Done        |

## 2. 详细记录

### LOG-001｜2026-03-02｜Decision｜建立 docs 文档基线

| 字段     | 内容                                                                 |
| -------- | -------------------------------------------------------------------- |
| 背景     | 仓库初始化阶段缺少统一产品与工程文档入口。                           |
| 决策     | 新增 `docs/prd.md`、`docs/plan.md`、`docs/rules.md`、`docs/log.md`。 |
| 影响范围 | 文档治理流程、后续交付节奏。                                         |
| 后续动作 | 所有里程碑完成后强制更新 `docs`。                                    |

### LOG-002｜2026-03-02｜Decision｜采用轻量 Monorepo

| 字段     | 内容                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 背景     | 需要前后端同仓协作，同时避免微服务过早复杂化。                         |
| 决策     | 使用 `apps/web` + `apps/api` + `packages/shared` + `packages/config`。 |
| 影响范围 | 目录结构、依赖管理、CI 入口。                                          |
| 后续动作 | 保持共享包只放类型/常量，禁止业务逻辑跨边界扩散。                      |

### LOG-003｜2026-03-02｜Decision｜AI 输出采用证据化结构

| 字段     | 内容                                                     |
| -------- | -------------------------------------------------------- |
| 背景     | 金融场景下 AI 文本误导风险高。                           |
| 决策     | 输出固定为“结论 + 证据 + 置信度 + 风险提示 + 行动建议”。 |
| 影响范围 | `@sightfi/shared` 类型定义、AI 接口契约、前端渲染模板。  |
| 后续动作 | 引入更多事实证据源后再提升置信度策略。                   |

### LOG-004｜2026-03-02｜Decision｜Figma MCP 拉取验证通过

| 字段     | 内容                                         |
| -------- | -------------------------------------------- |
| 背景     | 需确认原型可被工程流程读取并转化为开发约束。 |
| 决策     | 通过 MCP 成功读取 Make 上下文与资源。        |
| 影响范围 | 导航信息架构、视觉约束、交互层级。           |
| 后续动作 | 继续按 Figma 主结构推进页面实现。            |

### LOG-005｜2026-03-02｜Change｜Phase 0 骨架落地

| 字段     | 内容                                                   |
| -------- | ------------------------------------------------------ |
| 背景     | 进入 Phase 0，需先打通可运行骨架。                     |
| 决策     | 完成 Web/API 脚手架、Mock 数据、共享类型与基础校验链。 |
| 影响范围 | 运行命令、开发流程、目录基线。                         |
| 后续动作 | 推进 P0-04（数据层）、P0-06（PWA）、P0-07（CI）。      |

### LOG-006｜2026-03-02｜Change｜Dev 启动编排与监控

| 字段     | 内容                                                                |
| -------- | ------------------------------------------------------------------- |
| 背景     | 需要保证本地启动顺序稳定并具备运行日志。                            |
| 决策     | `pnpm dev` 改为编排脚本：先 API 探活，再 Web 启动，带健康监控日志。 |
| 影响范围 | 根脚本、`.env.example`、README。                                    |
| 后续动作 | 后续扩展 DB 与外部依赖健康检查项。                                  |

### LOG-007｜2026-03-02｜Change｜P0-04 数据层与接口预留推进（进行中）

| 字段     | 内容                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| 背景     | 为接入 Supabase 与第三方 AI，需先完成低耦合接口与数据模型基线。                     |
| 决策     | 新增 Prisma schema、Supabase service、AI provider adapter、系统 provider 状态接口。 |
| 影响范围 | `apps/api/prisma/*`、`apps/api/src/*`、`.env.example`、前端服务层。                 |
| 后续动作 | 执行首次 `prisma generate/migrate`，并接入真实 Supabase。                           |

### LOG-008｜2026-03-02｜Change｜常量/文案/提示词抽离与配置集中

| 字段     | 内容                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------- |
| 背景     | 需要提升可维护性，避免硬编码文案与提示词分散在业务代码中。                                            |
| 决策     | 提取 API 路径常量、导航常量、i18n 文案、AI prompt 常量与 env key 常量。                               |
| 影响范围 | `apps/web/src/constants/*`、`apps/web/src/i18n/*`、`apps/api/src/config/*`、`docs/configuration.md`。 |
| 后续动作 | 下一步支持多语言包切换与提示词版本化管理。                                                            |

### LOG-009｜2026-03-02｜Change｜生产部署骨架与主备 AI 配置落地

| 字段     | 内容                                                                                        |
| -------- | ------------------------------------------------------------------------------------------- |
| 背景     | 需要把当前开发链路平滑迁移到生产，且 AI 供应商需要具备主备容灾。                            |
| 决策     | 新增 Dockerfile、Compose、生产环境模板；AI 调用改为主 `packycode gpt-5.2` + 备 `deepseek`。 |
| 影响范围 | `apps/*/Dockerfile`、`docker-compose.yml`、`.env.production.example`、`.env`、配置常量。    |
| 后续动作 | 补充 Supabase 匿名/服务端 Key 后，执行迁移并联调登录与持久化链路。                          |

### LOG-010｜2026-03-02｜Change｜PRD 约束映射到执行计划

| 字段     | 内容                                                                  |
| -------- | --------------------------------------------------------------------- |
| 背景     | PRD 新增了多币种 P0、BFF 安全与 AI 降级超时约束，需要落到可执行任务。 |
| 决策     | 在 `plan.md` 新增 P1-07/08/09，并补充安全、弹性质量闸门和回归条目。   |
| 影响范围 | `docs/plan.md`、`docs/log.md`。                                       |
| 后续动作 | 开发阶段按新增任务逐项实现，并在里程碑收尾做故障注入回归。            |

### LOG-011｜2026-03-02｜Change｜Phase 0 全流程闭环验收

| 字段     | 内容                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 用户要求完成 Phase 0 全流程，并确保本地开发链路、数据库链路、部署前基础能力全部打通。                                                               |
| 决策     | 完成 Prisma 迁移并写入 Supabase，新增双向一致性校验脚本接线；补齐 PWA（manifest + SW）；新增 GitHub CI 流程。                                       |
| 影响范围 | `apps/api/prisma/migrations/*`、`apps/api/scripts/db-consistency-check.ts`、`apps/web/vite.config.ts`、`.github/workflows/ci.yml`、`docs/plan.md`。 |
| 验证结果 | `pnpm db:check`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 全部通过。                                                                |
| 后续动作 | 进入 Phase 1：接入真实行情/新闻数据源与多币种换算服务，补充接口集成测试与告警回归。                                                                 |

### LOG-012｜2026-03-02｜Change｜Phase 1 启动：多数据源适配与文档化

| 字段     | 内容                                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 进入 Phase 1，需要从 mock 过渡到可切换的真实数据源，并明确第三方来源、使用范围和降级策略。                                       |
| 决策     | 为行情与新闻新增 provider adapter：`yahoo-finance2`、`FMP`、`GNews`、`NewsAPI`；默认仍可回退 `mock`。                            |
| 影响范围 | `apps/api/src/integrations/*`、`apps/api/src/*controller.ts`、`.env*.example`、`docs/data-sources.md`、`docs/configuration.md`。 |
| 验证结果 | `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 全部通过。                                                              |
| 后续动作 | 下一步实现 P1-02（事实提取去重）与 P1-03（缓存 + SSE 推送）。                                                                    |

### LOG-013｜2026-03-03｜Change｜Phase 1 联动：事实提取 + SSE 实时行情

| 字段     | 内容                                                                                                                                                                                                |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | Phase 1 需要从“可拉取数据”升级到“可实时监控 + 可去噪事实流”。                                                                                                                                       |
| 决策     | 后端新增 `FactExtractionService`（去观点、事件 ID、去重合并）与 `GET /api/v1/market/stream` SSE；前端接入实时行情流与新闻查询刷新能力。                                                             |
| 影响范围 | `apps/api/src/fact-extraction.service.ts`、`apps/api/src/market.controller.ts`、`apps/api/src/integrations/news-data.service.ts`、`apps/web/src/hooks/use-live-quotes.ts`、`apps/web/src/App.tsx`。 |
| 验证结果 | `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 通过。                                                                                                                                     |
| 后续动作 | 接入 Redis 作为 SSE/新闻缓存层，并增加事实流去重集成测试覆盖误并/漏并场景。                                                                                                                         |

### LOG-014｜2026-03-03｜Change｜工程结构重构与常量集中治理

| 字段     | 内容                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 背景     | 随着 Phase 1 功能增加，前后端文件平铺导致模块边界模糊、`App.tsx` 过大，维护成本提升。                                                                        |
| 决策     | 前端改为 `app/features/shared` 分层并拆分页面与通用 UI；后端改为 `core/modules` 分层；补充 `WEB_COPY`、`news.constants`、`market.constants` 以去除散落常量。 |
| 影响范围 | `apps/web/src/app/*`、`apps/web/src/features/*`、`apps/web/src/shared/*`、`apps/api/src/core/*`、`apps/api/src/modules/*`、`README.md`。                     |
| 验证结果 | `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 全部通过。                                                                                          |
| 后续动作 | 下一步在 `modules` 内继续增加 DTO/validator 与测试夹具，进一步降低跨模块耦合。                                                                               |

### LOG-015｜2026-03-03｜Change｜冗余清理与前端继续解耦

| 字段     | 内容                                                                                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 结构重构后仍有迁移残留空目录，`App` 入口仍承担过多布局职责，且存在少量可精简依赖。                                                                                          |
| 决策     | 清理前后端空目录；新增 `app/layout` 组件（`AppHeader`、`NavTabs`）继续拆分 App 壳；新增 `useNewsFeed` 管理新闻视图状态；移除未使用 i18n key 与 API 包中冗余 devDependency。 |
| 影响范围 | `apps/web/src/app/layout/*`、`apps/web/src/features/news/use-news-feed.ts`、`apps/web/src/app/App.tsx`、`apps/api/package.json`、`docs/log.md`。                            |
| 验证结果 | `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 全部通过。                                                                                                         |
| 后续动作 | 在 `features` 层补充统一 `view-model`/`dto` 类型，进一步约束页面与服务边界。                                                                                                |

### LOG-016｜2026-03-03｜Change｜前端视觉重建（基于 figma-proto）

| 字段     | 内容                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 用户提供 `figma-proto` 草稿，希望在其基础上重建前端为简约高级风格，并支持中英双语、暗黑/白天主题、地图上帝视角与图表化仪表盘。                        |
| 决策     | 重写 Web UI 主体：新增全球情报地图、实时曲线、热力格、持仓环形图；重构布局与间距体系；引入全局中英翻译字典与语言切换；保留并接入现有后端 API 与 SSE。 |
| 影响范围 | `apps/web/src/index.css`、`apps/web/src/app/*`、`apps/web/src/features/*`、`apps/web/src/shared/i18n/messages.ts`。                                   |
| 验证结果 | `pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 全部通过。                                                                                   |
| 后续动作 | 下一步补齐地图与图表的可配置数据源映射（按市场/地区过滤）并增加 UI 回归截图测试。                                                                     |

### LOG-017｜2026-03-03｜Change｜Figma 原型高保真复原与样式重整

| 字段     | 内容                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 用户反馈“未按原版复原、留白过大、字体可读性差、布局混乱”，要求严格依据最新 `figma-proto` 重做。                                                      |
| 决策     | 采用原型同构布局：左侧导航 + 主内容 + 移动端底部导航；重写 Dashboard/Intel/Portfolio/System 页面密度与视觉层级；新增玻璃态样式与更清晰字体体系。      |
| 影响范围 | `apps/web/src/app/layout/app-shell.tsx`、`apps/web/src/features/*`、`apps/web/src/index.css`、`apps/web/package.json`、`docs/log.md`。              |
| 验证结果 | `pnpm --filter @sightfi/web lint`、`pnpm --filter @sightfi/web typecheck`、`pnpm --filter @sightfi/web build`、`pnpm test` 全部通过。                 |
| 后续动作 | 根据你后续 UI 细节反馈继续做像素级收口（字体尺寸、图表密度、地图点位文案），并在移动端断点补充截图回归。                                             |

### LOG-018｜2026-03-03｜Change｜地图仿真重构与跨页视觉统一收口

| 字段     | 内容                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 背景     | 用户反馈非 Dashboard 页面留白仍大、文案切换不完整、地图不够仿真、字体/表格层级不统一。                                                     |
| 决策     | 地图切换为真实世界底图实现（金融区点位 + 流向连线 + 筛选 Chips + 重置）；News/Portfolio 增加与 Dashboard 同风格顶栏；继续提升字号与浅色模式对比。 |
| 影响范围 | `apps/web/src/features/dashboard/components/world-map-news.tsx`、`apps/web/src/features/news/intel-page.tsx`、`apps/web/src/features/portfolio/assets-page.tsx`。 |
| 验证结果 | `pnpm --filter @sightfi/web lint`、`pnpm --filter @sightfi/web typecheck`、`pnpm --filter @sightfi/web build` 通过。                     |
| 后续动作 | 下一步可继续做地图“按资金主题动态着色”和表格样式 token 化，收敛视觉一致性。                                                                |

### LOG-019｜2026-03-03｜Change｜可读性与信息密度收口（继续）

| 字段     | 内容                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 用户继续反馈 PC 留白过大、浅色模式对比不足、地图移动端可读性和表格质感不足，且系统页含开发向信息。                                         |
| 决策     | 主内容区取消固定最大宽度；系统页仅保留用户设置与服务状态；重构世界地图为自适应画布并补充来源日期；提升 Dashboard/Portfolio 表格字号与样式层级。 |
| 影响范围 | `apps/web/src/app/layout/app-shell.tsx`、`apps/web/src/features/system/system-page.tsx`、`apps/web/src/features/dashboard/*`、`apps/web/src/features/portfolio/assets-page.tsx`、`docs/prd.md`。 |
| 验证结果 | `pnpm --filter @sightfi/web lint`、`pnpm --filter @sightfi/web typecheck`、`pnpm --filter @sightfi/web build` 全部通过。                 |
| 后续动作 | 下一步继续推进全量文案中心化（i18n 字典化）与表格样式 token 抽象，进一步降低页面内硬编码。                                                |

### LOG-020｜2026-03-03｜Change｜真实新闻源强制与 AI 连通性增强

| 字段     | 内容                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 用户要求实时新闻必须为真实外部来源，且 AI 链路需确认可调用；同时反馈地图 PC 遮挡和移动端可读性问题。                                         |
| 决策     | 新闻默认改为 `NEWS_DATA_PROVIDER=auto` 且 `ALLOW_MOCK_FALLBACK=false`；`auto` 链路补充免 Key 的 Yahoo Finance RSS；AI 增加 `/responses` 协议回退。 |
| 影响范围 | `apps/api/src/modules/news/news-data.service.ts`、`apps/api/src/modules/ai/*`、`apps/api/scripts/provider-smoke-check.ts`、`.env.example`、`docs/data-sources.md`、前端地图与移动端表格。 |
| 验证结果 | `pnpm --filter @sightfi/api smoke:providers` 通过（新闻首条来源 `Yahoo Finance RSS`，AI 返回结构化摘要）；后续前端与后端构建校验通过。        |
| 后续动作 | 继续把地图热点改为后端真实新闻驱动（按 region 聚合）并补充 e2e 回归测试。                                                                     |

### LOG-021｜2026-03-03｜Change｜Intel 页面重做（Apple 简约 + 全量 i18n）

| 字段     | 内容                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 用户要求重做情报页面：减少杂乱元素、整体高级简约，且 AI 简报需 bullet point 呈现并支持全局 i18n。                                       |
| 决策     | 重构 Intel 页面为“头部总览 + 实时快照 + 事实流主区 + AI 侧栏”；将页面文案统一迁移到 `messages.ts` 并通过 `t()` 调用。                 |
| 影响范围 | `apps/web/src/features/news/intel-page.tsx`、`apps/web/src/shared/i18n/messages.ts`、`docs/log.md`。                                   |
| 验证结果 | `pnpm --filter @sightfi/web lint`、`pnpm --filter @sightfi/web typecheck`、`pnpm --filter @sightfi/web build` 全部通过。               |
| 后续动作 | 下一步可将 AI chat 回复也改为后端实时接口驱动，并支持“证据引用跳转”。                                                                    |

### LOG-022｜2026-03-03｜Change｜文档与 UI 链路治理（二次收敛）

| 字段     | 内容                                                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 当前版本存在文档结构冗长、新闻展示长列表、时间无时区、壳层伪数据等问题，影响可维护性和真实感。                                           |
| 决策     | 新增 `goal/architecture` 文档并精简 `plan/rules`；新闻链路统一 i18n 与时区格式；世界地图改为真实 facts 聚合驱动；移除壳层静态伪行情。 |
| 影响范围 | `docs/*`、`README.md`、`apps/web/src/app/layout/*`、`apps/web/src/features/news/*`、`apps/web/src/features/dashboard/*`。            |
| 验证结果 | 已完成 lint/typecheck/build 校验（Web）。                                                                                             |
| 后续动作 | 继续将 Dashboard/Portfolio 页面内硬编码文案分批迁移到 i18n 字典，并拆分超大页面文件。                                                   |

### LOG-023｜2026-03-03｜Change｜数据源扩展与新闻翻译链路增强

| 字段     | 内容                                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 背景     | 需要提升真实数据覆盖（机构新闻、地缘主题、港美与国内 ETF）并支持新闻中英文一键切换；同时修复地图区域过度偏向北美的问题。                                 |
| 决策     | 行情默认 provider 改为 `hybrid`（Yahoo + Eastmoney）；新闻 `auto` 增加免配置 `Google RSS + Yahoo RSS`；新闻接口新增 `lang` 参数并接入服务端翻译。         |
| 影响范围 | `apps/api/src/modules/market/*`、`apps/api/src/modules/news/*`、`apps/web/src/shared/services/*`、`apps/web/src/shared/hooks/*`、`apps/web/src/features/dashboard/*`、`docs/data-sources.md`。 |
| 验证结果 | `@sightfi/api` 与 `@sightfi/web` 的 lint/typecheck/build 全部通过；`smoke:providers` 通过（新闻返回真实来源）。                                          |
| 后续动作 | 如需更高准确性，可追加付费专业源（Bloomberg 企业授权、金十官方 API）并增加新闻来源置信评级。                                                             |
