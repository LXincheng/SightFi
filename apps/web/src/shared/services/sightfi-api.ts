import type {
  HealthStatus,
  MarketQuote,
  NewsFact,
  PortfolioSummaryRequest,
  PortfolioSummaryResponse,
  ProviderFlags,
} from '@sightfi/shared';
import { API_PATHS } from '../constants/api.constants';
import { t } from '../i18n/messages';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${baseUrl}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      t('error.apiRequest', {
        status: response.status,
        detail: detail || path,
      }),
    );
  }

  return (await response.json()) as T;
}

export function getHealth(): Promise<HealthStatus> {
  return requestJson<HealthStatus>(API_PATHS.health);
}

export function getHealthWithSignal(signal?: AbortSignal): Promise<HealthStatus> {
  return requestJson<HealthStatus>(API_PATHS.health, { signal });
}

export function getQuotes(signal?: AbortSignal): Promise<MarketQuote[]> {
  return requestJson<MarketQuote[]>(API_PATHS.marketQuotes, { signal });
}

export function getFacts(
  query?: string,
  limit?: number,
  lang?: 'en' | 'zh',
  signal?: AbortSignal,
): Promise<NewsFact[]> {
  return requestJson<NewsFact[]>(
    `${API_PATHS.newsFacts}${buildQuery({ q: query, limit, lang })}`,
    { signal },
  );
}

export function getProviderFlags(signal?: AbortSignal): Promise<ProviderFlags> {
  return requestJson<ProviderFlags>(API_PATHS.systemProviders, { signal });
}

export function postPortfolioSummary(payload: PortfolioSummaryRequest): Promise<PortfolioSummaryResponse> {
  return requestJson<PortfolioSummaryResponse>(API_PATHS.aiPortfolioSummary, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && `${value}`.trim().length > 0) {
      searchParams.set(key, String(value));
    }
  });
  const text = searchParams.toString();
  return text ? `?${text}` : '';
}

export function createQuoteStream(
  symbols: string[],
  onQuotes: (quotes: MarketQuote[]) => void,
  onError?: (message: string) => void,
): EventSource {
  const streamUrl = buildUrl(API_PATHS.marketStream, {
    symbols: symbols.join(','),
  });
  const eventSource = new EventSource(streamUrl);
  eventSource.addEventListener('quotes', (event) => {
    try {
      const payload = JSON.parse(event.data) as MarketQuote[];
      onQuotes(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('error.sseParse');
      onError?.(message);
    }
  });
  eventSource.addEventListener('error', () => {
    onError?.(t('error.stream'));
  });
  return eventSource;
}
