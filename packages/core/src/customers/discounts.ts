/** Discount codes: the checks the server runs, so the counter can apply a saved code without internet. */

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type DiscountStatus = 'active' | 'inactive' | 'expired' | 'scheduled' | 'used_up';

export interface DiscountRule {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  minPurchase: number;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  shopIds?: string[];
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
}

export type DiscountProblem =
  | { code: 'not_found' }
  | { code: 'not_started' }
  | { code: 'ended' }
  | { code: 'used_up' }
  | { code: 'other_branch' }
  | { code: 'minimum'; minPurchase: number };

export type DiscountCheck = { ok: true; discount: number; finalAmount: number } | { ok: false; problem: DiscountProblem };

/** Codes are typed in any case with stray spaces. */
export const normalizeCode = (code: string) => code.toUpperCase().replace(/\s+/g, '');

/** What a code takes off an amount: percent (capped) or fixed, never more than the amount. */
export function discountAmount(rule: Pick<DiscountRule, 'type' | 'value' | 'maxDiscount'>, amount: number): number {
  let d = rule.type === 'PERCENTAGE' ? (amount * rule.value) / 100 : rule.value;
  if (rule.type === 'PERCENTAGE' && rule.maxDiscount && d > rule.maxDiscount) d = rule.maxDiscount;
  return Math.round(Math.min(d, amount) * 100) / 100;
}

/** Same rules as the server, against a saved list of codes (the per-customer count needs the server). */
export function checkDiscountCode(
  rules: ReadonlyArray<DiscountRule>, code: string, amount: number, shopId?: string | null, now: number = Date.now(),
): DiscountCheck {
  const dc = rules.find((c) => c.code === normalizeCode(code) && c.isActive);
  if (!dc) return { ok: false, problem: { code: 'not_found' } };
  if (dc.validFrom && now < new Date(dc.validFrom).getTime()) return { ok: false, problem: { code: 'not_started' } };
  if (dc.validUntil && now > new Date(dc.validUntil).getTime()) return { ok: false, problem: { code: 'ended' } };
  if (dc.usageLimit && dc.usageCount >= dc.usageLimit) return { ok: false, problem: { code: 'used_up' } };
  if (dc.shopIds?.length && shopId && !dc.shopIds.includes(shopId)) return { ok: false, problem: { code: 'other_branch' } };
  if (amount < dc.minPurchase) return { ok: false, problem: { code: 'minimum', minPurchase: dc.minPurchase } };
  const discount = discountAmount(dc, amount);
  return { ok: true, discount, finalAmount: Math.round((amount - discount) * 100) / 100 };
}

/** Days left until a code ends (negative when it has ended), or null without an end date. */
export const daysLeft = (validUntil?: string | null, now: number = Date.now()) =>
  validUntil ? Math.ceil((new Date(validUntil).getTime() - now) / 86_400_000) : null;
