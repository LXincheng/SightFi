import { Injectable, Logger } from '@nestjs/common';
import type { MarketQuote } from '@sightfi/shared';
import { APP_CONSTANTS } from '../../core/config/app.constants';
import { ENV_KEYS } from '../../core/config/env.keys';
import { MockDataService } from '../mock/mock-data.service';
import { MARKET_CONSTANTS } from './market.constants';

type MarketProvider = 'mock' | 'yahoo';

interface YahooQuote {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(private readonly mockDataService: MockDataService) {}

  async getQuotes(symbols?: string[]): Promise<MarketQuote[]> {
    const provider = this.getProvider();
    if (provider === 'yahoo') {
      try {
        const quotes = await this.getYahooQuotes(symbols);
        if (quotes.length > 0) {
          return quotes;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Yahoo quotes failed, fallback to mock: ${message}`);
      }
    }

    return this.mockDataService.getMarketQuotes().map((quote) => ({
      ...quote,
      source: 'mock',
    }));
  }

  private getProvider(): MarketProvider {
    const rawProvider = (
      process.env[ENV_KEYS.marketDataProvider] ??
      APP_CONSTANTS.defaultMarketProvider
    ).toLowerCase();
    return rawProvider === 'yahoo' ? 'yahoo' : 'mock';
  }

  private async getYahooQuotes(symbols?: string[]): Promise<MarketQuote[]> {
    const inputSymbols =
      symbols && symbols.length > 0
        ? symbols
        : APP_CONSTANTS.defaultWatchSymbols;
    const normalizedSymbols = inputSymbols
      .map((symbol) => symbol.trim())
      .filter((symbol) => symbol.length > 0)
      .slice(0, MARKET_CONSTANTS.maxSymbolCount);

    const yahooFinanceModule = await import('yahoo-finance2');
    const yahooFinance = yahooFinanceModule.default;

    const quoteTasks = normalizedSymbols.map((symbol) =>
      yahooFinance
        .quote(symbol)
        .then((data) => this.normalizeYahooQuote(symbol, data as YahooQuote))
        .catch(() => null),
    );

    const resolved = await Promise.all(quoteTasks);
    return resolved.filter((quote): quote is MarketQuote => quote !== null);
  }

  private normalizeYahooQuote(
    fallbackSymbol: string,
    quote: YahooQuote,
  ): MarketQuote | null {
    const symbol = quote.symbol ?? fallbackSymbol;
    const price = quote.regularMarketPrice;
    if (!symbol || typeof price !== 'number') {
      return null;
    }

    const updatedAt = quote.regularMarketTime
      ? new Date(quote.regularMarketTime * 1000).toISOString()
      : new Date().toISOString();

    return {
      symbol,
      name: quote.longName ?? quote.shortName ?? symbol,
      price,
      changePercent: quote.regularMarketChangePercent ?? 0,
      updatedAt,
      source: 'yahoo-finance2',
    };
  }
}
