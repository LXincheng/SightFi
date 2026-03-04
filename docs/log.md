# SightFi 开发日志（Log）

> 更新时间：2026-03-04  
> 目标：用最短结构记录“做了什么、影响什么、如何验证”。

## 1. 项目概览

| 项目 | 当前状态 | 说明 |
| --- | --- | --- |
| 当前阶段 | Phase 1（进行中） | MVP 闭环与体验收口并行推进 |
| 核心链路 | 已可用 | Web + API + BFF + SSE + 多源新闻 |
| 质量闸门 | 已启用 | lint / typecheck / build 作为发布前置 |
| UI 方向 | 收口中 | Apple 极简 + 透明玻璃 + 字体统一 |

## 2. 最近里程碑（保留关键）

| ID | 日期 | 类型 | 变更摘要 | 影响范围 | 验证 |
| --- | --- | --- | --- | --- | --- |
| LOG-024 | 2026-03-03 | Change | 文档入口收敛，减少重复描述 | `docs/*`, `README.md` | 文档一致性人工校验 |
| LOG-025 | 2026-03-03 | Change | 地图组件重做（区域聚合、缩放、重置） | `world-map-news.tsx`, `dashboard-page.tsx` | `web lint/typecheck/build` |
| LOG-026 | 2026-03-04 | Change | 地图视觉二次重做，交互层级简化 | `world-map-news.tsx` | `web lint/typecheck/build` |
| LOG-027 | 2026-03-04 | Change | Dashboard 性能提速（懒加载 + 拆包） | `App.tsx`, `vite.config.ts`, `use-bootstrap.ts` | `web lint/typecheck/build` |
| LOG-028 | 2026-03-04 | Change | 三个核心图表替换并重排仪表盘 | `dashboard/*` | `web lint/typecheck/build` |
| LOG-029 | 2026-03-04 | Change | UI 事故修复：中心地图 + 环绕图表 | `dashboard-page.tsx`, `world-map-news.tsx` | `web lint/typecheck/build` |
| LOG-030 | 2026-03-04 | Change | 增强地缘监控图（时间线 + 区域压力） | `geo-risk-timeline.tsx`, `geo-region-pressure.tsx` | `web lint/typecheck/build` |
| LOG-031 | 2026-03-04 | Change | 扩展新闻数据源并修复地图北美偏置 | `news-data.service.ts`, `news.constants.ts`, `world-map-news.tsx` | `api/web lint/typecheck/build` |
| LOG-032 | 2026-03-04 | Change | 第四轮 UI 收口：统一全局字体与图表字号 | `index.css`, `dashboard/*`, `system-page.tsx` | `web lint/typecheck/build` |

## 3. 当前约束（执行中）

| 约束 | 规则 |
| --- | --- |
| 文案 | 页面文案统一走 i18n，减少硬编码 |
| 字体 | 全局统一 `SF Pro / PingFang` 字体系，限制字号层级 |
| 图表 | 标题加粗、坐标轴与图例同层级字号，不允许遮挡 |
| 数据 | 前端只经 BFF 获取，外部源可降级不可直连 |

## 4. 日志模板（后续直接复制）

| 字段 | 内容 |
| --- | --- |
| 日期 | YYYY-MM-DD |
| 类型 | Decision / Change / Fix |
| 摘要 | 一句话说明本次变更 |
| 影响范围 | 具体文件或模块 |
| 风险 | 可能影响点（可空） |
| 验证 | 执行过的命令与结果 |
| 后续动作 | 下一步 1-2 项 |

> 记录原则：只保留“可追溯决策”和“可验证交付”，避免流水账。
