import { useMemo, useState } from 'react';
import type { MarketQuote, PortfolioSummaryResponse } from '@sightfi/shared';
import type { Locale } from '../../shared/i18n/messages';
import type { CurrencyCode } from '../../shared/constants/currency.constants';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart2,
  Brain,
  ChevronDown,
  List,
  Plus,
  TrendingUp,
  Trash2,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { APP_CONSTANTS } from '../../shared/constants/app.constants';
import { postPortfolioSummary } from '../../shared/services/sightfi-api';
import { formatCurrencyValue } from '../../shared/utils/currency';
import {
  ASSET_TYPES,
  PORTFOLIO_REGIONS,
  PORTFOLIO_SECTORS,
} from './portfolio.constants';
import type { AssetType, Region, Sector } from './portfolio.constants';
type ViewType = 'holdings' | 'sector' | 'region' | 'allocation';

interface Holding {
  id: string;
  name: string;
  fullName: string;
  type: AssetType;
  sector: Sector;
  region: Region;
  shares: number;
  avgCost: number;
  currentPrice: number;
  dailyChange: number;
}

interface HoldingForm {
  name: string;
  fullName: string;
  type: AssetType;
  sector: Sector;
  region: Region;
  shares: string;
  avgCost: string;
  currentPrice: string;
}

interface ChartDatum {
  name: string;
  value: number;
}

interface AssetsPageProps {
  quotes: MarketQuote[];
  locale: Locale;
  isDark: boolean;
  currency: CurrencyCode;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6', '#6b7280'];

function initHoldings(quotes: MarketQuote[]): Holding[] {
  const mapped = quotes.slice(0, 6).map((quote, index) => ({
    id: String(index + 1),
    name: quote.symbol,
    fullName: quote.name,
    type: quote.symbol === 'BTC' ? ('Crypto' as const) : quote.symbol.includes('ETF') || quote.symbol === 'VTI' ? ('ETF' as const) : ('Stock' as const),
    sector: index < 3 ? ('Technology' as const) : ('Finance' as const),
    region: quote.symbol === 'HSTECH' ? ('China' as const) : ('US' as const),
    shares: 10 + index * 4,
    avgCost: Number((quote.price * 0.9).toFixed(2)),
    currentPrice: quote.price,
    dailyChange: quote.changePercent,
  }));

  return [
    ...mapped,
    {
      id: 'cash',
      name: 'CASH',
      fullName: 'Cash & Equivalents',
      type: 'Cash',
      sector: 'N/A',
      region: 'N/A',
      shares: 1,
      avgCost: 6000,
      currentPrice: 6000,
      dailyChange: 0,
    },
  ];
}

function emptyForm(): HoldingForm {
  return {
    name: '',
    fullName: '',
    type: 'Stock',
    sector: 'Technology',
    region: 'US',
    shares: '',
    avgCost: '',
    currentPrice: '',
  };
}

function toChartData(map: Map<string, number>): ChartDatum[] {
  return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value) }));
}

function localizeBucket(label: string, locale: Locale): string {
  const zhMap: Record<string, string> = {
    Technology: '科技',
    Finance: '金融',
    Healthcare: '医疗',
    Consumer: '消费',
    Energy: '能源',
    Cash: '现金',
    Stock: '股票',
    ETF: 'ETF',
    Crypto: '加密',
    Bond: '债券',
    US: '美股',
    China: '中国',
    Europe: '欧洲',
    Global: '全球',
    'N/A': '其他',
  };
  if (locale === 'zh') return zhMap[label] ?? label;
  return label;
}

export function AssetsPage({ quotes, locale, isDark, currency }: AssetsPageProps) {
  const [holdings, setHoldings] = useState<Holding[]>(() => initHoldings(quotes));
  const [view, setView] = useState<ViewType>('holdings');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<HoldingForm>(emptyForm);
  const [summary, setSummary] = useState<PortfolioSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const cardBase = isDark
    ? 'bg-zinc-900/45 border-zinc-800/55 backdrop-blur-xl'
    : 'bg-white/85 border-slate-200/85 backdrop-blur-xl shadow-sm';
  const innerCard = isDark ? 'bg-zinc-800/35 border-zinc-700/45' : 'bg-white/80 border-slate-200/60';
  const textPrimary = isDark ? 'text-zinc-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-zinc-300' : 'text-slate-700';
  const textDim = isDark ? 'text-zinc-500' : 'text-slate-500';
  const inputClass = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-200 focus:border-emerald-500/50'
    : 'bg-white/90 border-slate-200 text-slate-800 focus:border-emerald-400';
  const tooltipStyle = isDark
    ? { backgroundColor: '#18181b', borderColor: '#27272a', color: '#f4f4f5' }
    : { backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', color: '#1e293b' };

  const totalValue = useMemo(
    () => holdings.reduce((sum, item) => sum + item.currentPrice * item.shares, 0),
    [holdings],
  );
  const totalCost = useMemo(
    () => holdings.reduce((sum, item) => sum + item.avgCost * item.shares, 0),
    [holdings],
  );
  const totalGain = totalValue - totalCost;
  const gainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const dayPnl = useMemo(
    () => holdings.reduce((sum, item) => sum + item.currentPrice * item.shares * (item.dailyChange / 100), 0),
    [holdings],
  );

  const sectorData = useMemo(() => {
    const map = new Map<string, number>();
    holdings.forEach((item) => {
      map.set(item.sector, (map.get(item.sector) ?? 0) + item.currentPrice * item.shares);
    });
    return toChartData(map).map((item) => ({ ...item, name: localizeBucket(item.name, locale) }));
  }, [holdings, locale]);

  const regionData = useMemo(() => {
    const map = new Map<string, number>();
    holdings.forEach((item) => {
      map.set(item.region, (map.get(item.region) ?? 0) + item.currentPrice * item.shares);
    });
    return toChartData(map).map((item) => ({ ...item, name: localizeBucket(item.name, locale) }));
  }, [holdings, locale]);

  const allocationData = useMemo(() => {
    const map = new Map<string, number>();
    holdings.forEach((item) => {
      map.set(item.type, (map.get(item.type) ?? 0) + item.currentPrice * item.shares);
    });
    return toChartData(map).map((item) => ({ ...item, name: localizeBucket(item.name, locale) }));
  }, [holdings, locale]);

  const views = [
    { id: 'holdings' as const, labelEn: 'Holdings', labelZh: '持仓', icon: List },
    { id: 'sector' as const, labelEn: 'Sector', labelZh: '板块', icon: BarChart2 },
    { id: 'region' as const, labelEn: 'Region', labelZh: '地区', icon: TrendingUp },
    { id: 'allocation' as const, labelEn: 'Mix', labelZh: '配置', icon: BarChart2 },
  ];

  function removeHolding(id: string) {
    setHoldings((prev) => prev.filter((item) => item.id !== id));
  }

  function setField<K extends keyof HoldingForm>(field: K, value: HoldingForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addHolding() {
    if (!form.name || !form.shares || !form.avgCost) return;
    const current = form.currentPrice ? Number(form.currentPrice) : Number(form.avgCost);
    const next: Holding = {
      id: String(Date.now()),
      name: form.name.toUpperCase(),
      fullName: form.fullName || form.name,
      type: form.type,
      sector: form.sector,
      region: form.region,
      shares: Number(form.shares),
      avgCost: Number(form.avgCost),
      currentPrice: current,
      dailyChange: 0,
    };
    setHoldings((prev) => [...prev, next]);
    setForm(emptyForm());
    setShowAddForm(false);
  }

  async function runSummary() {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await postPortfolioSummary({
        riskProfile: APP_CONSTANTS.defaultRiskProfile,
        positions: holdings
          .filter((item) => item.type !== 'Cash')
          .map((item) => ({
            symbol: item.name,
            quantity: item.shares,
            avgCost: item.avgCost,
            market: item.region === 'China' ? 'HK' : item.type === 'ETF' ? 'ETF' : 'US',
          })),
      });
      setSummary(result);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : locale === 'zh' ? 'AI 体检失败' : 'AI summary failed');
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div className="space-y-4 md:space-y-5 lg:space-y-6">
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card rounded-2xl border p-4 md:p-5 ${cardBase}`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className={`text-lg font-semibold ${textPrimary}`}>
              {locale === 'zh' ? '资产与仓位中心' : 'Portfolio Control Center'}
            </h1>
            <p className={`mt-1 text-sm ${textDim}`}>
              {locale === 'zh'
                ? '统一估值、收益和风险暴露，支持多视图快速切换'
                : 'Unified valuation, returns and exposure with multi-view switching'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-xl border px-3 py-2 ${innerCard}`}>
              <div className={`text-xs ${textDim}`}>{locale === 'zh' ? '币种' : 'Currency'}</div>
              <div className={`text-sm font-semibold ${textPrimary}`}>{currency}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2 ${innerCard}`}>
              <div className={`text-xs ${textDim}`}>{locale === 'zh' ? '仓位数' : 'Positions'}</div>
              <div className={`text-sm font-semibold ${textPrimary}`}>{holdings.length}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2 ${innerCard}`}>
              <div className={`text-xs ${textDim}`}>{locale === 'zh' ? '视图' : 'View'}</div>
              <div className={`text-sm font-semibold ${textPrimary}`}>
                {locale === 'zh'
                  ? views.find((item) => item.id === view)?.labelZh
                  : views.find((item) => item.id === view)?.labelEn}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card relative overflow-hidden rounded-2xl border p-4 md:p-5 ${cardBase}`}
      >
        <div className={`absolute left-0 top-0 h-40 w-40 rounded-full blur-3xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-400/12'}`} />
        <div className="relative z-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/15 p-2">
                <Brain className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>
                  {locale === 'zh' ? '持仓总览' : 'Portfolio Overview'}
                </h2>
                <p className={`text-sm ${textDim}`}>
                  {locale === 'zh' ? '实时估值与 AI 分析' : 'Realtime valuation & AI insights'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-black shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)] transition hover:bg-emerald-600"
              >
                <Plus className="h-3.5 w-3.5" />
                {locale === 'zh' ? '新增持仓' : 'Add Position'}
              </button>
              <button
                type="button"
                onClick={() => void runSummary()}
                disabled={summaryLoading}
                className="rounded-xl border border-purple-500/30 bg-purple-500/12 px-3 py-2 text-sm text-purple-400 transition hover:bg-purple-500/20 disabled:opacity-65"
              >
                {summaryLoading ? (locale === 'zh' ? '分析中...' : 'Analyzing...') : locale === 'zh' ? 'AI 体检' : 'AI Review'}
              </button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                label: locale === 'zh' ? '总市值' : 'Total Value',
                value: formatCurrencyValue(totalValue, currency, locale, 0),
                color: textPrimary,
              },
              {
                label: locale === 'zh' ? '总盈亏' : 'Total P&L',
                value: `${totalGain >= 0 ? '+' : '-'}${formatCurrencyValue(Math.abs(totalGain), currency, locale, 0)} (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%)`,
                color: totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400',
              },
              {
                label: locale === 'zh' ? '今日盈亏' : 'Day P&L',
                value: `${dayPnl >= 0 ? '+' : '-'}${formatCurrencyValue(Math.abs(dayPnl), currency, locale, 0)}`,
                color: dayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400',
              },
              {
                label: locale === 'zh' ? '持仓数' : 'Positions',
                value: `${holdings.length}`,
                color: textPrimary,
              },
            ].map((metric) => (
              <div key={metric.label} className={`rounded-xl border p-3 ${innerCard}`}>
                <div className={`text-xs uppercase ${textDim}`}>{metric.label}</div>
                <div className={`mt-1 text-base font-bold ${metric.color}`}>{metric.value}</div>
              </div>
            ))}
          </div>

          <div className={`rounded-xl border p-3 ${innerCard}`}>
            <div className="mb-1.5 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className={`text-xs uppercase ${textDim}`}>
                {locale === 'zh' ? 'AI 持仓分析' : 'AI Portfolio Analysis'}
              </span>
            </div>
            {summaryError ? <p className="text-sm text-rose-400">{summaryError}</p> : null}
            <p className={`text-sm leading-relaxed ${textMuted}`}>
              {summary
                ? summary.conclusion
                : locale === 'zh'
                  ? '建议保持分散化，避免在高波动阶段集中押注单一板块。可按估值分位与仓位上限分批执行再平衡。'
                  : 'Stay diversified and avoid concentrated bets in high-volatility phases. Rebalance in tranches based on valuation percentile and position limits.'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-2">
        <div className={`flex gap-1 rounded-xl border p-1 ${isDark ? 'border-zinc-800/55 bg-zinc-900/45' : 'border-slate-200/70 bg-white/70'}`}>
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all ${
                view === item.id
                  ? 'border border-emerald-500/20 bg-emerald-500/15 text-emerald-400'
                  : isDark
                    ? 'text-zinc-500 hover:text-zinc-300'
                    : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <item.icon className="h-3 w-3" />
              {locale === 'zh' ? item.labelZh : item.labelEn}
            </button>
          ))}
        </div>
      </div>

      {view === 'holdings' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`glass-card overflow-hidden rounded-2xl border ${cardBase}`}>
          <div className="space-y-2 p-3 md:hidden">
            {holdings.map((item, index) => {
              const value = item.currentPrice * item.shares;
              const gain = (item.currentPrice - item.avgCost) * item.shares;
              const gainRatio = item.avgCost > 0 ? ((item.currentPrice - item.avgCost) / item.avgCost) * 100 : 0;
              return (
                <article
                  key={`mobile-${item.id}`}
                  className={`rounded-xl border p-3 ${
                    isDark
                      ? `${index % 2 === 0 ? 'border-zinc-700/45 bg-zinc-900/40' : 'border-zinc-700/35 bg-zinc-900/28'}`
                      : `${index % 2 === 0 ? 'border-slate-200/90 bg-white/90' : 'border-slate-200/80 bg-slate-50/90'}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className={`text-sm font-semibold ${textPrimary}`}>{item.name}</div>
                      <div className={`text-sm ${textDim}`}>{item.fullName}</div>
                    </div>
                    <span
                      className={`rounded border px-2 py-0.5 text-sm ${
                        item.type === 'Stock'
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          : item.type === 'ETF'
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                            : item.type === 'Crypto'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : isDark
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <div className={`mt-2 grid grid-cols-2 gap-2 text-sm ${textMuted}`}>
                    <div>{locale === 'zh' ? '地区' : 'Region'}: {localizeBucket(item.region, locale)}</div>
                    <div className="text-right">{locale === 'zh' ? '数量' : 'Shares'}: {item.shares}</div>
                    <div>{locale === 'zh' ? '成本' : 'Avg'}: {formatCurrencyValue(item.avgCost, currency, locale, 2)}</div>
                    <div className="text-right">
                      {locale === 'zh' ? '现价' : 'Current'}: {formatCurrencyValue(item.currentPrice, currency, locale, 2)}
                    </div>
                  </div>
                  <div className={`mt-2 flex items-center justify-between border-t pt-2 ${isDark ? 'border-zinc-700/40' : 'border-slate-200/80'}`}>
                    <div className={`text-sm ${textMuted}`}>
                      {locale === 'zh' ? '市值' : 'Value'}: <span className={textPrimary}>{formatCurrencyValue(value, currency, locale, 0)}</span>
                    </div>
                    <div className={`text-sm ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {gain >= 0 ? '+' : '-'}
                      {formatCurrencyValue(Math.abs(gain), currency, locale, 0)}
                      {item.type === 'Cash' ? '' : ` (${gainRatio >= 0 ? '+' : ''}${gainRatio.toFixed(2)}%)`}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className={`${isDark ? 'bg-zinc-900/58' : 'bg-slate-100/88'}`}>
                  {[
                    locale === 'zh' ? '资产' : 'Asset',
                    'Type',
                    locale === 'zh' ? '地区' : 'Region',
                    locale === 'zh' ? '数量' : 'Shares',
                    locale === 'zh' ? '成本' : 'Avg Cost',
                    locale === 'zh' ? '现价' : 'Current',
                    locale === 'zh' ? '市值' : 'Value',
                    'P&L',
                    '',
                  ].map((header, index) => (
                      <th key={header + index} className={`px-3 py-3 text-sm font-medium ${textDim} ${index > 4 ? 'text-right' : ''}`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-zinc-700/35' : 'divide-slate-200/78'}`}>
                {holdings.map((item, index) => {
                  const value = item.currentPrice * item.shares;
                  const gain = (item.currentPrice - item.avgCost) * item.shares;
                  const gainRatio = item.avgCost > 0 ? ((item.currentPrice - item.avgCost) / item.avgCost) * 100 : 0;
                  return (
                    <tr
                      key={item.id}
                      className={
                        isDark
                          ? `group hover:bg-zinc-800/30 ${index % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'}`
                          : `group hover:bg-slate-50/85 ${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/65'}`
                      }
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-bold ${isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : 'border-slate-200 bg-slate-100 text-slate-500'}`}>
                            {item.name[0]}
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${textPrimary}`}>{item.name}</div>
                            <div className={`max-w-[130px] truncate text-sm ${textDim}`}>{item.fullName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded border px-1.5 py-0.5 text-sm ${
                          item.type === 'Stock'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : item.type === 'ETF'
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                              : item.type === 'Crypto'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                : isDark
                                  ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                                  : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-sm ${textDim}`}>{localizeBucket(item.region, locale)}</td>
                      <td className={`px-3 py-3 text-right text-sm ${textMuted}`}>{item.shares}</td>
                      <td className={`px-3 py-3 text-right text-sm ${textMuted}`}>
                        {formatCurrencyValue(item.avgCost, currency, locale, 2)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className={`text-sm ${textMuted}`}>
                          {formatCurrencyValue(item.currentPrice, currency, locale, 2)}
                        </div>
                        {item.type !== 'Cash' ? (
                          <div className={`text-sm ${item.dailyChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.dailyChange >= 0 ? '+' : ''}
                            {item.dailyChange.toFixed(2)}%
                          </div>
                        ) : null}
                      </td>
                      <td className={`px-3 py-3 text-right text-sm font-bold ${textPrimary}`}>
                        {formatCurrencyValue(value, currency, locale, 0)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {item.type === 'Cash' ? (
                          <span className={textDim}>-</span>
                        ) : (
                          <div>
                            <div className={`text-sm ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {gain >= 0 ? '+' : '-'}
                              {formatCurrencyValue(Math.abs(gain), currency, locale, 0)}
                            </div>
                            <div className={`text-sm ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {gainRatio >= 0 ? '+' : ''}
                              {gainRatio.toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeHolding(item.id)}
                          className={`p-1 opacity-0 transition group-hover:opacity-100 ${isDark ? 'text-zinc-600 hover:text-rose-500' : 'text-slate-300 hover:text-rose-500'}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : null}

      {view === 'sector' || view === 'region' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`glass-card rounded-2xl border p-4 ${cardBase}`}>
          <h3 className={`mb-4 text-base uppercase ${textDim}`}>
            {view === 'sector'
              ? locale === 'zh'
                ? '板块配置'
                : 'Sector Allocation'
              : locale === 'zh'
                ? '地区敞口'
                : 'Regional Exposure'}
          </h3>
          <div className="flex flex-col items-center gap-6 lg:flex-row">
            <div className="h-[210px] w-full lg:w-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={view === 'sector' ? sectorData : regionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={82}
                    dataKey="value"
                    paddingAngle={4}
                    stroke="none"
                  >
                    {(view === 'sector' ? sectorData : regionData).map((item, index) => (
                      <Cell key={item.name} fill={COLORS[index % COLORS.length] ?? '#6b7280'} fillOpacity={0.88} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full flex-1 space-y-2">
              {(view === 'sector' ? sectorData : regionData).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] ?? '#6b7280' }} />
                    <span className={`truncate text-sm ${textMuted}`}>{localizeBucket(item.name, locale)}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`text-sm ${textDim}`}>{((item.value / totalValue) * 100).toFixed(1)}%</span>
                    <span className={`text-sm ${textPrimary}`}>
                      {formatCurrencyValue(item.value, currency, locale, 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}

      {view === 'allocation' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`glass-card rounded-2xl border p-4 ${cardBase}`}>
          <h3 className={`mb-4 text-base uppercase ${textDim}`}>
            {locale === 'zh' ? '资产类型配置' : 'Asset Allocation Mix'}
          </h3>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allocationData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#52525b' : '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: isDark ? '#52525b' : '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '11px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {allocationData.map((item, index) => (
                    <Cell key={item.name} fill={COLORS[index % COLORS.length] ?? '#6b7280'} fillOpacity={0.86} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      ) : null}

      <AnimatePresence>
        {showAddForm ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl ${isDark ? 'border-zinc-700 bg-zinc-900' : 'border-slate-200 bg-white'}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className={`text-sm font-bold ${textPrimary}`}>{locale === 'zh' ? '新增持仓' : 'Add Position'}</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className={`rounded-lg p-1.5 transition-colors ${isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`mb-1 block text-xs font-medium uppercase ${textDim}`}>Ticker *</label>
                    <input
                      value={form.name}
                      onChange={(event) => setField('name', event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm uppercase outline-none ${inputClass}`}
                      placeholder="AAPL"
                    />
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-medium uppercase ${textDim}`}>{locale === 'zh' ? '全称' : 'Full Name'}</label>
                    <input
                      value={form.fullName}
                      onChange={(event) => setField('fullName', event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                      placeholder="Apple Inc"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`mb-1 block text-xs font-medium uppercase ${textDim}`}>Type</label>
                    <div className="relative">
                      <select
                        value={form.type}
                        onChange={(event) => setField('type', event.target.value as AssetType)}
                        className={`w-full appearance-none rounded-xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                      >
                        {ASSET_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 opacity-50" />
                    </div>
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-medium uppercase ${textDim}`}>{locale === 'zh' ? '板块' : 'Sector'}</label>
                    <div className="relative">
                      <select
                        value={form.sector}
                        onChange={(event) => setField('sector', event.target.value as Sector)}
                        className={`w-full appearance-none rounded-xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                      >
                        {PORTFOLIO_SECTORS.map((sector) => (
                          <option key={sector} value={sector}>
                            {sector}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 opacity-50" />
                    </div>
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-medium uppercase ${textDim}`}>{locale === 'zh' ? '地区' : 'Region'}</label>
                    <div className="relative">
                      <select
                        value={form.region}
                        onChange={(event) => setField('region', event.target.value as Region)}
                        className={`w-full appearance-none rounded-xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                      >
                        {PORTFOLIO_REGIONS.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={`mb-1 block text-xs font-medium uppercase ${textDim}`}>{locale === 'zh' ? '数量' : 'Quantity'} *</label>
                    <input
                      type="number"
                      value={form.shares}
                      onChange={(event) => setField('shares', event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-medium uppercase ${textDim}`}>{locale === 'zh' ? '成本' : 'Avg Cost'} *</label>
                    <input
                      type="number"
                      value={form.avgCost}
                      onChange={(event) => setField('avgCost', event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-medium uppercase ${textDim}`}>{locale === 'zh' ? '现价' : 'Curr Price'}</label>
                    <input
                      type="number"
                      value={form.currentPrice}
                      onChange={(event) => setField('currentPrice', event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addHolding}
                  className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-black shadow-[0_0_12px_-3px_rgba(16,185,129,0.4)] transition-colors hover:bg-emerald-600"
                >
                  {locale === 'zh' ? '确认添加' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
