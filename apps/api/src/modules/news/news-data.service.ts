import { Injectable, Logger } from '@nestjs/common';
import type { NewsFact, Sentiment } from '@sightfi/shared';
import { APP_CONSTANTS } from '../../core/config/app.constants';
import { ENV_KEYS } from '../../core/config/env.keys';
import { HttpJsonService } from '../../core/integrations/http-json.service';
import { MockDataService } from '../mock/mock-data.service';
import { FactExtractionService } from './fact-extraction.service';
import { NEWS_CONSTANTS } from './news.constants';
import { NewsTranslateService } from './news-translate.service';

type NewsProvider =
  | 'mock'
  | 'fmp'
  | 'newsapi'
  | 'gnews'
  | 'google'
  | 'rss'
  | 'auto';
type NewsLanguage = 'en' | 'zh';

interface GNewsArticle {
  title?: string;
  description?: string;
  publishedAt?: string;
  url?: string;
  source?: { name?: string };
}

interface GNewsResponse {
  articles?: GNewsArticle[];
}

interface FmpArticle {
  title?: string;
  text?: string;
  symbol?: string;
  publishedDate?: string;
  site?: string;
  url?: string;
}

interface NewsApiArticle {
  title?: string;
  description?: string;
  publishedAt?: string;
  url?: string;
  source?: { name?: string };
}

interface NewsApiResponse {
  articles?: NewsApiArticle[];
}

@Injectable()
export class NewsDataService {
  private readonly logger = new Logger(NewsDataService.name);

  constructor(
    private readonly mockDataService: MockDataService,
    private readonly httpJsonService: HttpJsonService,
    private readonly factExtractionService: FactExtractionService,
    private readonly newsTranslateService: NewsTranslateService,
  ) {}

  async getFacts(
    query: string = NEWS_CONSTANTS.defaultQuery,
    limit: number = NEWS_CONSTANTS.defaultLimit,
    lang: NewsLanguage = 'en',
  ): Promise<NewsFact[]> {
    const provider = this.getProvider();
    const allowMockFallback = this.getAllowMockFallback();

    if (provider === 'mock') {
      this.logger.warn(
        'NEWS_DATA_PROVIDER=mock is enabled, using local mock facts.',
      );
      const facts = this.factExtractionService.extractAndDedupeFacts(
        this.mockDataService.getNewsFacts().map((fact) => ({
          ...fact,
          sourceId: `mock:${fact.id}`,
        })),
      );
      return this.newsTranslateService.translateFacts(facts, lang);
    }

    try {
      const facts = await this.fetchProviderFacts(provider, query, limit);
      const normalized =
        this.factExtractionService.extractAndDedupeFacts(facts);
      return this.newsTranslateService.translateFacts(normalized, lang);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!allowMockFallback) {
        throw new Error(
          `News provider unavailable and mock fallback disabled: ${message}`,
        );
      }
      this.logger.warn(`News provider failed, fallback to mock: ${message}`);
      const fallbackFacts = this.factExtractionService.extractAndDedupeFacts(
        this.mockDataService.getNewsFacts().map((fact) => ({
          ...fact,
          sourceId: `mock:${fact.id}`,
        })),
      );
      return this.newsTranslateService.translateFacts(fallbackFacts, lang);
    }
  }

  private getProvider(): NewsProvider {
    const rawProvider = (
      process.env[ENV_KEYS.newsDataProvider] ??
      APP_CONSTANTS.defaultNewsProvider
    ).toLowerCase();

    if (
      rawProvider === 'fmp' ||
      rawProvider === 'newsapi' ||
      rawProvider === 'gnews' ||
      rawProvider === 'google' ||
      rawProvider === 'rss' ||
      rawProvider === 'auto'
    ) {
      return rawProvider;
    }

    return 'mock';
  }

  private getAllowMockFallback(): boolean {
    const raw = process.env[ENV_KEYS.allowMockFallback];
    if (typeof raw !== 'string') return APP_CONSTANTS.allowMockFallback;
    const value = raw.trim().toLowerCase();
    return value === '1' || value === 'true' || value === 'yes';
  }

  private async fetchProviderFacts(
    provider: NewsProvider,
    query: string,
    limit: number,
  ): Promise<NewsFact[]> {
    if (provider === 'fmp') {
      return this.getFmpFacts(limit);
    }
    if (provider === 'newsapi') {
      return this.getNewsApiFacts(query, limit);
    }
    if (provider === 'gnews') {
      return this.getGNewsFacts(query, limit);
    }
    if (provider === 'google') {
      return this.getGoogleNewsRssFacts(query, limit);
    }
    if (provider === 'rss') {
      return this.getRssBlendFacts(query, limit);
    }
    if (provider === 'auto') {
      return this.getAutoFacts(query, limit);
    }
    return this.mockDataService.getNewsFacts().map((fact) => ({
      ...fact,
      sourceId: `mock:${fact.id}`,
    }));
  }

  private async getAutoFacts(
    query: string,
    limit: number,
  ): Promise<NewsFact[]> {
    if (this.hasValue(ENV_KEYS.gnewsApiKey)) {
      return this.getGNewsFacts(query, limit);
    }
    if (this.hasValue(ENV_KEYS.newsApiKey)) {
      return this.getNewsApiFacts(query, limit);
    }
    if (this.hasValue(ENV_KEYS.fmpApiKey)) {
      return this.getFmpFacts(limit);
    }

    try {
      const facts = await this.getRssBlendFacts(query, limit);
      if (facts.length > 0) return facts;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`RSS blend failed: ${message}`);
    }

    return this.getYahooRssFacts(limit);
  }

  private async getRssBlendFacts(
    query: string,
    limit: number,
  ): Promise<NewsFact[]> {
    const [googleResult, yahooResult] = await Promise.allSettled([
      this.getGoogleNewsRssFacts(query, limit),
      this.getYahooRssFacts(limit),
    ]);

    const merged: NewsFact[] = [];
    if (googleResult.status === 'fulfilled') {
      merged.push(...googleResult.value);
    }
    if (yahooResult.status === 'fulfilled') {
      merged.push(...yahooResult.value);
    }

    return merged.slice(0, limit);
  }

  private async getGoogleNewsRssFacts(
    query: string,
    limit: number,
  ): Promise<NewsFact[]> {
    const queries = this.buildAutoQueries(query);
    const taskList = queries.map((item) => this.fetchGoogleRssByQuery(item));
    const resolved = await Promise.allSettled(taskList);

    const rawItems = resolved
      .filter(
        (
          item,
        ): item is PromiseFulfilledResult<
          Array<{
            title: string;
            description: string;
            link: string;
            source: string;
            publishedAt: string;
          }>
        > => item.status === 'fulfilled',
      )
      .flatMap((item) => item.value);

    const dedupe = new Map<string, NewsFact>();
    rawItems.forEach((item, index) => {
      const headline = item.title || `Google News ${index + 1}`;
      const summary = this.toFactSummary(item.description, headline);
      const normalized = this.normalizeGenericNews({
        prefix: 'google-rss',
        index,
        source: item.source || 'Google News',
        headline,
        content: summary,
        publishedAt: item.publishedAt,
        url: item.link,
      });
      dedupe.set(`${normalized.source}-${normalized.headline}`, normalized);
    });

    return Array.from(dedupe.values()).slice(0, limit);
  }

  private buildAutoQueries(query: string): string[] {
    const normalized =
      query.trim().length > 0 ? query.trim() : NEWS_CONSTANTS.defaultQuery;
    const set = new Set<string>([normalized, ...NEWS_CONSTANTS.autoQueryPacks]);
    return Array.from(set).slice(0, 4);
  }

  private async fetchGoogleRssByQuery(query: string): Promise<
    Array<{
      title: string;
      description: string;
      link: string;
      source: string;
      publishedAt: string;
    }>
  > {
    const endpoint =
      `${NEWS_CONSTANTS.googleRssEndpoint}?` +
      `q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(endpoint, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Google RSS failed: ${response.status}`);
    }
    const xml = await response.text();
    const items = this.parseRssItems(xml);

    return items.map((item) => ({
      title: this.extractTitleAndSource(item.title).title,
      description: item.description,
      link: item.link,
      source: item.source || this.extractTitleAndSource(item.title).source,
      publishedAt: item.publishedAt,
    }));
  }

  private async getYahooRssFacts(limit: number): Promise<NewsFact[]> {
    const symbols = APP_CONSTANTS.defaultWatchSymbols
      .slice(0, 8)
      .map((symbol) => symbol.replace(/[^A-Za-z0-9.]/g, ''))
      .filter((symbol) => symbol.length > 0)
      .join(',');
    const endpoint = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
      symbols,
    )}&region=US&lang=en-US`;

    const response = await fetch(endpoint, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Yahoo RSS failed: ${response.status}`);
    }
    const xml = await response.text();
    const items = this.parseRssItems(xml).slice(0, limit);

    if (items.length === 0) {
      throw new Error('Yahoo RSS returned empty items');
    }

    return items.map((item, index) => {
      const headline = item.title || `Yahoo RSS ${index + 1}`;
      const summary = this.toFactSummary(item.description, headline);
      return {
        id: `yahoo-rss-${index}-${this.toHash(headline)}`,
        source: item.source || 'Yahoo Finance RSS',
        sourceId: item.link || undefined,
        headline,
        factSummary: summary,
        symbols: this.extractSymbols(`${headline} ${summary}`),
        sentiment: this.detectSentiment(headline, summary),
        publishedAt: item.publishedAt
          ? new Date(item.publishedAt).toISOString()
          : new Date().toISOString(),
      };
    });
  }

  private parseRssItems(xml: string): Array<{
    title: string;
    description: string;
    link: string;
    source: string;
    publishedAt: string;
  }> {
    return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
      .map((match) => match[1])
      .filter((item): item is string => typeof item === 'string')
      .map((item) => ({
        title: this.decodeXmlText(this.extractTag(item, 'title')),
        description: this.stripHtml(
          this.decodeXmlText(this.extractTag(item, 'description')),
        ),
        link: this.extractTag(item, 'link'),
        source: this.decodeXmlText(this.extractTag(item, 'source')),
        publishedAt: this.extractTag(item, 'pubDate'),
      }));
  }

  private extractTitleAndSource(value: string): {
    title: string;
    source: string;
  } {
    const normalized = value.trim();
    if (normalized.length === 0) {
      return { title: '', source: '' };
    }
    const splitIndex = normalized.lastIndexOf(' - ');
    if (splitIndex <= 0) {
      return { title: normalized, source: '' };
    }
    return {
      title: normalized.slice(0, splitIndex).trim(),
      source: normalized.slice(splitIndex + 3).trim(),
    };
  }

  private async getFmpFacts(
    limit: number,
    apiKeyOverride?: string,
  ): Promise<NewsFact[]> {
    const apiKey = apiKeyOverride ?? this.requireEnv(ENV_KEYS.fmpApiKey);
    const endpoint = `https://financialmodelingprep.com/stable/news/latest?limit=${limit}&apikey=${encodeURIComponent(apiKey)}`;
    const data = await this.httpJsonService.getJson<FmpArticle[]>(endpoint);
    return data.slice(0, limit).map((article, index) => {
      const headline = article.title ?? `FMP News ${index + 1}`;
      const summary = this.toFactSummary(article.text, headline);
      const symbols = article.symbol
        ? [article.symbol]
        : this.extractSymbols(headline);
      return {
        id: `fmp-${index}-${this.toHash(headline)}`,
        source: article.site ?? 'Financial Modeling Prep',
        sourceId: article.url ?? undefined,
        headline,
        factSummary: summary,
        symbols,
        sentiment: this.detectSentiment(headline, summary),
        publishedAt: article.publishedDate
          ? new Date(article.publishedDate).toISOString()
          : new Date().toISOString(),
      };
    });
  }

  private async getNewsApiFacts(
    query: string,
    limit: number,
  ): Promise<NewsFact[]> {
    const apiKey = this.requireEnv(ENV_KEYS.newsApiKey);
    const endpoint =
      `https://newsapi.org/v2/everything?` +
      `q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${limit}&language=en`;
    const data = await this.httpJsonService.getJson<NewsApiResponse>(endpoint, {
      'X-Api-Key': apiKey,
    });
    const articles = data.articles ?? [];
    return articles.slice(0, limit).map((article, index) =>
      this.normalizeGenericNews({
        prefix: 'newsapi',
        index,
        source: article.source?.name ?? 'NewsAPI',
        headline: article.title ?? `NewsAPI ${index + 1}`,
        content: article.description ?? '',
        publishedAt: article.publishedAt,
        url: article.url,
      }),
    );
  }

  private async getGNewsFacts(
    query: string,
    limit: number,
  ): Promise<NewsFact[]> {
    const apiKey = this.requireEnv(ENV_KEYS.gnewsApiKey);
    const endpoint =
      `https://gnews.io/api/v4/search?` +
      `q=${encodeURIComponent(query)}&lang=en&max=${limit}&apikey=${encodeURIComponent(apiKey)}`;
    const data = await this.httpJsonService.getJson<GNewsResponse>(endpoint);
    const articles = data.articles ?? [];
    return articles.slice(0, limit).map((article, index) =>
      this.normalizeGenericNews({
        prefix: 'gnews',
        index,
        source: article.source?.name ?? 'GNews',
        headline: article.title ?? `GNews ${index + 1}`,
        content: article.description ?? '',
        publishedAt: article.publishedAt,
        url: article.url,
      }),
    );
  }

  private normalizeGenericNews(input: {
    prefix: string;
    index: number;
    source: string;
    headline: string;
    content: string;
    publishedAt?: string;
    url?: string;
  }): NewsFact {
    const summary = this.toFactSummary(input.content, input.headline);
    return {
      id: `${input.prefix}-${input.index}-${this.toHash(input.headline)}`,
      source: input.source,
      sourceId: input.url,
      headline: input.headline,
      factSummary: summary,
      symbols: this.extractSymbols(`${input.headline} ${summary}`),
      sentiment: this.detectSentiment(input.headline, summary),
      publishedAt: input.publishedAt
        ? new Date(input.publishedAt).toISOString()
        : new Date().toISOString(),
    };
  }

  private toFactSummary(content: string | undefined, fallback: string): string {
    const text = (content ?? '').trim();
    if (!text) {
      return fallback;
    }

    const stripped = text
      .replace(/\b(very|extremely|dramatically|massively|obviously)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    return stripped.length > NEWS_CONSTANTS.summaryMaxLength
      ? `${stripped.slice(0, NEWS_CONSTANTS.summaryMaxLength)}...`
      : stripped;
  }

  private extractTag(xmlItem: string, tag: string): string {
    const pattern =
      tag === 'source'
        ? new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
        : new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xmlItem.match(pattern);
    return match?.[1]?.trim() ?? '';
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private decodeXmlText(value: string): string {
    return value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  private extractSymbols(text: string): string[] {
    const symbols = new Set<string>();
    const candidates = APP_CONSTANTS.defaultWatchSymbols;
    const upperText = text.toUpperCase();
    for (const candidate of candidates) {
      if (upperText.includes(candidate.toUpperCase())) {
        symbols.add(candidate);
      }
    }
    return Array.from(symbols);
  }

  private detectSentiment(headline: string, summary: string): Sentiment {
    const text = `${headline} ${summary}`.toLowerCase();
    if (/(surge|rally|gain|beat|growth|inflow|upgrade)/.test(text)) {
      return 'bullish';
    }
    if (/(drop|fall|decline|miss|cut|selloff|outflow|downgrade)/.test(text)) {
      return 'bearish';
    }
    return 'neutral';
  }

  private toHash(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  private requireEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      throw new Error(`Missing required env: ${name}`);
    }
    return value;
  }

  private hasValue(name: string): boolean {
    const value = process.env[name];
    return !!value && value.trim().length > 0;
  }
}
