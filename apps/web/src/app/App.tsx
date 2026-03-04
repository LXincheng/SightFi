import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/app-shell';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { useNewsFeed } from '../features/news/use-news-feed';
import { APP_CONSTANTS } from '../shared/constants/app.constants';
import type { CurrencyCode } from '../shared/constants/currency.constants';
import { useBootstrap } from '../shared/hooks/use-bootstrap';
import { useLiveQuotes } from '../shared/hooks/use-live-quotes';
import { resolveLocale, setLocale, t } from '../shared/i18n/messages';
import type { Locale } from '../shared/i18n/messages';
import { Notice } from '../shared/ui/notice';
import { resolveCurrency } from '../shared/utils/currency';

const IntelPage = lazy(() =>
  import('../features/news/intel-page').then((module) => ({ default: module.IntelPage })),
);
const AssetsPage = lazy(() =>
  import('../features/portfolio/assets-page').then((module) => ({ default: module.AssetsPage })),
);
const SystemPage = lazy(() =>
  import('../features/system/system-page').then((module) => ({ default: module.SystemPage })),
);

type ThemeMode = 'dark' | 'light';

function detectInitialLocale(): Locale {
  const stored = localStorage.getItem(APP_CONSTANTS.localeStorageKey);
  if (stored === 'en' || stored === 'zh') return stored;
  return resolveLocale(navigator.language);
}

interface IntelRouteProps {
  initialFacts: ReturnType<typeof useBootstrap>['facts'];
  quotes: ReturnType<typeof useLiveQuotes>['quotes'];
  locale: Locale;
  isDark: boolean;
  currency: CurrencyCode;
}

function IntelRoute({ initialFacts, quotes, locale, isDark, currency }: IntelRouteProps) {
  const newsFeed = useNewsFeed(initialFacts, locale);

  return (
    <IntelPage
      facts={newsFeed.facts}
      loading={newsFeed.loading}
      error={newsFeed.error}
      query={newsFeed.query}
      limit={newsFeed.limit}
      onQueryChange={newsFeed.setQuery}
      onLimitChange={newsFeed.setLimit}
      onReload={newsFeed.reload}
      quotes={quotes}
      locale={locale}
      isDark={isDark}
      currency={currency}
    />
  );
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const raw = localStorage.getItem(APP_CONSTANTS.themeStorageKey);
    return raw === 'light' || raw === 'dark' ? raw : 'dark';
  });
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);
  const [currency, setCurrency] = useState<CurrencyCode>(() =>
    resolveCurrency(localStorage.getItem(APP_CONSTANTS.currencyStorageKey)),
  );

  const state = useBootstrap(locale);
  const live = useLiveQuotes(state.quotes);
  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(APP_CONSTANTS.themeStorageKey, theme);
  }, [isDark, theme]);

  useEffect(() => {
    setLocale(locale);
    localStorage.setItem(APP_CONSTANTS.localeStorageKey, locale);
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en-US';
  }, [locale]);

  useEffect(() => {
    localStorage.setItem(APP_CONSTANTS.currencyStorageKey, currency);
  }, [currency]);

  const routeFallback = useMemo(
    () => <Notice tone="info" message={locale === 'zh' ? '页面加载中…' : 'Loading page...'} />,
    [locale],
  );

  return (
    <AppShell
      isDark={isDark}
      locale={locale}
      currency={currency}
      onCurrencyChange={setCurrency}
      onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      onToggleLocale={() => setLocaleState((prev) => (prev === 'en' ? 'zh' : 'en'))}
    >
      {live.streamError ? <Notice tone="error" message={live.streamError} /> : null}
      {state.loading ? (
        <Notice tone="info" message={t('notice.bootstrap')} />
      ) : state.error ? (
        <Notice tone="error" message={state.error} />
      ) : (
        <Suspense fallback={routeFallback}>
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  state={state}
                  live={live}
                  facts={state.facts}
                  locale={locale}
                  isDark={isDark}
                  currency={currency}
                />
              }
            />
            <Route
              path="/news"
              element={
                <IntelRoute
                  initialFacts={state.facts}
                  quotes={live.quotes}
                  locale={locale}
                  isDark={isDark}
                  currency={currency}
                />
              }
            />
            <Route
              path="/portfolio"
              element={
                <AssetsPage
                  quotes={live.quotes}
                  locale={locale}
                  isDark={isDark}
                  currency={currency}
                />
              }
            />
            <Route
              path="/settings"
              element={
                <SystemPage
                  theme={theme}
                  locale={locale}
                  providers={state.providers}
                  facts={state.facts}
                  onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  onToggleLocale={() => setLocaleState((prev) => (prev === 'en' ? 'zh' : 'en'))}
                />
              }
            />
          </Routes>
        </Suspense>
      )}
    </AppShell>
  );
}

export default App;
