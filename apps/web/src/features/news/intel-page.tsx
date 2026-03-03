import { useMemo, useState } from 'react';
import type { MarketQuote, NewsFact } from '@sightfi/shared';
import { motion } from 'motion/react';
import { Brain, Cpu, ExternalLink, Send } from 'lucide-react';
import type { CurrencyCode } from '../../shared/constants/currency.constants';
import type { Locale, MessageKey } from '../../shared/i18n/messages';
import { t } from '../../shared/i18n/messages';
import { formatCurrencyValue } from '../../shared/utils/currency';

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

type FactCategory = 'ALL' | 'MACRO' | 'EARNINGS' | 'GEO' | 'CRYPTO' | 'GENERAL';

const FACT_CATEGORIES: FactCategory[] = ['ALL', 'MACRO', 'EARNINGS', 'GEO', 'CRYPTO', 'GENERAL'];

function toCategory(source: string): Exclude<FactCategory, 'ALL'> {
  const upper = source.toUpperCase();
  if (upper.includes('FED') || upper.includes('BLOOMBERG') || upper.includes('JIN10')) return 'MACRO';
  if (upper.includes('EARN') || upper.includes('SEC')) return 'EARNINGS';
  if (upper.includes('REUTERS') || upper.includes('GEO')) return 'GEO';
  if (upper.includes('COIN') || upper.includes('CRYPTO')) return 'CRYPTO';
  return 'GENERAL';
}

function tr(key: MessageKey, vars?: Record<string, string | number>): string {
  const template = t(key);
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    template,
  );
}

function categoryBadgeClass(category: FactCategory, isDark: boolean): string {
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

function categoryKey(category: FactCategory): MessageKey {
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
  const [filter, setFilter] = useState<FactCategory>('ALL');

  const topQuotes = useMemo(() => quotes.slice(0, 6), [quotes]);
  const filteredFacts = useMemo(
    () => (filter === 'ALL' ? facts : facts.filter((fact) => toCategory(fact.source) === filter)),
    [facts, filter],
  );

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
        ? tr('intel.chat.reply.withFact', { question, fact: topFact.factSummary })
        : tr('intel.chat.reply.noFact', { question });
      setChat((prev) => [...prev, { role: 'ai', text: response }]);
    }, 550);
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <section className={`glass-card rounded-2xl border p-4 md:p-5 ${cardBase}`}>
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className={`text-base font-semibold tracking-tight ${textPrimary}`}>{t('intel.section.facts')}</h2>
            <div className="flex flex-wrap gap-1.5">
              {FACT_CATEGORIES.map((category) => (
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
          </div>

          <div className={`grid gap-2 rounded-xl border p-2.5 ${innerCard}`}>
            <input
              className={`rounded-xl border px-3 py-2 text-sm outline-none transition ${inputClass}`}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t('intel.search.placeholder')}
            />
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <input
                className={`rounded-xl border px-3 py-2 text-sm outline-none transition ${inputClass}`}
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
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </div>

          <div className="mt-3 space-y-2.5">
            {filteredFacts.map((item, index) => {
              const category = toCategory(item.source);
              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700/55 bg-zinc-900/35' : 'border-slate-200/90 bg-white/95'}`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${categoryBadgeClass(category, isDark)}`}>
                      {t(categoryKey(category))}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${isDark ? 'border-zinc-700 text-zinc-400' : 'border-slate-200 text-slate-500'}`}>
                      {item.source}
                    </span>
                    <span className={`ml-auto text-xs ${textDim}`}>
                      {new Date(item.publishedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                        hour12: false,
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
                </motion.article>
              );
            })}

            {filteredFacts.length === 0 ? (
              <article className={`rounded-xl border p-3 text-sm ${innerCard} ${textMuted}`}>
                {t('intel.emptyFiltered')}
              </article>
            ) : null}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className={`glass-card rounded-2xl border p-4 ${cardBase}`}>
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-lg border border-purple-500/25 bg-purple-500/15 p-1.5">
                <Brain className="h-4 w-4 text-purple-400" />
              </div>
              <h3 className={`text-sm font-semibold tracking-tight ${textPrimary}`}>{t('intel.aiBrief.title')}</h3>
            </div>
            <ul className={`list-disc space-y-1.5 pl-5 text-sm leading-relaxed ${textMuted}`}>
              {briefPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>

          <section className={`glass-card flex min-h-[420px] flex-col overflow-hidden rounded-2xl border ${cardBase}`}>
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
