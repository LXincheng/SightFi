export const APP_CONSTANTS = {
  defaultPort: 3000,
  defaultMarketProvider: 'hybrid',
  defaultNewsProvider: 'auto',
  defaultWatchSymbols: ['SPY', 'QQQ', '0700.HK', 'GLD', '510300.SH'],
  httpTimeoutMs: 6000,
  ssePushIntervalMs: 8000,
  allowMockFallback: false,
} as const;
