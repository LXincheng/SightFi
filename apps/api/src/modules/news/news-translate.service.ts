import { Injectable } from '@nestjs/common';
import type { NewsFact } from '@sightfi/shared';
import { APP_CONSTANTS } from '../../core/config/app.constants';

type NewsLanguage = 'en' | 'zh';

interface TranslateCacheItem {
  text: string;
  expiresAt: number;
}

@Injectable()
export class NewsTranslateService {
  private readonly cache = new Map<string, TranslateCacheItem>();
  private readonly cacheTtlMs = 30 * 60 * 1000;

  async translateFacts(
    facts: NewsFact[],
    lang: NewsLanguage,
  ): Promise<NewsFact[]> {
    if (lang === 'en') return facts;

    const translated = await Promise.all(
      facts.map(async (fact) => {
        const [headline, summary] = await Promise.all([
          this.translateText(fact.headline, lang),
          this.translateText(fact.factSummary, lang),
        ]);

        return {
          ...fact,
          headline,
          factSummary: summary,
        };
      }),
    );

    return translated;
  }

  private async translateText(
    text: string,
    lang: NewsLanguage,
  ): Promise<string> {
    const normalized = text.trim();
    if (!normalized) return text;

    const cacheKey = `${lang}:${normalized}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.text;
    }

    const endpoint =
      `https://translate.googleapis.com/translate_a/single?` +
      `client=gtx&sl=auto&tl=${encodeURIComponent(
        lang === 'zh' ? 'zh-CN' : 'en',
      )}&dt=t&q=${encodeURIComponent(normalized)}`;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      APP_CONSTANTS.httpTimeoutMs,
    );

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      if (!response.ok) {
        return text;
      }

      const payload = (await response.json()) as unknown;
      const translated = this.extractTranslatedText(payload);
      if (!translated) return text;

      this.cache.set(cacheKey, {
        text: translated,
        expiresAt: now + this.cacheTtlMs,
      });
      return translated;
    } catch {
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractTranslatedText(payload: unknown): string | null {
    if (!Array.isArray(payload)) return null;
    const root = payload as unknown[];
    const first = root[0];
    if (!Array.isArray(first)) return null;
    const segments = first as unknown[];

    const parts: string[] = [];
    for (const chunk of segments) {
      if (!Array.isArray(chunk)) continue;
      const piece = chunk as unknown[];
      const text = piece[0];
      if (typeof text === 'string' && text.length > 0) {
        parts.push(text);
      }
    }

    const merged = parts.join('').trim();
    return merged.length > 0 ? merged : null;
  }
}
