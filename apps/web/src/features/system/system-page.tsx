import { useMemo, useState } from 'react';
import type { NewsFact, ProviderFlags } from '@sightfi/shared';
import type { Locale } from '../../shared/i18n/messages';
import { t } from '../../shared/i18n/messages';
import { Bell, Cpu, Globe, Moon, Sun } from 'lucide-react';

interface SystemPageProps {
  theme: 'dark' | 'light';
  locale: Locale;
  providers: ProviderFlags | null;
  facts: NewsFact[];
  onToggleTheme: () => void;
  onToggleLocale: () => void;
}

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  isDark: boolean;
}

function Toggle({ checked, onChange, isDark }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 rounded-full border-2 transition-colors ${
        checked
          ? 'border-emerald-500 bg-emerald-500'
          : isDark
            ? 'border-zinc-700 bg-zinc-700'
            : 'border-slate-300 bg-slate-200'
      }`}
    >
      <span
        className={`mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function SystemPage({ theme, locale, providers, facts, onToggleTheme, onToggleLocale }: SystemPageProps) {
  const [factOnly, setFactOnly] = useState(true);
  const [portfolioAware, setPortfolioAware] = useState(true);
  const [priceAlert, setPriceAlert] = useState(true);
  const isDark = theme === 'dark';

  const cardBase = isDark
    ? 'bg-zinc-900/45 border-zinc-800/55 backdrop-blur-xl'
    : 'bg-white/85 border-slate-200/85 backdrop-blur-xl shadow-sm';
  const textPrimary = isDark ? 'text-zinc-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-zinc-300' : 'text-slate-700';
  const textDim = isDark ? 'text-zinc-500' : 'text-slate-500';
  const divider = isDark ? 'border-zinc-800/55' : 'border-slate-200/75';

  const sourceCards = [
    { name: 'Market Data', active: providers?.marketDataConfigured ?? false },
    { name: 'News Data', active: providers?.newsDataConfigured ?? false },
    { name: 'AI Analysis', active: providers?.aiPrimaryConfigured ?? false },
    { name: 'Database', active: providers?.databaseConfigured ?? false },
  ];
  const sourceDistribution = useMemo(() => {
    const counter = new Map<string, number>();
    facts.forEach((fact) => {
      const source = fact.source?.trim() || (locale === 'zh' ? '未知来源' : 'Unknown');
      counter.set(source, (counter.get(source) ?? 0) + 1);
    });
    const total = Array.from(counter.values()).reduce((sum, value) => sum + value, 0) || 1;
    return Array.from(counter.entries())
      .map(([source, count]) => ({
        source,
        count,
        ratio: Math.round((count / total) * 100),
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 6);
  }, [facts, locale]);

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-5 xl:grid-cols-2">
      <section className={`glass-card rounded-2xl border p-4 md:p-5 ${cardBase}`}>
        <div className={`mb-4 flex items-center gap-2 border-b pb-3.5 ${divider}`}>
          <div className="rounded-lg bg-emerald-500/15 p-1.5">
            <Sun className="h-4 w-4 text-emerald-400" />
          </div>
          <h2 className={`text-lg font-bold ${textPrimary}`}>{locale === 'zh' ? '外观与语言' : 'Appearance & Language'}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className={`mb-2 text-sm ${textDim}`}>{locale === 'zh' ? '主题' : 'Theme'}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (theme !== 'dark') onToggleTheme();
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                  theme === 'dark'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : isDark
                      ? 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                      : 'border-slate-200 bg-white/70 text-slate-600'
                }`}
              >
                <Moon className="h-4 w-4" />
                {locale === 'zh' ? '暗黑' : 'Dark'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (theme !== 'light') onToggleTheme();
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                  theme === 'light'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                    : isDark
                      ? 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                      : 'border-slate-200 bg-white/70 text-slate-600'
                }`}
              >
                <Sun className="h-4 w-4" />
                {locale === 'zh' ? '白天' : 'Light'}
              </button>
            </div>
          </div>

          <div>
            <p className={`mb-2 text-sm ${textDim}`}>{locale === 'zh' ? '语言' : 'Language'}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onToggleLocale}
                className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                  locale === 'zh'
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-500'
                    : isDark
                      ? 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                      : 'border-slate-200 bg-white/70 text-slate-600'
                }`}
              >
                中文
              </button>
              <button
                type="button"
                onClick={onToggleLocale}
                className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                  locale === 'en'
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-500'
                    : isDark
                      ? 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                      : 'border-slate-200 bg-white/70 text-slate-600'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={`glass-card rounded-2xl border p-4 md:p-5 ${cardBase}`}>
        <div className={`mb-4 flex items-center gap-2 border-b pb-3.5 ${divider}`}>
          <div className="rounded-lg bg-purple-500/15 p-1.5">
            <Cpu className="h-4 w-4 text-purple-400" />
          </div>
          <h2 className={`text-lg font-bold ${textPrimary}`}>{locale === 'zh' ? 'AI 与提醒' : 'AI & Alerts'}</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              titleEn: 'Fact-first mode',
              titleZh: '事实优先模式',
              descEn: 'Only show verified facts and suppress subjective narratives.',
              descZh: '仅展示可验证事实，减少主观叙述。',
              checked: factOnly,
              onChange: () => setFactOnly((prev) => !prev),
            },
            {
              titleEn: 'Portfolio-aware analysis',
              titleZh: '结合持仓分析',
              descEn: 'Map hot events to your holdings and risk exposure.',
              descZh: '将热点事件映射到你的持仓与风险暴露。',
              checked: portfolioAware,
              onChange: () => setPortfolioAware((prev) => !prev),
            },
            {
              titleEn: 'Price movement alerts',
              titleZh: '价格异动提醒',
              descEn: 'Notify when watched assets exceed thresholds.',
              descZh: '关注标的超过阈值时提醒。',
              checked: priceAlert,
              onChange: () => setPriceAlert((prev) => !prev),
            },
          ].map((item) => (
            <div key={item.titleEn} className={`flex items-start justify-between gap-4 border-b pb-4 last:border-0 last:pb-0 ${divider}`}>
              <div className="min-w-0">
                <div className={`text-sm font-medium ${textPrimary}`}>{locale === 'zh' ? item.titleZh : item.titleEn}</div>
                <p className={`mt-0.5 text-sm leading-relaxed ${textDim}`}>{locale === 'zh' ? item.descZh : item.descEn}</p>
              </div>
              <Toggle checked={item.checked} onChange={item.onChange} isDark={isDark} />
            </div>
          ))}
        </div>
      </section>

      <section className={`glass-card rounded-2xl border p-4 md:p-5 xl:col-span-2 ${cardBase}`}>
        <div className={`mb-4 flex items-center gap-2 border-b pb-3.5 ${divider}`}>
          <div className="rounded-lg bg-blue-500/15 p-1.5">
            <Globe className="h-4 w-4 text-blue-400" />
          </div>
          <h2 className={`text-lg font-bold ${textPrimary}`}>{locale === 'zh' ? '服务状态' : 'Service Status'}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {sourceCards.map((source) => (
            <div
              key={source.name}
              className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700/45 bg-zinc-800/35' : 'border-slate-200/80 bg-white/80'}`}
            >
              <div className={`text-sm ${textMuted}`}>{source.name}</div>
              <div className={`mt-1.5 inline-flex items-center gap-1.5 text-sm ${source.active ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${source.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {source.active ? (locale === 'zh' ? '正常' : 'Active') : locale === 'zh' ? '异常' : 'Issue'}
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-3.5 flex items-center gap-2 text-sm ${textDim}`}>
          <Bell className="h-4 w-4" />
          {locale === 'zh'
            ? '当服务异常时会自动降级到快照模式，保障页面可用。'
            : 'When a provider is unstable, SightFi falls back to snapshot mode automatically.'}
        </div>
      </section>

      <section className={`glass-card rounded-2xl border p-4 md:p-5 xl:col-span-2 ${cardBase}`}>
        <div className={`mb-4 flex items-center gap-2 border-b pb-3.5 ${divider}`}>
          <div className="rounded-lg bg-cyan-500/15 p-1.5">
            <Globe className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h2 className={`text-lg font-bold ${textPrimary}`}>{t('system.newsSource.title')}</h2>
            <p className={`text-sm ${textDim}`}>{t('system.newsSource.subtitle')}</p>
          </div>
        </div>

        {sourceDistribution.length > 0 ? (
          <div className="space-y-2.5">
            {sourceDistribution.map((item) => (
              <article key={item.source} className={`rounded-xl border px-3 py-2 ${isDark ? 'border-zinc-700/45 bg-zinc-900/35' : 'border-slate-200/80 bg-white/80'}`}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className={`truncate text-sm font-medium ${textPrimary}`}>{item.source}</span>
                  <span className={`text-sm ${textDim}`}>{item.count}</span>
                </div>
                <div className={`h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                  <div
                    className="h-full rounded-full bg-cyan-500/80"
                    style={{ width: `${Math.max(6, item.ratio)}%` }}
                  />
                </div>
                <div className={`mt-1 text-sm ${textDim}`}>{item.ratio}%</div>
              </article>
            ))}
          </div>
        ) : (
          <div className={`rounded-xl border px-3 py-2 text-sm ${isDark ? 'border-zinc-700/45 bg-zinc-900/35 text-zinc-500' : 'border-slate-200/80 bg-slate-50/90 text-slate-500'}`}>
            {t('system.newsSource.empty')}
          </div>
        )}
      </section>
    </div>
  );
}
