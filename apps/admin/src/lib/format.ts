export const formatPKR = (amount: number) => {
  if (!amount && amount !== 0) return 'Rs 0';
  if (amount >= 10000000) return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `Rs ${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `Rs ${(amount / 1000).toFixed(1)}K`;
  return `Rs ${Math.round(amount)}`;
};

export const formatPKRFull = (amount: number) => {
  if (!amount && amount !== 0) return 'Rs 0';
  return `Rs ${Math.round(amount).toLocaleString('en-PK')}`;
};

export const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(d);
};

export const formatTime = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PK', {
    hour: '2-digit', minute: '2-digit',
  }).format(d);
};

export const formatRelative = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
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

export const formatNumber = (n: number) => {
  if (!n && n !== 0) return '0';
  return n.toLocaleString('en-PK');
};

/** Whole number with Pakistani grouping, e.g. 12,500. Empty values show as 0. */
export const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-PK');

/** Date with time, e.g. "11 Nov 2026, 4:05 pm" (Pakistan locale). */
export const formatDateTime = (date: string | Date) =>
  new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(typeof date === 'string' ? new Date(date) : date);

const PK_TZ = 'Asia/Karachi';

/** Exact Pakistan time, e.g. "12 Nov 2026, 1:04 PM" (or "12 Nov, 1:04 PM" with short). */
export const formatPkDateTime = (date: string | Date, opts: { short?: boolean } = {}) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PK_TZ, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(d);
  const p = (type: Intl.DateTimeFormatPartTypes) => parts.find((x) => x.type === type)?.value ?? '';
  const day = opts.short ? `${p('day')} ${p('month')}` : `${p('day')} ${p('month')} ${p('year')}`;
  return `${day}, ${p('hour')}:${p('minute')} ${p('dayPeriod').toUpperCase()}`;
};

/**
 * Time to or since a moment in plain words: "in 25 min", "in 5 h", "in 3 days",
 * "2 h ago", "4 days ago". Under a day it counts hours, never "1 day".
 */
export const formatTimeLeft = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const ms = d.getTime() - Date.now();
  const abs = Math.abs(ms);
  const word = abs < 3_600_000 ? `${Math.max(1, Math.floor(abs / 60_000))} min`
    : abs < 86_400_000 ? `${Math.floor(abs / 3_600_000)} h`
      : `${Math.floor(abs / 86_400_000)} day${Math.floor(abs / 86_400_000) === 1 ? '' : 's'}`;
  return ms >= 0 ? `in ${word}` : `${word} ago`;
};
