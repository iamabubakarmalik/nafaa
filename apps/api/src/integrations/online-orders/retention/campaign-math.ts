/**
 * WhatsApp campaign helpers: template kinds, filling a message for one
 * customer, and the conversion rule (an order from the same phone within
 * 7 days of sending).
 */

export const CAMPAIGN_TEMPLATES = ['WIN_BACK', 'NEW_ARRIVAL', 'REVIEW', 'RESTOCK', 'BIRTHDAY', 'CUSTOM'] as const;
export type CampaignTemplate = (typeof CAMPAIGN_TEMPLATES)[number];

/** Extra segment for campaigns only: customers whose birthday falls in the next 7 days. */
export const BIRTHDAY_SEGMENT = 'birthday';

export const CONVERT_DAYS = 7;
export const MAX_RECIPIENTS = 500;

export interface FillVars { name?: string | null; shop?: string | null; code?: string | null; link?: string | null; product?: string | null }

/** {name} {shop} {code} {link} {product}; the name is the first word only, as people write it. */
export function fillCampaignText(tpl: string, v: FillVars): string {
  const first = String(v.name ?? '').trim().split(/\s+/)[0] ?? '';
  return String(tpl ?? '')
    .replace(/\{name\}/g, first)
    .replace(/\{shop\}/g, String(v.shop ?? ''))
    .replace(/\{code\}/g, String(v.code ?? ''))
    .replace(/\{link\}/g, String(v.link ?? ''))
    .replace(/\{product\}/g, String(v.product ?? ''))
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, 1000);
}

export interface ConvOrder { id: string; receivedAt: Date; total: number; status: string; no: string }

/** The first non-cancelled order placed within 7 days after the message was sent. */
export function conversionOf(sentAt: Date | null, orders: ConvOrder[]): ConvOrder | null {
  if (!sentAt) return null;
  const from = sentAt.getTime();
  const to = from + CONVERT_DAYS * 86_400_000;
  return orders
    .filter((o) => o.receivedAt.getTime() >= from && o.receivedAt.getTime() <= to && o.status !== 'CANCELLED' && o.status !== 'REJECTED')
    .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())[0] ?? null;
}

/** True when month/day of `dob` falls within `days` days from `now` (year ignored; wraps at new year). */
export function birthdaySoon(dob: Date, now: Date, days = 7): boolean {
  for (let i = 0; i <= days; i++) {
    const d = new Date(now.getTime() + i * 86_400_000);
    if (d.getUTCMonth() === dob.getUTCMonth() && d.getUTCDate() === dob.getUTCDate()) return true;
  }
  return false;
}
