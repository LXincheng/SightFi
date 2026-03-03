import { Injectable } from '@nestjs/common';
import type { ProviderFlags } from '@sightfi/shared';
import { APP_CONSTANTS } from '../config/app.constants';
import { ENV_KEYS } from '../config/env.keys';

@Injectable()
export class EnvService {
  private hasValue(key: string): boolean {
    const value = process.env[key];
    return typeof value === 'string' && value.trim().length > 0;
  }

  getPort(): number {
    return Number(
      process.env[ENV_KEYS.port] ??
        process.env[ENV_KEYS.apiPort] ??
        APP_CONSTANTS.defaultPort,
    );
  }

  getProviderFlags(): ProviderFlags {
    const marketProvider = (
      process.env[ENV_KEYS.marketDataProvider] ??
      APP_CONSTANTS.defaultMarketProvider
    ).toLowerCase();
    const newsProvider = (
      process.env[ENV_KEYS.newsDataProvider] ??
      APP_CONSTANTS.defaultNewsProvider
    ).toLowerCase();

    const marketConfigured =
      marketProvider === 'yahoo'
        ? true
        : this.hasValue(ENV_KEYS.marketDataApiKey);
    const newsConfigured =
      newsProvider === 'auto' ||
      this.hasValue(ENV_KEYS.gnewsApiKey) ||
      this.hasValue(ENV_KEYS.newsApiKey) ||
      this.hasValue(ENV_KEYS.fmpApiKey) ||
      this.hasValue(ENV_KEYS.newsDataApiKey);

    return {
      supabaseConfigured:
        this.hasValue(ENV_KEYS.supabaseUrl) &&
        this.hasValue(ENV_KEYS.supabaseAnonKey),
      marketDataConfigured: marketConfigured,
      newsDataConfigured: newsConfigured,
      aiPrimaryConfigured: this.hasValue(ENV_KEYS.aiPrimaryApiKey),
      aiFallbackConfigured: this.hasValue(ENV_KEYS.aiFallbackApiKey),
      aiConfigured:
        this.hasValue(ENV_KEYS.aiPrimaryApiKey) ||
        this.hasValue(ENV_KEYS.aiFallbackApiKey),
      databaseConfigured:
        this.hasValue(ENV_KEYS.databaseUrl) &&
        this.hasValue(ENV_KEYS.directUrl),
      marketProvider,
      newsProvider,
    };
  }
}
