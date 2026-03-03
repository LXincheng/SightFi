export const APP_CONSTANTS = {
  defaultPort: 3000,
  defaultMarketProvider: 'yahoo',
  defaultNewsProvider: 'auto',
  defaultWatchSymbols: ['SPY', 'QQQ', '0700.HK', 'GLD'],
  httpTimeoutMs: 6000,
  ssePushIntervalMs: 8000,
  allowMockFallback: false,
} as const;
