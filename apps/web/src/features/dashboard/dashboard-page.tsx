import type { NewsFact } from '@sightfi/shared';
import type { BootstrapState } from '../../shared/hooks/use-bootstrap';
import type { LiveQuotesState } from '../../shared/hooks/use-live-quotes';
import type { Locale } from '../../shared/i18n/messages';
import type { CurrencyCode } from '../../shared/constants/currency.constants';
import type { ComponentType, ReactNode } from 'react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, ArrowDownRight, ArrowUpRight, ChartColumnBig, Clock3, Flag, Globe2, TrendingUp } from 'lucide-react';
import { SectorRotationChartECharts } from './components/sector-rotation-chart-echarts';
import { MoverAnomalyStreamECharts } from './components/mover-anomaly-stream-echarts';
import { MacroRegimeSurfaceECharts } from './components/macro-regime-surface-echarts';
import { GeoRiskTimelineECharts } from './components/geo-risk-timeline-echarts';
import { GeoRegionPressureECharts } from './components/geo-region-pressure-echarts';
import { PerformanceChartECharts } from './components/performance-chart-echarts';
import { useGeoPulse } from './use-geo-pulse';
import { t } from '../../shared/i18n/messages';
import { formatCurrencyValue } from '../../shared/utils/currency';

const WorldMapNews = lazy(() =>
  import('./components/world-map-news').then((module) => ({ default: module.WorldMapNews })),
);

interface DashboardPageProps {
  state: BootstrapState;
  live: LiveQuotesState;
  facts: NewsFact[];
  locale: Locale;
  isDark: boolean;
  currency: CurrencyCode;
}

interface PerfDatum {
  tick: string;
  portfolio: number;
  benchmark: number;
}

function buildPerfData(quotes: LiveQuotesState['quotes']): PerfDatum[] {
  const base = quotes.reduce((sum, quote, index) => sum + quote.price * (index + 2), 0) || 3600;
  const volatility = quotes.length > 0
    ? quotes.reduce((sum, item) => sum + Math.abs(item.changePercent), 0) / quotes.length
    : 0.9;

  return Array.from({ length: 28 }, (_, index) => {
    const drift = index * (220 + volatility * 14);
    const wave = Math.sin(index * 0.61) * (680 + volatility * 100) + Math.cos(index * 0.34) * 480;
    const benchmarkWave = Math.sin(index * 0.41) * 350 + Math.cos(index * 0.21) * 240;
    return {
      tick: `${index + 1}`,
      portfolio: Math.round(base * 17 + drift + wave),
      benchmark: Math.round(base * 16.6 + index * 210 + benchmarkWave),
    };
  });
}

interface DashboardCardProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  dimClass: string;
  panelClass: string;
  children: ReactNode;
  delay: number;
}

function DashboardCard({ title, icon: Icon, dimClass, panelClass, children, delay }: DashboardCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay }}
      className={`glass-card flex min-h-[280px] md:h-[320px] lg:h-[360px] flex-col rounded-2xl border px-4 py-3.5 ${panelClass}`}
    >
      <header className="mb-2.5 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-cyan-400" />
        <h3 className={`dashboard-chart-title ${dimClass}`}>{title}</h3>
      </header>
      <div className="min-h-0 flex-1 overflow-visible rounded-xl">
        {children}
      </div>
    </motion.article>
  );
}

export function DashboardPage({ state, live, facts, locale, isDark, currency }: DashboardPageProps) {
  const [mapReady, setMapReady] = useState(false);
  const geoPulse = useGeoPulse(locale);

  useEffect(() => {
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const onIdle = () => setMapReady(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (window as Window & { requestIdleCallback: (cb: () => void, options?: { timeout: number }) => number })
        .requestIdleCallback(onIdle, { timeout: 900 });
    } else {
      timeoutId = globalThis.setTimeout(onIdle, 300);
    }

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null && 'cancelIdleCallback' in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
    };
  }, []);

  const perfData = useMemo(() => buildPerfData(live.quotes), [live.quotes]);
  const movers = useMemo(
    () => [...live.quotes].sort((left, right) => Math.abs(right.changePercent) - Math.abs(left.changePercent)).slice(0, 6),
    [live.quotes],
  );

  const { totalAssets, dayPnl, avgChange } = useMemo(() => {
    const assets = live.quotes.reduce((sum, quote, index) => sum + quote.price * (8 + index * 2), 0);
    const pnl = live.quotes.reduce(
      (sum, quote, index) => sum + quote.price * (8 + index * 2) * (quote.changePercent / 100),
      0,
    );
    const change = live.quotes.length > 0
      ? live.quotes.reduce((sum, quote) => sum + quote.changePercent, 0) / live.quotes.length
      : 0;
    return { totalAssets: assets, dayPnl: pnl, avgChange: change };
  }, [live.quotes]);

  const panelClass = isDark
    ? 'border-slate-800/72 bg-slate-950/58 backdrop-blur-xl'
    : 'border-slate-200/90 bg-white/88 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.06)]';
  const insetClass = isDark ? 'border-slate-700/60 bg-slate-900/52' : 'border-slate-200/90 bg-slate-50/92';
  const titleClass = isDark ? 'text-slate-100' : 'text-slate-900';
  const dimClass = isDark ? 'text-slate-500' : 'text-slate-500';

  const stats = [
    {
      key: 'asset',
      label: t('dashboard.metric.totalAssets'),
      value: formatCurrencyValue(totalAssets, currency, locale, 0),
      delta: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`,
      up: avgChange >= 0,
    },
    {
      key: 'pnl',
      label: t('dashboard.metric.dayPnl'),
      value: `${dayPnl >= 0 ? '+' : '-'}${formatCurrencyValue(Math.abs(dayPnl), currency, locale, 0)}`,
      delta: t('dashboard.metric.vsYesterday'),
      up: dayPnl >= 0,
    },
    {
      key: 'watch',
      label: t('dashboard.metric.tracked'),
      value: `${live.quotes.length}`,
      delta: t('dashboard.metric.liveSymbols'),
      up: true,
    },
    {
      key: 'geo',
      label: t('dashboard.metric.geoEvents'),
      value: `${geoPulse.facts.length}`,
      delta: geoPulse.loading
        ? t('dashboard.metric.syncing')
        : geoPulse.error
          ? t('dashboard.metric.degraded')
          : t('dashboard.metric.synced'),
      up: !geoPulse.error,
    },
    {
      key: 'health',
      label: t('dashboard.metric.system'),
      value: state.health?.status === 'ok' ? 'ONLINE' : 'WAITING',
      delta: state.health ? `${state.health.uptimeSec}s` : '--',
      up: true,
    },
  ] as const;

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map((stat, index) => (
          <motion.article
            key={stat.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: index * 0.04 }}
            className={`glass-card relative overflow-hidden rounded-2xl border px-3 py-2.5 ${panelClass}`}
          >
            <div className="absolute right-2 top-2 opacity-20">
              {stat.up ? <ArrowUpRight className="h-5 w-5 text-emerald-500" /> : <ArrowDownRight className="h-5 w-5 text-rose-500" />}
            </div>
            <div className={`text-sm font-medium ${dimClass}`}>{stat.label}</div>
            <div className={`mt-0.5 text-lg font-bold md:text-xl ${titleClass}`}>{stat.value}</div>
            <div className={`mt-0.5 text-sm font-medium ${stat.up ? 'text-emerald-500' : 'text-rose-500'}`}>{stat.delta}</div>
          </motion.article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-12 xl:grid-rows-3">
        <div className="space-y-4 lg:col-span-1 xl:col-span-3 xl:row-span-3">
          <DashboardCard
            title={t('dashboard.card.performance')}
            icon={TrendingUp}
            dimClass={dimClass}
            panelClass={panelClass}
            delay={0.06}
          >
            <div className="dashboard-chart h-full">
              <PerformanceChartECharts data={perfData} isDark={isDark} />
            </div>
          </DashboardCard>

          <DashboardCard
            title={t('dashboard.card.sector')}
            icon={Activity}
            dimClass={dimClass}
            panelClass={panelClass}
            delay={0.1}
          >
            <div className="dashboard-chart h-full">
              <SectorRotationChartECharts quotes={live.quotes} locale={locale} isDark={isDark} />
            </div>
          </DashboardCard>

          <DashboardCard
            title={t('dashboard.card.geoTimeline')}
            icon={Flag}
            dimClass={dimClass}
            panelClass={panelClass}
            delay={0.14}
          >
            <div className="dashboard-chart h-full">
              <GeoRiskTimelineECharts facts={geoPulse.facts} locale={locale} isDark={isDark} />
            </div>
          </DashboardCard>
        </div>

        <motion.article
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.08 }}
          className={`glass-card flex h-[600px] md:h-[700px] lg:h-[900px] flex-col rounded-2xl border p-3.5 lg:col-span-2 xl:col-span-5 xl:row-span-3 ${panelClass}`}
        >
          <header className="mb-2.5 flex items-center justify-between">
            <h3 className={`flex items-center gap-1.5 text-base font-bold tracking-wide ${dimClass}`}>
              <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
              {t('dashboard.card.map')}
            </h3>
            <span className={`rounded-lg border px-2 py-0.5 text-sm font-semibold ${insetClass}`}>LIVE</span>
          </header>
          <div className="min-h-0 flex-1 overflow-visible rounded-xl">
            {mapReady ? (
              <Suspense
                fallback={
                  <div className={`flex h-full items-center justify-center rounded-xl border ${insetClass}`}>
                    <span className={dimClass}>{t('dashboard.map.loading')}</span>
                  </div>
                }
              >
                <WorldMapNews locale={locale} isDark={isDark} facts={geoPulse.facts.length > 0 ? geoPulse.facts : facts} />
              </Suspense>
            ) : (
              <div className={`flex h-full items-center justify-center rounded-xl border ${insetClass}`}>
                <span className={dimClass}>{t('dashboard.map.preparing')}</span>
              </div>
            )}
          </div>
        </motion.article>

        <div className="space-y-4 lg:col-span-1 xl:col-span-4 xl:row-span-3">
          <DashboardCard
            title={t('dashboard.card.macro')}
            icon={ChartColumnBig}
            dimClass={dimClass}
            panelClass={panelClass}
            delay={0.12}
          >
            <MacroRegimeSurfaceECharts quotes={live.quotes} locale={locale} isDark={isDark} />
          </DashboardCard>

          <DashboardCard
            title={t('dashboard.card.movers')}
            icon={Clock3}
            dimClass={dimClass}
            panelClass={panelClass}
            delay={0.16}
          >
            <div className="dashboard-chart h-full">
              <MoverAnomalyStreamECharts quotes={live.quotes} locale={locale} currency={currency} isDark={isDark} />
            </div>
          </DashboardCard>

          <DashboardCard
            title={t('dashboard.card.regionPressure')}
            icon={Flag}
            dimClass={dimClass}
            panelClass={panelClass}
            delay={0.2}
          >
            <div className="dashboard-chart h-full">
              <GeoRegionPressureECharts facts={geoPulse.facts} locale={locale} isDark={isDark} />
            </div>
          </DashboardCard>
        </div>
      </section>

      <section className={`glass-card rounded-2xl border px-3.5 py-2.5 ${panelClass}`}>
        <div className={`text-base font-medium ${titleClass}`}>
          {t('dashboard.summary', {
            symbols: live.quotes.length,
            geo: geoPulse.facts.length,
            movers: movers.length,
          })}
        </div>
      </section>
    </div>
  );
}
