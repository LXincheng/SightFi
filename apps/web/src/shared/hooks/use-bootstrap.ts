import { useEffect, useState } from 'react';
import type { HealthStatus, MarketQuote, NewsFact, ProviderFlags } from '@sightfi/shared';
import { t } from '../i18n/messages';
import { getFacts, getHealth, getProviderFlags, getQuotes } from '../services/sightfi-api';

export interface BootstrapState {
  loading: boolean;
  error: string | null;
  health: HealthStatus | null;
  quotes: MarketQuote[];
  facts: NewsFact[];
  providers: ProviderFlags | null;
}

export function useBootstrap(): BootstrapState {
  const [state, setState] = useState<BootstrapState>({
    loading: true,
    error: null,
    health: null,
    quotes: [],
    facts: [],
    providers: null,
  });

  useEffect(() => {
    const abortController = new AbortController();

    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [health, quotes, facts, providers] = await Promise.all([
          getHealth(),
          getQuotes(),
          getFacts(),
          getProviderFlags(),
        ]);
        if (abortController.signal.aborted) return;
        setState({
          loading: false,
          error: null,
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
  }, []);

  return state;
}
