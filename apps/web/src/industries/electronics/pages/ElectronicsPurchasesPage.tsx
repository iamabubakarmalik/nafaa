/**
 * Electronics purchases: the shared purchase editor and bill, plus serial
 * numbers. Serial products get a badge on the bill being written; each
 * received serial line shows how many of its units are entered against
 * this bill and opens the serial entry with the bill number and cost filled.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barcode, Plus } from 'lucide-react';
import { useShopParam } from '@core/stores/auth.store';
import { Button } from '@/design-system/components';
import { PurchaseEditorPage } from '@modules/purchasing/purchases/editor/PurchaseEditorPage';
import PurchaseDetailPage from '@modules/purchasing/purchases/pages/PurchaseDetailPage';
import { electronicsProductsApi } from '../api/products.api';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { AddUnitsModal } from '../components/AddUnitsModal';

/** Ids of products whose every piece carries a serial or IMEI. */
function useSerialProducts() {
  const { data = [] } = useQuery({
    queryKey: ['electronics-profiles-all'],
    queryFn: () => electronicsProductsApi.list().catch(() => []),
    staleTime: 5 * 60_000,
  });
  return new Set((data as Array<{ productId?: string; requiresSerial?: boolean; hasImei?: boolean }>)
    .filter((p) => p.productId && (p.requiresSerial || p.hasImei)).map((p) => p.productId!));
}

export function ElectronicsPurchaseEditor() {
  const ids = useSerialProducts();
  return (
    <PurchaseEditorPage config={{
      lineBadge: (productId) => ids.has(productId) ? (
        <span className="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1 text-[0.625rem] font-semibold text-violet-700"><Barcode className="h-2.5 w-2.5" /> Serial</span>
      ) : null,
    }} />
  );
}

interface Entry { productId: string; productName: string; expected: number; costPrice: number; supplierRef: string; have: number }

/** Units of one product entered against one purchase bill. */
function LineUnits({ productId, purchaseNumber, onAdd }: { productId: string; purchaseNumber: string; onAdd: (have: number) => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['electronics-serials', 'purchase', productId, purchaseNumber],
    queryFn: () => serialTrackingApi.list({ productId, search: purchaseNumber }),
  });
  const have = data.filter((s) => s.supplierRef === purchaseNumber).length;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-violet-50 px-2.5 py-2 ring-1 ring-violet-200">
      <span className="min-w-0 flex-1 text-[0.75rem] text-violet-800">Serial wali cheez — is bill ke <b>{isLoading ? '…' : have}</b> units darj</span>
      <Button size="xs" onClick={() => onAdd(have)} leftIcon={<Plus className="h-3 w-3" />} className="shrink-0">Serial daalein</Button>
    </div>
  );
}

export function ElectronicsPurchaseDetail() {
  const ids = useSerialProducts();
  const shopId = useShopParam();
  const [entry, setEntry] = useState<Entry | null>(null);
  return (
    <>
      {entry && (
        <AddUnitsModal product={{ id: entry.productId, name: entry.productName }} expected={entry.expected} alreadyHave={entry.have}
          costPrice={entry.costPrice} supplierRef={entry.supplierRef} shopId={shopId} onClose={() => setEntry(null)} />
      )}
      <PurchaseDetailPage config={{
        itemExtra: ({ item, purchase }) => {
          if (!item.productId || !ids.has(item.productId)) return null;
          return (
            <LineUnits productId={item.productId} purchaseNumber={purchase.purchaseNumber}
              onAdd={(have) => setEntry({
                productId: item.productId!, productName: item.itemName || item.product?.name || '',
                expected: item.baseQuantity ?? item.quantity, costPrice: item.costPrice / (item.conversionRate || 1),
                supplierRef: purchase.purchaseNumber, have,
              })} />
          );
        },
      }} />
    </>
  );
}
