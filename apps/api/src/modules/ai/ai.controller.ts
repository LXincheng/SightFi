import { Body, Controller, Post } from '@nestjs/common';
import type {
  PortfolioSummaryRequest,
  PortfolioSummaryResponse,
} from '@sightfi/shared';
import { AiService } from './ai.service';

@Controller('api/v1/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('portfolio-summary')
  async summarizePortfolio(
    @Body() payload: PortfolioSummaryRequest,
  ): Promise<PortfolioSummaryResponse> {
    return this.aiService.buildPortfolioSummaryAsync(payload);
  }
}
