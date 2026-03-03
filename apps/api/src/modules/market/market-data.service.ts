import { Injectable, Logger } from '@nestjs/common';
import type { MarketQuote } from '@sightfi/shared';
import { APP_CONSTANTS } from '../../core/config/app.constants';
import { ENV_KEYS } from '../../core/config/env.keys';
import { HttpJsonService } from '../../core/integrations/http-json.service';
import { MockDataService } from '../mock/mock-data.service';
import { MARKET_CONSTANTS } from './market.constants';

type MarketProvider = 'mock' | 'yahoo' | 'eastmoney' | 'hybrid';

interface YahooQuote {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
}

interface EastmoneyQuoteData {
  f58?: string; // name
  f43?: number; // price * 100
  f170?: number; // change percent * 100
  f60?: number; // pre-close * 100
  f86?: number; // unix timestamp
}

interface EastmoneyQuoteResponse {
  data?: EastmoneyQuoteData;
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    private readonly mockDataService: MockDataService,
    private readonly httpJsonService: HttpJsonService,
  ) {}

  async getQuotes(symbols?: string[]): Promise<MarketQuote[]> {
    const provider = this.getProvider();
    const targetSymbols = this.getTargetSymbols(symbols);

    if (provider === 'mock') {
      return this.toMockQuotes();
    }

    const quoteMap = new Map<string, MarketQuote>();

    if (provider === 'yahoo' || provider === 'hybrid') {
      try {
        const yahooQuotes = await this.getYahooQuotes(targetSymbols);
        yahooQuotes.forEach((quote) => quoteMap.set(quote.symbol, quote));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Yahoo quotes failed: ${message}`);
      }
    }

    if (provider === 'eastmoney' || provider === 'hybrid') {
      try {
        const eastmoneyQuotes = await this.getEastmoneyQuotes(targetSymbols);
        eastmoneyQuotes.forEach((quote) => quoteMap.set(quote.symbol, quote));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Eastmoney quotes failed: ${message}`);
      }
    }

    const resolved = targetSymbols
      .map((symbol) => quoteMap.get(symbol))
      .filter((item): item is MarketQuote => item !== undefined);
    if (resolved.length > 0) return resolved;

    return this.toMockQuotes();
  }

  private getProvider(): MarketProvider {
    const rawProvider = (
      process.env[ENV_KEYS.marketDataProvider] ??
      APP_CONSTANTS.defaultMarketProvider
    ).toLowerCase();
    if (rawProvider === 'yahoo') return 'yahoo';
    if (rawProvider === 'eastmoney') return 'eastmoney';
    if (rawProvider === 'hybrid') return 'hybrid';
    return 'mock';
  }

  private getTargetSymbols(symbols?: string[]): string[] {
    const inputSymbols =
      symbols && symbols.length > 0
        ? symbols
        : APP_CONSTANTS.defaultWatchSymbols;
    return inputSymbols
      .map((symbol) => symbol.trim().toUpperCase())
      .filter((symbol) => symbol.length > 0)
      .slice(0, MARKET_CONSTANTS.maxSymbolCount);
  }

  private toMockQuotes(): MarketQuote[] {
    return this.mockDataService.getMarketQuotes().map((quote) => ({
      ...quote,
      source: 'mock',
    }));
  }

  private async getYahooQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const yahooFinanceModule = await import('yahoo-finance2');
    const yahooFinance = yahooFinanceModule.default;

    const quoteTasks = symbols.map((symbol) =>
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
    const symbol = (quote.symbol ?? fallbackSymbol).toUpperCase();
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

  private async getEastmoneyQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const cnSymbols = symbols.filter((symbol) => this.isCnMarketSymbol(symbol));
    if (cnSymbols.length === 0) return [];

    const tasks = cnSymbols.map(async (symbol) => {
      const secId = this.toEastmoneySecId(symbol);
      if (!secId) return null;
      const endpoint =
        `https://push2.eastmoney.com/api/qt/stock/get?` +
        `secid=${encodeURIComponent(secId)}&fields=f58,f43,f170,f60,f86`;
      const response =
        await this.httpJsonService.getJson<EastmoneyQuoteResponse>(endpoint);
      return this.normalizeEastmoneyQuote(symbol, response.data);
    });

    const resolved = await Promise.all(tasks);
    return resolved.filter((quote): quote is MarketQuote => quote !== null);
  }

  private normalizeEastmoneyQuote(
    symbol: string,
    payload?: EastmoneyQuoteData,
  ): MarketQuote | null {
    if (!payload) return null;
    const latestRaw = this.toNumber(payload.f43);
    if (latestRaw === null) return null;

    const latest = latestRaw / 100;
    const pctRaw = this.toNumber(payload.f170);
    const preCloseRaw = this.toNumber(payload.f60);
    const pct =
      pctRaw !== null
        ? pctRaw / 100
        : preCloseRaw && preCloseRaw > 0
          ? ((latestRaw - preCloseRaw) / preCloseRaw) * 100
          : 0;

    const ts = this.toNumber(payload.f86);
    const updatedAt =
      ts !== null && ts > 0
        ? new Date(ts * 1000).toISOString()
        : new Date().toISOString();

    return {
      symbol: this.normalizeCnSymbol(symbol),
      name: payload.f58?.trim() || symbol,
      price: Number(latest.toFixed(3)),
      changePercent: Number(pct.toFixed(2)),
      updatedAt,
      source: 'eastmoney',
    };
  }

  private isCnMarketSymbol(symbol: string): boolean {
    return /^\d{6}(\.(SH|SZ))?$/i.test(symbol);
  }

  private normalizeCnSymbol(symbol: string): string {
    const upper = symbol.toUpperCase();
    if (upper.endsWith('.SH') || upper.endsWith('.SZ')) return upper;
    const code = upper.slice(0, 6);
    const exchange = code.startsWith('5') || code.startsWith('6') ? 'SH' : 'SZ';
    return `${code}.${exchange}`;
  }

  private toEastmoneySecId(symbol: string): string | null {
    const normalized = this.normalizeCnSymbol(symbol);
    const matched = normalized.match(/^(\d{6})\.(SH|SZ)$/);
    if (!matched) return null;
    const code = matched[1];
    const exchange = matched[2];
    return `${exchange === 'SH' ? '1' : '0'}.${code}`;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
