import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import type { MarketQuote, NewsFact } from '@sightfi/shared';

function asArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected array response body');
  }
  return value as T[];
}

describe('SightFi API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('/api/v1/market/quotes (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/market/quotes')
      .expect(200);
  });

  it('/api/v1/market/quotes?symbols=SPY,QQQ (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/market/quotes?symbols=SPY,QQQ')
      .expect(200);

    const quotes = asArray<MarketQuote>(response.body);
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0]).toHaveProperty('symbol');
  });

  it('/api/v1/news/facts?q=geopolitics&limit=5 (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/news/facts?q=geopolitics&limit=5')
      .expect(200);

    const facts = asArray<NewsFact>(response.body);
    expect(facts.length).toBeGreaterThan(0);
    expect(facts[0]).toHaveProperty('eventId');
  });

  it('/api/v1/system/providers (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/system/providers')
      .expect(200);
  });

  it('/api/v1/ai/portfolio-summary (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/ai/portfolio-summary')
      .send({
        riskProfile: 'balanced',
        positions: [
          { symbol: 'SPY', quantity: 10, avgCost: 520, market: 'US' },
          { symbol: 'QQQ', quantity: 8, avgCost: 480, market: 'US' },
        ],
      })
      .expect(201);
  });
});
