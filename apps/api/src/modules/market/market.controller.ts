import { Controller, Get, MessageEvent, Query, Sse } from '@nestjs/common';
import type { MarketQuote } from '@sightfi/shared';
import { Observable, from, interval } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { APP_CONSTANTS } from '../../core/config/app.constants';
import { MARKET_CONSTANTS } from './market.constants';
import { MarketDataService } from './market-data.service';

@Controller('api/v1/market')
export class MarketController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('quotes')
  async getQuotes(@Query('symbols') symbols?: string): Promise<MarketQuote[]> {
    const parsedSymbols = this.parseSymbols(symbols);
    return this.marketDataService.getQuotes(parsedSymbols);
  }

  @Sse('stream')
  streamQuotes(@Query('symbols') symbols?: string): Observable<MessageEvent> {
    const parsedSymbols = this.parseSymbols(symbols);

    return interval(APP_CONSTANTS.ssePushIntervalMs).pipe(
      startWith(0),
      switchMap(() =>
        from(this.marketDataService.getQuotes(parsedSymbols)).pipe(
          map((quotes) => ({
            type: 'quotes',
            data: quotes,
          })),
          catchError((error: unknown) => {
            const message =
              error instanceof Error ? error.message : 'stream failed';
            return from([
              {
                type: 'error',
                data: { message },
              } as MessageEvent,
            ]);
          }),
        ),
      ),
    );
  }

  private parseSymbols(symbols?: string): string[] | undefined {
    if (!symbols) {
      return undefined;
    }
    return symbols
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, MARKET_CONSTANTS.maxSymbolCount);
  }
}
