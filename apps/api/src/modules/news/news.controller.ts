import { Controller, Get, Query } from '@nestjs/common';
import type { NewsFact } from '@sightfi/shared';
import { NewsDataService } from './news-data.service';
import { NEWS_CONSTANTS } from './news.constants';

@Controller('api/v1/news')
export class NewsController {
  constructor(private readonly newsDataService: NewsDataService) {}

  @Get('facts')
  async getFacts(
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ): Promise<NewsFact[]> {
    const parsedLimit = Number(limit);
    const finalLimit =
      Number.isFinite(parsedLimit) &&
      parsedLimit >= NEWS_CONSTANTS.minLimit &&
      parsedLimit <= NEWS_CONSTANTS.maxLimit
        ? parsedLimit
        : NEWS_CONSTANTS.defaultLimit;
    return this.newsDataService.getFacts(
      query ?? NEWS_CONSTANTS.defaultQuery,
      finalLimit,
    );
  }
}
