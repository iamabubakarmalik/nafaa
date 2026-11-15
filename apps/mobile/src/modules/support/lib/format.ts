/** Times, day labels and sizes for the support chat, in the viewer's language. */

import { t } from '@/core/i18n';

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "3:42 PM" (built by hand: Hermes' Intl time formats differ between Android and iOS). */
export function timeOf(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${m < 10 ? '0' : ''}${m} ${h < 12 ? 'AM' : 'PM'}`;
}

const shortDate = (d: Date, withYear: boolean) => `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;

/** Day separator: Today, Yesterday, or "Mon, 12 Nov". */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return t('Aaj');
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return t('Kal');
  return `${DAYS[d.getDay()]}, ${shortDate(d, d.getFullYear() !== now.getFullYear())}`;
}

export const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** "Last seen today at 3:42 PM" style, for the chat header. */
export function lastSeenText(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (mins < 2) return t('Last seen abhi');
  if (mins < 60) return t('Last seen {{count}} min pehle', { count: mins });
  if (sameDay(d, now)) return t('Last seen aaj {{time}}', { time: timeOf(iso) });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return t('Last seen kal {{time}}', { time: timeOf(iso) });
  return t('Last seen {{date}}', { date: shortDate(d, false) });
}

/** "12 KB", "1.4 MB". */
export function sizeText(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Rough reply time: "a few minutes", "about 2 hours". */
export function replyTimeText(minutes: number | null | undefined): string {
  const m = Math.max(1, Math.round(minutes ?? 10));
  if (m <= 5) return t('kuch minute');
  if (m < 60) return t('{{count}} minute', { count: m });
  const h = Math.round(m / 60);
  return h === 1 ? t('1 ghanta') : t('{{count}} ghante', { count: h });
}

/** "1:05" for voice notes and call lengths. */
export function clock(totalSec: number | null | undefined): string {
  const s = Math.max(0, Math.round(totalSec ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
