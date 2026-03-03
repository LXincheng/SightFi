import { Injectable } from '@nestjs/common';
import type { MarketQuote, NewsFact } from '@sightfi/shared';

@Injectable()
export class MockDataService {
  getMarketQuotes(): MarketQuote[] {
    const now = new Date().toISOString();
    return [
      {
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF',
        price: 590.23,
        changePercent: 0.82,
        updatedAt: now,
      },
      {
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        price: 517.44,
        changePercent: 1.17,
        updatedAt: now,
      },
      {
        symbol: 'HSTECH',
        name: 'Hang Seng TECH',
        price: 4201.37,
        changePercent: -0.61,
        updatedAt: now,
      },
      {
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        price: 301.56,
        changePercent: 0.32,
        updatedAt: now,
      },
    ];
  }

  getNewsFacts(): NewsFact[] {
    return [
      {
        id: 'nf-001',
        source: 'Reuters',
        headline: 'US Manufacturing PMI Released',
        factSummary: '美国 2 月制造业 PMI 公布为 51.2，高于前值 50.3。',
        symbols: ['SPY', 'QQQ'],
        sentiment: 'neutral',
        publishedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
      {
        id: 'nf-002',
        source: 'Financial Times',
        headline: 'Major ETF Net Inflows Continue',
        factSummary:
          '多只宽基 ETF 连续第三个交易日出现净流入，规模合计超过 30 亿美元。',
        symbols: ['SPY', 'VTI'],
        sentiment: 'bullish',
        publishedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
      {
        id: 'nf-004',
        source: 'Bloomberg',
        headline: 'Major ETF Net Inflows Continue',
        factSummary:
          '美国市场多只宽基 ETF 连续第三日净流入，跟踪资金显示当日新增约 31 亿美元。',
        symbols: ['SPY', 'VTI'],
        sentiment: 'bullish',
        publishedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
      {
        id: 'nf-003',
        source: 'Nikkei Asia',
        headline: 'Asia Tech Index Pullback',
        factSummary: '亚洲科技指数盘中回调，主要受短线获利了结影响。',
        symbols: ['HSTECH'],
        sentiment: 'bearish',
        publishedAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
      },
    ];
  }
}
