export const NEWS_CONSTANTS = {
  defaultQuery: 'global markets',
  defaultLimit: 20,
  minLimit: 1,
  maxLimit: 50,
  summaryMaxLength: 180,
  googleRssEndpoint: 'https://news.google.com/rss/search',
  autoQueryPacks: [
    'global markets',
    'geopolitics',
    'us stocks',
    'hong kong stocks',
    'china etf valuation',
    'jin10 macro',
  ],
} as const;
