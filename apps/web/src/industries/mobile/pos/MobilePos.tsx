/**
 * Mobile shop counter: the shared POS with the mobile config, plus the qist
 * plan offer after a phone is sold on udhaar to a named customer.
 */

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useShopParam } from '@core/stores/auth.store';
import { PosScreen, type PosSavedSale } from '@modules/pos/engine';
import type { MobilePosCatalog } from '../api/mobile-pos.api';
import { QistPlanPrompt, type QistSale } from './QistPlanPrompt';
import { mobilePos, mobileSaleListener } from './config';
import { CATALOG_KEY } from './liveCatalog';

export default function MobilePos() {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const canPlan = usePermission(PERMISSIONS.KHATA_MANAGE);
  const [qist, setQist] = useState<QistSale | null>(null);

  // The engine calls `onSale` only for bills the server saved; offline bills get their plan later from Qist plans.
  const offerQist = useRef<(sale: PosSavedSale) => void>(() => undefined);
  offerQist.current = (sale) => {
    if (!canPlan || !sale.customer || !(Number(sale.creditAmount) > 0)) return;
    const phoneIds = new Set(qc.getQueryData<MobilePosCatalog>([CATALOG_KEY, shopId])?.phoneProductIds ?? []);
    const hasPhone = (sale.items ?? []).some((i) => i.usedPhoneId || (i.productId && phoneIds.has(i.productId)));
    if (!hasPhone) return;
    setQist({
      id: sale.id, saleNumber: sale.saleNumber, total: Number(sale.total) || 0, creditAmount: Number(sale.creditAmount) || 0,
      customer: { id: sale.customer.id, name: sale.customer.name, phone: sale.customer.phone },
    });
  };
  useEffect(() => {
    const listener = (sale: PosSavedSale) => offerQist.current(sale);
    mobileSaleListener.current = listener;
    return () => { if (mobileSaleListener.current === listener) mobileSaleListener.current = null; };
  }, []);

  return (
    <>
      <PosScreen config={mobilePos} />
      {qist && <QistPlanPrompt sale={qist} onClose={() => setQist(null)} />}
    </>
  );
}
