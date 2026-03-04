import { useEffect, useState } from 'react';
import type { HealthStatus, MarketQuote, NewsFact, ProviderFlags } from '@sightfi/shared';
import type { Locale } from '../i18n/messages';
import { t } from '../i18n/messages';
import { getFacts, getHealthWithSignal, getProviderFlags, getQuotes } from '../services/sightfi-api';

export interface BootstrapState {
  loading: boolean;
  error: string | null;
  health: HealthStatus | null;
  quotes: MarketQuote[];
  facts: NewsFact[];
  providers: ProviderFlags | null;
}

interface BootstrapCachePayload {
  locale: Locale;
  savedAt: number;
  health: HealthStatus | null;
  quotes: MarketQuote[];
  facts: NewsFact[];
  providers: ProviderFlags | null;
}

const BOOTSTRAP_CACHE_KEY = 'sightfi.bootstrap.cache';
const BOOTSTRAP_CACHE_TTL_MS = 45_000;

function readBootstrapCache(locale: Locale): BootstrapCachePayload | null {
  try {
    const raw = sessionStorage.getItem(BOOTSTRAP_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BootstrapCachePayload;
    const expired = Date.now() - parsed.savedAt > BOOTSTRAP_CACHE_TTL_MS;
    if (expired || parsed.locale !== locale) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeBootstrapCache(payload: BootstrapCachePayload): void {
  try {
    sessionStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write failure, runtime data stays authoritative.
  }
}

export function useBootstrap(locale: Locale): BootstrapState {
  const [state, setState] = useState<BootstrapState>(() => {
    const cached = readBootstrapCache(locale);
    if (!cached) {
      return {
        loading: true,
        error: null,
        health: null,
        quotes: [],
        facts: [],
        providers: null,
      };
    }

    return {
      loading: false,
      error: null,
      health: cached.health,
      quotes: cached.quotes,
      facts: cached.facts,
      providers: cached.providers,
    };
  });

  useEffect(() => {
    const abortController = new AbortController();

    async function load() {
      const snapshot = readBootstrapCache(locale);
      const hasWarmData = (snapshot?.quotes.length ?? 0) > 0 && (snapshot?.facts.length ?? 0) > 0;
      setState((prev) => ({ ...prev, loading: !hasWarmData, error: null }));

      try {
        const healthPromise = getHealthWithSignal(abortController.signal).catch(() => null);
        const providerPromise = getProviderFlags(abortController.signal).catch(() => null);
        const [quotes, facts] = await Promise.all([
          getQuotes(abortController.signal),
          getFacts(undefined, undefined, locale, abortController.signal),
        ]);

        if (abortController.signal.aborted) return;

        setState((prev) => ({
          loading: false,
          error: null,
          health: prev.health,
          quotes,
          facts,
          providers: prev.providers,
        }));

        const [health, providers] = await Promise.all([healthPromise, providerPromise]);
        if (abortController.signal.aborted) return;

        setState({
          loading: false,
          error: null,
          health,
          quotes,
          facts,
          providers,
        });

        writeBootstrapCache({
          locale,
          savedAt: Date.now(),
          health,
          quotes,
          facts,
          providers,
        });
      } catch (error) {
        if (abortController.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : t('error.bootstrap'),
        }));
      }
    }

    void load();
    return () => abortController.abort();
  }, [locale]);

  return state;
}
