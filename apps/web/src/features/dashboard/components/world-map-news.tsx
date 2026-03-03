import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ComposableMap, Geographies, Geography, Line, Marker } from 'react-simple-maps';
import { ExternalLink } from 'lucide-react';
import worldData from 'world-atlas/countries-110m.json';
import type { Locale } from '../../../shared/i18n/messages';

interface RegionNews {
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  source: string;
  url: string;
  publishedAt: string;
}

interface FinancialRegion {
  id: string;
  nameEn: string;
  nameZh: string;
  coordinates: [number, number];
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  focus: 'rates' | 'energy' | 'supply' | 'emerging';
  news: RegionNews[];
}

interface WorldMapNewsProps {
  locale: Locale;
  isDark: boolean;
}

type FocusFilter = 'all' | 'rates' | 'energy' | 'supply' | 'emerging';
type SimpleGeo = { rsmKey: string } & Record<string, unknown>;

const FINANCIAL_REGIONS: FinancialRegion[] = [
  {
    id: 'na',
    nameEn: 'North America',
    nameZh: '北美',
    coordinates: [-98, 38],
    sentiment: 'positive',
    score: 88,
    focus: 'rates',
    news: [
      {
        titleEn: 'US AI capex momentum remains strong',
        titleZh: '美国 AI 资本开支动能仍强',
        summaryEn: 'Cloud and semiconductor demand stays above guidance in major listed firms.',
        summaryZh: '头部上市公司云与半导体需求持续高于指引。',
        source: 'Bloomberg',
        url: 'https://www.bloomberg.com',
        publishedAt: '2026-03-03T09:10:00.000Z',
      },
      {
        titleEn: 'Fed keeps policy optionality',
        titleZh: '美联储维持政策灵活性',
        summaryEn: 'Data-dependent path reduces abrupt policy shocks for risk assets.',
        summaryZh: '数据依赖路径降低了风险资产遭遇突发政策冲击的概率。',
        source: 'Reuters',
        url: 'https://www.reuters.com',
        publishedAt: '2026-03-03T08:40:00.000Z',
      },
    ],
  },
  {
    id: 'latam',
    nameEn: 'Latin America',
    nameZh: '拉丁美洲',
    coordinates: [-61, -15],
    sentiment: 'neutral',
    score: 56,
    focus: 'emerging',
    news: [
      {
        titleEn: 'Regional FX remains volatile',
        titleZh: '区域外汇仍处波动区间',
        summaryEn: 'Sensitivity to commodity and USD-rate changes remains high.',
        summaryZh: '对商品价格和美元利率变化仍高度敏感。',
        source: 'Reuters',
        url: 'https://www.reuters.com',
        publishedAt: '2026-03-03T07:20:00.000Z',
      },
      {
        titleEn: 'Copper demand outlook revised up',
        titleZh: '铜需求展望上修',
        summaryEn: 'Industrial demand supports mining exporters across the region.',
        summaryZh: '工业需求支撑区域矿业出口国预期。',
        source: 'Financial Times',
        url: 'https://www.ft.com',
        publishedAt: '2026-03-03T06:10:00.000Z',
      },
    ],
  },
  {
    id: 'eu',
    nameEn: 'Europe',
    nameZh: '欧洲',
    coordinates: [12, 50],
    sentiment: 'neutral',
    score: 63,
    focus: 'rates',
    news: [
      {
        titleEn: 'ECB remains cautious',
        titleZh: '欧央行维持谨慎立场',
        summaryEn: 'Growth is stable while services inflation still needs monitoring.',
        summaryZh: '增长稳定，但服务通胀仍需观察。',
        source: 'Financial Times',
        url: 'https://www.ft.com',
        publishedAt: '2026-03-03T09:00:00.000Z',
      },
      {
        titleEn: 'Energy storage buildout accelerates',
        titleZh: '储能建设继续提速',
        summaryEn: 'Power-grid investments reduce winter energy shock risk.',
        summaryZh: '电网投资提高了冬季能源波动的缓冲能力。',
        source: 'Reuters',
        url: 'https://www.reuters.com',
        publishedAt: '2026-03-03T05:55:00.000Z',
      },
    ],
  },
  {
    id: 'me',
    nameEn: 'Middle East',
    nameZh: '中东',
    coordinates: [45, 27],
    sentiment: 'negative',
    score: 46,
    focus: 'energy',
    news: [
      {
        titleEn: 'Energy risk premium elevated',
        titleZh: '能源风险溢价抬升',
        summaryEn: 'Shipping and geopolitical uncertainty keep energy pricing volatile.',
        summaryZh: '航运与地缘不确定性使能源定价波动维持高位。',
        source: 'Bloomberg',
        url: 'https://www.bloomberg.com',
        publishedAt: '2026-03-03T08:25:00.000Z',
      },
      {
        titleEn: 'Key shipping lanes under watch',
        titleZh: '关键航运通道持续监测',
        summaryEn: 'Insurance premiums move up as route risk remains uncertain.',
        summaryZh: '在航线风险未消退背景下，航运保险费率上行。',
        source: 'Reuters',
        url: 'https://www.reuters.com',
        publishedAt: '2026-03-03T07:45:00.000Z',
      },
    ],
  },
  {
    id: 'af',
    nameEn: 'Africa',
    nameZh: '非洲',
    coordinates: [20, 2],
    sentiment: 'neutral',
    score: 52,
    focus: 'emerging',
    news: [
      {
        titleEn: 'Commodity exports hold steady',
        titleZh: '大宗商品出口保持稳定',
        summaryEn: 'Core mining and energy exports stay resilient despite logistics pressure.',
        summaryZh: '核心矿业与能源出口在物流压力下仍具韧性。',
        source: 'CNBC',
        url: 'https://www.cnbc.com',
        publishedAt: '2026-03-03T05:40:00.000Z',
      },
    ],
  },
  {
    id: 'ea',
    nameEn: 'East Asia',
    nameZh: '东亚',
    coordinates: [121, 32],
    sentiment: 'positive',
    score: 84,
    focus: 'supply',
    news: [
      {
        titleEn: 'Semiconductor cycle strengthens',
        titleZh: '半导体景气周期继续增强',
        summaryEn: 'AI-related supply chain expansion continues across listed suppliers.',
        summaryZh: 'AI 相关供应链扩张在核心上市供应商中持续推进。',
        source: 'Nikkei Asia',
        url: 'https://asia.nikkei.com',
        publishedAt: '2026-03-03T09:15:00.000Z',
      },
      {
        titleEn: 'Cross-border logistics returns to trend',
        titleZh: '跨境物流恢复常态节奏',
        summaryEn: 'Port throughput stabilizes and supports export guidance.',
        summaryZh: '港口吞吐恢复稳定，出口预期得到支撑。',
        source: 'Bloomberg',
        url: 'https://www.bloomberg.com',
        publishedAt: '2026-03-03T06:35:00.000Z',
      },
    ],
  },
  {
    id: 'sa',
    nameEn: 'South Asia',
    nameZh: '南亚',
    coordinates: [78, 22],
    sentiment: 'neutral',
    score: 59,
    focus: 'supply',
    news: [
      {
        titleEn: 'Domestic demand remains resilient',
        titleZh: '内需维持韧性',
        summaryEn: 'Consumer and financial activity continue expanding in core markets.',
        summaryZh: '核心市场消费与金融活动持续扩张。',
        source: 'CNBC',
        url: 'https://www.cnbc.com',
        publishedAt: '2026-03-03T05:00:00.000Z',
      },
    ],
  },
  {
    id: 'oc',
    nameEn: 'Oceania',
    nameZh: '大洋洲',
    coordinates: [135, -25],
    sentiment: 'neutral',
    score: 58,
    focus: 'energy',
    news: [
      {
        titleEn: 'Resource exports support growth',
        titleZh: '资源出口支撑增长',
        summaryEn: 'Iron ore and LNG exports continue to stabilize regional macro data.',
        summaryZh: '铁矿石与 LNG 出口继续稳定区域宏观数据。',
        source: 'ABC News',
        url: 'https://www.abc.net.au',
        publishedAt: '2026-03-03T04:20:00.000Z',
      },
    ],
  },
];

const REGION_LINKS: Array<{ from: string; to: string }> = [
  { from: 'na', to: 'eu' },
  { from: 'eu', to: 'ea' },
  { from: 'me', to: 'ea' },
  { from: 'ea', to: 'oc' },
  { from: 'na', to: 'latam' },
  { from: 'eu', to: 'af' },
];

function regionColor(sentiment: FinancialRegion['sentiment']): string {
  if (sentiment === 'positive') return '#10b981';
  if (sentiment === 'negative') return '#f43f5e';
  return '#38bdf8';
}

function formatDate(value: string, locale: Locale): string {
  return new Date(value).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function WorldMapNews({ locale, isDark }: WorldMapNewsProps) {
  const [activeId, setActiveId] = useState<string>('na');
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('all');

  const filteredRegions = useMemo(
    () => FINANCIAL_REGIONS.filter((item) => (focusFilter === 'all' ? true : item.focus === focusFilter)),
    [focusFilter],
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
    all: locale === 'zh' ? '全部' : 'All',
    rates: locale === 'zh' ? '利率' : 'Rates',
    energy: locale === 'zh' ? '能源' : 'Energy',
    supply: locale === 'zh' ? '供应链' : 'Supply',
    emerging: locale === 'zh' ? '新兴' : 'Emerging',
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
          <div className={`text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
            {locale === 'zh' ? '全球金融区热点监测' : 'Global financial-zone monitor'}
          </div>
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
                  {locale === 'zh' ? activeRegion.nameZh : activeRegion.nameEn}
                </h3>
                <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  {locale === 'zh' ? '地缘情报热度评分' : 'Geopolitical heat score'}: {activeRegion.score}
                </p>
                <div className="mt-3 space-y-2.5">
                  {activeRegion.news.map((news, index) => (
                    <article
                      key={`${news.source}-${index}`}
                      className={`rounded-xl border p-2.5 ${
                        isDark ? 'border-zinc-700/50 bg-zinc-800/45' : 'border-slate-200/90 bg-slate-50/90'
                      }`}
                    >
                      <h4 className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                        {locale === 'zh' ? news.titleZh : news.titleEn}
                      </h4>
                      <p className={`mt-1 text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                        {locale === 'zh' ? news.summaryZh : news.summaryEn}
                      </p>
                      <div className={`mt-1.5 flex flex-wrap items-center gap-1.5 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                        <span>{news.source}</span>
                        <span>·</span>
                        <span>{formatDate(news.publishedAt, locale)}</span>
                        <a
                          href={news.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
                        >
                          {locale === 'zh' ? '原文' : 'Source'}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                {locale === 'zh' ? '当前筛选无可用区域。' : 'No region available for current filter.'}
              </div>
            )}
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
