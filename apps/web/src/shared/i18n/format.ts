import type { Locale } from './messages';

export function localeToIntlTag(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}

export function formatDateTimeWithZone(
  value: string,
  locale: Locale,
  options?: {
    withYear?: boolean;
    withSeconds?: boolean;
  },
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const formatter = new Intl.DateTimeFormat(localeToIntlTag(locale), {
    year: options?.withYear === false ? undefined : 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: options?.withSeconds ? '2-digit' : undefined,
    hour12: false,
    timeZoneName: 'short',
  });
  return formatter.format(date);
}

