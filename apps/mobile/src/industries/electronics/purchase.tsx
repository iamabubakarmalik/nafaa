/**
 * Electronics purchases (web ElectronicsPurchasesPage): the shared purchase
 * editor and bill, plus serial numbers. Serial products get a badge on the bill
 * being written; each received serial line shows how many of its units are
 * entered against this bill and opens the serial entry with the bill number
 * and cost filled in.
 */

import { useQuery } from '@tanstack/react-query';
import { Barcode, Plus } from 'lucide-react-native';
import { useState } from 'react';

import { t } from '@/core/i18n';
import { Badge, Button, Card, Row, Text } from '@/design';
import { registerPurchaseExtras } from '@/modules/purchasing/industry/registry';
import { electronicsProductsApi, serialTrackingApi } from './api';
import { AddUnitsSheet } from './components/UnitSheets';

/** Ids of products whose every piece carries a serial or IMEI. */
function useSerialProducts() {
  const { data = [] } = useQuery({ queryKey: ['electronics-profiles-all'], queryFn: () => electronicsProductsApi.list().catch(() => []), staleTime: 5 * 60_000 });
  return new Set(data.filter((p) => p.productId && (p.requiresSerial || p.hasImei)).map((p) => p.productId as string));
}

function LineBadge({ productId }: { productId: string }) {
  return useSerialProducts().has(productId) ? <Badge tone="accent" icon={Barcode}>{t('Serial')}</Badge> : null;
}

function ItemExtra({ item, purchase }: { item: { productId?: string | null; itemName?: string; product?: { name?: string } | null; baseQuantity?: number; quantity: number; costPrice: number; conversionRate?: number }; purchase: { purchaseNumber: string } }) {
  const ids = useSerialProducts();
  const [open, setOpen] = useState(false);
  const productId = item.productId ?? '';
  const units = useQuery({ queryKey: ['electronics-serials', 'purchase', productId, purchase.purchaseNumber], queryFn: () => serialTrackingApi.list({ productId, search: purchase.purchaseNumber }), enabled: !!productId && ids.has(productId) });
  if (!productId || !ids.has(productId)) return null;
  const have = (units.data ?? []).filter((s) => s.supplierRef === purchase.purchaseNumber).length;
  return (
    <>
      <Card tone="info">
        <Row gap={2} style={{ justifyContent: 'space-between' }}>
          <Text size="sm" style={{ flex: 1 }}>{t('Serial wali cheez — is bill ke {{count}} units darj', { count: units.isLoading ? 0 : have })}</Text>
          <Button size="sm" icon={Plus} onPress={() => setOpen(true)}>{t('Serial daalein')}</Button>
        </Row>
      </Card>
      <AddUnitsSheet open={open} onClose={() => setOpen(false)} product={{ id: productId, name: item.itemName || item.product?.name || '' }} expected={item.baseQuantity ?? item.quantity} alreadyHave={have}
        costPrice={item.costPrice / (item.conversionRate || 1)} supplierRef={purchase.purchaseNumber} />
    </>
  );
}

registerPurchaseExtras('electronics', { LineBadge, ItemExtra: ItemExtra as never });
