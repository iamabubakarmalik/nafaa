type CurrencyFormatOptions = {
  compact?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

const isValidNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeNumber = (value: unknown): number | null => {
  if (isValidNumber(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatLocaleNumber = (
  amount: number,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
) =>
  amount.toLocaleString('en-PK', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

export const formatPKRCompact = (amount: number | string | null | undefined) => {
  const value = normalizeNumber(amount);
  if (value === null) return 'Rs 0.00';

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 10000000) {
    return `Rs ${sign}${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    return `Rs ${sign}${(abs / 100000).toFixed(2)} L`;
  }
  if (abs >= 1000) {
    return `Rs ${sign}${(abs / 1000).toFixed(1)}K`;
  }

  return `Rs ${sign}${formatLocaleNumber(abs, 2, 2)}`;
};

// Default export — backward compatible, but now shows decimals
export const formatPKR = (
  amount: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
) => {
  const value = normalizeNumber(amount);
  if (value === null) return 'Rs 0.00';

  if (options.compact) {
    return formatPKRCompact(value);
  }

  const minimumFractionDigits = options.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;

  return `Rs ${formatLocaleNumber(value, minimumFractionDigits, maximumFractionDigits)}`;
};

export const formatPKRFull = (amount: number | string | null | undefined) =>
  formatPKR(amount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Quantity formatter — integers without decimals, decimals with .XX
export const formatQty = (qty: number | string | null | undefined): string => {
  const value = normalizeNumber(qty);
  if (value === null) return '0';
  return value % 1 === 0 ? String(value) : value.toFixed(2);
};

export const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
};

export const formatTime = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatRelative = (date: string | Date | number) => {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
};

export const formatNumber = (n: number | string | null | undefined) => {
  const value = normalizeNumber(n);
  if (value === null) return '0';
  return value.toLocaleString('en-PK');
};
