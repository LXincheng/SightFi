import { useMemo, useState } from 'react';
import type { MarketQuote, NewsFact } from '@sightfi/shared';
import { motion } from 'motion/react';
import { Brain, Cpu, ExternalLink, Search, Send } from 'lucide-react';
import type { CurrencyCode } from '../../shared/constants/currency.constants';
import { formatDateTimeWithZone, localeToIntlTag } from '../../shared/i18n/format';
import type { Locale, MessageKey } from '../../shared/i18n/messages';
import { t } from '../../shared/i18n/messages';
import { formatCurrencyValue } from '../../shared/utils/currency';
import {
  NEWS_CHAT_REPLY_DELAY_MS,
  NEWS_FACT_CATEGORIES,
} from './news.constants';
import type { NewsFactCategory } from './news.constants';

interface IntelPageProps {
  facts: NewsFact[];
  loading: boolean;
  error: string | null;
  query: string;
  limit: number;
  onQueryChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onReload: () => Promise<void>;
  quotes: MarketQuote[];
  locale: Locale;
  isDark: boolean;
  currency: CurrencyCode;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

interface TimelineGroup {
  key: string;
  label: string;
  items: NewsFact[];
}

function toCategory(source: string): Exclude<NewsFactCategory, 'ALL'> {
  const upper = source.toUpperCase();
  if (upper.includes('FED') || upper.includes('BLOOMBERG') || upper.includes('JIN10')) return 'MACRO';
  if (upper.includes('EARN') || upper.includes('SEC')) return 'EARNINGS';
  if (upper.includes('REUTERS') || upper.includes('GEO')) return 'GEO';
  if (upper.includes('COIN') || upper.includes('CRYPTO')) return 'CRYPTO';
  return 'GENERAL';
}

function categoryBadgeClass(category: NewsFactCategory, isDark: boolean): string {
  if (category === 'MACRO') return 'border-sky-400/30 bg-sky-400/10 text-sky-400';
  if (category === 'EARNINGS') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400';
  if (category === 'GEO') return 'border-rose-400/30 bg-rose-400/10 text-rose-400';
  if (category === 'CRYPTO') return 'border-amber-400/30 bg-amber-400/10 text-amber-400';
  if (category === 'ALL') {
    return isDark
      ? 'border-zinc-600/60 bg-zinc-800/50 text-zinc-200'
      : 'border-slate-300/70 bg-slate-100 text-slate-700';
  }
  return isDark
    ? 'border-zinc-700/60 bg-zinc-800/50 text-zinc-300'
    : 'border-slate-300/70 bg-slate-100 text-slate-700';
}

function categoryKey(category: NewsFactCategory): MessageKey {
  if (category === 'ALL') return 'intel.filter.all';
  if (category === 'MACRO') return 'intel.filter.macro';
  if (category === 'EARNINGS') return 'intel.filter.earnings';
  if (category === 'GEO') return 'intel.filter.geo';
  if (category === 'CRYPTO') return 'intel.filter.crypto';
  return 'intel.filter.general';
}

function quickPromptKey(index: number): MessageKey {
  if (index === 0) return 'intel.quickPrompt.1';
  if (index === 1) return 'intel.quickPrompt.2';
  return 'intel.quickPrompt.3';
}

function buildTimelineGroups(facts: NewsFact[], locale: Locale): TimelineGroup[] {
  const bucket = new Map<string, NewsFact[]>();
  const formatter = new Intl.DateTimeFormat(localeToIntlTag(locale), {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  facts.forEach((fact) => {
    const date = new Date(fact.publishedAt);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    const next = bucket.get(key) ?? [];
    next.push(fact);
    bucket.set(key, next);
  });

  return Array.from(bucket.entries())
    .sort(([left], [right]) => (left > right ? -1 : 1))
    .map(([key, items]) => ({
      key,
      label: formatter.format(new Date(`${key}T00:00:00.000Z`)),
      items: items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    }));
}

export function IntelPage({
  facts,
  loading,
  error,
  query,
  limit,
  onQueryChange,
  onLimitChange,
  onReload,
  quotes,
  locale,
  isDark,
  currency,
}: IntelPageProps) {
  const [chat, setChat] = useState<ChatMessage[]>([{ role: 'ai', text: t('intel.chat.welcome') }]);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<NewsFactCategory>('ALL');

  const topQuotes = useMemo(() => quotes.slice(0, 6), [quotes]);
  const filteredFacts = useMemo(
    () => (filter === 'ALL' ? facts : facts.filter((fact) => toCategory(fact.source) === filter)),
    [facts, filter],
  );
  const timeline = useMemo(() => buildTimelineGroups(filteredFacts, locale), [filteredFacts, locale]);
  const highlightedFacts = useMemo(() => filteredFacts.slice(0, 2), [filteredFacts]);

  const briefPoints = useMemo(() => {
    const points = facts
      .slice(0, 3)
      .map((fact) => fact.factSummary.replace(/\s+/g, ' ').trim())
      .filter((item) => item.length > 0);
    if (points.length > 0) return points;
    return [t('intel.aiBrief.fallback1'), t('intel.aiBrief.fallback2'), t('intel.aiBrief.fallback3')];
  }, [facts]);

  const cardBase = isDark
    ? 'bg-zinc-900/45 border-zinc-800/55 backdrop-blur-xl'
    : 'bg-white/88 border-slate-200/85 backdrop-blur-xl shadow-sm';
  const innerCard = isDark ? 'bg-zinc-800/35 border-zinc-700/45' : 'bg-white/92 border-slate-200/75';
  const textPrimary = isDark ? 'text-zinc-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-zinc-300' : 'text-slate-700';
  const textDim = isDark ? 'text-zinc-500' : 'text-slate-500';
  const divider = isDark ? 'border-zinc-800/55' : 'border-slate-200/70';
  const inputClass = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-200 placeholder-zinc-600 focus:border-emerald-500/50'
    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-400';

  function sendMessage(): void {
    if (!draft.trim()) return;
    const question = draft.trim();
    setChat((prev) => [...prev, { role: 'user', text: question }]);
    setDraft('');

    window.setTimeout(() => {
      const topFact = filteredFacts[0];
      const response = topFact
        ? t('intel.chat.reply.withFact', { question, fact: topFact.factSummary })
        : t('intel.chat.reply.noFact', { question });
      setChat((prev) => [...prev, { role: 'ai', text: response }]);
    }, NEWS_CHAT_REPLY_DELAY_MS);
  }

  return (
    <div className="space-y-4 md:space-y-5 lg:space-y-6">
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card rounded-2xl border p-4 md:p-5 ${cardBase}`}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className={`text-xl font-semibold tracking-tight ${textPrimary}`}>{t('intel.hubTitle')}</h1>
            <p className={`mt-1 text-sm leading-relaxed ${textDim}`}>{t('intel.hubSubtitle')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-xl border px-3 py-2 ${innerCard}`}>
              <div className={`text-xs ${textDim}`}>{t('intel.stat.facts')}</div>
              <div className={`text-sm font-semibold ${textPrimary}`}>{facts.length}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2 ${innerCard}`}>
              <div className={`text-xs ${textDim}`}>{t('intel.stat.filter')}</div>
              <div className={`text-sm font-semibold ${textPrimary}`}>{t(categoryKey(filter))}</div>
            </div>
            <div className={`rounded-xl border px-3 py-2 ${innerCard}`}>
              <div className={`text-xs ${textDim}`}>{t('intel.stat.sync')}</div>
              <div className={`text-sm font-semibold ${loading ? 'text-amber-400' : 'text-emerald-500'}`}>
                {loading ? t('intel.sync.running') : t('intel.sync.synced')}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass-card rounded-2xl border p-3 ${cardBase}`}
      >
        <div className="mb-2 text-sm font-medium tracking-tight text-emerald-500">{t('intel.marketStrip')}</div>
        <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
          {topQuotes.map((item) => (
            <div key={item.symbol} className={`min-w-[132px] rounded-xl border px-3 py-2 ${innerCard}`}>
              <div className={`text-xs ${textDim}`}>{item.symbol}</div>
              <div className={`text-sm font-semibold ${textPrimary}`}>
                {formatCurrencyValue(item.price, currency, locale, 2)}
              </div>
              <div className={`text-xs ${item.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {item.changePercent >= 0 ? '+' : ''}
                {item.changePercent.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <section className={`glass-card rounded-2xl border p-4 md:p-5 ${cardBase}`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className={`pointer-events-none absolute left-3 top-2.5 h-4 w-4 ${textDim}`} />
              <input
                className={`w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none transition ${inputClass}`}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={t('intel.search.placeholder')}
              />
            </div>
            <input
              className={`w-20 rounded-xl border px-3 py-2 text-sm outline-none transition ${inputClass}`}
              type="number"
              min={5}
              max={100}
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              aria-label={t('intel.limit.label')}
            />
            <button
              type="button"
              onClick={() => void onReload()}
              disabled={loading}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-500 transition hover:bg-emerald-500/22 disabled:opacity-60"
            >
              {loading ? t('intel.refreshing') : t('intel.refresh')}
            </button>
          </div>
          {error ? <p className="mb-3 text-sm text-rose-500">{error}</p> : null}

          <div className="mb-3 flex flex-wrap gap-1.5">
            {NEWS_FACT_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  filter === category
                    ? categoryBadgeClass(category, isDark)
                    : isDark
                      ? 'border-zinc-700/70 text-zinc-400 hover:text-zinc-200'
                      : 'border-slate-200 text-slate-500 hover:text-slate-700'
                }`}
              >
                {t(categoryKey(category))}
              </button>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {highlightedFacts.map((item) => {
              const category = toCategory(item.source);
              return (
                <article
                  key={`highlight-${item.id}`}
                  className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700/55 bg-zinc-900/35' : 'border-slate-200/90 bg-white/95'}`}
                >
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${categoryBadgeClass(category, isDark)}`}>
                      {t(categoryKey(category))}
                    </span>
                    <span className={`text-xs ${textDim}`}>{item.source || t('intel.source.unknown')}</span>
                  </div>
                  <p className={`max-h-[4.2rem] overflow-hidden text-sm leading-relaxed ${textMuted}`}>{item.factSummary}</p>
                </article>
              );
            })}
          </div>

          <div className={`rounded-xl border ${innerCard}`}>
            <header className={`flex items-center justify-between border-b px-3 py-2 ${divider}`}>
              <div>
                <h2 className={`text-sm font-semibold ${textPrimary}`}>{t('intel.timeline.title')}</h2>
                <p className={`text-xs ${textDim}`}>{t('intel.timeline.subtitle')}</p>
              </div>
            </header>

            <div className="scrollbar-thin max-h-[760px] space-y-4 overflow-y-auto px-3 py-3">
              {timeline.map((group) => (
                <section key={group.key}>
                  <div className={`mb-2 text-xs font-medium ${textDim}`}>{group.label}</div>
                  <div className="space-y-2.5">
                    {group.items.map((item) => {
                      const category = toCategory(item.source);
                      return (
                        <article
                          key={item.id}
                          className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700/55 bg-zinc-900/35' : 'border-slate-200/90 bg-white/95'}`}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${categoryBadgeClass(category, isDark)}`}>
                              {t(categoryKey(category))}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${isDark ? 'border-zinc-700 text-zinc-400' : 'border-slate-200 text-slate-500'}`}>
                              {item.source || t('intel.source.unknown')}
                            </span>
                            <span className={`ml-auto text-xs ${textDim}`}>
                              {formatDateTimeWithZone(item.publishedAt, locale)}
                            </span>
                          </div>
                          <p className={`text-sm leading-relaxed ${textMuted}`}>{item.factSummary}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex flex-wrap gap-1">
                              {item.symbols.slice(0, 5).map((symbol) => (
                                <span
                                  key={`${item.id}-${symbol}`}
                                  className={`rounded-full border px-2 py-0.5 text-xs ${isDark ? 'border-zinc-700 text-zinc-500' : 'border-slate-200 text-slate-500'}`}
                                >
                                  #{symbol}
                                </span>
                              ))}
                            </div>
                            {item.sourceId ? (
                              <a
                                href={item.sourceId}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
                              >
                                {t('intel.source.link')}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}

              {timeline.length === 0 ? (
                <article className={`rounded-xl border p-3 text-sm ${innerCard} ${textMuted}`}>
                  {t('intel.timeline.empty')}
                </article>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className={`glass-card rounded-2xl border p-4 ${cardBase}`}>
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/15 p-1.5">
                <Brain className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className={`text-sm font-semibold tracking-tight ${textPrimary}`}>{t('intel.aiBrief.title')}</h3>
            </div>
            <ul className={`list-disc space-y-1.5 pl-5 text-sm leading-relaxed ${textMuted}`}>
              {briefPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>

          <section className={`glass-card flex min-h-[460px] flex-col overflow-hidden rounded-2xl border ${cardBase}`}>
            <header className={`flex items-center justify-between border-b px-4 py-3 ${divider}`}>
              <h3 className={`flex items-center gap-2 text-sm font-semibold ${textPrimary}`}>
                <Cpu className="h-4 w-4 text-emerald-500" />
                {t('intel.copilot.title')}
              </h3>
              <span className={`text-xs ${textDim}`}>{t('intel.copilot.online')}</span>
            </header>

            <div className="scrollbar-thin min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
              {chat.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-xl border p-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'border-emerald-500/20 bg-emerald-500/12 text-emerald-500'
                        : isDark
                          ? 'border-zinc-700/50 bg-zinc-800/45 text-zinc-300'
                          : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            <footer className={`border-t p-3 ${divider}`}>
              <div className={`mb-1.5 text-xs ${textDim}`}>{t('intel.chat.quickTitle')}</div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[0, 1, 2].map((index) => {
                  const text = t(quickPromptKey(index));
                  return (
                    <button
                      key={text}
                      type="button"
                      onClick={() => setDraft(text)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        isDark
                          ? 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                          : 'border-slate-200 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {text}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') sendMessage();
                  }}
                  placeholder={t('intel.chat.placeholder')}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/18 p-2 text-emerald-500 transition hover:bg-emerald-500/28"
                  aria-label={t('intel.chat.send')}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </section>
        </aside>
      </div>
    </div>
  );
}
