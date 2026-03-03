import { Injectable, Logger } from '@nestjs/common';
import { AI_DEFAULTS, AI_PROMPTS } from '../../core/config/ai-prompts';
import { ENV_KEYS } from '../../core/config/env.keys';

interface ProviderConfig {
  name: 'primary' | 'fallback';
  baseUrl: string;
  model: string;
  apiKey: string;
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  private readonly primary: ProviderConfig = {
    name: 'primary',
    baseUrl:
      process.env[ENV_KEYS.aiPrimaryBaseUrl] ?? 'https://www.packyapi.com/v1',
    model: process.env[ENV_KEYS.aiPrimaryModel] ?? 'gpt-5.2',
    apiKey: process.env[ENV_KEYS.aiPrimaryApiKey] ?? '',
  };

  private readonly fallback: ProviderConfig = {
    name: 'fallback',
    baseUrl:
      process.env[ENV_KEYS.aiFallbackBaseUrl] ?? 'https://api.deepseek.com/v1',
    model: process.env[ENV_KEYS.aiFallbackModel] ?? 'deepseek-reasoner',
    apiKey: process.env[ENV_KEYS.aiFallbackApiKey] ?? '',
  };

  async summarizeWithProvider(prompt: string): Promise<string | null> {
    const primaryResult = await this.callProvider(this.primary, prompt);
    if (primaryResult) {
      return primaryResult;
    }
    return this.callProvider(this.fallback, prompt);
  }

  private async callProvider(
    provider: ProviderConfig,
    prompt: string,
  ): Promise<string | null> {
    if (!provider.apiKey) {
      this.logger.warn(`${provider.name} ai key missing`);
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(
        () => controller.abort(),
        AI_DEFAULTS.requestTimeoutMs,
      );
      const response = await fetch(
        `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              {
                role: 'system',
                content: AI_PROMPTS.system,
              },
              { role: 'user', content: prompt },
            ],
            temperature: AI_DEFAULTS.temperature,
          }),
          signal: controller.signal,
        },
      ).finally(() => clearTimeout(timeoutHandle));

      if (response.status === 404) {
        return this.callResponsesEndpoint(provider, prompt);
      }

      if (!response.ok) {
        this.logger.warn(
          `${provider.name} ai request failed: ${response.status}`,
        );
        return null;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return payload.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`${provider.name} ai unavailable: ${detail}`);
      return null;
    }
  }

  private async callResponsesEndpoint(
    provider: ProviderConfig,
    prompt: string,
  ): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(
        () => controller.abort(),
        AI_DEFAULTS.requestTimeoutMs,
      );
      const response = await fetch(
        `${provider.baseUrl.replace(/\/$/, '')}/responses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model: provider.model,
            input: [
              {
                role: 'system',
                content: [{ type: 'input_text', text: AI_PROMPTS.system }],
              },
              {
                role: 'user',
                content: [{ type: 'input_text', text: prompt }],
              },
            ],
            temperature: AI_DEFAULTS.temperature,
          }),
          signal: controller.signal,
        },
      ).finally(() => clearTimeout(timeoutHandle));

      if (!response.ok) {
        this.logger.warn(
          `${provider.name} responses request failed: ${response.status}`,
        );
        return null;
      }

      const payload = (await response.json()) as {
        output_text?: string;
        output?: Array<{
          content?: Array<{ type?: string; text?: string }>;
        }>;
      };

      if (payload.output_text && payload.output_text.trim().length > 0) {
        return payload.output_text.trim();
      }

      const extracted =
        payload.output
          ?.flatMap((item) => item.content ?? [])
          .map((item) => item.text ?? '')
          .join('\n')
          .trim() ?? '';
      return extracted.length > 0 ? extracted : null;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(
        `${provider.name} responses endpoint unavailable: ${detail}`,
      );
      return null;
    }
  }
}
