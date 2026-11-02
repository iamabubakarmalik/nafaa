/**
 * Price-tier badges for bills and bill lines. Old bills (no tier stored) get
 * no badge; an all-retail bill shows "Retail" only once the shop has price
 * tiers on, so shops that never use tiers see nothing new.
 */

import { Badge, type BadgeVariant } from '@/design-system/components';
import { PRICE_TIER_LABEL, PRICE_TIER_TONE, type PriceTier } from '@core/lib/priceTiers';
import { usePriceTierSettings } from '@modules/pos/lib/usePriceTierSettings';
import type { BillTier } from '../api';
import { t as tr } from '@core/i18n';

const VARIANT: Record<'neutral' | 'info' | 'warning', BadgeVariant> = { neutral: 'default', info: 'info', warning: 'warning' };

export const BILL_TIER_LABEL: Record<BillTier, string> = { ...PRICE_TIER_LABEL, MIXED: tr('Mixed') };
export const billTierVariant = (t: BillTier): BadgeVariant => (t === 'MIXED' ? 'brand' : VARIANT[PRICE_TIER_TONE[t]]);

/** A bill's tier, following the visibility rules above. */
export function BillTierBadge({ tier, size = 'xs' }: { tier?: BillTier | null; size?: 'xs' | 'sm' }) {
  const { on } = usePriceTierSettings();
  if (!tier || (tier === 'RETAIL' && !on)) return null;
  return <Badge size={size} variant={billTierVariant(tier)} title={tier === 'MIXED' ? tr('Is bill me alag alag price lagi') : tr('{{value}} price par bika', { value: BILL_TIER_LABEL[tier] })}>{BILL_TIER_LABEL[tier]}</Badge>;
}

/** A line's tier; retail and old lines show nothing. */
export function LineTierBadge({ tier }: { tier?: PriceTier | null }) {
  if (!tier || tier === 'RETAIL') return null;
  return <Badge size="xs" variant={billTierVariant(tier)}>{PRICE_TIER_LABEL[tier]}</Badge>;
}
