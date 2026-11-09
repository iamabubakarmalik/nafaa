/**
 * Supplier links for the purchase editor: each product's preferred supplier,
 * the pack usually bought and the cost per base unit from a chosen supplier
 * (usual cost, else the last price paid). Loaded once per page.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productSuppliersApi, type SupplierLinkRow } from '@modules/inventory/products/api/product-suppliers.api';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { t } from '@core/i18n';

export function useSupplierLinks() {
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const q = useQuery({ queryKey: ['supplier-links'], queryFn: () => productSuppliersApi.map(), enabled: canBuy, staleTime: 60_000 });
  return useMemo(() => {
    const rows = q.data ?? [];
    const preferred = new Map<string, SupplierLinkRow>();
    const byPair = new Map<string, SupplierLinkRow>();
    for (const r of rows) {
      if (r.isPreferred) preferred.set(r.productId, r);
      byPair.set(`${r.productId}:${r.supplierId}`, r);
    }
    return { preferred, link: (productId: string, supplierId: string) => byPair.get(`${productId}:${supplierId}`) };
  }, [q.data]);
}

/** Default `useSupplierCosts` of the shared editor: this supplier's cost per base unit for each linked product. */
export function useLinkedSupplierCosts(supplierId: string) {
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const q = useQuery({ queryKey: ['supplier-links'], queryFn: () => productSuppliersApi.map(), enabled: canBuy && !!supplierId, staleTime: 60_000 });
  return useMemo(() => {
    if (!supplierId) return undefined;
    const costs = new Map<string, number>();
    for (const r of q.data ?? []) {
      if (r.supplierId !== supplierId) continue;
      const c = Number(r.costPrice) > 0 ? Number(r.costPrice) : Number(r.lastPurchasePrice) > 0 ? Number(r.lastPurchasePrice) : 0;
      if (c > 0) costs.set(r.productId, c);
    }
    return costs.size ? { costs, note: t('is supplier ke rate') } : undefined;
  }, [q.data, supplierId]);
}
