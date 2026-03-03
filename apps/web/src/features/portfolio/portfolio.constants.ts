export const ASSET_TYPES = ['Stock', 'ETF', 'Crypto', 'Bond', 'Cash'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const PORTFOLIO_REGIONS = ['US', 'China', 'Europe', 'Global', 'N/A'] as const;
export type Region = (typeof PORTFOLIO_REGIONS)[number];

export const PORTFOLIO_SECTORS = ['Technology', 'Finance', 'Healthcare', 'Consumer', 'Energy', 'N/A'] as const;
export type Sector = (typeof PORTFOLIO_SECTORS)[number];

