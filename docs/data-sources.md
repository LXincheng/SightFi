# SightFi 数据源（Data Sources）

> 更新时间：2026-03-03  
> 设计目标：**默认免配置即可跑通真实行情 + 真实新闻**；需要更强覆盖/稳定性时，再按需补 Key。

## 1. 一句话结论（你需要知道的最少信息）

| 你关心什么                 | 默认就有吗 | 默认来源                                        | 可选增强                        |
| -------------------------- | ---------- | ----------------------------------------------- | ------------------------------- |
| 行情（美股/港股/部分 ETF） | 是         | Yahoo（聚合库）                                 | 后续可扩展付费源（需单独接入）  |
| 行情（沪深/国内 ETF）      | 是         | Eastmoney（公开接口）                           | 券商/终端（需单独接入）         |
| 新闻事实流                 | 是         | Google News RSS + Yahoo Finance RSS             | GNews / NewsAPI / FMP（需 Key） |
| 新闻中英切换               | 是         | Google Translate 公共端点（无 Key，服务端请求） | 后续可替换为 AI 翻译            |

> 核心约束：新闻条目必须可追溯（`source` + `sourceId` + `publishedAt`）。

## 2. Provider 选择（环境变量）

| 模块 | 环境变量               | 可选值                                                           | 默认值   | 说明                                               |
| ---- | ---------------------- | ---------------------------------------------------------------- | -------- | -------------------------------------------------- |
| 行情 | `MARKET_DATA_PROVIDER` | `hybrid` / `yahoo` / `eastmoney` / `mock`                        | `hybrid` | `hybrid` 会合并 Yahoo（跨市场）+ Eastmoney（国内） |
| 新闻 | `NEWS_DATA_PROVIDER`   | `auto` / `rss` / `google` / `gnews` / `newsapi` / `fmp` / `mock` | `auto`   | `auto`：优先走已配置 Key 的源；否则走免配置 RSS    |
| 兜底 | `ALLOW_MOCK_FALLBACK`  | `true` / `false`                                                 | `false`  | 仅建议本地开发使用；生产默认禁用                   |

## 3. 可选配置（提升覆盖/稳定性）

| 配置项          | 是否必需 | 何时需要                 | 影响                                   |
| --------------- | -------- | ------------------------ | -------------------------------------- |
| `GNEWS_API_KEY` | 否       | 需要更稳定的全球新闻覆盖 | `NEWS_DATA_PROVIDER=auto/gnews` 可用   |
| `NEWSAPI_KEY`   | 否       | 需要新闻备源             | `NEWS_DATA_PROVIDER=auto/newsapi` 可用 |
| `FMP_API_KEY`   | 否       | 需要更结构化的金融新闻源 | `NEWS_DATA_PROVIDER=auto/fmp` 可用     |

> `MARKET_DATA_API_KEY` / `NEWS_DATA_API_KEY` 当前属于**预留配置位**：用于未来接入“自定义/付费 Provider”时做统一注入；现阶段默认链路不依赖它们。

## 4. API 一览（用于联调/排障）

| 接口                           | Query 参数                          | 返回                  | 备注                                       |
| ------------------------------ | ----------------------------------- | --------------------- | ------------------------------------------ | ----------------------------------- |
| `GET /api/v1/market/quotes`    | `symbols=SPY,QQQ,0700.HK,510300.SH` | `MarketQuote[]`       | `symbols` 最多 20 个；缺省走默认 watchlist |
| `GET /api/v1/market/stream`    | `symbols=...`                       | SSE（event=`quotes`） | 事件数据是 `MarketQuote[]` JSON            |
| `GET /api/v1/news/facts`       | `q=...&limit=20&lang=en             | zh`                   | `NewsFact[]`                               | `limit` 范围 1–50；`lang` 缺省 `en` |
| `GET /api/v1/system/providers` | -                                   | `ProviderFlags`       | 用于 System 页显示“哪些外部能力已配置”     |

## 5. 降级策略（读者只需要记住顺序）

| 数据域                                | 策略                           | 说明                                                       |
| ------------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| 新闻（`NEWS_DATA_PROVIDER=auto`）     | Key 源 → RSS Blend → Yahoo RSS | Key 源优先：`gnews` → `newsapi` → `fmp`；无 Key 时走免配置 |
| 新闻（整体失败）                      | 是否允许回退 mock              | `ALLOW_MOCK_FALLBACK=false` 时直接报错，避免“伪数据污染”   |
| 行情（`MARKET_DATA_PROVIDER=hybrid`） | Yahoo + Eastmoney 合并         | 对国内标的优先 Eastmoney；其余走 Yahoo                     |
