export type Sentiment = "bullish" | "neutral" | "bearish";

export interface HealthStatus {
  status: "ok";
  service: string;
  timestamp: string;
  uptimeSec: number;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  updatedAt: string;
  source?: string;
}

export interface NewsFact {
  id: string;
  eventId?: string;
  source: string;
  sourceId?: string;
  headline: string;
  factSummary: string;
  symbols: string[];
  sentiment: Sentiment;
  publishedAt: string;
}

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCost: number;
  market: "US" | "HK" | "ETF";
}

export interface PortfolioSummaryRequest {
  riskProfile: "conservative" | "balanced" | "aggressive";
  positions: PortfolioPosition[];
  notes?: string;
}

export interface AiEvidence {
  source: string;
  detail: string;
}

export interface PortfolioSummaryResponse {
  conclusion: string;
  confidence: number;
  riskNotice: string;
  actions: string[];
  evidences: AiEvidence[];
  generatedAt: string;
}

export interface ProviderFlags {
  supabaseConfigured: boolean;
  marketDataConfigured: boolean;
  newsDataConfigured: boolean;
  aiConfigured: boolean;
  aiPrimaryConfigured: boolean;
  aiFallbackConfigured: boolean;
  databaseConfigured: boolean;
  marketProvider?: string;
  newsProvider?: string;
}
