/**
 * Money, links and small text helpers shared by server and client code.
 */
import type { Lang } from './api';

/** "Rs 2,450". Rupees are whole numbers in Pakistan; paisa are dropped. */
export function money(amount: number | null | undefined, symbol = 'Rs'): string {
  const n = Math.round(Number(amount ?? 0));
  return `${symbol} ${n.toLocaleString('en-PK')}`;
}

export function percentOff(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** Storefront path for the current language: "/products/x" or "/ur/products/x". */
export function href(lang: Lang, path: string): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  if (lang === 'ur') return p === '/' ? '/ur' : `/ur${p}`;
  return p;
}

/** Digits only, as 92XXXXXXXXXX for wa.me links. */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = `92${d.slice(1)}`;
  if (d.length === 10 && d.startsWith('3')) d = `92${d}`;
  return d.length >= 11 ? d : null;
}

export function waLink(phone: string | null | undefined, text: string): string | null {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

/** Pakistani mobile: 03XXXXXXXXX or +923XXXXXXXXX. */
export function isPkMobile(phone: string): boolean {
  const d = phone.replace(/\D/g, '');
  return /^03\d{9}$/.test(d) || /^923\d{9}$/.test(d) || /^3\d{9}$/.test(d);
}

export function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : v == null ? fallback : String(v);
}

export function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : v == null ? fallback : v === 'true' || v === 1;
}

export function stripHtml(html: string | null | undefined, max = 160): string {
  const s = (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

export function formatDate(iso: string, lang: Lang): string {
  try {
    return new Date(iso).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}
