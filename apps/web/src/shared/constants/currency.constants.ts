export type CurrencyCode = 'USD' | 'CNY' | 'HKD' | 'EUR' | 'JPY';

export interface CurrencyOption {
  code: CurrencyCode;
  label: string;
  symbol: string;
  usdRate: number;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'USD', label: 'USD', symbol: '$', usdRate: 1 },
  { code: 'CNY', label: 'CNY', symbol: '¥', usdRate: 7.2 },
  { code: 'HKD', label: 'HKD', symbol: 'HK$', usdRate: 7.8 },
  { code: 'EUR', label: 'EUR', symbol: '€', usdRate: 0.92 },
  { code: 'JPY', label: 'JPY', symbol: '¥', usdRate: 149 },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

