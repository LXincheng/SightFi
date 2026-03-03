import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from '../constants/currency.constants';
import type { CurrencyCode } from '../constants/currency.constants';
import type { Locale } from '../i18n/messages';

function currencyMeta(code: CurrencyCode) {
  const matched = CURRENCY_OPTIONS.find((item) => item.code === code);
  if (matched) return matched;
  return {
    code: DEFAULT_CURRENCY,
    label: DEFAULT_CURRENCY,
    symbol: '$',
    usdRate: 1,
  };
}

export function convertUsd(value: number, currency: CurrencyCode): number {
  return value * currencyMeta(currency).usdRate;
}

export function formatCurrencyValue(
  valueInUsd: number,
  currency: CurrencyCode,
  locale: Locale,
  digits = 2,
): string {
  const meta = currencyMeta(currency);
  const converted = convertUsd(valueInUsd, currency);
  const localeCode = locale === 'zh' ? 'zh-CN' : 'en-US';
  return new Intl.NumberFormat(localeCode, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(converted).replace(/^/, meta.symbol);
}

export function resolveCurrency(raw: string | null): CurrencyCode {
  if (!raw) return DEFAULT_CURRENCY;
  const candidate = raw.toUpperCase();
  if (candidate === 'USD' || candidate === 'CNY' || candidate === 'HKD' || candidate === 'EUR' || candidate === 'JPY') {
    return candidate;
  }
  return DEFAULT_CURRENCY;
}
