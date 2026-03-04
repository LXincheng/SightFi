import { useMemo } from 'react';
import type { MarketQuote } from '@sightfi/shared';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { Locale } from '../../../shared/i18n/messages';

interface MacroRegimeSurfaceEChartsProps {
  quotes: MarketQuote[];
  locale: Locale;
  isDark: boolean;
}

interface MacroDatum {
  bucket: string;
  breadth: number;
  stress: number;
}

function buildMacroSurface(quotes: MarketQuote[], locale: Locale): MacroDatum[] {
  const groups = [
    { key: 'growth', matcher: (s: string) => ['QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META'].includes(s) },
    { key: 'broad', matcher: (s: string) => ['SPY', 'VTI', 'DIA', 'IWM', 'VOO'].includes(s) },
    { key: 'asia', matcher: (s: string) => s.endsWith('.HK') || s.includes('HSI') || ['FXI', 'MCHI', 'EWJ', 'INDA'].includes(s) },
    { key: 'defensive', matcher: (s: string) => ['TLT', 'IEF', 'SHY', 'GLD', 'SLV', 'XLP', 'XLU'].includes(s) },
  ] as const;

  const labels = locale === 'zh'
    ? { growth: '成长', broad: '宽基', asia: '亚太', defensive: '防御' }
    : { growth: 'Growth', broad: 'Broad', asia: 'APAC', defensive: 'Defensive' };

  return groups.map((group) => {
    const scoped = quotes.filter((quote) => group.matcher(quote.symbol.toUpperCase()));
    const changeAvg = scoped.length > 0 ? scoped.reduce((sum, quote) => sum + quote.changePercent, 0) / scoped.length : 0;
    const breadth = Math.max(5, Math.min(95, Math.round(50 + changeAvg * 16)));
    const stress = Math.max(5, Math.min(95, Math.round(scoped.reduce((sum, quote) => sum + Math.abs(quote.changePercent), 0) * 8)));
    return {
      bucket: labels[group.key],
      breadth,
      stress,
    };
  });
}

export function MacroRegimeSurfaceECharts({ quotes, locale, isDark }: MacroRegimeSurfaceEChartsProps) {
  const data = useMemo(() => buildMacroSurface(quotes, locale), [quotes, locale]);

  const option = useMemo<EChartsOption>(() => {
    const indicators = data.map(item => ({
      name: item.bucket,
      max: 100,
    }));

    const breadthData = data.map(item => item.breadth);
    const stressData = data.map(item => item.stress);

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? 'rgba(9,14,26,0.95)' : 'rgba(255,255,255,0.96)',
        borderColor: isDark ? 'rgba(63,63,70,0.75)' : '#e2e8f0',
        textStyle: {
          color: isDark ? '#f8fafc' : '#0f172a',
          fontSize: 13,
        },
        borderRadius: 10,
      },
      legend: {
        data: [
          locale === 'zh' ? '市场广度' : 'Breadth',
          locale === 'zh' ? '压力指数' : 'Stress',
        ],
        bottom: 0,
        textStyle: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 12,
        },
      },
      radar: {
        indicator: indicators,
        radius: '65%',
        splitNumber: 4,
        axisName: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 13,
        },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)',
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: isDark
              ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
              : ['rgba(15,23,42,0.02)', 'rgba(15,23,42,0.04)'],
          },
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.16)',
          },
        },
      },
      series: [
        {
          name: locale === 'zh' ? '宏观态势' : 'Macro Regime',
          type: 'radar',
          data: [
            {
              value: breadthData,
              name: locale === 'zh' ? '市场广度' : 'Breadth',
              areaStyle: {
                color: isDark ? 'rgba(8,145,178,0.25)' : 'rgba(8,145,178,0.18)',
              },
              lineStyle: {
                color: isDark ? 'rgba(8,145,178,0.85)' : 'rgba(8,145,178,0.75)',
                width: 2,
              },
              itemStyle: {
                color: isDark ? '#0891b2' : '#0891b2',
              },
            },
            {
              value: stressData,
              name: locale === 'zh' ? '压力指数' : 'Stress',
              areaStyle: {
                color: isDark ? 'rgba(226,232,240,0.12)' : 'rgba(51,65,85,0.08)',
              },
              lineStyle: {
                color: isDark ? '#e2e8f0' : '#334155',
                width: 2,
              },
              itemStyle: {
                color: isDark ? '#e2e8f0' : '#334155',
              },
            },
          ],
        },
      ],
    };
  }, [data, locale, isDark]);

  return (
    <div className="dashboard-chart h-full">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
