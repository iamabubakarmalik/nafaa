/**
 * Mobile shop POS on the shared engine. New phones are sold by IMEI: tapping
 * a model opens the list of its in-stock phones in this branch, and scanning
 * an IMEI puts that phone straight on the bill. Used phones are sold as they
 * are (no catalog product), accessories like any product, and used phones
 * taken in as an exchange can pay part of the bill at checkout.
 *
 * The catalog comes from the mobile POS API, so this counter needs a
 * connection: a phone sale must name its IMEI, which only the server knows.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Headphones, Recycle, ShieldAlert, Smartphone } from 'lucide-react';
import { useShopParam } from '@core/stores/auth.store';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { PosTradeIn } from '@modules/pos/components';
import type { AddOptions, PosEngineApi, PosFilter, PosIndustryConfig, PosItem } from '@modules/pos/engine';
import { mobilePosApi, type PosAccessory, type PosPhone } from '../api/mobile-pos.api';
import { PTA_STATUS_LABELS } from '../api/imei.api';
import { CONDITION_LABELS, usedPhonesApi, type UsedPhone } from '../api/used-phones.api';
import { ImeiPicker } from './ImeiPicker';

const CATALOG_KEY = 'mobile-pos-catalog';

type Kind = 'phone' | 'used' | 'accessory';
const kindOf = (it: PosItem) => it.meta?.kind as Kind | undefined;
const phonesOf = (it: PosItem) => (it.meta?.phones as PosPhone[] | undefined) ?? [];

const fakeProduct = (p: { id: string; name: string; sku?: string | null; barcode?: string | null; unit?: string | null; price: number; costPrice?: number; image?: string | null }) => ({
  id: p.id, name: p.name, sku: p.sku ?? null, barcode: p.barcode ?? null, unit: p.unit || 'pcs', price: p.price,
  costPrice: p.costPrice ?? 0, isActive: true, images: p.image ? [{ url: p.image, isPrimary: true }] : [],
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

function accessoryItems(list: PosAccessory[]): PosItem[] {
  return list.map((a) => ({
    id: a.id,
    product: fakeProduct({ id: a.id, name: a.name, sku: a.sku, barcode: a.barcode, unit: a.unit, price: a.price, costPrice: a.costPrice, image: a.imageUrl }),
    name: a.name,
    price: a.price,
    stock: a.stock,
    unit: a.unit || 'pcs',
    image: a.imageUrl ?? undefined,
    lowStock: a.lowStockAlert || undefined,
    hasVariants: a.hasVariants,
    rank: 2,
    dim: a.notInShop,
    meta: { kind: 'accessory' satisfies Kind, notInShop: a.notInShop },
  }));
}

function useMobileCatalog() {
  const shopId = useShopParam();
  const q = useQuery({
    queryKey: [CATALOG_KEY, shopId],
    queryFn: () => mobilePosApi.catalog({ shopId: shopId || undefined }),
    enabled: !!shopId,
    staleTime: 15_000,
  });
  const items = useMemo(() => (q.data
    ? [...phoneItems(q.data.phones), ...usedItems(q.data.usedPhones), ...accessoryItems(q.data.accessories)]
    : []), [q.data]);
  return { items, loading: q.isLoading, refreshKeys: [CATALOG_KEY, 'used-phones', 'imei', 'imei-inventory', 'mobile-dashboard'] };
}

/** Used phones taken in as an exchange, offered as a trade-in payment. */
function useMobileTradeIns(): PosTradeIn[] {
  const { data = [] } = useQuery({
    queryKey: ['used-phones', 'trade-ins-open'],
    queryFn: usedPhonesApi.openTradeIns,
    staleTime: 30_000,
  });
  return useMemo(() => data.map((p) => ({
    code: p.usedPhoneCode,
    label: [`${p.brand} ${p.model}`, p.storage, p.fromCustomerName].filter(Boolean).join(' · '),
    value: Number(p.buybackPrice) || 0,
  })), [data]);
}

/** Bill options for one phone: its IMEI, variant, own price and warranty. */
function phoneOptions(p: PosPhone, opts: AddOptions = {}): AddOptions {
  return {
    ...opts,
    imei: { id: p.id, imei1: p.imei1, imei2: p.imei2 ?? null },
    ...(p.variantId && { variant: { id: p.variantId, name: p.variant?.name ?? 'Variant', price: Number(p.salePrice) || null, stock: 1 } }),
    price: Number(p.salePrice) || undefined,
    warrantyMonths: p.warrantyMonths || undefined,
    note: PTA_STATUS_LABELS[p.ptaStatus],
  };
}

function addUsed(item: PosItem, api: PosEngineApi) {
  const u = item.meta?.used as UsedPhone;
  api.addUsedPhone({
    usedPhoneId: u.id, code: u.usedPhoneCode, name: item.name, price: item.price,
    note: `Used · ${u.usedPhoneCode} · IMEI: ${u.imei1} · ${CONDITION_LABELS[u.condition]} · ${PTA_STATUS_LABELS[u.ptaStatus]}`,
  });
}

const filters: PosFilter[] = [
  { id: 'phones', label: 'Naye phone', icon: Smartphone, match: (i) => kindOf(i) === 'phone' },
  { id: 'used', label: 'Used phone', icon: Recycle, match: (i) => kindOf(i) === 'used' },
  { id: 'accessories', label: 'Accessories', icon: Headphones, match: (i) => kindOf(i) === 'accessory' },
];

export const mobilePos: PosIndustryConfig = {
  id: 'mobile',
  label: 'Mobile shop',
  useCatalog: useMobileCatalog,
  useTradeIns: useMobileTradeIns,
  quickKeys: true,
  filters,
  searchHint: 'Model, brand, accessory — ya IMEI / barcode scan karein',
  receiptFooter: 'Warranty ke liye ye bill aur dabba sambhaal kar rakhein. Paani ya tootne ka nuqsan warranty me nahi.',
  beforeAdd: (item, opts, api) => {
    const kind = kindOf(item);
    if (kind === 'used') { addUsed(item, api); return 'handled'; }
    if (kind === 'accessory' && item.meta?.notInShop) {
      toast.error(`${item.name} is branch me nahi — Transfer ya Purchase entry karein`);
      return 'handled';
    }
    if (kind === 'phone' && !opts.imei) {
      const phones = phonesOf(item);
      if (!phones.length) { toast.error(`${item.name} — koi phone stock me nahi`); return 'handled'; }
      const inCart = new Set(api.cart.map((l) => l.imeiId).filter((x): x is string => !!x));
      api.openPicker(createElement(ImeiPicker, {
        name: item.name, phones, inCart,
        onPick: (p: PosPhone) => { api.closePicker(); api.addItem(item, phoneOptions(p, opts)); },
        onClose: api.closePicker,
      }));
      return 'handled';
    }
    return 'continue';
  },
  scan: async (code, api) => {
    const c = code.trim();
    if (c.length < 5) return false;
    // An IMEI puts that exact phone on the bill.
    for (const it of api.items) {
      if (kindOf(it) === 'phone') {
        const p = phonesOf(it).find((x) => x.imei1 === c || x.imei2 === c);
        if (p) { api.addItem(it, phoneOptions(p)); return true; }
      } else if (kindOf(it) === 'used') {
        const u = it.meta?.used as UsedPhone;
        if (u.imei1 === c || u.imei2 === c || u.usedPhoneCode.toLowerCase() === c.toLowerCase()) { addUsed(it, api); return true; }
      }
    }
    return false;
  },
};
