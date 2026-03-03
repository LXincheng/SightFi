import { Injectable } from '@nestjs/common';
import type {
  AiEvidence,
  PortfolioPosition,
  PortfolioSummaryRequest,
  PortfolioSummaryResponse,
} from '@sightfi/shared';
import { AiProviderService } from './ai-provider.service';
import { AI_DEFAULTS, AI_PROMPTS } from '../../core/config/ai-prompts';
import { PORTFOLIO_COPY } from '../../core/config/portfolio-copy';

interface ProviderSummaryPayload {
  conclusion?: string;
  confidence?: number;
  riskNotice?: string;
  actions?: string[];
  evidences?: string[];
}

@Injectable()
export class AiService {
  constructor(private readonly aiProviderService: AiProviderService) {}

  buildPortfolioSummary(
    payload: PortfolioSummaryRequest,
  ): PortfolioSummaryResponse {
    const concentration = this.findConcentration(payload.positions);
    const concentrationHint =
      concentration.weight > 0.45
        ? PORTFOLIO_COPY.concentrationHigh.replace(
            '{symbol}',
            concentration.symbol,
          )
        : PORTFOLIO_COPY.concentrationBalanced;

    const baseAction =
      payload.riskProfile === 'aggressive'
        ? PORTFOLIO_COPY.actionAggressive
        : payload.riskProfile === 'balanced'
          ? PORTFOLIO_COPY.actionBalanced
          : PORTFOLIO_COPY.actionConservative;

    return {
      conclusion: `${PORTFOLIO_COPY.conclusionPrefix}${concentrationHint}`,
      confidence: AI_DEFAULTS.fallbackConfidence,
      riskNotice: PORTFOLIO_COPY.riskNotice,
      actions: [
        baseAction,
        PORTFOLIO_COPY.actionEventCheck,
        PORTFOLIO_COPY.actionSingleAdjust,
      ],
      evidences: [
        {
          source: 'portfolio.positions',
          detail: `已分析 ${payload.positions.length} 个持仓标的，最大仓位为 ${concentration.symbol}。`,
        },
        {
          source: 'riskProfile',
          detail: `当前风险偏好为 ${payload.riskProfile}。`,
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  async buildPortfolioSummaryAsync(
    payload: PortfolioSummaryRequest,
  ): Promise<PortfolioSummaryResponse> {
    const fallback = this.buildPortfolioSummary(payload);
    const prompt = this.buildProviderPrompt(payload);
    const providerText =
      await this.aiProviderService.summarizeWithProvider(prompt);
    if (!providerText) {
      return fallback;
    }
    const parsed = this.parseProviderSummary(providerText);
    if (!parsed) {
      return {
        ...fallback,
        conclusion: providerText.slice(0, 600),
        generatedAt: new Date().toISOString(),
      };
    }

    const actions = this.normalizeActions(parsed.actions, fallback.actions);
    const evidences = this.normalizeEvidences(
      parsed.evidences,
      fallback.evidences,
    );
    const confidence = this.normalizeConfidence(
      parsed.confidence,
      fallback.confidence,
    );

    return {
      conclusion: parsed.conclusion?.trim() || fallback.conclusion,
      confidence,
      riskNotice: parsed.riskNotice?.trim() || fallback.riskNotice,
      actions,
      evidences,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildProviderPrompt(payload: PortfolioSummaryRequest): string {
    const positionLines = payload.positions
      .map((position, index) => {
        const value = position.avgCost * position.quantity;
        return `${index + 1}. ${position.symbol} | market=${position.market} | qty=${position.quantity} | avgCost=${position.avgCost} | estValue=${value.toFixed(2)}`;
      })
      .join('\n');

    return [
      AI_PROMPTS.portfolioSummaryUser,
      `riskProfile: ${payload.riskProfile}`,
      'positions:',
      positionLines || 'none',
      `notes: ${payload.notes?.trim() || 'none'}`,
      '请显式说明不确定性和信息缺口。',
    ].join('\n');
  }

  private parseProviderSummary(text: string): ProviderSummaryPayload | null {
    const maybeJson = this.extractJsonPayload(text);
    if (!maybeJson) {
      return null;
    }
    try {
      const parsed = JSON.parse(maybeJson) as ProviderSummaryPayload;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private extractJsonPayload(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }
    const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
    if (match?.[1]) {
      return match[1].trim();
    }
    return null;
  }

  private normalizeActions(
    input: string[] | undefined,
    fallback: string[],
  ): string[] {
    if (!Array.isArray(input)) return fallback;
    const actions = input
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 3);
    return actions.length > 0 ? actions : fallback;
  }

  private normalizeEvidences(
    input: string[] | undefined,
    fallback: AiEvidence[],
  ): AiEvidence[] {
    if (!Array.isArray(input)) return fallback;
    const evidences = input
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 4)
      .map((detail, index) => ({
        source: `ai.provider.${index + 1}`,
        detail,
      }));
    return evidences.length > 0 ? evidences : fallback;
  }

  private normalizeConfidence(
    input: number | undefined,
    fallback: number,
  ): number {
    if (typeof input !== 'number' || Number.isNaN(input)) return fallback;
    if (input < 0) return 0;
    if (input > 1) return 1;
    return Number(input.toFixed(2));
  }

  private findConcentration(positions: PortfolioPosition[]): {
    symbol: string;
    weight: number;
  } {
    const withValue = positions.map((position) => ({
      symbol: position.symbol,
      value: position.avgCost * position.quantity,
    }));
    const total = withValue.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0 || withValue.length === 0) {
      return { symbol: '-', weight: 0 };
    }
    const first = withValue.at(0);
    if (!first) {
      return { symbol: '-', weight: 0 };
    }
    let max = first;
    for (const item of withValue.slice(1)) {
      if (item.value > max.value) {
        max = item;
      }
    }
    return { symbol: max.symbol, weight: max.value / total };
  }
}
