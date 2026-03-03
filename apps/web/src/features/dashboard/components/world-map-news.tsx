import { useMemo, useState } from 'react';
import type { NewsFact, Sentiment } from '@sightfi/shared';
import { motion } from 'motion/react';
import { ComposableMap, Geographies, Geography, Line, Marker, ZoomableGroup } from 'react-simple-maps';
import { ExternalLink, Minus, Plus, RotateCcw } from 'lucide-react';
import worldData from 'world-atlas/countries-110m.json';
import { formatDateTimeWithZone } from '../../../shared/i18n/format';
import type { Locale, MessageKey } from '../../../shared/i18n/messages';
import { t } from '../../../shared/i18n/messages';

type TopicFilter = 'all' | 'politics' | 'finance';
type NewsTopic = Exclude<TopicFilter, 'all'>;
type ContinentId = 'na' | 'sa' | 'eu' | 'af' | 'as' | 'oc';
type SimpleGeo = { rsmKey: string } & Record<string, unknown>;

interface ContinentConfig {
  id: ContinentId;
  nameKey: MessageKey;
  coordinates: [number, number];
  center: [number, number];
  zoom: number;
}

interface ContinentInsight extends ContinentConfig {
  score: number;
  sentiment: Sentiment;
  news: NewsFact[];
  politicsNews: NewsFact[];
  financeNews: NewsFact[];
}

interface WorldMapNewsProps {
  locale: Locale;
  isDark: boolean;
  facts: NewsFact[];
}

interface ContinentBucket {
  all: NewsFact[];
  politics: NewsFact[];
  finance: NewsFact[];
}

const CONTINENT_CONFIGS: ContinentConfig[] = [
  { id: 'na', nameKey: 'map.region.na', coordinates: [-100, 38], center: [-95, 32], zoom: 1.5 },
  { id: 'sa', nameKey: 'map.region.sa', coordinates: [-61, -15], center: [-60, -20], zoom: 1.65 },
  { id: 'eu', nameKey: 'map.region.eu', coordinates: [13, 52], center: [12, 49], zoom: 2.15 },
  { id: 'af', nameKey: 'map.region.af', coordinates: [21, 3], center: [20, 0], zoom: 1.85 },
  { id: 'as', nameKey: 'map.region.as', coordinates: [110, 28], center: [102, 27], zoom: 1.75 },
  { id: 'oc', nameKey: 'map.region.oc', coordinates: [135, -26], center: [132, -24], zoom: 2.2 },
];

const CONTINENT_LINKS: Array<{ from: ContinentId; to: ContinentId }> = [
  { from: 'na', to: 'eu' },
  { from: 'na', to: 'sa' },
  { from: 'eu', to: 'af' },
  { from: 'eu', to: 'as' },
  { from: 'as', to: 'oc' },
  { from: 'as', to: 'af' },
];

const NA_SYMBOLS = new Set(['SPY', 'QQQ', 'VTI', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'DIA', 'IWM']);
const SA_SYMBOLS = new Set(['EWZ', 'EWW', 'ILF', 'ARGT', 'MEXX']);
const EU_SYMBOLS = new Set(['VGK', 'EZU', 'EWG', 'EWU', 'STOXX50E', 'DAX']);
const AF_SYMBOLS = new Set(['EZA', 'NGE', 'AFK']);
const AS_SYMBOLS = new Set(['HSTECH', 'HSI', '0700.HK', 'BABA', 'JD', 'TCEHY', 'EWJ', 'INDA', 'FXI', 'MCHI']);
const OC_SYMBOLS = new Set(['EWA', 'ENZL', 'AORD']);

const CONTINENT_KEYWORDS: Record<ContinentId, string[]> = {
  na: ['united states', 'u.s.', 'new york', 'canada', 'north america', 'federal reserve', '华尔街', '美联储', '美国'],
  sa: ['latin america', 'brazil', 'mexico', 'argentina', 'chile', 'south america', '拉美', '巴西', '墨西哥'],
  eu: ['europe', 'eurozone', 'ecb', 'germany', 'france', 'uk', 'london', '欧盟', '欧洲', '英国'],
  af: ['africa', 'south africa', 'nigeria', 'egypt', 'kenya', '非洲', '南非', '尼日利亚'],
  as: ['china', 'hong kong', 'japan', 'korea', 'taiwan', 'beijing', 'shanghai', 'india', 'singapore', '亚洲', '中国', '日本', '印度'],
  oc: ['australia', 'new zealand', 'oceania', 'sydney', 'melbourne', '大洋洲', '澳大利亚', '新西兰'],
};

const POLITICS_KEYWORDS = [
  'election',
  'government',
  'president',
  'prime minister',
  'tariff',
  'sanction',
  'war',
  'conflict',
  'policy',
  'parliament',
  '外交',
  '制裁',
  '战争',
  '政府',
  '政策',
  '选举',
];

const FINANCE_KEYWORDS = [
  'market',
  'stock',
  'equity',
  'etf',
  'bond',
  'yield',
  'rate',
  'inflation',
  'gdp',
  'earnings',
  'bank',
  'finance',
  'oil',
  'currency',
  '涨跌',
  '收益',
  '汇率',
  '利率',
  '通胀',
  '财报',
  '股票',
  '债券',
];

function detectContinentByKeyword(text: string): ContinentId | null {
  const normalized = text.toLowerCase();
  let bestRegion: ContinentId | null = null;
  let bestScore = 0;

  (Object.keys(CONTINENT_KEYWORDS) as ContinentId[]).forEach((region) => {
    const score = CONTINENT_KEYWORDS[region].reduce((sum, keyword) => (normalized.includes(keyword) ? sum + 1 : sum), 0);
    if (score > bestScore) {
      bestScore = score;
      bestRegion = region;
    }
  });

  return bestScore > 0 ? bestRegion : null;
}

function detectContinentFromFact(fact: NewsFact): ContinentId | null {
  const symbols = fact.symbols.map((item) => item.toUpperCase());
  if (symbols.some((item) => NA_SYMBOLS.has(item))) return 'na';
  if (symbols.some((item) => SA_SYMBOLS.has(item))) return 'sa';
  if (symbols.some((item) => EU_SYMBOLS.has(item))) return 'eu';
  if (symbols.some((item) => AF_SYMBOLS.has(item))) return 'af';
  if (symbols.some((item) => AS_SYMBOLS.has(item))) return 'as';
  if (symbols.some((item) => OC_SYMBOLS.has(item))) return 'oc';

  return detectContinentByKeyword(`${fact.headline} ${fact.factSummary} ${fact.source}`);
}

function classifyTopic(fact: NewsFact): NewsTopic {
  const normalized = `${fact.headline} ${fact.factSummary}`.toLowerCase();
  const politicsScore = POLITICS_KEYWORDS.reduce((sum, keyword) => (normalized.includes(keyword) ? sum + 1 : sum), 0);
  const financeScore = FINANCE_KEYWORDS.reduce((sum, keyword) => (normalized.includes(keyword) ? sum + 1 : sum), 0);

  return politicsScore > financeScore ? 'politics' : 'finance';
}

function regionColor(sentiment: Sentiment): string {
  if (sentiment === 'bullish') return '#22c55e';
  if (sentiment === 'bearish') return '#f43f5e';
  return '#0ea5e9';
}

function scoreFromNews(news: NewsFact[]): number {
  if (news.length === 0) return 25;
  const latestTs = new Date(news[0]?.publishedAt ?? 0).getTime();
  const recencyHours = Math.max(0, (Date.now() - latestTs) / (1000 * 60 * 60));
  const recencyBonus = Math.max(0, 16 - recencyHours);
  return Math.min(96, Math.round(42 + news.length * 8 + recencyBonus));
}

function sentimentFromNews(news: NewsFact[]): Sentiment {
  const bullish = news.filter((item) => item.sentiment === 'bullish').length;
  const bearish = news.filter((item) => item.sentiment === 'bearish').length;
  if (bullish > bearish) return 'bullish';
  if (bearish > bullish) return 'bearish';
  return 'neutral';
}

function isHttpUrl(value?: string): value is string {
  return value ? /^https?:\/\//i.test(value) : false;
}

function buildEmptyBuckets(): Map<ContinentId, ContinentBucket> {
  return new Map(
    CONTINENT_CONFIGS.map((item) => [
      item.id,
      {
        all: [],
        politics: [],
        finance: [],
      },
    ]),
  );
}

function getTopicNews(region: ContinentInsight, topic: NewsTopic): NewsFact[] {
  return topic === 'politics' ? region.politicsNews : region.financeNews;
}

export function WorldMapNews({ locale, isDark, facts }: WorldMapNewsProps) {
  const [activeId, setActiveId] = useState<ContinentId>('na');
  const [hoveredId, setHoveredId] = useState<ContinentId | null>(null);
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all');
  const [zoomFactor, setZoomFactor] = useState(1);

  const regions = useMemo<ContinentInsight[]>(() => {
    const buckets = buildEmptyBuckets();
    const sortedFacts = [...facts].sort(
      (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    );

    sortedFacts.forEach((fact) => {
      const regionId = detectContinentFromFact(fact);
      if (!regionId) return;
      const topic = classifyTopic(fact);
      const bucket = buckets.get(regionId);
      if (!bucket) return;

      bucket.all.push(fact);
      if (topic === 'politics') bucket.politics.push(fact);
      if (topic === 'finance') bucket.finance.push(fact);
    });

    return CONTINENT_CONFIGS.map((config) => {
      const bucket = buckets.get(config.id);
      const allNews = bucket?.all.slice(0, 6) ?? [];
      const politicsNews = bucket?.politics.slice(0, 4) ?? [];
      const financeNews = bucket?.finance.slice(0, 4) ?? [];

      return {
        ...config,
        score: scoreFromNews(allNews),
        sentiment: sentimentFromNews(allNews),
        news: allNews,
        politicsNews,
        financeNews,
      };
    });
  }, [facts]);

  const activeRegion = useMemo(() => regions.find((item) => item.id === activeId) ?? regions[0] ?? null, [activeId, regions]);

  const focusedRegionId = hoveredId ?? activeRegion?.id ?? null;

  const linkCoordinates = useMemo(
    () =>
      CONTINENT_LINKS.map((item) => {
        const from = regions.find((region) => region.id === item.from);
        const to = regions.find((region) => region.id === item.to);
        if (!from || !to) return null;

        const highlighted = focusedRegionId ? from.id === focusedRegionId || to.id === focusedRegionId : false;
        return {
          id: `${item.from}-${item.to}`,
          from: from.coordinates,
          to: to.coordinates,
          highlighted,
        };
      }).filter(
        (
          item,
        ): item is {
          id: string;
          from: [number, number];
          to: [number, number];
          highlighted: boolean;
        } => item !== null,
      ),
    [focusedRegionId, regions],
  );

  const topicLabels: Record<TopicFilter, string> = {
    all: t('map.focus.all'),
    politics: t('map.focus.politics'),
    finance: t('map.focus.finance'),
  };

  const visibleTopics = topicFilter === 'all' ? (['politics', 'finance'] as NewsTopic[]) : [topicFilter];
  const activeCenter = activeRegion?.center ?? [10, 15];
  const activeZoom = (activeRegion?.zoom ?? 1) * zoomFactor;
  const mapZoom = Math.min(4.2, Math.max(1, activeZoom));

  const surfaceClass = isDark
    ? 'border-slate-700/60 bg-slate-950/70'
    : 'border-slate-200/90 bg-white/88';

  const dimClass = isDark ? 'text-slate-400' : 'text-slate-600';
  const primaryClass = isDark ? 'text-slate-100' : 'text-slate-900';

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl">
      <div
        className={`absolute inset-0 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_20%_18%,rgba(14,116,144,0.22),transparent_44%),radial-gradient(circle_at_82%_88%,rgba(15,118,110,0.18),transparent_48%),#020617]'
            : 'bg-[radial-gradient(circle_at_20%_18%,rgba(56,189,248,0.18),transparent_42%),radial-gradient(circle_at_82%_88%,rgba(45,212,191,0.15),transparent_45%),#f4f8fc]'
        }`}
      />

      <div className="relative z-10 flex h-full flex-col p-2 md:p-3">
        <div className={`rounded-2xl border px-3 py-2.5 md:px-4 md:py-3 ${surfaceClass}`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0">
              <div className={`truncate text-sm font-semibold tracking-wide md:text-base ${primaryClass}`}>{t('map.monitor.title')}</div>
              <div className={`text-xs md:text-sm ${dimClass}`}>{t('dashboard.map.hint')}</div>
            </div>

            <div className="ml-auto flex items-center gap-1 rounded-xl border border-slate-400/20 bg-slate-900/10 p-1 backdrop-blur">
              {(['all', 'politics', 'finance'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTopicFilter(item)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition md:text-sm ${
                    topicFilter === item
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : isDark
                        ? 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {topicLabels[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {regions.map((region) => {
              const active = region.id === activeId;
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => setActiveId(region.id)}
                  onMouseEnter={() => setHoveredId(region.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition md:text-sm ${
                    active
                      ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-300'
                      : isDark
                        ? 'border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/60'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {t(region.nameKey)} · {region.news.length}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <div className={`relative overflow-hidden rounded-2xl border ${surfaceClass}`}>
            <div className="absolute right-2 top-2 z-20 flex flex-col gap-1 rounded-xl border border-slate-400/20 bg-slate-900/20 p-1.5 backdrop-blur">
              <button
                type="button"
                onClick={() => setZoomFactor((prev) => Math.min(2.25, prev + 0.15))}
                className={`rounded-md p-1.5 ${isDark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-200/70'}`}
                aria-label={t('map.zoom.in')}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomFactor((prev) => Math.max(0.78, prev - 0.15))}
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

            <div className="h-[340px] sm:h-[410px] md:h-[500px] lg:h-full lg:min-h-[560px]">
              <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 170 }} width={980} height={560} style={{ width: '100%', height: '100%' }}>
                <ZoomableGroup center={activeCenter} zoom={mapZoom} minZoom={1} maxZoom={4.2}>
                  <Geographies geography={worldData}>
                    {({ geographies }: { geographies: SimpleGeo[] }) =>
                      geographies.map((geo: SimpleGeo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          style={{
                            default: {
                              fill: isDark ? '#0f172a' : '#e6edf7',
                              outline: 'none',
                              stroke: isDark ? '#334155' : '#c1d1e5',
                              strokeWidth: 0.5,
                            },
                            hover: {
                              fill: isDark ? '#152238' : '#dae6f4',
                              outline: 'none',
                              stroke: isDark ? '#4b5f7e' : '#a4bdd7',
                            },
                            pressed: {
                              fill: isDark ? '#162841' : '#d4e3f3',
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
                      stroke={item.highlighted ? (isDark ? 'rgba(34,211,238,0.65)' : 'rgba(14,116,144,0.45)') : isDark ? 'rgba(71,85,105,0.35)' : 'rgba(148,163,184,0.35)'}
                      strokeWidth={item.highlighted ? 1.7 : 1.1}
                      strokeLinecap="round"
                      strokeDasharray={`${4 + (index % 2)} 5`}
                    />
                  ))}

                  {regions.map((region) => {
                    const active = focusedRegionId === region.id;
                    return (
                      <Marker key={region.id} coordinates={region.coordinates}>
                        <g
                          className="cursor-pointer"
                          onClick={() => setActiveId(region.id)}
                          onMouseEnter={() => setHoveredId(region.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <circle r={20} fill="transparent" />
                          <circle r={active ? 12 : 9} fill={regionColor(region.sentiment)} fillOpacity={0.94} stroke={isDark ? '#020617' : '#ffffff'} strokeWidth={1.5} />
                          <circle r={active ? 18 : 14} fill="none" stroke={regionColor(region.sentiment)} strokeOpacity={0.4} strokeWidth={1.2} />
                        </g>
                      </Marker>
                    );
                  })}
                </ZoomableGroup>
              </ComposableMap>
            </div>

            {activeRegion ? (
              <motion.div
                key={`summary-${activeRegion.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`absolute bottom-2 left-2 right-2 rounded-xl border px-3 py-2 backdrop-blur-md md:left-3 md:right-auto md:min-w-[280px] ${
                  isDark ? 'border-slate-700/80 bg-slate-950/78' : 'border-slate-200/85 bg-white/88'
                }`}
              >
                <div className={`text-sm font-semibold ${primaryClass}`}>{t(activeRegion.nameKey)}</div>
                <div className={`mt-1 flex items-center gap-2 text-xs ${dimClass}`}>
                  <span>{t('map.score')}: {activeRegion.score}</span>
                  <span>•</span>
                  <span>{t('map.news.total')}: {activeRegion.news.length}</span>
                </div>
              </motion.div>
            ) : null}
          </div>

          <motion.aside
            key={`${activeRegion?.id ?? 'none'}-${topicFilter}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`scrollbar-thin flex min-h-0 flex-col overflow-y-auto rounded-2xl border p-3 md:p-3.5 ${surfaceClass}`}
          >
            {activeRegion ? (
              <div className="space-y-3">
                {visibleTopics.map((topic) => {
                  const scopedNews = getTopicNews(activeRegion, topic);
                  const sectionTitle = topic === 'politics' ? t('map.topic.politics') : t('map.topic.finance');

                  return (
                    <section key={topic}>
                      <div className={`mb-2 text-xs font-semibold uppercase tracking-[0.08em] ${dimClass}`}>{sectionTitle}</div>
                      {scopedNews.length > 0 ? (
                        <div className="space-y-2.5">
                          {scopedNews.map((news) => (
                            <article
                              key={news.id}
                              className={`rounded-xl border p-2.5 ${
                                isDark
                                  ? 'border-slate-800/85 bg-slate-900/70 hover:bg-slate-900/92'
                                  : 'border-slate-200/85 bg-slate-50/90 hover:bg-white'
                              } transition`}
                            >
                              <h4 className={`line-clamp-2 text-sm font-semibold ${primaryClass}`}>{news.headline}</h4>
                              <p className={`mt-1 line-clamp-3 text-sm leading-relaxed ${dimClass}`}>{news.factSummary}</p>
                              <div className={`mt-1.5 flex flex-wrap items-center gap-1.5 text-xs ${dimClass}`}>
                                <span>{news.source}</span>
                                <span>·</span>
                                <span>{formatDateTimeWithZone(news.publishedAt, locale)}</span>
                                {isHttpUrl(news.sourceId) ? (
                                  <a
                                    href={news.sourceId}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="ml-auto inline-flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400"
                                  >
                                    {t('map.source')}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : null}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className={`rounded-lg border px-2.5 py-2 text-sm ${isDark ? 'border-slate-700/80 text-slate-500' : 'border-slate-200/90 text-slate-500'}`}>
                          {t('map.noNewsForTopic')}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className={`text-sm ${dimClass}`}>{t('map.noRegion')}</div>
            )}
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
