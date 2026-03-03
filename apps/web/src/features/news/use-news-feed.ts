import { useEffect, useState } from 'react';
import type { NewsFact } from '@sightfi/shared';
import { t } from '../../shared/i18n/messages';
import { getFacts } from '../../shared/services/sightfi-api';
import { NEWS_DEFAULTS } from './news.constants';

interface UseNewsFeedState {
  facts: NewsFact[];
  loading: boolean;
  error: string | null;
  query: string;
  limit: number;
  setQuery: (value: string) => void;
  setLimit: (value: number) => void;
  reload: () => Promise<void>;
}

export function useNewsFeed(initialFacts: NewsFact[]): UseNewsFeedState {
  const [facts, setFacts] = useState<NewsFact[]>(initialFacts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>(NEWS_DEFAULTS.query);
  const [limit, setLimitState] = useState<number>(NEWS_DEFAULTS.limit);

  useEffect(() => {
    setFacts(initialFacts);
  }, [initialFacts]);

  function setLimit(value: number) {
    if (!Number.isFinite(value)) {
      setLimitState(NEWS_DEFAULTS.limit);
      return;
    }
    const clamped = Math.max(
      NEWS_DEFAULTS.minLimit,
      Math.min(NEWS_DEFAULTS.maxLimit, value),
    );
    setLimitState(clamped);
  }

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const nextFacts = await getFacts(query, limit);
      setFacts(nextFacts);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('error.news'));
    } finally {
      setLoading(false);
    }
  }

  return {
    facts,
    loading,
    error,
    query,
    limit,
    setQuery,
    setLimit,
    reload,
  };
}
