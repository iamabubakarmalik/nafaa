/**
 * Book costs on a purchase bill (web bookstore usePublisherCosts): when the
 * supplier is a publisher's supplier, each of its books costs the list price
 * less the publisher's discount. Costs per supplier are loaded once and kept
 * for a minute; failed lookups keep the usual cost.
 */

import { queryClient } from '@/core/query/client';
import { t } from '@/core/i18n';
import { registerPurchaseExtras } from '@/modules/purchasing/industry/registry';
import { publishersApi } from './api';

const costsFor = (supplierId: string) => queryClient.fetchQuery({
  queryKey: ['bookstore-publisher-costs', supplierId],
  queryFn: () => publishersApi.purchaseCosts(supplierId),
  staleTime: 60_000,
}).catch(() => null);

registerPurchaseExtras('bookstore', {
  lineCost: async ({ supplierId, productId }) => {
    if (!supplierId) return null;
    const d = await costsFor(supplierId);
    const line = d?.lines.find((l) => l.productId === productId);
    if (!line) return null;
    const note = d!.publishers.map((p) => t('{{name}} {{pct}}% Discount', { name: p.name, pct: p.discountPct })).join(', ');
    return { cost: line.cost, note };
  },
});
