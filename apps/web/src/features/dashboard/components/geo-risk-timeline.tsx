import { useMemo } from 'react';
import type { NewsFact } from '@sightfi/shared';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Locale } from '../../../shared/i18n/messages';

interface GeoRiskTimelineProps {
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

export function GeoRiskTimeline({ facts, locale, isDark }: GeoRiskTimelineProps) {
  const data = useMemo(() => buildGeoRiskData(facts), [facts]);
  const tooltipStyle = isDark
    ? { backgroundColor: 'rgba(9,14,26,0.95)', borderColor: 'rgba(63,63,70,0.75)', color: '#f8fafc' }
    : { backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', color: '#0f172a' };

  if (data.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center rounded-xl border text-sm ${isDark ? 'border-slate-700/70 bg-slate-900/50 text-slate-500' : 'border-slate-200/90 bg-slate-50/90 text-slate-500'}`}>
        {locale === 'zh' ? '暂无地缘风险序列' : 'No geopolitical timeline'}
      </div>
    );
  }

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 12, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id="geoRiskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.08)'} />
          <XAxis dataKey="day" tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} width={42} tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '13px' }}
            formatter={(value: number | string | Array<number | string> | undefined, name) => {
              const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
              if (!Number.isFinite(numeric)) return '--';
              if (name === 'risk') return [`${numeric}`, locale === 'zh' ? '风险分' : 'Risk Score'];
              return [`${numeric}`, locale === 'zh' ? '事件量' : 'Event Volume'];
            }}
          />
          <Area type="monotone" dataKey="risk" stroke="#dc2626" strokeWidth={1.8} fill="url(#geoRiskGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
