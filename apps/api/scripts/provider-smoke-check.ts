import { NewsDataService } from '../src/modules/news/news-data.service';
import { MockDataService } from '../src/modules/mock/mock-data.service';
import { HttpJsonService } from '../src/core/integrations/http-json.service';
import { FactExtractionService } from '../src/modules/news/fact-extraction.service';
import { AiProviderService } from '../src/modules/ai/ai-provider.service';
import { AiService } from '../src/modules/ai/ai.service';

async function main(): Promise<void> {
  const news = new NewsDataService(
    new MockDataService(),
    new HttpJsonService(),
    new FactExtractionService(),
  );
  const facts = await news.getFacts('global markets', 5);

  const ai = new AiService(new AiProviderService());
  const summary = await ai.buildPortfolioSummaryAsync({
    riskProfile: 'balanced',
    positions: [
      { symbol: 'SPY', quantity: 10, avgCost: 520, market: 'US' },
      { symbol: 'QQQ', quantity: 8, avgCost: 440, market: 'US' },
      { symbol: '0700.HK', quantity: 20, avgCost: 310, market: 'HK' },
    ],
    notes: 'Focus on objective risk control and avoid overreaction.',
  });

  const firstSource = facts[0]?.source ?? 'NONE';
  const firstId = facts[0]?.sourceId ?? 'NONE';

  console.log(`NEWS_COUNT=${facts.length}`);
  console.log(`NEWS_FIRST_SOURCE=${firstSource}`);
  console.log(`NEWS_FIRST_SOURCE_ID=${firstId}`);
  console.log(`AI_CONFIDENCE=${summary.confidence}`);
  console.log(`AI_ACTIONS=${summary.actions.length}`);
  console.log(`AI_CONCLUSION=${summary.conclusion.slice(0, 90)}`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`SMOKE_ERROR=${message}`);
  process.exit(1);
});
