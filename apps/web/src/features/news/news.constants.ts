export const NEWS_DEFAULTS = {
  query: 'global markets',
  limit: 20,
  minLimit: 1,
  maxLimit: 50,
} as const;

export const NEWS_FACT_CATEGORIES = ['ALL', 'MACRO', 'EARNINGS', 'GEO', 'CRYPTO', 'GENERAL'] as const;
export type NewsFactCategory = (typeof NEWS_FACT_CATEGORIES)[number];

export const NEWS_CHAT_REPLY_DELAY_MS = 450;
