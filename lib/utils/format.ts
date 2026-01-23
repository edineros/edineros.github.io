import { format, formatDistanceToNow } from 'date-fns';

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF ',
  CAD: 'C$',
  AUD: 'A$',
  CNY: '¥',
  INR: '₹',
  KRW: '₩',
  BTC: '₿',
};

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'EUR',
  options?: {
    showSign?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  if (amount === null || amount === undefined) {
    return '—';
  }

  const {
    showSign = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options ?? {};

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : amount > 0 && showSign ? '+' : '';
  const symbol = currencySymbols[currency] || `${currency} `;

  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return `${sign}${symbol}${formatted}`;
}

export function formatPercent(
  value: number | null | undefined,
  options?: {
    showSign?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  if (value === null || value === undefined) {
    return '—';
  }

  const {
    showSign = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options ?? {};

  const sign = value < 0 ? '' : value > 0 && showSign ? '+' : '';
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return `${sign}${formatted}%`;
}

export function formatQuantity(
  quantity: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { minimumFractionDigits = 0, maximumFractionDigits = 8 } = options ?? {};

  return quantity.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

export function formatDate(date: Date | number, formatString: string = 'MMM d, yyyy'): string {
  return format(date, formatString);
}

export function formatDateTime(date: Date | number): string {
  return format(date, 'MMM d, yyyy HH:mm');
}

export function formatRelativeTime(date: Date | number): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(2);
}

export function getGainColor(value: number | null | undefined): 'gain' | 'loss' | 'neutral' {
  if (value === null || value === undefined || value === 0) {
    return 'neutral';
  }
  return value > 0 ? 'gain' : 'loss';
}

export const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'KRW', label: 'KRW - South Korean Won' },
];
