/**
 * Book costs on a purchase bill: when the supplier is a publisher's
 * supplier, each of that publisher's books costs its list price (MRP, else
 * selling price) less the publisher's discount %. The shared purchase
 * editor calls this through PurchaseEditorConfig.useSupplierCosts.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { publishersApi } from '../api/publishers.api';

export interface SupplierCosts {
  /** Cost of one base unit, by product id. */
  costs: ReadonlyMap<string, number>;
  /** Short reason shown when lines are filled, e.g. "Oxford 25% discount". */
  note: string;
}

export function usePublisherCosts(supplierId: string): SupplierCosts | undefined {
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const q = useQuery({
    queryKey: ['bookstore-publisher-costs', supplierId],
    queryFn: () => publishersApi.purchaseCosts(supplierId),
    enabled: !!supplierId && canBuy,
    staleTime: 60_000,
  });
  return useMemo(() => {
    const d = q.data;
    if (!d?.lines.length) return undefined;
    return {
      costs: new Map(d.lines.map((l) => [l.productId, l.cost])),
      note: d.publishers.map((p) => `${p.name} ${p.discountPct}% discount`).join(', '),
    };
  }, [q.data]);
}
