/**
 * Courier charge for the price calculator. The shop's courier rate cards live
 * with the online order costs (Online store → selling costs); this adapter is
 * the one place the calculator reads them, so a change there needs a change
 * here only. Without a rate card for the courier it falls back to the
 * calculator's own defaults.
 */

import { OrderCostSettings, normalizeCostSettings, rateCharge } from '../../../integrations/online-orders/order-costs';
import type { PriceDefaults } from '../growth-settings';

/** SystemSetting key of the online order costs (rate cards, packaging). */
export const orderCostsKey = (tenantId: string) => `online_order_costs:${tenantId}`;

export function readOrderCosts(value: string | null | undefined): OrderCostSettings | null {
  if (!value) return null;
  try {
    return normalizeCostSettings(JSON.parse(value), false);
  } catch {
    return null;
  }
}

export interface CourierQuote {
  code: string | null;
  charge: number;
  codPct: number;
  codFixed: number;
  returnPct: number;
  /** RATE_CARD: from the courier's rate card; DEFAULT: the calculator's saved inputs. */
  source: 'RATE_CARD' | 'DEFAULT';
}

/** Charge, COD fee and return leg for a courier, city and weight. */
export function rateCardQuote(
  costs: OrderCostSettings | null,
  pick: { code?: string | null; city?: string | null; weightKg?: number | null },
  fallback: PriceDefaults['courier'],
): CourierQuote {
  const code = pick.code ?? fallback.code ?? null;
  const rate = code && costs ? costs.couriers[code] : undefined;
  const charge = rateCharge(rate, pick.city ?? fallback.city, pick.weightKg ?? fallback.weightKg);
  if (rate && charge !== null) {
    return { code, charge, codPct: rate.codPct, codFixed: rate.codFixed, returnPct: rate.rtoPct, source: 'RATE_CARD' };
  }
  return { code, charge: fallback.charge, codPct: fallback.codPct, codFixed: fallback.codFixed, returnPct: fallback.returnPct, source: 'DEFAULT' };
}

/** Couriers that have a rate card. */
export const rateCardCouriers = (costs: OrderCostSettings | null) => Object.keys(costs?.couriers ?? {});

/** Packaging per order from the selling-cost setting (a channel's own value first). */
export function packagingFrom(costs: OrderCostSettings | null, integrationId?: string | null): number | null {
  if (!costs) return null;
  if (integrationId && costs.packaging.byChannel[integrationId] !== undefined) return costs.packaging.byChannel[integrationId];
  return costs.packaging.default > 0 ? costs.packaging.default : null;
}
