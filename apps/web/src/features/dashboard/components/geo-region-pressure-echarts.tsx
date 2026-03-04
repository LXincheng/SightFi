import { useMemo } from 'react';
import type { NewsFact } from '@sightfi/shared';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { Locale } from '../../../shared/i18n/messages';

interface GeoRegionPressureEChartsProps {
  facts: NewsFact[];
  locale: Locale;
  isDark: boolean;
}

interface RegionPressureDatum {
  region: string;
  pressure: number;
  events: number;
}

type RegionId = 'NA' | 'SA' | 'EU' | 'AF' | 'AS' | 'OC';

const REGION_KEYWORDS: Record<RegionId, string[]> = {
  NA: ['u.s.', 'united states', 'north america', 'canada', '美国', '美联储'],
  SA: ['latin america', 'brazil', 'mexico', 'south america', '拉美', '巴西'],
  EU: ['europe', 'eurozone', 'germany', 'france', 'uk', '欧洲', '欧盟'],
  AF: ['africa', 'south africa', 'nigeria', '非洲', '南非'],
  AS: ['asia', 'china', 'hong kong', 'japan', 'india', '亚洲', '中国', '日本', '印度'],
  OC: ['oceania', 'australia', 'new zealand', '大洋洲', '澳大利亚'],
};

const REGION_LABELS: Record<RegionId, { zh: string; en: string }> = {
  NA: { zh: '北美', en: 'N.A.' },
  SA: { zh: '拉美', en: 'LatAm' },
  EU: { zh: '欧洲', en: 'Europe' },
  AF: { zh: '非洲', en: 'Africa' },
  AS: { zh: '亚太', en: 'APAC' },
  OC: { zh: '大洋洲', en: 'Oceania' },
};

function detectRegion(fact: NewsFact): RegionId {
  const text = `${fact.headline} ${fact.factSummary} ${fact.source}`.toLowerCase();
  let bestRegion: RegionId = 'NA';
  let bestScore = 0;

  (Object.keys(REGION_KEYWORDS) as RegionId[]).forEach((region) => {
    const score = REGION_KEYWORDS[region].reduce((sum, keyword) => (text.includes(keyword) ? sum + 1 : sum), 0);
    if (score > bestScore) {
      bestScore = score;
      bestRegion = region;
    }
  });

  return bestScore > 0 ? bestRegion : 'NA';
}

function buildData(facts: NewsFact[], locale: Locale): RegionPressureDatum[] {
  const bucket = new Map<RegionId, { pressure: number; events: number }>(
    (Object.keys(REGION_LABELS) as RegionId[]).map((region) => [region, { pressure: 0, events: 0 }]),
  );

  facts.slice(0, 50).forEach((fact) => {
    const region = detectRegion(fact);
    const entry = bucket.get(region);
    if (!entry) return;
    const score = fact.sentiment === 'bearish' ? 16 : fact.sentiment === 'bullish' ? 8 : 12;
    bucket.set(region, {
      pressure: Math.min(100, entry.pressure + score),
      events: entry.events + 1,
    });
  });

  return (Object.keys(REGION_LABELS) as RegionId[])
    .map((region) => ({
      region: locale === 'zh' ? REGION_LABELS[region].zh : REGION_LABELS[region].en,
      pressure: bucket.get(region)?.pressure ?? 0,
      events: bucket.get(region)?.events ?? 0,
    }))
    .sort((left, right) => right.pressure - left.pressure)
    .slice(0, 5);
}

export function GeoRegionPressureECharts({ facts, locale, isDark }: GeoRegionPressureEChartsProps) {
  const data = useMemo(() => buildData(facts, locale), [facts, locale]);

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
          type: 'shadow',
        },
      },
      grid: {
        top: 12,
        right: 12,
        bottom: 8,
        left: 72,
        containLabel: false,
      },
      xAxis: {
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
      yAxis: {
        type: 'category',
        data: data.map(item => item.region),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: isDark ? '#a1a1aa' : '#475569',
          fontSize: 13,
        },
      },
      series: [
        {
          name: locale === 'zh' ? '压力分' : 'Pressure',
          type: 'bar',
          data: data.map(item => item.pressure),
          barWidth: 18,
          itemStyle: {
            color: isDark ? 'rgba(8,145,178,0.72)' : 'rgba(8,145,178,0.55)',
            borderRadius: [6, 6, 6, 6],
          },
        },
      ],
    };
  }, [data, locale, isDark]);

  if (data.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center rounded-xl border text-sm ${isDark ? 'border-slate-700/70 bg-slate-900/50 text-slate-500' : 'border-slate-200/90 bg-slate-50/90 text-slate-500'}`}>
        {locale === 'zh' ? '暂无区域压力数据' : 'No region pressure data'}
      </div>
    );
  }

  return (
    <div className="h-full">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
