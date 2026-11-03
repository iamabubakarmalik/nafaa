/**
 * Electronics counter (web electronics/pos/config.ts) on the shared POS.
 * Serial-tracked products ask which unit is being sold; scanning a serial or
 * IMEI puts that exact unit on the bill; a sold item carries its warranty. The
 * Bundles tab sells deals of several products. A serial unit is checked on the
 * server when sold, so such a bill needs internet.
 */

import { Layers } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { offline } from '@/core/offline';
import { queryClient } from '@/core/query/client';
import { toast } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { electronicsPosApi, serialTrackingApi, type ElectronicsPosCatalog } from './api';
import { BundlesTab, CATALOG_KEY, ElectronicsOverlay, setElectronicsPos } from './components/PosPieces';
import { serialStatusOf } from './meta';

const allowOnce = new Set<string>();

async function catalogFor(shopId: string | null): Promise<ElectronicsPosCatalog | null> {
  const key = [CATALOG_KEY, shopId];
  const cached = queryClient.getQueryData<ElectronicsPosCatalog>(key);
  if (cached) { if (isOnline()) void queryClient.prefetchQuery({ queryKey: key, queryFn: () => electronicsPosApi.catalog({ shopId: shopId ?? undefined }), staleTime: 20_000 }); return cached; }
  if (!isOnline()) return null;
  try { return await queryClient.fetchQuery({ queryKey: key, queryFn: () => electronicsPosApi.catalog({ shopId: shopId ?? undefined }), staleTime: 20_000 }); } catch { return null; }
}

export const electronicsPos: PosIndustryConfig = {
  ...generalPos,
  id: 'electronics',
  searchHint: msg('Naam, brand, model — ya barcode / serial / IMEI scan karein'),
  receiptFooter: 'Warranty claim ke liye ye bill aur dabba zaroori. Physical ya paani ka nuqsan warranty mein nahi.',
  Overlay: ElectronicsOverlay,
  extraView: { label: msg('Bundles'), icon: Layers, Component: BundlesTab },
  beforeCheckout: () => (!isOnline() && useBill.getState().lines.some((l) => l.serialId || l.comboSerials?.length) ? t('Internet nahi — serial wala bill online hi banta hai') : null),
  beforeAdd: (productId, opts, api) => {
    if (opts.serial) return 'continue';
    if (allowOnce.delete(productId)) return 'continue';
    void (async () => {
      const go = async (o = opts) => { allowOnce.add(productId); const ok = await api.addProduct(productId, o); if (!ok) allowOnce.delete(productId); };
      const item = (await catalogFor(api.shopId))?.items.find((i) => i.id === productId);
      if (!item) { await go(); return; }
      if (item.notInShop) { toast.error(t('{{name}} is branch mein assign nahi — Transfer ya Purchase entry karein', { name: item.name })); return; }
      const warrantyMonths = item.warrantyMonths || undefined;
      if (item.requiresSerial || item.hasImei) {
        if (!isOnline()) { toast.error(t('Internet nahi — {{what}} sirf online hota hai. Accessories offline bik sakti hain.', { what: t('serial wali cheez bechna') })); return; }
        if ((item.availableStock ?? item.stock) <= 0) { toast.error(t('{{name}} — koi unit stock mein nahi', { name: item.name })); return; }
        setElectronicsPos({ serial: { productId, name: item.name, opts, warrantyMonths } });
        return;
      }
      await go(warrantyMonths && opts.warrantyMonths === undefined ? { ...opts, warrantyMonths } : opts);
    })();
    return 'handled';
  },
  scan: async (code, api) => {
    const c = code.trim();
    if (c.length < 5 || !isOnline()) return false;
    // Product barcodes are handled by the shared scan; only unknown codes go to the serial lookup.
    if (await offline.products.byBarcode(c, api.shopId).catch(() => null)) return false;
    try {
      const s = await serialTrackingApi.lookup(c);
      if (!s) return false;
      if (s.status !== 'IN_STOCK') { toast.error(t('Serial {{serialNumber}} — {{value}}', { serialNumber: s.serialNumber, value: t(serialStatusOf(s.status).label) })); return true; }
      if (useBill.getState().lines.some((l) => l.serialId === s.id)) { toast.info(t('Ye unit pehle se bill mein hai')); return true; }
      const item = (await catalogFor(api.shopId))?.items.find((i) => i.id === s.productId);
      if (!item) { toast.error(t('Is serial ka product is branch ke catalog mein nahi')); return true; }
      await api.addProduct(s.productId, { serial: { id: s.id, serialNumber: s.serialNumber, imei: s.imei }, warrantyMonths: item.warrantyMonths || undefined });
      return true;
    } catch { return false; }
  },
};

registerPosIndustry(electronicsPos);
