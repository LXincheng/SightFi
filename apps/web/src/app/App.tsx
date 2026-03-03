import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/app-shell';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { IntelPage } from '../features/news/intel-page';
import { useNewsFeed } from '../features/news/use-news-feed';
import { AssetsPage } from '../features/portfolio/assets-page';
import { SystemPage } from '../features/system/system-page';
import { APP_CONSTANTS } from '../shared/constants/app.constants';
import type { CurrencyCode } from '../shared/constants/currency.constants';
import { useBootstrap } from '../shared/hooks/use-bootstrap';
import { useLiveQuotes } from '../shared/hooks/use-live-quotes';
import { resolveLocale, setLocale, t } from '../shared/i18n/messages';
import type { Locale } from '../shared/i18n/messages';
import { Notice } from '../shared/ui/notice';
import { resolveCurrency } from '../shared/utils/currency';

type ThemeMode = 'dark' | 'light';

function detectInitialLocale(): Locale {
  const stored = localStorage.getItem(APP_CONSTANTS.localeStorageKey);
  if (stored === 'en' || stored === 'zh') return stored;
  return resolveLocale(navigator.language);
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
  const newsFeed = useNewsFeed(state.facts, locale);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(APP_CONSTANTS.themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    setLocale(locale);
    localStorage.setItem(APP_CONSTANTS.localeStorageKey, locale);
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en-US';
  }, [locale]);

  useEffect(() => {
    localStorage.setItem(APP_CONSTANTS.currencyStorageKey, currency);
  }, [currency]);

  return (
    <AppShell
      isDark={theme === 'dark'}
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
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                state={state}
                live={live}
                facts={newsFeed.facts}
                locale={locale}
                isDark={theme === 'dark'}
                currency={currency}
              />
            }
          />
          <Route
            path="/news"
            element={
              <IntelPage
                facts={newsFeed.facts}
                loading={newsFeed.loading}
                error={newsFeed.error}
                query={newsFeed.query}
                limit={newsFeed.limit}
                onQueryChange={newsFeed.setQuery}
                onLimitChange={newsFeed.setLimit}
                onReload={newsFeed.reload}
                quotes={live.quotes}
                locale={locale}
                isDark={theme === 'dark'}
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
                isDark={theme === 'dark'}
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
                onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                onToggleLocale={() => setLocaleState((prev) => (prev === 'en' ? 'zh' : 'en'))}
              />
            }
          />
        </Routes>
      )}
    </AppShell>
  );
}

export default App;
