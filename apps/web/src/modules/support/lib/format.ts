/** Times and day labels for the chat, in the viewer's language. */

import { t } from '@core/i18n';

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "3:42 PM". */
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true });

/** Day separator: Today, Yesterday, or "Mon, 12 Nov". */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return t('Aaj');
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return t('Kal');
  return d.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

export const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** "last seen today at 3:42 PM" style, for the chat header. */
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
  return t('Last seen {{date}}', { date: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) });
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
