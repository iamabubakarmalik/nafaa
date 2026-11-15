/** Money, dates and phone helpers shared by server and client components. */
import type { Lang } from './types';

export function money(n: number | null | undefined): string {
  const v = Math.round(Number(n) || 0);
  return `Rs ${v.toLocaleString('en-PK')}`;
}

const LOCALE: Record<Lang, string> = { en: 'en-PK', roman: 'en-PK', ur: 'ur-PK' };

export function dateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' }).format(new Date(iso));
}

export function dateOnly(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Karachi' }).format(new Date(iso));
}

export function timeOnly(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' }).format(new Date(iso));
}

/** 03001234567 / +923001234567 / 3001234567 → 03001234567, or null. */
export function normalizePhone(v: string): string | null {
  const d = v.replace(/[^\d+]/g, '');
  const m = d.match(/^(?:\+?92|0)?(3\d{9})$/);
  return m ? `0${m[1]}` : null;
}

/** wa.me link for a Pakistani number. */
export function whatsappLink(phone: string, text?: string): string {
  const n = normalizePhone(phone);
  const intl = n ? `92${n.slice(1)}` : phone.replace(/\D/g, '');
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
