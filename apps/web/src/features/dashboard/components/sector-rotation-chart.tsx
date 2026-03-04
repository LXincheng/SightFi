import type { MarketQuote } from '@sightfi/shared';
import { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Locale } from '../../../shared/i18n/messages';

interface SectorRotationChartProps {
  quotes: MarketQuote[];
  locale: Locale;
  isDark: boolean;
}

interface SectorSlice {
  id: string;
  name: string;
  allocation: number;
  momentum: number;
  strength: string;
  fill: string;
}

const GROWTH_SYMBOLS = new Set(['QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'BABA', 'JD']);
const ETF_SYMBOLS = new Set(['SPY', 'VTI', 'DIA', 'IWM', 'FXI', 'MCHI', 'EWJ', 'INDA']);
const DEFENSIVE_SYMBOLS = new Set(['TLT', 'IEF', 'SHY', 'GLD', 'SLV', 'XLU', 'XLP', 'DBC']);
const RATE_SYMBOLS = new Set(['^TNX', '^VIX', 'TLT', 'IEF', 'SHY']);

function buildFactorSlices(quotes: MarketQuote[], locale: Locale): SectorSlice[] {
  const buckets = {
    growth: { weight: 0, momentum: 0, count: 0 },
    etf: { weight: 0, momentum: 0, count: 0 },
    asia: { weight: 0, momentum: 0, count: 0 },
    defensive: { weight: 0, momentum: 0, count: 0 },
    rates: { weight: 0, momentum: 0, count: 0 },
  };

  quotes.forEach((quote, index) => {
    const symbol = quote.symbol.toUpperCase();
    const weight = Math.max(1, quote.price * (index + 1) * (1 + Math.abs(quote.changePercent) * 0.03));
    const momentum = quote.changePercent;

    if (GROWTH_SYMBOLS.has(symbol)) {
      buckets.growth.weight += weight;
      buckets.growth.momentum += momentum;
      buckets.growth.count += 1;
      return;
    }

    if (ETF_SYMBOLS.has(symbol)) {
      buckets.etf.weight += weight;
      buckets.etf.momentum += momentum;
      buckets.etf.count += 1;
      return;
    }

    if (DEFENSIVE_SYMBOLS.has(symbol)) {
      buckets.defensive.weight += weight;
      buckets.defensive.momentum += momentum;
      buckets.defensive.count += 1;
      return;
    }

    if (RATE_SYMBOLS.has(symbol)) {
      buckets.rates.weight += weight * 0.95;
      buckets.rates.momentum += momentum;
      buckets.rates.count += 1;
      return;
    }

    if (symbol.endsWith('.HK') || symbol.endsWith('.SH') || symbol.endsWith('.SZ') || symbol.includes('HSI')) {
      buckets.asia.weight += weight;
      buckets.asia.momentum += momentum;
      buckets.asia.count += 1;
      return;
    }

    buckets.rates.weight += weight * 0.4;
    buckets.rates.momentum += momentum * 0.35;
    buckets.rates.count += 1;
  });

  const totalWeight =
    buckets.growth.weight +
    buckets.etf.weight +
    buckets.asia.weight +
    buckets.defensive.weight +
    buckets.rates.weight || 1;

  const labels = locale === 'zh'
    ? { growth: '成长科技', etf: '宽基ETF', asia: '亚太主题', defensive: '防御资产', rates: '利率敏感' }
    : { growth: 'Growth Tech', etf: 'Broad ETF', asia: 'Asia Theme', defensive: 'Defensive', rates: 'Rate Sensitive' };

  const source = [
    { key: 'growth', fill: '#14b8a6', ...buckets.growth },
    { key: 'etf', fill: '#0284c7', ...buckets.etf },
    { key: 'asia', fill: '#f97316', ...buckets.asia },
    { key: 'defensive', fill: '#0f766e', ...buckets.defensive },
    { key: 'rates', fill: '#64748b', ...buckets.rates },
  ] as const;

  return source
    .map((item) => ({
      id: item.key,
      name: labels[item.key],
      allocation: Math.max(4, Math.round((item.weight / totalWeight) * 100)),
      momentum: item.count > 0 ? item.momentum / item.count : 0,
      strength: momentumLabel(item.count > 0 ? item.momentum / item.count : 0, locale),
      fill: item.fill,
    }))
    .sort((left, right) => right.allocation - left.allocation);
}

function momentumLabel(momentum: number, locale: Locale): string {
  if (momentum > 0.6) return locale === 'zh' ? '强势扩张' : 'Strong Expansion';
  if (momentum > 0.1) return locale === 'zh' ? '温和抬升' : 'Mild Upturn';
  if (momentum < -0.6) return locale === 'zh' ? '回撤加速' : 'Fast Drawdown';
  if (momentum < -0.1) return locale === 'zh' ? '弱势承压' : 'Under Pressure';
  return locale === 'zh' ? '中性震荡' : 'Neutral Rotation';
}

export function SectorRotationChart({ quotes, locale, isDark }: SectorRotationChartProps) {
  const data = useMemo(() => buildFactorSlices(quotes, locale), [quotes, locale]);
  const lead = data[0] ?? null;
  const compactData = data.slice(0, 4);
  const momentumRange = useMemo(() => {
    const maxAbs = Math.max(...data.map((item) => Math.abs(item.momentum)), 1.2);
    const bound = Math.ceil(maxAbs + 0.4);
    return [-bound, bound] as const;
  }, [data]);
  const tooltipStyle = isDark
    ? { backgroundColor: 'rgba(12,18,30,0.95)', borderColor: 'rgba(63,63,70,0.75)', color: '#f4f4f5' }
    : { backgroundColor: 'rgba(255,255,255,0.95)', borderColor: '#e2e8f0', color: '#0f172a' };

  return (
    <div className="grid h-full grid-cols-1 gap-2.5">
      <div className="h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={compactData}
            margin={{ top: 6, right: 12, bottom: 2, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              yAxisId="allocation"
              domain={[0, 100]}
              tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => `${value}%`}
              width={42}
            />
            <YAxis
              yAxisId="momentum"
              orientation="right"
              domain={[momentumRange[0], momentumRange[1]]}
              tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`}
              width={52}
            />
            <Tooltip
              contentStyle={{ ...tooltipStyle, borderRadius: '12px', fontSize: '13px' }}
              formatter={(value: number | string | Array<number | string> | undefined, name) => {
                const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
                if (!Number.isFinite(numeric)) return '--';
                if (name === 'allocation') {
                  return [`${numeric.toFixed(0)}%`, locale === 'zh' ? '仓位占比' : 'Allocation'];
                }
                return [`${numeric > 0 ? '+' : ''}${numeric.toFixed(2)}%`, locale === 'zh' ? '动量' : 'Momentum'];
              }}
            />
            <Bar
              yAxisId="allocation"
              dataKey="allocation"
              radius={[6, 6, 0, 0]}
              barSize={18}
              fill={isDark ? 'rgba(8,145,178,0.68)' : 'rgba(8,145,178,0.45)'}
            />
            <Line
              yAxisId="momentum"
              type="monotone"
              dataKey="momentum"
              stroke={isDark ? '#e2e8f0' : '#334155'}
              strokeWidth={1.7}
              dot={{ r: 2, fill: isDark ? '#e2e8f0' : '#334155' }}
              activeDot={{ r: 3.2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-1.5">
        {compactData.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>{item.name}</span>
            <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>{item.allocation}%</span>
            <span className={`ml-auto ${item.momentum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {item.momentum >= 0 ? '+' : ''}
              {item.momentum.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {lead ? (
        <div
          className={`rounded-xl border px-2.5 py-1.5 text-sm ${
            isDark ? 'border-zinc-700/50 bg-zinc-900/55 text-zinc-300' : 'border-slate-200/85 bg-slate-50/80 text-slate-700'
          }`}
        >
          {locale === 'zh' ? '主导因子' : 'Dominant Factor'}: <span className="font-semibold">{lead.name}</span> ·{' '}
          {lead.strength}
        </div>
      ) : null}
    </div>
  );
}
