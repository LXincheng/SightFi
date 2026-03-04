import { useMemo } from 'react';
import type { MarketQuote } from '@sightfi/shared';
import { ComposedChart, Bar, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Locale } from '../../../shared/i18n/messages';

interface MacroRegimeSurfaceProps {
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

export function MacroRegimeSurface({ quotes, locale, isDark }: MacroRegimeSurfaceProps) {
  const data = useMemo(() => buildMacroSurface(quotes, locale), [quotes, locale]);
  const tooltipStyle = isDark
    ? { backgroundColor: 'rgba(9,14,26,0.95)', borderColor: 'rgba(63,63,70,0.75)', color: '#f8fafc' }
    : { backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e8f0', color: '#0f172a' };

  return (
    <div className="dashboard-chart h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.08)'} />
          <XAxis dataKey="bucket" tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} width={42} tick={{ fontSize: 13, fill: isDark ? '#94a3b8' : '#475569' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ ...tooltipStyle, borderRadius: '10px', fontSize: '13px' }}
            wrapperStyle={{ zIndex: 9999 }}
            allowEscapeViewBox={{ x: true, y: true }}
            formatter={(value: number | string | Array<number | string> | undefined, name) => {
              const numeric = Array.isArray(value) ? Number(value[0]) : Number(value);
              if (!Number.isFinite(numeric)) return '--';
              if (name === 'breadth') return [`${numeric}`, locale === 'zh' ? '市场广度' : 'Breadth'];
              return [`${numeric}`, locale === 'zh' ? '压力指数' : 'Stress'];
            }}
          />
          <Bar dataKey="breadth" radius={[6, 6, 0, 0]} barSize={20} fill={isDark ? 'rgba(8,145,178,0.68)' : 'rgba(8,145,178,0.5)'} />
          <Line type="monotone" dataKey="stress" stroke={isDark ? '#e2e8f0' : '#334155'} strokeWidth={1.8} dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
