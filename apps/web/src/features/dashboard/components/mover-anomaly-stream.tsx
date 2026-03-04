import type { MarketQuote } from '@sightfi/shared';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CurrencyCode } from '../../../shared/constants/currency.constants';
import type { Locale } from '../../../shared/i18n/messages';
import { formatDateTimeWithZone } from '../../../shared/i18n/format';
import { formatCurrencyValue } from '../../../shared/utils/currency';

interface MoverAnomalyStreamProps {
  quotes: MarketQuote[];
  locale: Locale;
  currency: CurrencyCode;
  isDark: boolean;
}

interface MoverDatum {
  symbol: string;
  delta: number;
  absDelta: number;
  price: number;
  updatedAt: string;
  severity: 'high' | 'medium' | 'low';
  recencyScore: number;
}

function severityByChange(changePercent: number): 'high' | 'medium' | 'low' {
  const abs = Math.abs(changePercent);
  if (abs >= 2.2) return 'high';
  if (abs >= 1.1) return 'medium';
  return 'low';
}

function toMoverData(quotes: MarketQuote[]): MoverDatum[] {
  const now = Date.now();
  return [...quotes]
    .sort((left, right) => {
      const timeDiff = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return Math.abs(right.changePercent) - Math.abs(left.changePercent);
    })
    .slice(0, 10)
    .map((item) => ({
      symbol: item.symbol,
      delta: Number(item.changePercent.toFixed(2)),
      absDelta: Number(Math.abs(item.changePercent).toFixed(2)),
      price: item.price,
      updatedAt: item.updatedAt,
      severity: severityByChange(item.changePercent),
      recencyScore: Math.max(4, 100 - Math.round((now - new Date(item.updatedAt).getTime()) / (1000 * 60))),
    }))
    .sort((left, right) => right.absDelta - left.absDelta);
}

function severityLabel(level: MoverDatum['severity'], locale: Locale): string {
  if (locale === 'zh') {
    if (level === 'high') return '高优先';
    if (level === 'medium') return '中优先';
    return '低优先';
  }
  if (level === 'high') return 'High Priority';
  if (level === 'medium') return 'Medium Priority';
  return 'Low Priority';
}

export function MoverAnomalyStream({ quotes, locale, currency, isDark }: MoverAnomalyStreamProps) {
  const data = useMemo(() => toMoverData(quotes), [quotes]);
  const chartData = useMemo(() => data.slice(0, 6).reverse(), [data]);
  const topAlerts = useMemo(() => data.slice(0, 2), [data]);
  const textDim = isDark ? 'text-zinc-500' : 'text-slate-500';
  const tooltipStyle = isDark
    ? { backgroundColor: 'rgba(12,18,30,0.95)', borderColor: 'rgba(63,63,70,0.75)', color: '#f4f4f5' }
    : { backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', color: '#1e293b' };

  return (
    <div className="grid h-full grid-cols-1 gap-2.5">
      <div className="h-[164px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} />
            <XAxis
              dataKey="symbol"
              tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number) => `${value.toFixed(1)}%`}
            />
            <ReferenceLine y={1.2} stroke={isDark ? 'rgba(245,158,11,0.8)' : 'rgba(234,88,12,0.6)'} strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '13px' }}
              formatter={(_value: number | string | Array<number | string> | undefined, _name, item) => {
                const payload = item.payload as MoverDatum | undefined;
                if (!payload) return '--';
                const change = `${payload.delta >= 0 ? '+' : ''}${payload.delta.toFixed(2)}%`;
                return [change, `${payload.symbol} · ${formatCurrencyValue(payload.price, currency, locale, 2)}`];
              }}
            />
            <Bar dataKey="absDelta" radius={[8, 8, 0, 0]}>
              {chartData.map((item) => (
                <Cell
                  key={item.symbol}
                  fill={
                    item.delta >= 0
                      ? item.severity === 'high'
                        ? '#10b981'
                        : '#34d399'
                      : item.severity === 'high'
                        ? '#f43f5e'
                        : '#fb7185'
                  }
                  fillOpacity={item.severity === 'high' ? 0.95 : 0.78}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {topAlerts.map((item) => (
          <article
            key={item.symbol}
            className={`rounded-xl border p-2.5 ${
              isDark ? 'border-zinc-700/45 bg-zinc-900/45' : 'border-slate-200/85 bg-white/90'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={isDark ? 'text-sm font-semibold text-zinc-100' : 'text-sm font-semibold text-slate-900'}>
                {item.symbol}
              </div>
              <div className={`text-sm font-semibold ${item.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {item.delta >= 0 ? '+' : ''}
                {item.delta.toFixed(2)}%
              </div>
            </div>
            <div className={`mt-1 text-sm ${textDim}`}>
              {formatCurrencyValue(item.price, currency, locale, 2)}
            </div>
            <div className={`mt-1 text-sm ${textDim}`}>
              {severityLabel(item.severity, locale)} · {formatDateTimeWithZone(item.updatedAt, locale, { withYear: false })}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-300/30 dark:bg-zinc-800/80">
              <div
                className={`h-full rounded-full ${item.delta >= 0 ? 'bg-emerald-400/90' : 'bg-rose-400/90'}`}
                style={{ width: `${Math.max(12, Math.min(100, item.recencyScore))}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
