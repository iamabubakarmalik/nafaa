/**
 * Mobile shop POS on the shared engine. New phones are sold by IMEI: tapping
 * a model opens the list of its in-stock phones in this branch, and scanning
 * an IMEI puts that phone straight on the bill. Used phones are sold as they
 * are (no catalog product), accessories like any product, and used phones
 * taken in as an exchange can pay part of the bill at checkout. Repaired
 * phones waiting at the counter are handed back from the "Repair wapsi" chip.
 *
 * Offline: accessories come from the offline product store and sell as in
 * every other POS. Phones, used phones and repair hand-overs show from the
 * last saved list but need the internet, because the IMEI or job must be
 * checked on the server at that moment.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Headphones, Recycle, ShieldAlert, Smartphone, Wrench } from 'lucide-react';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useShopParam } from '@core/stores/auth.store';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { PosTradeIn } from '@modules/pos/components';
import {
  useProductCatalog, type AddOptions, type PosEngineApi, type PosFilter, type PosIndustryConfig, type PosItem, type PosSavedSale,
} from '@modules/pos/engine';
import type { PosPhone } from '../api/mobile-pos.api';
import { PTA_STATUS_LABELS } from '../api/imei.api';
import { repairsApi, type RepairTicket } from '../api/repairs.api';
import { CONDITION_LABELS, usedPhonesApi, type UsedPhone } from '../api/used-phones.api';
import { IMEI_KEY, REPAIR_KEY, USED_KEY, repairStatusOf } from '../components/meta';
import { ImeiPicker } from './ImeiPicker';
import { CATALOG_KEY, useLiveCatalog } from './liveCatalog';
import { CounterNotes } from './CounterNotes';
import { RepairHandover } from './RepairHandover';

type Kind = 'phone' | 'used' | 'accessory' | 'repair';
const kindOf = (it: PosItem) => it.meta?.kind as Kind | undefined;
const phonesOf = (it: PosItem) => (it.meta?.phones as PosPhone[] | undefined) ?? [];

const fakeProduct = (p: { id: string; name: string; sku?: string | null; price: number; image?: string | null }) => ({
  id: p.id, name: p.name, sku: p.sku ?? null, barcode: null, unit: 'pcs', price: p.price,
  costPrice: 0, isActive: true, images: p.image ? [{ url: p.image, isPrimary: true }] : [],
}) as unknown as Product;

/** One card per phone model, carrying its in-stock IMEIs. */
function phoneItems(phones: PosPhone[]): PosItem[] {
  const byProduct = new Map<string, PosPhone[]>();
  for (const p of phones) byProduct.set(p.productId, [...(byProduct.get(p.productId) ?? []), p]);
  return [...byProduct.values()].map((list) => {
    const first = list[0];
    const prices = list.map((p) => Number(p.salePrice) || 0).filter((x) => x > 0);
    const price = prices.length ? Math.min(...prices) : 0;
    const variants = [...new Set(list.map((p) => p.variant?.name).filter(Boolean))];
    const unapproved = list.filter((p) => p.ptaStatus === 'NON_PTA' || p.ptaStatus === 'PENDING').length;
    return {
      id: first.productId,
      product: fakeProduct({ id: first.productId, name: first.productName, sku: first.product?.sku, price, image: first.imageUrl }),
      name: first.productName,
      price,
      stock: list.length,
      unit: 'pcs',
      image: first.imageUrl ?? undefined,
      searchText: [first.brandName, ...variants, ...list.flatMap((p) => [p.imei1, p.imei2 ?? '', p.color ?? ''])].filter(Boolean).join(' '),
      rank: 0,
      badges: [
        { label: 'IMEI', tone: 'neutral' as const, icon: Smartphone },
        ...(unapproved ? [{ label: `${unapproved} PTA baqi`, tone: 'warning' as const, icon: ShieldAlert }] : []),
      ],
      subline: [first.brandName, variants.length > 1 ? `${variants.length} variant` : variants[0], `${list.length} phone`].filter(Boolean).join(' · '),
      meta: { kind: 'phone' satisfies Kind, phones: list },
    };
  });
}

function usedItems(list: UsedPhone[]): PosItem[] {
  return list.map((u) => {
    const name = [`${u.brand} ${u.model}`, u.storage].filter(Boolean).join(' ');
    const price = Number(u.resalePrice) || 0;
    return {
      id: `used:${u.id}`,
      product: fakeProduct({ id: `used:${u.id}`, name, sku: u.usedPhoneCode, price }),
      name: `${name} (Used)`,
      price,
      stock: 1,
      unit: 'pcs',
      searchText: [u.usedPhoneCode, u.imei1, u.imei2 ?? '', u.color ?? '', 'used'].join(' '),
      rank: 1,
      badges: [{ label: 'Used', tone: 'info' as const, icon: Recycle }],
      subline: [u.usedPhoneCode, CONDITION_LABELS[u.condition], PTA_STATUS_LABELS[u.ptaStatus]].filter(Boolean).join(' · '),
      meta: { kind: 'used' satisfies Kind, used: u },
    };
  });
}

/** Repaired (or not repairable) phones waiting to go back, priced at what is still due. */
function repairItems(list: RepairTicket[]): PosItem[] {
  return list.map((t) => {
    const due = Math.max((Number(t.totalCost) || 0) - (Number(t.paidAmount) || 0), 0);
    const name = `${t.deviceBrand} ${t.deviceModel}`.trim();
    return {
      id: `repair:${t.id}`,
      product: fakeProduct({ id: `repair:${t.id}`, name, sku: t.ticketNumber, price: due }),
      name: `${name} — ${t.customerName}`,
      price: due,
      stock: 1,
      unit: 'pcs',
      searchText: [t.ticketNumber, t.customerName, t.customerPhone, t.imei1 ?? '', 'repair'].join(' '),
      rank: 3,
      badges: [{ label: repairStatusOf(t.status).label, tone: t.status === 'READY' ? 'success' as const : 'warning' as const, icon: Wrench }],
      subline: `${t.ticketNumber} · ${due > 0 ? 'baqi' : 'kuch baqi nahi'}`,
      meta: { kind: 'repair' satisfies Kind, ticket: t },
    };
  });
}

function useMobileCatalog() {
  const shopId = useShopParam();
  const canHandOver = usePermission(PERMISSIONS.MOBILE_REPAIRS_MANAGE);
  const live = useLiveCatalog();
  const repairs = useQuery({
    queryKey: [REPAIR_KEY, 'handover', shopId],
    queryFn: () => repairsApi.list({ view: 'handover', shopId: shopId || undefined, limit: 200 }),
    enabled: !!shopId && canHandOver,
    staleTime: 15_000,
  });
  // Accessories: the offline product store every POS uses, minus anything sold by IMEI.
  const products = useProductCatalog();
  const items = useMemo(() => {
    const phoneIds = new Set(live.data?.phoneProductIds ?? []);
    const accessories = products.items
      .filter((it) => !phoneIds.has(it.id) && (it.product as { productType?: string | null }).productType !== 'PHONE')
      .map((it) => ({ ...it, rank: 2, meta: { kind: 'accessory' satisfies Kind } }));
    return [
      ...phoneItems(live.data?.phones ?? []),
      ...usedItems(live.data?.usedPhones ?? []),
      ...accessories,
      ...repairItems(repairs.data?.items ?? []),
    ];
  }, [live.data, repairs.data, products.items]);
  return {
    items,
    loading: products.loading || live.isLoading,
    refreshKeys: [...products.refreshKeys, CATALOG_KEY, USED_KEY, IMEI_KEY, 'imei-stats', 'product-imeis', 'imei-available', 'mobile-imei-lookup', 'used-phones-stats'],
  };
}

/** Used phones taken in as an exchange, offered as a trade-in payment. */
function useMobileTradeIns(): PosTradeIn[] {
  const { data = [] } = useQuery({
    queryKey: [USED_KEY, 'trade-ins-open'],
    queryFn: usedPhonesApi.openTradeIns,
    staleTime: 30_000,
  });
  return useMemo(() => data.map((p) => ({
    code: p.usedPhoneCode,
    label: [`${p.brand} ${p.model}`, p.storage, p.fromCustomerName].filter(Boolean).join(' · '),
    value: Number(p.buybackPrice) || 0,
  })), [data]);
}

/** Phones, used phones and repair hand-overs are checked on the server, so they need a connection. */
function needsInternet(what: string) {
  if (navigator.onLine) return false;
  toast.error(`Internet nahi — ${what} sirf online hota hai. Accessories offline bik sakti hain.`);
  return true;
}

/** Puts one exact phone on the bill, after a check when it is not PTA approved. */
function addPhone(item: PosItem, p: PosPhone, api: PosEngineApi, opts: AddOptions = {}) {
  if ((p.ptaStatus === 'NON_PTA' || p.ptaStatus === 'PENDING')
    && !window.confirm(`${item.name} (${p.imei1}) ${PTA_STATUS_LABELS[p.ptaStatus]} hai. Customer ko bata diya? Bill me daalein?`)) return;
  api.addItem(item, {
    ...opts,
    imei: { id: p.id, imei1: p.imei1, imei2: p.imei2 ?? null },
    ...(p.variantId && { variant: { id: p.variantId, name: p.variant?.name ?? 'Variant', price: Number(p.salePrice) || null, stock: 1 } }),
    price: Number(p.salePrice) || undefined,
    warrantyMonths: p.warrantyMonths || undefined,
    note: PTA_STATUS_LABELS[p.ptaStatus],
  });
}

function addUsed(item: PosItem, api: PosEngineApi) {
  if (needsInternet('used phone bechna')) return;
  const u = item.meta?.used as UsedPhone;
  api.addUsedPhone({
    usedPhoneId: u.id, code: u.usedPhoneCode, name: item.name, price: item.price,
    note: `Used · ${u.usedPhoneCode} · IMEI: ${u.imei1} · ${CONDITION_LABELS[u.condition]} · ${PTA_STATUS_LABELS[u.ptaStatus]}`,
  });
}

function handOver(item: PosItem, api: PosEngineApi) {
  if (needsInternet('repair wapas dena')) return;
  api.openPicker(createElement(RepairHandover, { ticket: item.meta?.ticket as RepairTicket, onClose: api.closePicker }));
}

/** Receives each bill the server saved; MobilePos sets it while the counter is open (qist offer). */
export const mobileSaleListener: { current: ((sale: PosSavedSale) => void) | null } = { current: null };

const filters: PosFilter[] = [
  { id: 'phones', label: 'Naye phone', icon: Smartphone, match: (i) => kindOf(i) === 'phone' },
  { id: 'used', label: 'Used phone', icon: Recycle, match: (i) => kindOf(i) === 'used' },
  { id: 'accessories', label: 'Accessories', icon: Headphones, match: (i) => kindOf(i) === 'accessory' },
  { id: 'repairs', label: 'Repair wapsi', icon: Wrench, match: (i) => kindOf(i) === 'repair' },
];

export const mobilePos: PosIndustryConfig = {
  id: 'mobile',
  label: 'Mobile shop',
  useCatalog: useMobileCatalog,
  useTradeIns: useMobileTradeIns,
  quickKeys: true,
  // Voice adds lines without the IMEI step, so it stays off for phones.
  voice: false,
  filters,
  CartExtra: CounterNotes,
  searchHint: 'Model, accessory, job number — ya IMEI / barcode scan karein',
  receiptFooter: 'Warranty ke liye ye bill aur dabba sambhaal kar rakhein. Paani ya tootne ka nuqsan warranty me nahi.',
  // A phone line is checked on the server when sold, so such a bill is never queued offline.
  beforeCheckout: (cart) => (!navigator.onLine && cart.some((l) => l.imeiId || l.usedPhoneId)
    ? 'Internet nahi — phone wala bill online hi banta hai'
    : null),
  onSale: (sale) => mobileSaleListener.current?.(sale),
  beforeAdd: (item, opts, api) => {
    const kind = kindOf(item);
    if (kind === 'used') { addUsed(item, api); return 'handled'; }
    if (kind === 'repair') { handOver(item, api); return 'handled'; }
    if (kind === 'phone' && !opts.imei) {
      if (needsInternet('naya phone (IMEI) bechna')) return 'handled';
      const phones = phonesOf(item);
      if (!phones.length) { toast.error(`${item.name} — koi phone stock me nahi`); return 'handled'; }
      const inCart = new Set(api.cart.map((l) => l.imeiId).filter((x): x is string => !!x));
      api.openPicker(createElement(ImeiPicker, {
        name: item.name, phones, inCart,
        onPick: (p: PosPhone) => { api.closePicker(); addPhone(item, p, api, opts); },
        onClose: api.closePicker,
      }));
      return 'handled';
    }
    return 'continue';
  },
  scan: async (code, api) => {
    const c = code.trim();
    if (c.length < 5) return false;
    const lower = c.toLowerCase();
    // An IMEI puts that exact phone on the bill; a job number or the phone's IMEI opens its hand-over.
    for (const it of api.items) {
      const kind = kindOf(it);
      if (kind === 'phone') {
        const p = phonesOf(it).find((x) => x.imei1 === c || x.imei2 === c);
        if (p) { if (!needsInternet('naya phone (IMEI) bechna')) addPhone(it, p, api); return true; }
      } else if (kind === 'used') {
        const u = it.meta?.used as UsedPhone;
        if (u.imei1 === c || u.imei2 === c || u.usedPhoneCode.toLowerCase() === lower) { addUsed(it, api); return true; }
      } else if (kind === 'repair') {
        const t = it.meta?.ticket as RepairTicket;
        if (t.ticketNumber.toLowerCase() === lower || t.imei1 === c) { handOver(it, api); return true; }
      }
    }
    return false;
  },
};
