export const PORTFOLIO_COPY = {
  concentrationHigh: '当前最大仓位 {symbol} 占比偏高，建议拆分风险。',
  concentrationBalanced: '仓位分散度尚可，继续保持纪律化调仓。',
  conclusionPrefix:
    '基于当前组合与风险偏好，建议以“证据优先 + 分批动作”的方式管理仓位。',
  riskNotice:
    '本结果仅用于研究辅助，不构成投资建议；缺少财报与估值全量数据时建议减少操作频率。',
  actionAggressive: '保留高弹性仓位，但单一标的仓位不超过 35%。',
  actionBalanced: '维持宽基与行业仓平衡，分批止盈避免情绪化交易。',
  actionConservative: '优先控制回撤，现金和低波动 ETF 配比保持在策略区间。',
  actionEventCheck: '当日大波动时先复核事实新闻，再决定是否调仓。',
  actionSingleAdjust: '单次调仓建议不超过组合净值的 10%。',
  promptSuffix: '请给出一句中文结论，强调风险控制与分批动作。',
} as const;
