/**
 * The shop's counter rules for one bill (Settings → Counter rules), the same
 * checks the web POS runs before it sends a bill and the server runs again:
 * hand discount on/off and its limit, the discount PIN, credit on/off and a
 * customer's credit limit.
 */

export interface CounterRules {
  allowDiscount: boolean;
  maxDiscountPercent: number;
  pinForDiscount: boolean;
  allowCredit: boolean;
  requireCustomer: boolean;
  /** The shop has an owner/manager PIN set. */
  hasPin: boolean;
  /** This user may give any discount without a PIN (pos.discount_override). */
  discountTrusted: boolean;
}

export interface CounterCheckInput {
  /** Hand discount on the bill (codes and points follow their own rules). */
  manualDiscount: number;
  /** Rupees taken off by lowering line rates. */
  priceCut: number;
  subtotal: number;
  /** Part of the bill going on khata. */
  credit: number;
  customer?: { balance?: number | null; creditLimit?: number | null } | null;
}

export type CounterStop =
  | { code: 'discount_off' }
  | { code: 'discount_limit'; maxPercent: number }
  | { code: 'credit_limit'; limit: number };

export type CounterPin =
  | { kind: 'discount'; reason: 'over_limit'; maxPercent: number }
  | { kind: 'discount'; reason: 'discount' }
  | { kind: 'credit'; reason: 'credit_limit'; limit: number };

export interface CounterCheck {
  /** The bill cannot go (show the message). */
  stop: CounterStop | null;
  /** The bill needs the owner's or manager's PIN. */
  pin: CounterPin | null;
}

/** Discount over the limit (including lowered rates) needs a PIN, or stops the bill when no PIN is set. */
export function counterCheck(rules: CounterRules, b: CounterCheckInput): CounterCheck {
  const given = (b.manualDiscount || 0) + (b.priceCut || 0);
  if (b.manualDiscount > 0 && !rules.allowDiscount) return { stop: { code: 'discount_off' }, pin: null };
  let pin: CounterPin | null = null;
  if (given > 0.005 && !rules.discountTrusted) {
    const base = b.subtotal + (b.priceCut || 0);
    const pct = base > 0 ? (given / base) * 100 : 100;
    if (pct > rules.maxDiscountPercent + 0.01) {
      if (!rules.hasPin) return { stop: { code: 'discount_limit', maxPercent: rules.maxDiscountPercent }, pin: null };
      pin = { kind: 'discount', reason: 'over_limit', maxPercent: rules.maxDiscountPercent };
    } else if (rules.pinForDiscount && rules.hasPin) {
      pin = { kind: 'discount', reason: 'discount' };
    }
  }
  if (!pin && b.credit > 0 && b.customer) {
    const limit = Number(b.customer.creditLimit) || 0;
    if (limit > 0 && (Number(b.customer.balance) || 0) + b.credit > limit + 0.01) {
      if (!rules.hasPin) return { stop: { code: 'credit_limit', limit }, pin: null };
      pin = { kind: 'credit', reason: 'credit_limit', limit };
    }
  }
  return { stop: null, pin };
}

/** How close a customer is to their credit limit after this bill. */
export function creditStatus(customer: { balance?: number | null; creditLimit?: number | null } | null | undefined, credit = 0) {
  const balance = Number(customer?.balance) || 0;
  const limit = Number(customer?.creditLimit) || 0;
  const after = balance + Math.max(credit, 0);
  return {
    balance,
    limit,
    after,
    /** Rupees still open before the limit (null without a limit). */
    room: limit > 0 ? Math.max(limit - balance, 0) : null,
    over: limit > 0 && after > limit + 0.01,
    near: limit > 0 && after > limit * 0.8,
  };
}
