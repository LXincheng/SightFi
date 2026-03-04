import type { MarketQuote } from '@sightfi/shared';
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CurrencyCode } from '../../../shared/constants/currency.constants';
import type { Locale } from '../../../shared/i18n/messages';
import { formatDateTimeWithZone } from '../../../shared/i18n/format';
import { formatCurrencyValue } from '../../../shared/utils/currency';

interface MoverAnomalyStreamEChartsProps {
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
}

function severityByChange(changePercent: number): 'high' | 'medium' | 'low' {
  const abs = Math.abs(changePercent);
  if (abs >= 2.2) return 'high';
  if (abs >= 1.1) return 'medium';
  return 'low';
}

function toMoverData(quotes: MarketQuote[]): MoverDatum[] {
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

export function MoverAnomalyStreamECharts({ quotes, locale, currency, isDark }: MoverAnomalyStreamEChartsProps) {
  const data = useMemo(() => toMoverData(quotes), [quotes]);
  const chartData = useMemo(() => data.slice(0, 4).reverse(), [data]);
  const topAlerts = useMemo(() => data.slice(0, 2), [data]);
  const textDim = isDark ? 'text-zinc-500' : 'text-slate-500';

  const option = useMemo<EChartsOption>(() => {
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(12,18,30,0.95)' : 'rgba(255,255,255,0.96)',
        borderColor: isDark ? 'rgba(63,63,70,0.75)' : '#e2e8f0',
        textStyle: {
          color: isDark ? '#f4f4f5' : '#1e293b',
          fontSize: 13,
        },
        borderRadius: 10,
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const item = params[0];
          const payload = chartData[item.dataIndex];
          if (!payload) return '';
          const change = `${payload.delta >= 0 ? '+' : ''}${payload.delta.toFixed(2)}%`;
          return `${payload.symbol}<br/>${formatCurrencyValue(payload.price, currency, locale, 2)}<br/>${change}`;
        },
      },
      grid: {
        top: 12,
        right: 12,
        bottom: 8,
        left: 44,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: chartData.map(item => item.symbol),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 13,
        },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
            type: 'dashed',
          },
        },
        axisLabel: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 13,
          formatter: (value: number) => `${value.toFixed(1)}%`,
        },
      },
      series: [
        {
          name: locale === 'zh' ? '涨跌幅' : 'Change',
          type: 'bar',
          data: chartData.map(item => ({
            value: item.absDelta,
            itemStyle: {
              color: item.delta >= 0
                ? (item.severity === 'high' ? '#10b981' : '#34d399')
                : (item.severity === 'high' ? '#f43f5e' : '#fb7185'),
              opacity: item.severity === 'high' ? 0.95 : 0.78,
              borderRadius: [8, 8, 0, 0],
            },
          })),
          barWidth: 24,
        },
      ],
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: {
          color: isDark ? 'rgba(245,158,11,0.8)' : 'rgba(234,88,12,0.6)',
          type: 'dashed',
          width: 1,
        },
        data: [{ yAxis: 1.2 }],
      },
    };
  }, [chartData, locale, currency, isDark]);

  return (
    <div className="grid h-full grid-cols-1 gap-2.5">
      <div className="h-[180px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
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
          </article>
        ))}
      </div>
    </div>
  );
}
