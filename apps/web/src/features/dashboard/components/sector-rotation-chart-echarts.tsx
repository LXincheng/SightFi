import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { MarketQuote } from '@sightfi/shared';
import type { Locale } from '../../../shared/i18n/messages';

interface SectorRotationChartEChartsProps {
  quotes: MarketQuote[];
  locale: Locale;
  isDark: boolean;
}

interface SectorSlice {
  id: string;
  name: string;
  allocation: number;
  momentum: number;
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
    : { growth: 'Growth', etf: 'Broad ETF', asia: 'APAC', defensive: 'Defensive', rates: 'Rate Sens' };

  const source = [
    { key: 'growth', ...buckets.growth },
    { key: 'etf', ...buckets.etf },
    { key: 'asia', ...buckets.asia },
    { key: 'defensive', ...buckets.defensive },
    { key: 'rates', ...buckets.rates },
  ] as const;

  return source
    .map((item) => ({
      id: item.key,
      name: labels[item.key],
      allocation: Math.round((item.weight / totalWeight) * 100),
      momentum: item.count > 0 ? item.momentum / item.count : 0,
    }))
    .sort((a, b) => b.allocation - a.allocation);
}

function getMomentumColor(momentum: number): string {
  if (momentum > 1.5) return '#10b981';
  if (momentum > 0.5) return '#34d399';
  if (momentum < -1.5) return '#ef4444';
  if (momentum < -0.5) return '#f87171';
  return '#64748b';
}

export function SectorRotationChartECharts({ quotes, locale, isDark }: SectorRotationChartEChartsProps) {
  const data = useMemo(() => buildFactorSlices(quotes, locale), [quotes, locale]);

  const option = useMemo<EChartsOption>(() => {
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.06)';

    return {
      grid: {
        top: 10,
        right: 15,
        bottom: 30,
        left: 5,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(9,14,26,0.95)' : 'rgba(255,255,255,0.97)',
        borderColor: isDark ? 'rgba(63,63,70,0.78)' : '#e2e8f0',
        borderRadius: 10,
        textStyle: {
          color: isDark ? '#f8fafc' : '#0f172a',
          fontSize: 13,
        },
        formatter: (params: any) => {
          const item = params[0];
          const dataItem = data[item.dataIndex];
          if (!dataItem) return '';
          return `${dataItem.name}<br/>配置: ${dataItem.allocation}%<br/>动量: ${dataItem.momentum >= 0 ? '+' : ''}${dataItem.momentum.toFixed(2)}%`;
        },
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 12,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 12,
          formatter: '{value}%',
        },
        splitLine: {
          lineStyle: {
            color: gridColor,
            type: 'dashed',
          },
        },
      },
      series: [
        {
          type: 'bar',
          data: data.map(item => ({
            value: item.allocation,
            itemStyle: {
              color: getMomentumColor(item.momentum),
              borderRadius: [8, 8, 0, 0],
            },
          })),
          barWidth: '50%',
          emphasis: {
            disabled: true,
          },
        },
      ],
    };
  }, [data, isDark]);

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}
