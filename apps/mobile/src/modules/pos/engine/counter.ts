/**
 * The shop's counter setup as this phone knows it: rules (Settings → Counter
 * rules), loyalty, tax and service charge, and the counter's parts (POS
 * counter config). Read from the offline manifest, so it works without
 * internet; the server checks the rules again on every bill.
 */

import { useMemo } from 'react';
import { PRICE_TIERS, isPriceTier, type CounterRules, type PaymentMethod, type PriceTier } from '@nafaa/core/pos';
import { useOfflineManifest } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';

export interface CounterParts {
  showImages: boolean;
  showCategories: boolean;
  showQuickKeys: boolean;
  showReceiver: boolean;
  showDelivery: boolean;
  showDiscount: boolean;
  lineNotes: boolean;
  priceEdit: boolean;
  showStock: boolean;
  recentItems: boolean;
  quickDiscounts: number[];
  priceTiers: boolean;
  priceTierList: PriceTier[];
  defaultPriceTier: PriceTier;
  tierCreditOnUdhaar: boolean;
  tierFromCustomer: boolean;
  tierLineOverride: boolean;
}

const DEFAULT_PARTS: CounterParts = {
  showImages: true, showCategories: true, showQuickKeys: true, showReceiver: true, showDelivery: true, showDiscount: true,
  lineNotes: false, priceEdit: true, showStock: true, recentItems: true, quickDiscounts: [5, 10],
  priceTiers: false, priceTierList: [...PRICE_TIERS], defaultPriceTier: 'RETAIL', tierCreditOnUdhaar: true, tierFromCustomer: true, tierLineOverride: true,
};

/** Server value with defaults filled in (same rules as the web normalizePosCounter). */
export function normalizeParts(raw: unknown): CounterParts {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = { ...DEFAULT_PARTS } as Record<string, unknown>;
  for (const [k, v] of Object.entries(DEFAULT_PARTS)) if (typeof v === 'boolean' && typeof s[k] === 'boolean') out[k] = s[k];
  if (Array.isArray(s.quickDiscounts)) out.quickDiscounts = s.quickDiscounts.map(Number).filter((n) => n > 0 && n <= 100);
  if (isPriceTier(s.defaultPriceTier)) out.defaultPriceTier = s.defaultPriceTier;
  if (Array.isArray(s.priceTierList)) {
    const list = PRICE_TIERS.filter((x) => (s.priceTierList as unknown[]).includes(x));
    out.priceTierList = list.length ? list : [...PRICE_TIERS];
  }
  const list = out.priceTierList as PriceTier[];
  if (!list.includes(out.defaultPriceTier as PriceTier)) out.priceTierList = PRICE_TIERS.filter((x) => x === out.defaultPriceTier || list.includes(x));
  return out as unknown as CounterParts;
}

export interface Counter {
  rules: CounterRules & { negativeStock: boolean; requirePinForVoid: boolean; requirePinForRefund: boolean };
  parts: CounterParts;
  defaultMethod: PaymentMethod;
  loyalty: { on: boolean; rate: number; maxRedeemPercent: number; minRedeem: number };
  tax: { on: boolean; rate: number; label: string; inclusive: boolean };
  serviceChargePct: number;
  /** Staff may lower a line's rate (shop allows it, or trusted with discounts). */
  canEditPrice: boolean;
  /** May pick a non-default price tier by hand. */
  tierTrusted: boolean;
  ready: boolean;
}

export function useCounter(): Counter {
  const { data: m } = useOfflineManifest();
  const can = usePermission();
  const trusted = can(P.POS_DISCOUNT_OVERRIDE);
  const tierTrusted = can(P.POS_PRICE_TIER);
  return useMemo(() => {
    const s = (m?.settings ?? {}) as Record<string, unknown>;
    const num = (k: string, d: number) => (s[k] == null || Number.isNaN(Number(s[k])) ? d : Number(s[k]));
    const parts = normalizeParts((s.receiptConfig as Record<string, unknown> | null)?.posCounter);
    const method = String(s.defaultPaymentMethod ?? 'CASH');
    return {
      rules: {
        allowDiscount: s.allowDiscount !== false,
        maxDiscountPercent: num('maxDiscountPercent', 100),
        pinForDiscount: !!s.requirePinForDiscount,
        allowCredit: s.allowCredit !== false,
        requireCustomer: !!s.requireCustomerForSale,
        hasPin: !!s.hasManagerPin,
        discountTrusted: trusted,
        negativeStock: !!s.allowNegativeStock,
        requirePinForVoid: !!s.requirePinForVoid,
        // On by default (the server treats a missing value as on).
        requirePinForRefund: s.requirePinForRefund !== false,
      },
      parts,
      defaultMethod: (['CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'].includes(method) ? method : 'CASH') as PaymentMethod,
      loyalty: {
        on: !!s.enableLoyalty,
        rate: num('loyaltyRedemptionRate', 1) || 1,
        maxRedeemPercent: num('loyaltyMaxRedeemPercent', 100),
        minRedeem: num('loyaltyMinRedeem', 0),
      },
      tax: { on: !!s.enableTax, rate: num('taxRate', 0), label: String(s.taxLabel || 'Tax'), inclusive: !!s.taxInclusive },
      serviceChargePct: num('serviceChargePct', 0),
      canEditPrice: parts.priceEdit || trusted,
      tierTrusted,
      ready: !!m,
    };
  }, [m, trusted, tierTrusted]);
}
