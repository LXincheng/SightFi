import { useMemo } from 'react';
import type { NewsFact } from '@sightfi/shared';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { Locale } from '../../../shared/i18n/messages';

interface GeoRiskTimelineEChartsProps {
  facts: NewsFact[];
  locale: Locale;
  isDark: boolean;
}

interface GeoRiskDatum {
  day: string;
  risk: number;
  volume: number;
}

const RISK_KEYWORDS = [
  'war',
  'conflict',
  'sanction',
  'tariff',
  'missile',
  'blockade',
  'election',
  'coup',
  'military',
  '制裁',
  '战争',
  '冲突',
  '关税',
  '选举',
];

function buildGeoRiskData(facts: NewsFact[]): GeoRiskDatum[] {
  const dayMap = new Map<string, { risk: number; volume: number }>();
  const sorted = [...facts]
    .sort((left, right) => new Date(left.publishedAt).getTime() - new Date(right.publishedAt).getTime())
    .slice(-40);

  sorted.forEach((fact) => {
    const date = new Date(fact.publishedAt);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(5, 10);
    const text = `${fact.headline} ${fact.factSummary}`.toLowerCase();
    const keywordHit = RISK_KEYWORDS.reduce((sum, keyword) => (text.includes(keyword) ? sum + 1 : sum), 0);
    const sentimentFactor = fact.sentiment === 'bearish' ? 1.6 : fact.sentiment === 'bullish' ? 0.7 : 1;
    const score = Math.max(1, Math.round((keywordHit + 1) * sentimentFactor * 8));
    const prev = dayMap.get(key) ?? { risk: 0, volume: 0 };
    dayMap.set(key, {
      risk: Math.min(100, prev.risk + score),
      volume: prev.volume + 1,
    });
  });

  return Array.from(dayMap.entries())
    .slice(-8)
    .map(([day, item]) => ({
      day,
      risk: item.risk,
      volume: item.volume,
    }));
}

export function GeoRiskTimelineECharts({ facts, locale, isDark }: GeoRiskTimelineEChartsProps) {
  const data = useMemo(() => buildGeoRiskData(facts), [facts]);

  const option = useMemo<EChartsOption>(() => {
    if (data.length === 0) return {};

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(9,14,26,0.95)' : 'rgba(255,255,255,0.96)',
        borderColor: isDark ? 'rgba(63,63,70,0.75)' : '#e2e8f0',
        textStyle: {
          color: isDark ? '#f8fafc' : '#0f172a',
          fontSize: 13,
        },
        borderRadius: 10,
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)',
          },
        },
      },
      grid: {
        top: 12,
        right: 12,
        bottom: 8,
        left: 42,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: data.map(item => item.day),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 13,
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.08)',
            type: 'dashed',
          },
        },
        axisLabel: {
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 13,
        },
      },
      series: [
        {
          name: locale === 'zh' ? '风险分' : 'Risk Score',
          type: 'line',
          data: data.map(item => item.risk),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#dc2626',
            width: 2,
          },
          itemStyle: {
            color: '#dc2626',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(220,38,38,0.28)' },
                { offset: 1, color: 'rgba(220,38,38,0.02)' },
              ],
            },
          },
        },
      ],
    };
  }, [data, locale, isDark]);

  if (data.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center rounded-xl border text-sm ${isDark ? 'border-slate-700/70 bg-slate-900/50 text-slate-500' : 'border-slate-200/90 bg-slate-50/90 text-slate-500'}`}>
        {locale === 'zh' ? '暂无地缘风险序列' : 'No geopolitical timeline'}
      </div>
    );
  }

  return (
    <div className="h-full">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
