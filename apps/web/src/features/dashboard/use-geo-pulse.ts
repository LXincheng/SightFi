import { useEffect, useState } from 'react';
import type { NewsFact } from '@sightfi/shared';
import type { Locale } from '../../shared/i18n/messages';
import { getFacts } from '../../shared/services/sightfi-api';

interface GeoPulseState {
  facts: NewsFact[];
  loading: boolean;
  error: string | null;
}

const GEO_QUERY =
  'geopolitics OR tariff OR sanction OR election OR central bank OR war OR conflict OR diplomacy OR oil OR strait OR europe OR asia OR middle east OR africa OR latin america OR oceania';
const GEO_LIMIT = 36;
const GEO_CACHE_KEY = 'sightfi.geo.pulse.cache';
const GEO_CACHE_TTL_MS = 60_000;

interface GeoCachePayload {
  locale: Locale;
  savedAt: number;
  facts: NewsFact[];
}

function readCache(locale: Locale): NewsFact[] | null {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoCachePayload;
    if (parsed.locale !== locale) return null;
    if (Date.now() - parsed.savedAt > GEO_CACHE_TTL_MS) return null;
    return parsed.facts;
  } catch {
    return null;
  }
}

function writeCache(locale: Locale, facts: NewsFact[]): void {
  try {
    const payload: GeoCachePayload = {
      locale,
      savedAt: Date.now(),
      facts,
    };
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

export function useGeoPulse(locale: Locale): GeoPulseState {
  const [state, setState] = useState<GeoPulseState>(() => {
    const cached = readCache(locale);
    return {
      facts: cached ?? [],
      loading: cached === null,
      error: null,
    };
  });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const cached = readCache(locale);
      if (cached) {
        setState({ facts: cached, loading: false, error: null });
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const facts = await getFacts(GEO_QUERY, GEO_LIMIT, locale, controller.signal);
        if (controller.signal.aborted) return;
        setState({ facts, loading: false, error: null });
        writeCache(locale, facts);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Geo pulse unavailable';
        setState((prev) => ({ ...prev, loading: false, error: message }));
      }
    }

    void load();
    return () => controller.abort();
  }, [locale]);

  return state;
}
