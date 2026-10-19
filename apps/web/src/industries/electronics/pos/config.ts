/**
 * Electronics POS: branch catalog with serial/IMEI units, warranty and
 * bundles. Serial-tracked products ask which unit is being sold; scanning a
 * serial or IMEI puts that exact unit on the bill. Falls back to the
 * offline product list when the catalog cannot be reached.
 */

import { createElement, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, Barcode, Recycle, Sparkles } from 'lucide-react';
import { useShopParam } from '@core/stores/auth.store';
import type { Product } from '@modules/inventory/products/api/products.api';
import { useProductCatalog, type PosBundle, type PosEngineApi, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import { electronicsPosApi, type PosElectronicsProduct } from '../api/electronics-pos.api';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { BundleSerialPickerModal, type BundleSerialNeed } from '../components/pos/BundleSerialPickerModal';
import { SerialPickerModal } from '../components/pos/SerialPickerModal';
import { CATEGORY_GROUPS, CATEGORY_META } from '../constants';

const CATALOG_KEY = 'electronics-pos-catalog';

function toItem(p: PosElectronicsProduct): PosItem {
  const product = {
    id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, unit: p.unit || 'pcs', price: p.price, costPrice: p.costPrice,
    stock: p.availableStock ?? p.stock, lowStockAlert: p.lowStockAlert, hasVariants: p.hasVariants, isFeatured: p.isFeatured,
    categoryId: p.categoryId, images: p.imageUrl ? [{ url: p.imageUrl, isPrimary: true }] : [], isActive: true,
  } as unknown as Product;
  const serial = p.requiresSerial || p.hasImei;
  const used = !!p.conditionType && p.conditionType !== 'BRAND_NEW';
  return {
    id: p.id,
    product,
    name: p.name,
    price: Number(p.price || 0),
    stock: Number(p.availableStock ?? p.stock ?? 0),
    unit: p.unit || 'pcs',
    image: p.imageUrl ?? undefined,
    categoryId: p.categoryId,
    categoryName: p.categoryName ?? undefined,
    featured: p.isFeatured,
    lowStock: p.lowStockAlert,
    hasVariants: p.hasVariants && !serial,
    searchText: [p.brandName, p.modelNumber, p.colorName, ...(p.serials ?? []).flatMap((s) => [s.serialNumber, s.imei ?? ''])].filter(Boolean).join(' '),
    badges: [
      ...(serial ? [{ label: p.hasImei ? 'IMEI' : 'Serial', tone: 'neutral' as const, icon: Barcode }] : []),
      ...(used ? [{ label: String(p.conditionType).replace(/_/g, ' ').toLowerCase(), tone: 'warning' as const, icon: Recycle }] : []),
      ...(p.isBestSeller ? [{ label: 'Best seller', tone: 'brand' as const, icon: Award }] : []),
      ...(p.isNewArrival ? [{ label: 'Naya', tone: 'success' as const, icon: Sparkles }] : []),
    ],
    subline: [p.brandName, p.modelNumber, p.warrantyMonths ? `${p.warrantyMonths}m warranty` : ''].filter(Boolean).join(' · ') || undefined,
    dim: p.notInShop,
    meta: { serial, warrantyMonths: p.warrantyMonths || undefined, notInShop: p.notInShop, categoryType: p.categoryType },
  };
}

/** Serial units already on the bill, so a picker does not offer them twice. */
function takenSerials(cart: PosEngineApi['cart']) {
  return new Set(cart.flatMap((l) => [...(l.serialId ? [l.serialId] : []), ...(l.comboSerials ?? []).map((s) => s.id)]));
}

function useElectronicsQuery() {
  const shopId = useShopParam();
  return useQuery({
    queryKey: [CATALOG_KEY, shopId],
    queryFn: () => electronicsPosApi.catalog({ shopId }),
    enabled: !!shopId,
    staleTime: 20_000,
    retry: 1,
  });
}

function useElectronicsCatalog() {
  const q = useElectronicsQuery();
  const offline = useProductCatalog();
  const items = useMemo(() => (q.data ? q.data.items.map(toItem) : null), [q.data]);
  if (items) return { items, loading: false, refreshKeys: [CATALOG_KEY, 'serials-for-pos', 'electronics-serials', 'electronics-dashboard', ...offline.refreshKeys] };
  return { ...offline, loading: q.isLoading && offline.loading, refreshKeys: [CATALOG_KEY, ...offline.refreshKeys] };
}

function useElectronicsBundles(): PosBundle[] {
  const { data } = useElectronicsQuery();
  return useMemo(() => (data?.bundles ?? []).map((b) => ({
    id: b.id, name: b.name, price: Number(b.bundlePrice), image: b.imageUrl ?? undefined, featured: b.isFeatured,
    savings: Number(b.savings || 0), savingsPct: Number(b.savingsPct || 0),
    items: b.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), originalPrice: Number(i.unitPrice) || 0 })),
  })), [data]);
}

// One chip per product type, big items first; the counter hides types with no products.
const filters: PosFilter[] = CATEGORY_GROUPS.flatMap((g) => g.items)
  .filter((t) => t !== 'OTHER')
  .map((t) => ({ id: t, label: CATEGORY_META[t].label, match: (i) => i.meta?.categoryType === t }));

export const electronicsPos: PosIndustryConfig = {
  id: 'electronics',
  label: 'Electronics',
  useCatalog: useElectronicsCatalog,
  useBundles: useElectronicsBundles,
  filters,
  searchHint: 'Naam, brand, model — ya barcode / serial / IMEI scan karein',
  receiptFooter: 'Warranty claim ke liye ye bill aur dabba zaroori. Physical ya paani ka nuqsan warranty mein nahi.',
  beforeAdd: (item, opts, api) => {
    if (item.meta?.notInShop) {
      toast.error(`${item.name} is branch mein assign nahi — Transfer ya Purchase entry karein`);
      return 'handled';
    }
    if (item.meta?.serial && !opts.serial) {
      if (item.stock <= 0) { toast.error(`${item.name} — koi unit stock mein nahi`); return 'handled'; }
      api.openPicker(createElement(SerialPickerModal, {
        product: item.product,
        taken: takenSerials(api.cart),
        onConfirm: (serial: { id: string; serialNumber: string; imei?: string | null }) => {
          api.closePicker();
          api.addItem(item, { ...opts, serial, warrantyMonths: item.meta?.warrantyMonths as number | undefined });
        },
        onClose: api.closePicker,
      }));
      return 'handled';
    }
    if (item.meta?.warrantyMonths && opts.warrantyMonths === undefined) {
      api.addItem(item, { ...opts, warrantyMonths: item.meta.warrantyMonths as number });
      return 'handled';
    }
    return 'continue';
  },
  beforeAddBundle: (bundle, qty, api) => {
    // Serial products inside the bundle need their exact units, like a single sale.
    const needs = new Map<string, BundleSerialNeed>();
    for (const it of bundle.items) {
      const item = api.itemById(it.productId);
      if (!item?.meta?.serial) continue;
      const n = needs.get(item.id) ?? { productId: item.id, name: item.name, count: 0 };
      n.count += Number(it.quantity) * qty;
      needs.set(item.id, n);
    }
    if (!needs.size) return 'continue';
    api.openPicker(createElement(BundleSerialPickerModal, {
      bundleName: bundle.name,
      needs: [...needs.values()],
      taken: takenSerials(api.cart),
      onConfirm: (serials) => { api.closePicker(); api.addBundle(bundle, qty, serials); },
      onClose: api.closePicker,
    }));
    return 'handled';
  },
  scan: async (code, api) => {
    // Product barcodes are handled by the engine; only unknown codes go to the serial lookup.
    if (api.findItemByCode(code) || !navigator.onLine || code.length < 5) return false;
    try {
      const s = await serialTrackingApi.lookup(code);
      if (!s) return false;
      if (s.status !== 'IN_STOCK') { toast.error(`Serial ${s.serialNumber} — ${String(s.status).toLowerCase().replace(/_/g, ' ')}`); return true; }
      const item = api.itemById(s.productId);
      if (!item) { toast.error('Is serial ka product is branch ke catalog mein nahi'); return true; }
      if (api.cart.some((l) => l.serialId === s.id)) { toast.info('Ye unit pehle se bill mein hai'); return true; }
      api.addItem(item, { serial: { id: s.id, serialNumber: s.serialNumber, imei: s.imei }, warrantyMonths: item.meta?.warrantyMonths as number | undefined });
      return true;
    } catch {
      return false;
    }
  },
};
