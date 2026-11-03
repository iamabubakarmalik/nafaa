/**
 * Appliance counter (web appliances/pos/config.ts) on the shared POS. Big
 * units (AC, fridge, LED) are sold by serial: tapping a product with serials
 * on the shelf asks which unit is going, and scanning a serial puts that unit
 * on the bill. Each picked unit is marked sold on the bill right after it is
 * saved, so its warranty starts on the bill date, and the after-sale step
 * offers installation, delivery and a qist plan. Units come from this
 * counter's branch only. A bill with picked units needs the internet because
 * the units are matched on the server.
 */

import { useQuery } from '@tanstack/react-query';
import { msg, t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { toast } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { useLastSale } from '@/modules/pos/engine/checkout';
import { generalPos, registerPosIndustry, type PosIndustryConfig, type PosTradeIn } from '@/modules/pos/engine/industry';
import { applianceSerialApi, tradeInsApi } from './api';
import { AppliancesOverlay, TradeInTake, askAfterSale, askUnit, type AfterSaleLine, type PickedUnit } from './components/PosSheets';
import { refreshAppliances, KEYS } from './meta';

/** Units picked on the open bill and the bill's lines as last checked out. */
const counter = { picked: [] as PickedUnit[], lines: [] as AfterSaleLine[] };
const allowOnce = new Set<string>();

let shelf = new Map<string, number>();
let loadedAt = 0;
/** In-stock serial units per product on this branch, to know which products ask for a unit. */
function refreshShelf() {
  if (!isOnline() || Date.now() - loadedAt < 30_000) return;
  loadedAt = Date.now();
  applianceSerialApi.counter().then((units) => {
    const m = new Map<string, number>();
    for (const u of units) m.set(u.productId, (m.get(u.productId) ?? 0) + 1);
    shelf = m;
  }).catch(() => { loadedAt = 0; });
}

/** Keeps no more picked units per product than the bill sells; the latest picks win. */
function trimPicked() {
  const lines = useBill.getState().lines;
  const qty = new Map<string, number>();
  for (const l of lines) if (l.productId) qty.set(l.productId, (qty.get(l.productId) ?? 0) + Math.floor(l.baseQuantity));
  const kept: PickedUnit[] = [];
  for (const p of [...counter.picked].reverse()) {
    const left = qty.get(p.productId) ?? 0;
    if (left > 0) { kept.unshift(p); qty.set(p.productId, left - 1); }
  }
  counter.picked = kept;
  counter.lines = lines.filter((l) => l.productId).map((l) => ({ productId: l.productId!, name: l.name, qty: l.baseQuantity }));
}

/** Old units held in the shop; offered as a Trade-in payment (online only). */
function useApplianceTradeIns(): PosTradeIn[] | undefined {
  return useQuery({ queryKey: ['appliance-trade-ins', 'counter'], queryFn: tradeInsApi.counter, staleTime: 10_000, enabled: isOnline() }).data;
}

export const appliancesPos: PosIndustryConfig = {
  ...generalPos,
  id: 'appliances',
  searchHint: msg('Model, brand, ton, liter — ya barcode / serial scan karein'),
  receiptFooter: 'Warranty ke liye ye bill aur warranty card sambhaal kar rakhein. Bijli ke utaar charhao, paani ya tootne ka nuqsan warranty me nahi.',
  Overlay: AppliancesOverlay,
  CartExtra: TradeInTake,
  useTradeIns: useApplianceTradeIns,
  beforeCheckout: () => {
    trimPicked();
    return !isOnline() && counter.picked.length ? t('Internet nahi — serial wala bill online hi banta hai') : null;
  },
  afterSale: (sale) => {
    const units = counter.picked;
    const lines = counter.lines;
    counter.picked = [];
    refreshAppliances([KEYS.tradeIn]);
    if (units.length) {
      void applianceSerialApi.assignSale(sale.id, units.map((u) => u.serialId))
        .then(() => refreshAppliances([KEYS.serial]))
        .catch(() => toast.error(t('Serial {{value}} bill par nahi lage — Serial register se dobara lagayein', { value: units.map((u) => u.serialNumber).join(', ') })));
    }
    // The shared checkout stores the finished sale right after this call.
    setTimeout(() => {
      const done = useLastSale.getState().sale;
      const customer = done?.customerId ? { id: done.customerId, name: done.customerName ?? '', phone: done.customerPhone ?? '' } : null;
      const credit = done?.credit ?? 0;
      const relevant = lines.some((l) => shelf.has(l.productId)) || units.length > 0 || (credit > 0 && !!customer);
      if (relevant) askAfterSale({ saleId: sale.id, saleNumber: sale.saleNumber, lines, units, total: done?.total ?? 0, credit, customer });
    }, 0);
  },
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId)) return 'continue';
    refreshShelf();
    if (!useBill.getState().lines.length) counter.picked = [];
    const units = shelf.get(productId) ?? 0;
    if (!units || !isOnline()) return 'continue';
    void (async () => {
      const name = useBill.getState().lines.find((l) => l.productId === productId)?.name ?? (await import('@/core/offline').then((m) => m.offline.products.get(productId, api.shopId).catch(() => null)))?.name ?? '';
      askUnit({
        productId, name, taken: new Set(counter.picked.map((p) => p.serialId)),
        onPick: (u) => {
          if (counter.picked.some((p) => p.serialId === u.id)) { toast.info(t('Ye unit pehle se bill me hai')); return; }
          counter.picked.push({ productId, serialId: u.id, serialNumber: u.serialNumber });
          allowOnce.add(productId);
          void api.addProduct(productId, { ...opts, note: [opts.note, `S/N ${u.serialNumber}`].filter(Boolean).join(' · ') }).then((ok) => { if (!ok) { allowOnce.delete(productId); counter.picked.pop(); } });
        },
        onSkip: () => { allowOnce.add(productId); void api.addProduct(productId, opts).then((ok) => { if (!ok) allowOnce.delete(productId); }); },
      });
    })();
    return 'handled';
  },
  scan: async (code, api) => {
    if (!isOnline() || code.trim().length < 4) return false;
    // A product barcode wins over a serial number.
    const { offline } = await import('@/core/offline');
    if (await offline.products.byBarcode(code.trim(), api.shopId).catch(() => null)) return false;
    try {
      const s = await applianceSerialApi.counterLookup(code.trim());
      if (!s) return false;
      if (s.status !== 'IN_STOCK') { toast.error(t('Serial {{serialNumber}} — {{value}}', { serialNumber: s.serialNumber, value: s.status === 'SOLD' ? t('pehle bik chuka ({{value}})', { value: s.invoiceNumber ?? '' }) : t('stock me nahi') })); return true; }
      if (s.otherBranch) { toast.error(t('Serial {{serialNumber}} {{otherBranch}} me hai — pehle Transfer karein', { serialNumber: s.serialNumber, otherBranch: s.otherBranch })); return true; }
      if (counter.picked.some((p) => p.serialId === s.id)) { toast.info(t('Ye unit pehle se bill me hai')); return true; }
      if (!useBill.getState().lines.length) counter.picked = [];
      counter.picked.push({ productId: s.productId, serialId: s.id, serialNumber: s.serialNumber });
      allowOnce.add(s.productId);
      const ok = await api.addProduct(s.productId, { note: `S/N ${s.serialNumber}` });
      if (!ok) { allowOnce.delete(s.productId); counter.picked.pop(); }
      return true;
    } catch {
      return false;
    }
  },
};

registerPosIndustry(appliancesPos);
