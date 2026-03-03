import { useMemo, useState } from 'react';
import type { NewsFact, Sentiment } from '@sightfi/shared';
import { motion } from 'motion/react';
import { ComposableMap, Geographies, Geography, Line, Marker } from 'react-simple-maps';
import { ExternalLink } from 'lucide-react';
import worldData from 'world-atlas/countries-110m.json';
import { formatDateTimeWithZone } from '../../../shared/i18n/format';
import type { Locale, MessageKey } from '../../../shared/i18n/messages';
import { t } from '../../../shared/i18n/messages';

type FocusFilter = 'all' | 'rates' | 'energy' | 'supply' | 'emerging';
type RegionId = 'na' | 'latam' | 'eu' | 'me' | 'af' | 'ea' | 'sa' | 'oc';
type SimpleGeo = { rsmKey: string } & Record<string, unknown>;

interface RegionConfig {
  id: RegionId;
  nameKey: MessageKey;
  coordinates: [number, number];
  focus: Exclude<FocusFilter, 'all'>;
}

interface RegionInsight extends RegionConfig {
  score: number;
  sentiment: Sentiment;
  news: NewsFact[];
}

interface WorldMapNewsProps {
  locale: Locale;
  isDark: boolean;
  facts: NewsFact[];
}

const REGION_CONFIGS: RegionConfig[] = [
  { id: 'na', nameKey: 'map.region.na', coordinates: [-98, 38], focus: 'rates' },
  { id: 'latam', nameKey: 'map.region.sa', coordinates: [-61, -15], focus: 'emerging' },
  { id: 'eu', nameKey: 'map.region.eu', coordinates: [12, 50], focus: 'rates' },
  { id: 'me', nameKey: 'map.region.me', coordinates: [45, 27], focus: 'energy' },
  { id: 'af', nameKey: 'map.region.af', coordinates: [20, 2], focus: 'emerging' },
  { id: 'ea', nameKey: 'map.region.as', coordinates: [121, 32], focus: 'supply' },
  { id: 'sa', nameKey: 'map.region.as', coordinates: [78, 22], focus: 'supply' },
  { id: 'oc', nameKey: 'map.region.oc', coordinates: [135, -25], focus: 'energy' },
];

const REGION_LINKS: Array<{ from: RegionId; to: RegionId }> = [
  { from: 'na', to: 'eu' },
  { from: 'eu', to: 'ea' },
  { from: 'me', to: 'ea' },
  { from: 'ea', to: 'oc' },
  { from: 'na', to: 'latam' },
  { from: 'eu', to: 'af' },
];

const NA_SYMBOLS = new Set([
  'SPY',
  'QQQ',
  'VTI',
  'AAPL',
  'MSFT',
  'NVDA',
  'TSLA',
  'META',
  'AMZN',
]);
const ASIA_SYMBOLS = new Set(['HSTECH', 'HSI', '0700.HK', 'BABA', 'JD', 'TCEHY']);
const EUROPE_SYMBOLS = new Set(['VGK', 'EWG', 'DAX', 'STOXX50E']);

const REGION_KEYWORDS: Record<RegionId, string[]> = {
  na: ['united states', 'u.s.', 'us ', 'nasdaq', 'wall street', 'federal reserve', 'fed'],
  latam: ['latin america', 'brazil', 'mexico', 'argentina', 'chile'],
  eu: ['europe', 'eurozone', 'ecb', 'germany', 'france', 'uk', 'london'],
  me: ['middle east', 'israel', 'iran', 'saudi', 'gulf', 'opec'],
  af: ['africa', 'south africa', 'nigeria', 'egypt'],
  ea: ['china', 'hong kong', 'japan', 'korea', 'taiwan', 'beijing', 'shanghai'],
  sa: ['india', 'pakistan', 'bangladesh', 'sri lanka', 'new delhi'],
  oc: ['australia', 'new zealand', 'oceania', 'sydney', 'melbourne'],
};

function detectRegionByKeyword(text: string): RegionId | null {
  const normalized = text.toLowerCase();
  let bestRegion: RegionId | null = null;
  let bestScore = 0;

  (Object.keys(REGION_KEYWORDS) as RegionId[]).forEach((region) => {
    const score = REGION_KEYWORDS[region].reduce(
      (sum, keyword) => (normalized.includes(keyword) ? sum + 1 : sum),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestRegion = region;
    }
  });

  return bestScore > 0 ? bestRegion : null;
}

function toRegionId(fact: NewsFact): RegionId {
  const symbols = fact.symbols.map((item) => item.toUpperCase());
  const blob = `${fact.headline} ${fact.factSummary} ${fact.source}`.toLowerCase();

  if (symbols.some((item) => ASIA_SYMBOLS.has(item))) return 'ea';
  if (symbols.some((item) => EUROPE_SYMBOLS.has(item))) return 'eu';
  if (symbols.some((item) => NA_SYMBOLS.has(item))) return 'na';
  const byKeyword = detectRegionByKeyword(blob);
  if (byKeyword) return byKeyword;
  return 'na';
}

function regionColor(sentiment: Sentiment): string {
  if (sentiment === 'bullish') return '#10b981';
  if (sentiment === 'bearish') return '#f43f5e';
  return '#38bdf8';
}

function scoreFromNews(news: NewsFact[]): number {
  if (news.length === 0) return 40;
  return Math.min(95, 50 + news.length * 10);
}

function sentimentFromNews(news: NewsFact[]): Sentiment {
  const bullish = news.filter((item) => item.sentiment === 'bullish').length;
  const bearish = news.filter((item) => item.sentiment === 'bearish').length;
  if (bullish > bearish) return 'bullish';
  if (bearish > bullish) return 'bearish';
  return 'neutral';
}

function isHttpUrl(value?: string): value is string {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

export function WorldMapNews({ locale, isDark, facts }: WorldMapNewsProps) {
  const [activeId, setActiveId] = useState<RegionId>('na');
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all');

  const regions = useMemo<RegionInsight[]>(() => {
    const regionNewsMap = new Map<RegionId, NewsFact[]>();
    facts.forEach((fact) => {
      const regionId = toRegionId(fact);
      const next = regionNewsMap.get(regionId) ?? [];
      next.push(fact);
      regionNewsMap.set(regionId, next);
    });

    return REGION_CONFIGS.map((config) => {
      const news = (regionNewsMap.get(config.id) ?? [])
        .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
        .slice(0, 4);
      return {
        ...config,
        score: scoreFromNews(news),
        sentiment: sentimentFromNews(news),
        news,
      };
    });
  }, [facts]);

  const filteredRegions = useMemo(
    () => regions.filter((item) => (focusFilter === 'all' ? true : item.focus === focusFilter)),
    [focusFilter, regions],
  );

  const activeRegion = useMemo(
    () => filteredRegions.find((item) => item.id === activeId) ?? filteredRegions[0] ?? null,
    [activeId, filteredRegions],
  );

  const linkCoordinates = useMemo(
    () =>
      REGION_LINKS.map((item) => {
        const from = filteredRegions.find((region) => region.id === item.from);
        const to = filteredRegions.find((region) => region.id === item.to);
        if (!from || !to) return null;
        return {
          from: from.coordinates,
          to: to.coordinates,
          id: `${item.from}-${item.to}`,
        };
      }).filter((item): item is { from: [number, number]; to: [number, number]; id: string } => item !== null),
    [filteredRegions],
  );

  const filterLabels: Record<FocusFilter, string> = {
    all: t('map.focus.all'),
    rates: t('map.focus.rates'),
    energy: t('map.focus.energy'),
    supply: t('map.focus.supply'),
    emerging: t('map.focus.emerging'),
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <div
        className={`absolute inset-0 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.16),transparent_45%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.2),transparent_45%),#030814]'
            : 'bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.15),transparent_45%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.16),transparent_45%),#e8f0fb]'
        }`}
      />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 md:px-4">
          <div className={`text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{t('map.monitor.title')}</div>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-white/20 bg-black/15 p-1 backdrop-blur-md">
            {(['all', 'rates', 'energy', 'supply', 'emerging'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFocusFilter(item)}
                className={`rounded-md px-2 py-1 text-xs md:text-sm transition ${
                  focusFilter === item
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filterLabels[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 px-2 pb-2 md:grid-cols-[minmax(0,1fr)_320px] md:px-3 md:pb-3">
          <div className="min-h-[300px] overflow-hidden rounded-xl border border-white/10 md:min-h-0">
            <ComposableMap
              projection="geoEqualEarth"
              projectionConfig={{ scale: 170 }}
              width={980}
              height={500}
              style={{ width: '100%', height: '100%' }}
            >
              <Geographies geography={worldData}>
                {({ geographies }: { geographies: SimpleGeo[] }) =>
                  geographies.map((geo: SimpleGeo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: isDark ? '#132437' : '#d8e6f6',
                          outline: 'none',
                          stroke: isDark ? '#2e5379' : '#9cb3d2',
                          strokeWidth: 0.56,
                        },
                        hover: {
                          fill: isDark ? '#1c3652' : '#c8daef',
                          outline: 'none',
                          stroke: isDark ? '#4d77a6' : '#7f9cc2',
                        },
                        pressed: {
                          fill: isDark ? '#1b3d5f' : '#bfd2e8',
                          outline: 'none',
                        },
                      }}
                    />
                  ))
                }
              </Geographies>

              {linkCoordinates.map((item, index) => (
                <Line
                  key={item.id}
                  from={item.from}
                  to={item.to}
                  stroke={isDark ? 'rgba(52,211,153,0.58)' : 'rgba(5,150,105,0.45)'}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeDasharray={`${4 + (index % 2)} 5`}
                />
              ))}

              {filteredRegions.map((region) => (
                <Marker key={region.id} coordinates={region.coordinates}>
                  <g className="cursor-pointer" onClick={() => setActiveId(region.id)}>
                    <circle r={15} fill="transparent" />
                    <circle
                      r={activeRegion?.id === region.id ? 9 : 7}
                      fill={regionColor(region.sentiment)}
                      fillOpacity={0.95}
                      stroke={isDark ? '#0b1220' : '#ffffff'}
                      strokeWidth={1.3}
                    />
                    <circle
                      r={activeRegion?.id === region.id ? 15 : 12}
                      fill="none"
                      stroke={regionColor(region.sentiment)}
                      strokeOpacity={0.48}
                      strokeWidth={1.2}
                    />
                  </g>
                </Marker>
              ))}
            </ComposableMap>
          </div>

          <motion.aside
            key={activeRegion?.id ?? 'empty'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`scrollbar-thin overflow-y-auto rounded-xl border p-3 ${
              isDark ? 'border-zinc-700/60 bg-zinc-950/85' : 'border-slate-200/90 bg-white/90'
            }`}
          >
            {activeRegion ? (
              <>
                <h3 className={`text-sm font-semibold md:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t(activeRegion.nameKey)}
                </h3>
                <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  {t('map.score')}: {activeRegion.score}
                </p>
                <div className="mt-3 space-y-2.5">
                  {(activeRegion.news.length > 0
                    ? activeRegion.news
                    : facts.slice(0, 4)
                  ).map((news) => (
                    <article
                      key={news.id}
                      className={`rounded-xl border p-2.5 ${
                        isDark ? 'border-zinc-700/50 bg-zinc-800/45' : 'border-slate-200/90 bg-slate-50/90'
                      }`}
                    >
                      <h4 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                        {news.headline}
                      </h4>
                      <p className={`mt-1 text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        {news.factSummary}
                      </p>
                      <div className={`mt-1.5 flex flex-wrap items-center gap-1.5 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                        <span>{news.source}</span>
                        <span>·</span>
                        <span>{formatDateTimeWithZone(news.publishedAt, locale)}</span>
                        {isHttpUrl(news.sourceId) ? (
                          <a
                            href={news.sourceId}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
                          >
                            {t('map.source')}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                {t('map.noRegion')}
              </div>
            )}
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
