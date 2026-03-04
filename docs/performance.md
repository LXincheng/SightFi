# SightFi Dashboard 性能优化记录

> 更新时间：2026-03-04  
> 范围：`apps/web` Dashboard 首屏加载、图表渲染与监控可用性

## 1. 问题分析

| 维度       | 现象                                                  | 根因                                                               | 用户影响                                     |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| 数据加载   | 首屏等待时间长，需等全部 bootstrap 请求完成才展示页面 | `useBootstrap` 一次性等待 `health/quotes/facts/providers` 全部返回 | Dashboard 内容可见时间延后，首屏“空白等待”   |
| 请求冗余   | 首页加载后新闻又触发一次请求                          | `useNewsFeed` 在 mount 的 `locale` effect 再次请求                 | 增加不必要 RTT，拉高网络负担                 |
| 渲染成本   | Dashboard 每次状态变化会重算多个派生数据              | `perfData/统计数据/movers` 未做 memo 化                            | SSE 更新时重绘压力偏高                       |
| 代码体积   | 地图模块默认首屏同步渲染                              | `world-map-news` 体量大、依赖重                                    | 首屏主线程负载过高                           |
| 图表可用性 | 市场热力图、板块配置、近期异动可读性与监控信号不够强  | 可视编码弱，监控语义不足                                           | 难快速定位“谁在异动、异动级别、因子轮动方向” |

## 2. 优化方案与落地

| 类别     | 优化项             | 实施细节                                                                                                | 预期收益                               |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 数据层   | Bootstrap 会话缓存 | 在 `useBootstrap` 增加 `sessionStorage` 缓存（TTL 45s），命中时直接回填 `quotes/facts/health/providers` | 减少重复首屏等待，刷新回访更快         |
| 数据层   | 渐进加载           | 首先并发拉取关键数据 `quotes + facts`，随后异步补齐 `health + providers`                                | 首屏先可用后补全，缩短可交互时间       |
| 数据层   | 请求可取消         | `sightfi-api` 的 `getQuotes/getFacts/getProviderFlags/getHealth` 支持 `AbortSignal`                     | 路由切换或 locale 切换时降低无效请求   |
| 数据层   | 去重请求           | `useNewsFeed` 首次 mount 若已有 `initialFacts` 则跳过首轮 locale 同步请求                               | 避免重复新闻请求                       |
| 渲染层   | 派生数据 memo      | `dashboard-page` 对 `perfData/movers/资产统计` 使用 `useMemo`                                           | 降低 SSE 高频更新时重算                |
| 渲染层   | 地图懒加载         | `world-map-news` 改为 `React.lazy + Suspense + requestIdleCallback` 延后挂载                            | 减少首屏 JS 执行与绘制阻塞             |
| 图表重构 | 市场热力图替换     | 新增“市场脉冲矩阵（MarketPulseMatrix）”：按波动+价格计算强度并网格化展示                                | 直观看“谁在动、动得多强、最后更新时间” |
| 图表重构 | 板块配置替换       | 新增“风格轮动环图（SectorRotationChart）”：RadialBar 展示因子占比+动量                                  | 更适合监控“配置结构 + 轮动方向”        |
| 图表重构 | 近期异动替换       | 新增“异动雷达流（MoverAnomalyStream）”：水平异动条+Top Alert 卡片                                       | 快速识别高优先级异常标的               |
| 信息架构 | Dashboard 布局重排 | 结构调整为“AI摘要 → 指标卡 → 净值趋势 + 地图 → 三联监控图表”                                            | 监控路径更顺畅，信号层级更清晰         |

## 3. 变更文件清单

| 文件                                                                   | 变更摘要                               |
| ---------------------------------------------------------------------- | -------------------------------------- |
| `apps/web/src/shared/hooks/use-bootstrap.ts`                           | 缓存、渐进加载、错误与状态策略优化     |
| `apps/web/src/shared/services/sightfi-api.ts`                          | 请求函数支持 `AbortSignal`             |
| `apps/web/src/features/news/use-news-feed.ts`                          | 首次 locale 同步请求去重               |
| `apps/web/src/features/dashboard/dashboard-page.tsx`                   | 布局重构、memo、地图懒加载、新图表接入 |
| `apps/web/src/features/dashboard/components/market-pulse-matrix.tsx`   | 新增监控矩阵图                         |
| `apps/web/src/features/dashboard/components/sector-rotation-chart.tsx` | 新增风格轮动环图                       |
| `apps/web/src/features/dashboard/components/mover-anomaly-stream.tsx`  | 新增异动雷达流图                       |

## 4. 验证记录

| 检查项              | 结果 |
| ------------------- | ---- |
| TypeScript 类型检查 | 通过 |
| ESLint              | 通过 |
| Web 构建            | 通过 |

> 说明：本次为工程级优化与结构重构，性能收益以“首屏更早可见 + 交互阻塞减少”为主；若需量化结论，建议在下一步补 Web Vitals 埋点并采集真实设备数据。

## 5. 后续优化建议

| 优先级 | 建议                                                        | 目的                                 |
| ------ | ----------------------------------------------------------- | ------------------------------------ |
| P0     | 增加 Web Vitals（FCP/LCP/INP）埋点与 dashboard 路由性能日志 | 将“感觉快”转为可量化指标             |
| P1     | 对地图数据做 Web Worker 预处理（关键词归类与分桶）          | 进一步降低主线程开销                 |
| P1     | 在 CI 中加入 bundle size 与关键路由预算阈值                 | 防止后续回归导致性能退化             |
| P2     | 抽取 dashboard 文案到 i18n 字典                             | 与 `rules.md` 的文案治理约束完全对齐 |
