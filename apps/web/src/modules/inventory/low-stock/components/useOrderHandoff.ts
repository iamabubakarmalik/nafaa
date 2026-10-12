/**
 * Hands a supplier's lines to the purchase editor as a new order. An order
 * belongs to one branch, so on the all-branches view the app first switches
 * to the branch the lines are for.
 */

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';
import type { PurchasePrefill } from '@modules/purchasing/purchases/editor/PurchaseEditorPage';
import type { LowRow } from '../api';
import type { OrderGroup } from './meta';

export function useOrderHandoff() {
  const navigate = useNavigate();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const setCurrentShop = useAuthStore((s) => s.setCurrentShop);

  return (g: OrderGroup, qtyOf: (r: LowRow) => number = (r) => r.suggestQty) => {
    const lines = g.rows.filter((r) => !r.made && qtyOf(r) > 0).map((r) => ({ productId: r.productId, qty: qtyOf(r) }));
    if (!lines.length) { toast.error('Mangwane ke liye koi miqdar nahi'); return; }
    if (currentShopId !== g.shopId) {
      setCurrentShop(g.shopId);
      toast.success(`${g.shopName} khul gayi — order isi branch ka banega`);
    }
    const prefill: PurchasePrefill = { supplierId: g.supplier?.id, supplierName: g.supplier?.name, lines };
    navigate('/purchases/new?order=1', { state: { prefill } });
  };
}
