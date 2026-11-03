import { msg } from '@/core/i18n';

/** Hours at which stores actually change day; late-night shops pick 4-6, early bakeries 5. */
export const DAY_START_HOURS = [
  { value: '0', label: msg('Raat 12 baje — aam (default)') },
  { value: '1', label: msg('Raat 1 baje') },
  { value: '2', label: msg('Raat 2 baje') },
  { value: '3', label: msg('Raat 3 baje') },
  { value: '4', label: msg('Subah 4 baje') },
  { value: '5', label: msg('Subah 5 baje') },
  { value: '6', label: msg('Subah 6 baje') },
  { value: '7', label: msg('Subah 7 baje') },
  { value: '8', label: msg('Subah 8 baje') },
  { value: '9', label: msg('Subah 9 baje') },
  { value: '10', label: msg('Subah 10 baje') },
];

export const DAYS = [
  { value: 'mon', label: msg('Mon') }, { value: 'tue', label: msg('Tue') }, { value: 'wed', label: msg('Wed') },
  { value: 'thu', label: msg('Thu') }, { value: 'fri', label: msg('Fri') }, { value: 'sat', label: msg('Sat') }, { value: 'sun', label: msg('Sun') },
];

export const CURRENCIES = [
  { value: 'PKR', label: 'PKR — Pakistani Rupee', symbol: 'Rs' },
  { value: 'USD', label: 'USD — US Dollar', symbol: '$' },
  { value: 'AED', label: 'AED — UAE Dirham', symbol: 'د.إ' },
  { value: 'SAR', label: 'SAR — Saudi Riyal', symbol: 'ر.س' },
  { value: 'GBP', label: 'GBP — British Pound', symbol: '£' },
  { value: 'EUR', label: 'EUR — Euro', symbol: '€' },
  { value: 'INR', label: 'INR — Indian Rupee', symbol: '₹' },
];

export const TIMEZONES = [
  'Asia/Karachi', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Tehran', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Kabul',
  'Europe/London', 'Europe/Stockholm', 'Europe/Berlin', 'America/New_York', 'America/Toronto', 'UTC',
].map((value) => ({ value, label: value }));

/** "21:00" → "9:00 pm" */
export function clock(time?: string) {
  const [h, m] = (time || '21:00').split(':').map(Number);
  if (!Number.isFinite(h)) return time ?? '';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m || 0).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** "HH:MM" string ↔ Date (today, device zone) for the time picker. */
export function timeToDate(time?: string | null): Date | null {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
export const dateToTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
