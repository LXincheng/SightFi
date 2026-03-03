import { Injectable } from '@nestjs/common';
import type { NewsFact } from '@sightfi/shared';

const SUBJECTIVE_WORDS = [
  'very',
  'extremely',
  'dramatically',
  'massively',
  'obviously',
  'clearly',
  'huge',
  'terrible',
  'amazing',
];

@Injectable()
export class FactExtractionService {
  extractAndDedupeFacts(facts: NewsFact[]): NewsFact[] {
    const normalized = facts.map((fact) => this.normalizeFact(fact));
    const deduped = this.dedupeByEvent(normalized);
    return deduped.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }

  private normalizeFact(fact: NewsFact): NewsFact {
    const cleanedHeadline = this.cleanText(fact.headline);
    const cleanedSummary = this.cleanText(fact.factSummary);
    const uniqueSymbols = Array.from(
      new Set(fact.symbols.map((symbol) => symbol.toUpperCase())),
    ).sort();
    const eventId = this.buildEventId(cleanedHeadline, uniqueSymbols);

    return {
      ...fact,
      headline: cleanedHeadline,
      factSummary: cleanedSummary,
      symbols: uniqueSymbols,
      sourceId: fact.sourceId ?? `${fact.source}:${fact.id}`,
      eventId,
    };
  }

  private dedupeByEvent(facts: NewsFact[]): NewsFact[] {
    const eventMap = new Map<string, NewsFact>();
    for (const fact of facts) {
      const key = fact.eventId ?? fact.id;
      const existing = eventMap.get(key);
      if (!existing) {
        eventMap.set(key, fact);
        continue;
      }

      const existingTs = new Date(existing.publishedAt).getTime();
      const currentTs = new Date(fact.publishedAt).getTime();
      if (currentTs >= existingTs) {
        eventMap.set(key, this.mergeFacts(fact, existing));
      } else {
        eventMap.set(key, this.mergeFacts(existing, fact));
      }
    }

    return Array.from(eventMap.values());
  }

  private mergeFacts(primary: NewsFact, secondary: NewsFact): NewsFact {
    const sourceTag = this.mergeSources(primary.source, secondary.source);
    return {
      ...primary,
      source: sourceTag,
      sourceId: primary.sourceId ?? secondary.sourceId,
      symbols: Array.from(new Set([...primary.symbols, ...secondary.symbols])),
    };
  }

  private mergeSources(sourceA: string, sourceB: string): string {
    const merged = Array.from(new Set([sourceA, sourceB])).filter(
      (item) => item.trim().length > 0,
    );
    return merged.join(' | ');
  }

  private cleanText(input: string): string {
    let output = input.replace(/\s+/g, ' ').trim();
    for (const word of SUBJECTIVE_WORDS) {
      const pattern = new RegExp(`\\b${word}\\b`, 'gi');
      output = output.replace(pattern, '');
    }
    return output.replace(/\s+/g, ' ').trim();
  }

  private buildEventId(headline: string, symbols: string[]): string {
    const normalizedHeadline = headline
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const base = `${normalizedHeadline}|${symbols.join(',')}`;
    return this.hash(base);
  }

  private hash(value: string): string {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return `ev-${Math.abs(hash).toString(36)}`;
  }
}
