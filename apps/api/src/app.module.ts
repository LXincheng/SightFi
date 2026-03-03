import { Module } from '@nestjs/common';
import { PrismaService } from './core/database/prisma.service';
import { EnvService } from './core/env/env.service';
import { HttpJsonService } from './core/integrations/http-json.service';
import { SupabaseService } from './core/integrations/supabase/supabase.service';
import { AiController } from './modules/ai/ai.controller';
import { AiProviderService } from './modules/ai/ai-provider.service';
import { AiService } from './modules/ai/ai.service';
import { HealthController } from './modules/health/health.controller';
import { MarketController } from './modules/market/market.controller';
import { MarketDataService } from './modules/market/market-data.service';
import { MockDataService } from './modules/mock/mock-data.service';
import { FactExtractionService } from './modules/news/fact-extraction.service';
import { NewsController } from './modules/news/news.controller';
import { NewsDataService } from './modules/news/news-data.service';
import { NewsTranslateService } from './modules/news/news-translate.service';
import { SystemController } from './modules/system/system.controller';

@Module({
  imports: [],
  controllers: [
    HealthController,
    MarketController,
    NewsController,
    SystemController,
    AiController,
  ],
  providers: [
    MockDataService,
    EnvService,
    AiService,
    AiProviderService,
    PrismaService,
    SupabaseService,
    MarketDataService,
    NewsDataService,
    NewsTranslateService,
    HttpJsonService,
    FactExtractionService,
  ],
})
export class AppModule {}
