import type { NewsFact } from '@sightfi/shared';
import type { BootstrapState } from '../../shared/hooks/use-bootstrap';
import type { LiveQuotesState } from '../../shared/hooks/use-live-quotes';
import type { Locale } from '../../shared/i18n/messages';
import type { CurrencyCode } from '../../shared/constants/currency.constants';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Brain,
  Clock,
  Globe,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MarketHeatmap } from './components/market-heatmap';
import { WorldMapNews } from './components/world-map-news';
import { formatDateTimeWithZone } from '../../shared/i18n/format';
import { formatCurrencyValue } from '../../shared/utils/currency';

interface DashboardPageProps {
  state: BootstrapState;
  live: LiveQuotesState;
  facts: NewsFact[];
  locale: Locale;
  isDark: boolean;
  currency: CurrencyCode;
}

interface PerfDatum {
  day: string;
  value: number;
  benchmark: number;
}

interface SectorDatum {
  name: string;
  value: number;
  color: string;
}

const SECTOR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280'];

function buildPerfData(quotes: LiveQuotesState['quotes']): PerfDatum[] {
  const seed = quotes.reduce((sum, quote) => sum + quote.price, 0) || 1200;
  const base = 100000 + seed * 10;
  return Array.from({ length: 30 }, (_, index) => {
    const trend = index * 420;
    const noise = Math.sin(index * 0.68) * 2600 + Math.cos(index * 1.19) * 1500;
    return {
      day: `${index + 1}`,
      value: Math.round(base + trend + noise),
      benchmark: Math.round(base + index * 290 + Math.sin(index * 0.4) * 900),
    };
  });
}

function buildSectorData(quotes: LiveQuotesState['quotes']): SectorDatum[] {
  const base = quotes.slice(0, 5);
  if (base.length === 0) {
    return [
      { name: 'Tech', value: 40, color: SECTOR_COLORS[0] ?? '#10b981' },
      { name: 'ETF', value: 25, color: SECTOR_COLORS[1] ?? '#3b82f6' },
      { name: 'Macro', value: 20, color: SECTOR_COLORS[2] ?? '#f59e0b' },
      { name: 'Cash', value: 15, color: SECTOR_COLORS[4] ?? '#6b7280' },
    ];
  }

  const total = base.reduce((sum, item) => sum + Math.abs(item.changePercent), 0) || 1;
  return base.map((item, index) => ({
    name: item.symbol,
    value: Math.max(5, Math.round((Math.abs(item.changePercent) / total) * 100)),
    color: SECTOR_COLORS[index % SECTOR_COLORS.length] ?? '#6b7280',
  }));
}

function formatDateForLocale(value: string, locale: Locale): string {
  return formatDateTimeWithZone(value, locale, { withYear: false });
}

export function DashboardPage({ state, live, facts, locale, isDark, currency }: DashboardPageProps) {
  const perfData = buildPerfData(live.quotes);
  const sectorData = buildSectorData(live.quotes);
  const movers = live.quotes.slice(0, 5);

  const totalAssets = live.quotes.reduce((sum, quote, index) => sum + quote.price * (8 + index * 2), 0);
  const dayPnl = live.quotes.reduce(
    (sum, quote, index) => sum + quote.price * (8 + index * 2) * (quote.changePercent / 100),
    0,
  );
  const avgChange =
    live.quotes.length > 0
      ? live.quotes.reduce((sum, quote) => sum + quote.changePercent, 0) / live.quotes.length
      : 0;

  const cardBase = isDark
    ? 'bg-zinc-900/45 border-zinc-800/55 backdrop-blur-xl'
    : 'bg-white/85 border-slate-200/85 backdrop-blur-xl shadow-sm';
  const innerCard = isDark ? 'bg-zinc-800/35 border-zinc-700/45' : 'bg-white/80 border-slate-200/60 shadow-sm';
  const textPrimary = isDark ? 'text-zinc-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-zinc-300' : 'text-slate-700';
  const textDim = isDark ? 'text-zinc-500' : 'text-slate-500';
  const tooltipStyle = isDark
    ? { backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }
    : { backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', color: '#1e293b' };

  const leadFact = facts[0];
  const secondaryFact = facts[1];

  return (
    <div className="space-y-4 md:space-y-5 lg:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card relative overflow-hidden rounded-2xl border p-4 md:p-5 ${cardBase}`}
      >
        <div
          className={`pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full blur-3xl ${
            isDark ? 'bg-emerald-500/10' : 'bg-emerald-400/12'
          }`}
        />
        <div
          className={`pointer-events-none absolute bottom-0 left-0 h-28 w-28 rounded-full blur-3xl ${
            isDark ? 'bg-blue-500/8' : 'bg-blue-400/10'
          }`}
        />
        <div className="relative z-10">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/15 p-2">
                <Brain className="h-4 w-4 text-emerald-400" />
              </div>
              <h2 className={`text-base font-bold tracking-wide ${textPrimary}`}>
                {locale === 'zh' ? 'AI 智能总结' : 'AI Intelligence Summary'}
              </h2>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-mono text-emerald-400">
                {locale === 'zh' ? '2 分钟前更新' : 'Updated 2 min ago'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className={`rounded-xl border p-3.5 ${innerCard}`}>
              <h3 className={`mb-2 flex items-center gap-1.5 text-sm font-medium ${textDim}`}>
                <TrendingUp className="h-3 w-3 text-blue-400" />
                {locale === 'zh' ? '市场总览' : 'Market Overview'}
              </h3>
              <p className={`mb-2.5 text-sm leading-relaxed ${textMuted}`}>
                {leadFact
                  ? leadFact.factSummary
                  : locale === 'zh'
                    ? '暂无最新事实流，系统将持续同步已验证事件。'
                    : 'No latest fact stream yet. SightFi keeps syncing verified events.'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                  {locale === 'zh' ? '风险: 低' : 'Risk: Low'}
                </span>
                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                  {avgChange >= 0
                    ? locale === 'zh'
                      ? '趋势: 偏多'
                      : 'Trend: Bullish'
                    : locale === 'zh'
                      ? '趋势: 偏空'
                      : 'Trend: Bearish'}
                </span>
              </div>
            </div>

            <div className={`rounded-xl border p-3.5 ${innerCard}`}>
              <h3 className={`mb-2 flex items-center gap-1.5 text-sm font-medium ${textDim}`}>
                <Target className="h-3 w-3 text-amber-400" />
                {locale === 'zh' ? '持仓建议' : 'Portfolio Recommendation'}
              </h3>
              <p className={`mb-2.5 text-sm leading-relaxed ${textMuted}`}>
                {secondaryFact
                  ? secondaryFact.factSummary
                  : locale === 'zh'
                    ? '建议保持分散化，分批执行止盈，避免高波动阶段集中追涨。'
                    : 'Stay diversified, take profits in tranches, and avoid concentration chasing in high-volatility windows.'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                  {locale === 'zh' ? '动作: 再平衡' : 'Action: Rebalance'}
                </span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                  {locale === 'zh' ? '置信度: 高' : 'Confidence: High'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            key: 'asset',
            label: locale === 'zh' ? '总资产' : 'Total Assets',
            value: formatCurrencyValue(totalAssets, currency, locale, 0),
            change: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`,
            up: avgChange >= 0,
          },
          {
            key: 'pnl',
            label: locale === 'zh' ? '今日盈亏' : 'Day P/L',
            value: `${dayPnl >= 0 ? '+' : '-'}${formatCurrencyValue(Math.abs(dayPnl), currency, locale, 0)}`,
            change: locale === 'zh' ? '对比昨日' : 'vs yesterday',
            up: dayPnl >= 0,
          },
          {
            key: 'health',
            label: locale === 'zh' ? '系统状态' : 'System Health',
            value: state.health?.status === 'ok' ? 'ONLINE' : 'WAITING',
            change: state.health ? `${state.health.uptimeSec}s` : '--',
            up: true,
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * index + 0.1 }}
            className={`glass-card relative overflow-hidden rounded-xl border p-3 md:p-4 ${cardBase}`}
          >
            <div className="absolute right-2 top-2 opacity-15">
              {stat.up ? <ArrowUpRight className="h-8 w-8 text-emerald-400" /> : <ArrowDownRight className="h-8 w-8 text-rose-400" />}
            </div>
            <p className={`text-sm tracking-wide ${textDim}`}>{stat.label}</p>
            <h3 className={`mt-1 text-base font-bold md:text-xl ${textPrimary}`}>{stat.value}</h3>
            <p className={`mt-1 text-xs md:text-sm ${stat.up ? 'text-emerald-400' : 'text-rose-400'}`}>{stat.change}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className={`glass-card rounded-2xl border p-4 md:p-5 ${cardBase}`}
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className={`flex items-center gap-2 text-sm font-medium ${textDim}`}>
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            {locale === 'zh' ? '组合净值曲线 · 30天' : 'Portfolio Performance · 30D'}
          </h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="inline-block h-0.5 w-3 rounded bg-emerald-400" />
              Portfolio
            </span>
            <span className={`flex items-center gap-1 ${textDim}`}>
              <span className={`inline-block h-0.5 w-3 rounded ${isDark ? 'bg-zinc-600' : 'bg-slate-300'}`} />
              Benchmark
            </span>
          </div>
        </div>
        <div className="h-[170px] md:h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={perfData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: isDark ? '#52525b' : '#64748b' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis
                tick={{ fontSize: 10, fill: isDark ? '#52525b' : '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="benchmark" stroke={isDark ? '#3f3f46' : '#cbd5e1'} strokeWidth={1.5} fill="url(#benchGrad)" dot={false} />
              <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#perfGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className={`glass-card flex h-[760px] flex-col rounded-2xl border p-3 md:h-[820px] md:p-4 lg:h-[720px] ${cardBase}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className={`flex items-center gap-1.5 text-sm font-medium ${textDim}`}>
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            {locale === 'zh' ? '全球情报地图' : 'Global Intel Map'}
          </h3>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className={`text-sm ${textDim}`}>LIVE</span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
          <WorldMapNews locale={locale} isDark={isDark} facts={facts} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className={`glass-card flex h-[320px] flex-col rounded-2xl border p-4 md:h-[420px] lg:col-span-1 ${cardBase}`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className={`flex items-center gap-1.5 text-sm font-medium ${textDim}`}>
              <BarChart2 className="h-3.5 w-3.5 text-emerald-400" />
              {locale === 'zh' ? '市场热力图' : 'Market Heatmap'}
            </h3>
            <span className={`rounded-lg border px-2 py-0.5 text-sm ${isDark ? 'border-zinc-800 bg-zinc-900/70 text-zinc-500' : 'border-slate-200 bg-slate-100/70 text-slate-500'}`}>
              LIVE
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
            <MarketHeatmap quotes={live.quotes} />
          </div>
        </div>

        <div className={`glass-card rounded-2xl border p-4 lg:col-span-1 ${cardBase}`}>
          <h3 className={`mb-4 flex items-center gap-1.5 text-sm uppercase ${textDim}`}>
            <Zap className="h-3.5 w-3.5 text-purple-400" />
            {locale === 'zh' ? '板块配置' : 'Sector Exposure'}
          </h3>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#52525b' : '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: isDark ? '#52525b' : '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `${value}%`}
                />
                <Tooltip contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '11px' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {sectorData.map((item) => (
                    <Cell key={item.name} fill={item.color} fillOpacity={0.86} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sectorData.map((item) => (
              <span key={item.name} className="flex items-center gap-1 text-xs md:text-sm" style={{ color: item.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name} {item.value}%
              </span>
            ))}
          </div>
        </div>

        <div className={`glass-card rounded-2xl border p-4 lg:col-span-2 ${cardBase}`}>
          <h3 className={`mb-4 flex items-center gap-1.5 text-sm uppercase ${textDim}`}>
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            {locale === 'zh' ? '近期异动' : 'Recent Movers'}
          </h3>
          <div className="space-y-2 md:hidden">
            {movers.map((quote, index) => (
              <article
                key={`mobile-${quote.symbol}`}
                className={`rounded-xl border p-3 ${
                  isDark
                    ? `${index % 2 === 0 ? 'border-zinc-700/45 bg-zinc-900/40' : 'border-zinc-700/35 bg-zinc-900/28'}`
                    : `${index % 2 === 0 ? 'border-slate-200/90 bg-white/90' : 'border-slate-200/85 bg-slate-50/90'}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`text-sm font-semibold ${textPrimary}`}>{quote.symbol}</div>
                  <div
                    className={`text-sm font-medium ${
                      quote.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {quote.changePercent >= 0 ? '+' : ''}
                    {quote.changePercent.toFixed(2)}%
                  </div>
                </div>
                <div className={`mt-1.5 flex items-center justify-between text-sm ${textMuted}`}>
                  <span>{formatCurrencyValue(quote.price, currency, locale, 2)}</span>
                  <span className={textDim}>{formatDateForLocale(quote.updatedAt, locale)}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="-mx-1 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className={`${isDark ? 'bg-zinc-900/55' : 'bg-slate-100/85'}`}>
                  <th className={`pb-2 pr-4 ${textDim}`}>{locale === 'zh' ? '代码' : 'Ticker'}</th>
                  <th className={`pb-2 pr-4 text-right ${textDim}`}>{locale === 'zh' ? '价格' : 'Price'}</th>
                  <th className={`pb-2 pr-4 text-right ${textDim}`}>{locale === 'zh' ? '涨跌' : 'Change'}</th>
                  <th className={`pb-2 pr-4 text-right ${textDim}`}>{locale === 'zh' ? '时间' : 'Time'}</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-zinc-700/35' : 'divide-slate-200/75'}`}>
                {movers.map((quote, index) => (
                  <tr
                    key={quote.symbol}
                    className={
                      isDark
                        ? `hover:bg-zinc-800/32 ${index % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'}`
                        : `hover:bg-white ${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/70'}`
                    }
                  >
                    <td className={`py-2.5 pr-4 text-sm font-semibold ${textPrimary}`}>{quote.symbol}</td>
                    <td className={`py-2.5 pr-4 text-right text-sm ${textMuted}`}>
                      {formatCurrencyValue(quote.price, currency, locale, 2)}
                    </td>
                    <td
                      className={`py-2.5 pr-4 text-right text-sm font-medium ${
                        quote.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {quote.changePercent >= 0 ? '+' : ''}
                      {quote.changePercent.toFixed(2)}%
                    </td>
                    <td className={`py-2.5 pr-4 text-right text-sm ${textDim}`}>
                      {formatDateForLocale(quote.updatedAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
