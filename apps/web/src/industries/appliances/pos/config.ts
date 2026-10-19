/**
 * Appliance counter on the shared POS engine. Big units (AC, fridge, LED)
 * are sold by serial: tapping a product with serials on the shelf asks which
 * unit is going, and scanning a serial puts that unit on the bill. Each
 * picked unit is marked sold on the bill right after it is saved, so its
 * warranty starts on the bill date. Accessories and small items sell like
 * any product.
 *
 * Offline: products sell from the offline store; a bill with picked serial
 * units needs the internet, because the units are matched on the server.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, Barcode, HardHat, Sparkles, Truck } from 'lucide-react';
import { useProductCatalog, type PosEngineApi, type PosFilter, type PosIndustryConfig, type PosItem, type PosSavedSale } from '@modules/pos/engine';
import type { PosCartLine } from '@modules/pos/lib/posCart';
import type { ApplianceProductProfile } from '../api/products.api';
import { useApplianceProfiles } from '../components/profiles';
import { applianceSerialApi, type ApplianceSerial } from '../api/serial-tracking.api';
import { CATEGORY_GROUPS, PROFILE_KEY, SERIAL_KEY, catMeta } from '../components/meta';
import { SerialPicker } from './SerialPicker';

/** A unit picked for the bill; marked sold once the bill is saved. */
export interface PickedUnit { productId: string; serialId: string; serialNumber: string }

/** Units picked on the open bill and the bill's lines as last checked out. */
export const counter = {
  picked: [] as PickedUnit[],
  lines: [] as Array<{ productId: string; name: string; qty: number }>,
};

/** Receives each bill the server saved; AppliancesPos sets it while the counter is open. */
export const applianceSaleListener: { current: ((sale: PosSavedSale, units: PickedUnit[]) => void) | null } = { current: null };

const STOCK_KEY = [SERIAL_KEY, 'pos-in-stock'];

/** Serial units on the shelf per product (first 200), to know which products ask for a unit. */
function useShelf() {
  return useQuery({ queryKey: STOCK_KEY, queryFn: () => applianceSerialApi.list({ status: 'IN_STOCK', limit: 200 }), staleTime: 30_000, enabled: navigator.onLine });
}

function decorate(profiles: Map<string, ApplianceProductProfile>, shelf: Map<string, number>) {
  return (it: PosItem): PosItem => {
    const p = profiles.get(it.id);
    if (!p) return { ...it, rank: 2 };
    const units = shelf.get(it.id) ?? 0;
    const m = catMeta(p.categoryType);
    return {
      ...it,
      rank: m.heavy ? 0 : 1,
      searchText: [it.searchText, p.modelNumber, p.brand?.name, p.capacity, p.acTonnage, m.label].filter(Boolean).join(' '),
      badges: [
        ...(units ? [{ label: `${units} serial`, tone: 'neutral' as const, icon: Barcode }] : []),
        ...(p.requiresInstallation ? [{ label: 'Fitting', tone: 'info' as const, icon: HardHat }] : []),
        ...(p.isBestSeller ? [{ label: 'Best seller', tone: 'brand' as const, icon: Award }] : []),
        ...(p.isNewArrival ? [{ label: 'Naya', tone: 'success' as const, icon: Sparkles }] : []),
        ...(p.freeDelivery ? [{ label: 'Free delivery', tone: 'success' as const, icon: Truck }] : []),
      ],
      subline: [p.brand?.name, p.modelNumber, p.acTonnage ? `${p.acTonnage} ton` : p.capacity, p.warrantyMonths ? `${p.warrantyMonths}m warranty` : ''].filter(Boolean).join(' · ') || undefined,
      meta: { ...it.meta, group: m.group, units, warrantyMonths: p.warrantyMonths || undefined, profile: p },
    };
  };
}

function useApplianceCatalog() {
  const profiles = useApplianceProfiles();
  const shelfQ = useShelf();
  const shelf = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of shelfQ.data?.items ?? []) m.set(u.productId, (m.get(u.productId) ?? 0) + 1);
    return m;
  }, [shelfQ.data]);
  const catalog = useProductCatalog(decorate(profiles, shelf), [profiles, shelf]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, SERIAL_KEY, PROFILE_KEY] };
}

/** Puts one exact unit on the bill and remembers it for marking sold. */
function addUnit(item: PosItem, u: Pick<ApplianceSerial, 'id' | 'serialNumber'>, api: PosEngineApi) {
  if (!api.cart.length) counter.picked = [];
  if (counter.picked.some((p) => p.serialId === u.id)) { toast.info('Ye unit pehle se bill me hai'); return; }
  counter.picked.push({ productId: item.id, serialId: u.id, serialNumber: u.serialNumber });
  api.addItem(item, { confirmed: ['serial'], note: `S/N ${u.serialNumber}`, warrantyMonths: item.meta?.warrantyMonths as number | undefined });
}

/** Keeps no more picked units per product than the bill sells. */
function trimPicked(cart: PosCartLine[]) {
  const qty = new Map<string, number>();
  for (const l of cart) if (l.productId) qty.set(l.productId, (qty.get(l.productId) ?? 0) + Math.floor(l.baseQuantity));
  // The latest picks win: an earlier pick whose line was removed drops out first.
  const kept: PickedUnit[] = [];
  for (const p of [...counter.picked].reverse()) {
    const left = qty.get(p.productId) ?? 0;
    if (left > 0) { kept.unshift(p); qty.set(p.productId, left - 1); }
  }
  counter.picked = kept;
  counter.lines = cart.filter((l) => l.productId).map((l) => ({ productId: l.productId!, name: l.name, qty: l.baseQuantity }));
}

const filters: PosFilter[] = CATEGORY_GROUPS.filter((g) => g !== 'Kuch aur').map((g) => ({ id: g, label: g, match: (i) => i.meta?.group === g }));

export const appliancesPos: PosIndustryConfig = {
  id: 'appliances',
  label: 'Appliances',
  useCatalog: useApplianceCatalog,
  filters: [{ id: 'accessories', label: 'Accessories', match: (i) => !i.meta?.profile }, ...filters],
  quickKeys: true,
  searchHint: 'Model, brand, ton, liter — ya barcode / serial scan karein',
  receiptFooter: 'Warranty ke liye ye bill aur warranty card sambhaal kar rakhein. Bijli ke utaar charhao, paani ya tootne ka nuqsan warranty me nahi.',
  beforeCheckout: (cart) => {
    trimPicked(cart);
    return !navigator.onLine && counter.picked.length ? 'Internet nahi — serial wala bill online hi banta hai' : null;
  },
  onSale: (sale) => {
    const units = counter.picked;
    counter.picked = [];
    if (units.length) {
      void applianceSerialApi.assignSale(sale.id, units.map((u) => u.serialId))
        .catch(() => toast.error(`Serial ${units.map((u) => u.serialNumber).join(', ')} bill par nahi lage — Serial register se dobara lagayein`));
    }
    applianceSaleListener.current?.(sale, units);
  },
  beforeAdd: (item, opts, api) => {
    if (opts.confirmed?.includes('serial')) return 'continue';
    // A new bill starts with nothing picked.
    if (!api.cart.length) counter.picked = [];
    const units = Number(item.meta?.units) || 0;
    if (!units || !navigator.onLine) return 'continue';
    const taken = new Set(counter.picked.map((p) => p.serialId));
    api.openPicker(createElement(SerialPicker, {
      item, taken,
      onPick: (u: ApplianceSerial) => { api.closePicker(); addUnit(item, u, api); },
      onSkip: () => { api.closePicker(); api.addItem(item, { ...opts, confirmed: [...(opts.confirmed ?? []), 'serial'], warrantyMonths: item.meta?.warrantyMonths as number | undefined }); },
      onClose: api.closePicker,
    }));
    return 'handled';
  },
  scan: async (code, api) => {
    if (api.findItemByCode(code) || !navigator.onLine || code.trim().length < 4) return false;
    try {
      const s = await applianceSerialApi.lookup(code.trim());
      if (!s) return false;
      if (s.status !== 'IN_STOCK') { toast.error(`Serial ${s.serialNumber} — ${s.status === 'SOLD' ? `pehle bik chuka (${s.invoiceNumber ?? ''})` : 'stock me nahi'}`); return true; }
      const item = api.itemById(s.productId);
      if (!item) { toast.error('Is serial ka product counter par nahi'); return true; }
      addUnit(item, s, api);
      return true;
    } catch {
      return false;
    }
  },
};
