import { useMemo, useState } from 'react';
import type { NewsFact, Sentiment } from '@sightfi/shared';
import { motion } from 'motion/react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import worldData from 'world-atlas/countries-110m.json';
import { formatDateTimeWithZone } from '../../../shared/i18n/format';
import type { Locale, MessageKey } from '../../../shared/i18n/messages';
import { t } from '../../../shared/i18n/messages';

type ContinentId = 'na' | 'sa' | 'eu' | 'af' | 'as' | 'me' | 'oc';
type SimpleGeo = { rsmKey: string } & Record<string, unknown>;

interface WorldMapNewsProps {
  locale: Locale;
  isDark: boolean;
  facts: NewsFact[];
}

interface ContinentConfig {
  id: ContinentId;
  nameKey: MessageKey;
  marker: [number, number];
  center: [number, number];
  zoom: number;
}

interface RegionInsight extends ContinentConfig {
  score: number;
  sentiment: Sentiment;
  news: NewsFact[];
}

const CONTINENT_CONFIGS: ContinentConfig[] = [
  { id: 'na', nameKey: 'map.region.na', marker: [-100, 39], center: [-96, 36], zoom: 1.65 },
  { id: 'sa', nameKey: 'map.region.sa', marker: [-63, -17], center: [-62, -19], zoom: 1.72 },
  { id: 'eu', nameKey: 'map.region.eu', marker: [11, 51], center: [12, 50], zoom: 2.12 },
  { id: 'me', nameKey: 'map.region.me', marker: [45, 29], center: [46, 28], zoom: 2.0 },
  { id: 'af', nameKey: 'map.region.af', marker: [21, 4], center: [20, 2], zoom: 1.9 },
  { id: 'as', nameKey: 'map.region.as', marker: [108, 27], center: [102, 27], zoom: 1.84 },
  { id: 'oc', nameKey: 'map.region.oc', marker: [136, -25], center: [134, -24], zoom: 2.22 },
];

const NA_SYMBOLS = new Set(['SPY', 'QQQ', 'VTI', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'DIA', 'IWM']);
const SA_SYMBOLS = new Set(['EWZ', 'EWW', 'ILF', 'ARGT', 'MEXX']);
const EU_SYMBOLS = new Set(['VGK', 'EZU', 'EWG', 'EWU', 'STOXX50E', 'DAX']);
const ME_SYMBOLS = new Set(['QAT', 'UAE', 'MENA', 'GULF']);
const AF_SYMBOLS = new Set(['EZA', 'NGE', 'AFK']);
const AS_SYMBOLS = new Set(['HSTECH', 'HSI', '0700.HK', 'BABA', 'JD', 'TCEHY', 'EWJ', 'INDA', 'FXI', 'MCHI']);
const OC_SYMBOLS = new Set(['EWA', 'ENZL', 'AORD']);

const CONTINENT_KEYWORDS: Record<ContinentId, string[]> = {
  na: ['united states', 'u.s.', 'new york', 'canada', 'north america', 'federal reserve', '华尔街', '美联储', '美国'],
  sa: ['latin america', 'brazil', 'mexico', 'argentina', 'chile', 'south america', '拉美', '巴西', '墨西哥'],
  eu: ['europe', 'eurozone', 'ecb', 'germany', 'france', 'uk', 'london', '欧盟', '欧洲', '英国'],
  me: ['middle east', 'saudi', 'uae', 'dubai', 'qatar', 'israel', 'iran', 'iraq', 'turkey', 'egypt', 'oil', 'opec', '中东', '沙特', '伊朗', '以色列', '石油'],
  af: ['africa', 'south africa', 'nigeria', 'kenya', '非洲', '南非', '尼日利亚'],
  as: ['china', 'hong kong', 'japan', 'korea', 'taiwan', 'beijing', 'shanghai', 'india', 'singapore', '亚洲', '中国', '日本', '印度'],
  oc: ['australia', 'new zealand', 'oceania', 'sydney', 'melbourne', '大洋洲', '澳大利亚', '新西兰'],
};

const SOURCE_REGION_HINTS: Record<ContinentId, string[]> = {
  na: ['cnbc', 'wsj', 'bloomberg', 'nytimes', 'marketwatch'],
  sa: ['buenos', 'sao paulo', 'latam'],
  eu: ['bbc', 'ft.com', 'euronews', 'ecb', 'reuters'],
  me: ['aljazeera', 'arabianbusiness', 'gulf', 'middle east'],
  af: ['africa', 'nigeria', 'southafrica'],
  as: ['nikkei', 'caixin', 'scmp', 'asia', 'japan', 'china'],
  oc: ['australia', 'anz', 'newzealand'],
};

function detectByKeyword(text: string): ContinentId | null {
  const normalized = text.toLowerCase();
  let bestRegion: ContinentId | null = null;
  let bestScore = 0;

  (Object.keys(CONTINENT_KEYWORDS) as ContinentId[]).forEach((continent) => {
    const score = CONTINENT_KEYWORDS[continent].reduce((sum, keyword) => (normalized.includes(keyword) ? sum + 1 : sum), 0);
    if (score > bestScore) {
      bestScore = score;
      bestRegion = continent;
    }
  });

  return bestScore > 0 ? bestRegion : null;
}

function detectBySource(source: string): ContinentId | null {
  const normalized = source.toLowerCase();
  let best: ContinentId | null = null;
  let bestScore = 0;
  (Object.keys(SOURCE_REGION_HINTS) as ContinentId[]).forEach((region) => {
    const score = SOURCE_REGION_HINTS[region].reduce((sum, key) => (normalized.includes(key) ? sum + 1 : sum), 0);
    if (score > bestScore) {
      bestScore = score;
      best = region;
    }
  });
  return bestScore > 0 ? best : null;
}

function hashFallbackRegion(fact: NewsFact): ContinentId {
  const seed = `${fact.id}-${fact.source}-${fact.headline}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }
  const regionList: ContinentId[] = ['na', 'sa', 'eu', 'me', 'af', 'as', 'oc'];
  return regionList[Math.abs(hash) % regionList.length] ?? 'na';
}

function detectContinent(fact: NewsFact): ContinentId | null {
  const symbols = fact.symbols.map((item) => item.toUpperCase());
  if (symbols.some((item) => NA_SYMBOLS.has(item))) return 'na';
  if (symbols.some((item) => SA_SYMBOLS.has(item))) return 'sa';
  if (symbols.some((item) => EU_SYMBOLS.has(item))) return 'eu';
  if (symbols.some((item) => ME_SYMBOLS.has(item))) return 'me';
  if (symbols.some((item) => AF_SYMBOLS.has(item))) return 'af';
  if (symbols.some((item) => AS_SYMBOLS.has(item))) return 'as';
  if (symbols.some((item) => OC_SYMBOLS.has(item))) return 'oc';
  const byKeyword = detectByKeyword(`${fact.headline} ${fact.factSummary} ${fact.source}`);
  if (byKeyword) return byKeyword;
  const bySource = detectBySource(fact.source);
  if (bySource) return bySource;
  return hashFallbackRegion(fact);
}

function scoreFromNews(news: NewsFact[]): number {
  if (news.length === 0) return 20;
  const latestTs = new Date(news[0]?.publishedAt ?? 0).getTime();
  const recencyHours = Math.max(0, (Date.now() - latestTs) / (1000 * 60 * 60));
  const recencyBonus = Math.max(0, 14 - recencyHours);
  return Math.min(96, Math.round(36 + news.length * 9 + recencyBonus));
}

function sentimentFromNews(news: NewsFact[]): Sentiment {
  const bullish = news.filter((item) => item.sentiment === 'bullish').length;
  const bearish = news.filter((item) => item.sentiment === 'bearish').length;
  if (bullish > bearish) return 'bullish';
  if (bearish > bullish) return 'bearish';
  return 'neutral';
}

function regionTone(sentiment: Sentiment): string {
  if (sentiment === 'bullish') return '#16a34a';
  if (sentiment === 'bearish') return '#dc2626';
  return '#0891b2';
}

export function WorldMapNews({ locale, isDark, facts }: WorldMapNewsProps) {
  const [activeId, setActiveId] = useState<ContinentId>('na');
  const [zoomFactor, setZoomFactor] = useState(1);

  const regions = useMemo<RegionInsight[]>(() => {
    const buckets = new Map<ContinentId, NewsFact[]>(CONTINENT_CONFIGS.map((item) => [item.id, []]));
    const sortedFacts = [...facts].sort(
      (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    );

    sortedFacts.forEach((fact) => {
      const continent = detectContinent(fact);
      if (!continent) return;
      const bucket = buckets.get(continent);
      if (!bucket) return;
      bucket.push(fact);
    });

    return CONTINENT_CONFIGS.map((config) => {
      const news = (buckets.get(config.id) ?? []).slice(0, 5);
      return {
        ...config,
        score: scoreFromNews(news),
        sentiment: sentimentFromNews(news),
        news,
      };
    });
  }, [facts]);

  const activeRegion = useMemo(() => regions.find((item) => item.id === activeId) ?? regions[0] ?? null, [activeId, regions]);
  const lowCoverageCount = useMemo(
    () => regions.filter((region) => region.news.length < 2).length,
    [regions],
  );

  const center = activeRegion?.center ?? [8, 14];
  const zoom = Math.min(4.2, Math.max(1, (activeRegion?.zoom ?? 1) * zoomFactor));
  const surfaceClass = isDark ? 'border-slate-700/65 bg-slate-950/74' : 'border-slate-200/90 bg-white/90';
  const chipClass = isDark ? 'border-slate-700 text-slate-300 hover:border-slate-500' : 'border-slate-200 text-slate-700 hover:border-slate-300';
  const titleClass = isDark ? 'text-slate-100' : 'text-slate-900';
  const dimClass = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-2xl border ${surfaceClass}`}>
      <div
        className={`absolute inset-0 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_14%_10%,rgba(8,145,178,0.14),transparent_42%),radial-gradient(circle_at_84%_86%,rgba(2,132,199,0.12),transparent_44%),#020617]'
            : 'bg-[radial-gradient(circle_at_14%_10%,rgba(56,189,248,0.14),transparent_40%),radial-gradient(circle_at_84%_86%,rgba(125,211,252,0.12),transparent_44%),#eff6ff]'
        }`}
      />

      <div className="relative z-10 flex h-full flex-col p-2.5 md:p-3">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <div
            className={`rounded-full border px-2.5 py-1 text-sm font-medium ${
              lowCoverageCount > 0
                ? isDark
                  ? 'border-amber-500/35 bg-amber-500/10 text-amber-300'
                  : 'border-amber-400/45 bg-amber-100/75 text-amber-700'
                : isDark
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                  : 'border-emerald-400/45 bg-emerald-100/80 text-emerald-700'
            }`}
          >
            {t('map.coverage.label')}: {lowCoverageCount > 0 ? t('map.coverage.low') : t('map.coverage.ok')}
          </div>
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1">
            {regions.map((region) => {
              const active = region.id === activeId;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setActiveId(region.id)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-sm font-medium transition ${
                    active
                      ? 'border-cyan-400/50 bg-cyan-500/14 text-cyan-300'
                      : chipClass
                  }`}
                >
                  {t(region.nameKey)} · {region.news.length}
                </button>
              );
            })}
          </div>
          <div className={`flex items-center gap-1 rounded-xl border p-1 ${surfaceClass}`}>
            <button
              type="button"
              onClick={() => setZoomFactor((prev) => Math.min(2.3, prev + 0.18))}
              className={`rounded-md p-1.5 ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200/70'}`}
              aria-label={t('map.zoom.in')}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomFactor((prev) => Math.max(0.75, prev - 0.18))}
              className={`rounded-md p-1.5 ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200/70'}`}
              aria-label={t('map.zoom.out')}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomFactor(1)}
              className={`rounded-md p-1.5 ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200/70'}`}
              aria-label={t('map.zoom.reset')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl">
          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 168 }}
            width={980}
            height={560}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup
              center={center}
              zoom={zoom}
              minZoom={0.8}
              maxZoom={4.2}
              translateExtent={[[-50, -50], [1030, 610]]}
            >
              <Geographies geography={worldData}>
                {({ geographies }: { geographies: SimpleGeo[] }) =>
                  geographies.map((geo: SimpleGeo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: isDark ? '#0f172a' : '#dde8f6',
                          outline: 'none',
                          stroke: isDark ? '#334155' : '#b8cbe2',
                          strokeWidth: 0.58,
                        },
                        hover: {
                          fill: isDark ? '#17243a' : '#d2e2f4',
                          outline: 'none',
                          stroke: isDark ? '#475569' : '#9ab7d8',
                          strokeWidth: 0.7,
                        },
                        pressed: {
                          fill: isDark ? '#1e314d' : '#c8dcf2',
                          outline: 'none',
                        },
                      }}
                    />
                  ))
                }
              </Geographies>

              {regions.map((region) => {
                const active = region.id === activeId;
                const color = regionTone(region.sentiment);
                return (
                  <Marker key={region.id} coordinates={region.marker}>
                    <g className="cursor-pointer" onClick={() => setActiveId(region.id)}>
                      <circle r={20} fill="transparent" />
                      <circle r={active ? 11 : 8} fill={color} fillOpacity={0.92} stroke={isDark ? '#020617' : '#ffffff'} strokeWidth={1.4} />
                      <circle r={active ? 18 : 13} fill="none" stroke={color} strokeOpacity={0.34} strokeWidth={1.2} />
                    </g>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        <motion.div
          key={activeRegion?.id ?? 'none'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`mt-2.5 rounded-xl border p-2.5 ${surfaceClass}`}
        >
          {activeRegion ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className={`text-base font-semibold ${titleClass}`}>{t(activeRegion.nameKey)}</div>
                <div className={`text-sm ${dimClass}`}>
                  {t('map.score')}: {activeRegion.score}
                </div>
              </div>
              <div className="space-y-1.5">
                {activeRegion.news.length > 0 ? (
                  activeRegion.news.map((item) => (
                    <article key={item.id} className={`rounded-lg border px-2.5 py-2 ${isDark ? 'border-slate-800/80 bg-slate-900/70' : 'border-slate-200/90 bg-slate-50/88'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`line-clamp-2 text-sm font-medium leading-relaxed ${titleClass}`}>{item.headline}</div>
                          <div className={`mt-1 text-xs ${dimClass}`}>{formatDateTimeWithZone(item.publishedAt, locale, { withYear: false })}</div>
                        </div>
                        <div className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.sentiment === 'bullish'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : item.sentiment === 'bearish'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-cyan-500/15 text-cyan-400'
                        }`}>
                          {item.sentiment === 'bullish' ? '↑' : item.sentiment === 'bearish' ? '↓' : '→'}
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className={`rounded-lg border px-2.5 py-3 text-center text-sm ${isDark ? 'border-slate-800/80 bg-slate-900/70' : 'border-slate-200/90 bg-slate-50/88'} ${dimClass}`}>
                    {t('map.noNewsForTopic')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`text-sm ${dimClass}`}>{t('map.noRegion')}</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
