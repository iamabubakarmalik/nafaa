/**
 * Counter logic shared by every POS: catalog search, barcode and voice,
 * units, weights and variants, combos, bill lines, discount, delivery,
 * hold, checkout (online or queued offline), receipt and auto-print.
 *
 * This is the logic the Retail POS ran in production, made industry-neutral.
 * Industry differences come in through `PosIndustryConfig`.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { offlineSalesApi } from '@core/lib/offline/offlineSales';
import { offlineProductsApi } from '@core/lib/offline/offlineProducts';
import { useCustomerDisplayFeed } from '@core/hardware/customerDisplay';
import { formatPKR } from '@core/lib/format';
import { customerLedgerApi } from '@modules/customers/khata/api/customer-ledger.api';
import { productUnitsApi } from '@modules/inventory/products/api/product-units.api';
import { productVariantsApi, type ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { VoiceCommand } from '@core/components/voice/VoiceSaleButton';
import { quickKeysApi, type QuickKey } from '../api/quick-keys.api';
import { usePosPreferences } from '../hooks/usePosPreferences';
import { emptyDelivery, deliveryAmount, deliveryRiderAmount, deliveryServiceCharge, type PosDeliveryState } from '../components/PosDeliveryPanel';
import { emptyReceiver, type PosReceiverValue } from '../components/PosReceiverField';
import type { PosCheckoutResult } from '../components/PosCheckoutModal';
import type { PosLastSale } from '../components/PosSuccessModal';
import {
  POS_PAYMENT_METHODS, posHeldId, posLineId,
  type PosCartLine, type PosCheckoutMode, type PosDiscountMode, type PosHeldCart,
} from '../lib/posCart';
import {
  buildUnitScanIndex, derivePosUnits, isWeightUnit, qtyStep, unitEmoji, unitKeyOf, type PosUnitOption,
} from '../lib/posUnits';
import { printReceiptDirect, type ReceiptPayload } from '../lib/thermalReceipt';
import type { AddOptions, PosBundle, PosEngineApi, PosIndustryConfig, PosItem } from './types';

/** Customers refresh after a sale (balances change). */
const SALE_REFRESH = ['customers-for-pos', 'sales-list', 'dashboard-overview', 'dashboard-day-report', 'retail-money-map', 'dashboard-list'];

/** Common Urdu/Roman words for everyday goods, for voice search. */
const BASE_VOICE_ALIASES: Record<string, string> = {
  chini: 'cheeni sugar', cheeni: 'cheeni sugar', doodh: 'milk doodh', dudh: 'milk doodh',
  chai: 'tea chai patti', patti: 'patti tea chai', chawal: 'rice chawal', aata: 'aata atta flour', atta: 'aata atta flour',
  tel: 'oil tel', namak: 'salt namak', anda: 'egg anda anday', anday: 'egg anda anday', sabun: 'soap sabun',
  daal: 'daal dal', aloo: 'potato aloo', pyaz: 'onion pyaz', tamatar: 'tomato tamatar', dahi: 'yogurt dahi', paani: 'water paani',
};

export type PosView = 'products' | 'combos' | 'quickkeys';

export interface PosLastSaleFull extends PosLastSale {
  printPayload: ReceiptPayload;
  customerPhone?: string;
}

export function usePosEngine(config: PosIndustryConfig) {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const tenant = useAuthStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user) as (ReturnType<typeof useAuthStore.getState>['user'] & { assignedShop?: { phone?: string; address?: string } }) | null;
  const prefs = usePosPreferences(config.id);

  /* ── Catalog ── */
  const { items, loading, refreshKeys } = config.useCatalog();
  const useBundles = config.useBundles ?? (() => [] as PosBundle[]);
  const bundles = useBundles();
  const { data: quickKeys = [] } = useQuery({
    queryKey: ['pos-quick-keys'],
    queryFn: () => quickKeysApi.list().catch(() => [] as QuickKey[]),
    staleTime: 60_000,
    enabled: !!config.quickKeys,
  });
  // All multi-units once, so pack barcodes work on scan without a request and offline.
  const { data: allUnits = [] } = useQuery({
    queryKey: ['pos-product-units'],
    queryFn: () => productUnitsApi.listAll(),
    staleTime: 5 * 60_000,
  });
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
    staleTime: 60_000,
  });
  const customers: any[] = customersData?.items ?? [];

  const unitIndex = useMemo(() => buildUnitScanIndex(allUnits as any[]), [allUnits]);
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  /* ── Search ── */
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [filterId, setFilterId] = useState('');
  const [view, setView] = useState<PosView>((prefs.viewMode as PosView) || 'products');
  const [visible, setVisible] = useState(60);
  useEffect(() => { const t = setTimeout(() => setQuery(search), 120); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setVisible(60); }, [query, categoryId, filterId, view]);
  useEffect(() => { prefs.setViewMode(view); }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  // Built once per catalog change: order plus one lowercase haystack per item,
  // so each keystroke is a single pass even with 20,000 products.
  const index = useMemo(() => {
    const collator = new Intl.Collator('en', { sensitivity: 'base' });
    const rows = items.map((it) => ({
      it,
      hay: [it.name, it.product.sku ?? '', it.product.barcode ?? '', it.categoryName ?? '', it.searchText ?? '',
        ...(unitIndex.codesByProduct.get(it.id) ?? [])].join(' ').toLowerCase(),
    }));
    rows.sort((a, b) => {
      const ra = a.it.rank ?? 1, rb = b.it.rank ?? 1;
      if (ra !== rb) return ra - rb;
      if (!!a.it.featured !== !!b.it.featured) return a.it.featured ? -1 : 1;
      const ao = a.it.stock <= 0, bo = b.it.stock <= 0;
      if (ao !== bo) return ao ? 1 : -1;
      return collator.compare(a.it.name, b.it.name);
    });
    return rows;
  }, [items, unitIndex]);

  const filter = config.filters?.find((f) => f.id === filterId);
  const filtered = useMemo(() => {
    let rows = index;
    if (filter) rows = rows.filter((r) => filter.match(r.it));
    if (categoryId) rows = rows.filter((r) => r.it.categoryId === categoryId);
    const q = query.toLowerCase().trim();
    if (q) {
      const words = q.split(/\s+/);
      rows = rows.filter((r) => words.every((w) => r.hay.includes(w)));
    }
    return rows.map((r) => r.it);
  }, [index, filter, categoryId, query]);

  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color?: string | null; count: number }>();
    for (const it of items) {
      if (!it.categoryId) continue;
      const c = m.get(it.categoryId);
      if (c) c.count += 1;
      else m.set(it.categoryId, { id: it.categoryId, name: it.categoryName ?? 'Category', color: it.categoryColor, count: 1 });
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [items]);

  const filterCounts = useMemo(() => Object.fromEntries((config.filters ?? []).map((f) => [f.id, items.filter(f.match).length])), [config.filters, items]);

  const filteredBundles = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list = q ? bundles.filter((b) => `${b.name} ${b.sku ?? ''}`.toLowerCase().includes(q)) : bundles;
    return [...list].sort((a, b) => (a.featured !== b.featured ? (a.featured ? -1 : 1) : (b.savingsPct ?? 0) - (a.savingsPct ?? 0)));
  }, [bundles, query]);

  const groupedQuickKeys = useMemo(() => {
    const q = query.toLowerCase().trim();
    const groups: Record<string, QuickKey[]> = {};
    quickKeys.filter((k) => k.isActive && (!q || k.label.toLowerCase().includes(q)))
      .forEach((k) => { (groups[k.group || 'General'] ||= []).push(k); });
    return groups;
  }, [quickKeys, query]);

  /* ── Bill ── */
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [delivery, setDelivery] = useState<PosDeliveryState>(emptyDelivery());
  const [discountMode, setDiscountMode] = useState<PosDiscountMode>('pct');
  const [discountPct, setDiscountPct] = useState(0);
  const [discountRs, setDiscountRs] = useState(0);
  const [receiver, setReceiver] = useState<PosReceiverValue>(emptyReceiver());
  const [soldById, setSoldById] = useState<string | undefined>();
  const [heldCarts, setHeldCarts] = useState<PosHeldCart[]>([]);
  const [priceEditId, setPriceEditId] = useState<string | null>(null);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  // A new customer must not inherit the previous customer's receiver.
  useEffect(() => { setReceiver(emptyReceiver()); }, [customerId]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = discountMode === 'pct' ? (subtotal * discountPct) / 100 : Math.min(discountRs || 0, subtotal);
  const deliveryFee = deliveryAmount(delivery);
  const total = Math.max(subtotal - discountAmount, 0) + deliveryFee;
  const totalSavings = useMemo(() => cart.reduce((s, l) => s + (l.savings || 0) * l.quantity, 0), [cart]);
  const totalQty = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);
  const inCartBy = useMemo(() => {
    const m = new Map<string, number>();
    cart.forEach((l) => {
      if (l.productId) m.set(l.productId, (m.get(l.productId) ?? 0) + l.baseQuantity);
      if (l.comboId) m.set(`combo:${l.comboId}`, (m.get(`combo:${l.comboId}`) ?? 0) + l.quantity);
    });
    return m;
  }, [cart]);

  useCustomerDisplayFeed({
    shopName: tenant?.name || 'Shop',
    items: cart.map((l) => ({ name: l.name, qty: `${l.quantity} ${l.unitLabel || l.unitName}`, total: l.lineTotal })),
    subtotal, discount: discountAmount, total,
  });

  /* ── Modals ── */
  const [unitPicker, setUnitPicker] = useState<{ item: PosItem; units: PosUnitOption[]; opts: AddOptions } | null>(null);
  const [weigh, setWeigh] = useState<{ item: PosItem; unit: PosUnitOption; opts: AddOptions; prefillMoney?: number } | null>(null);
  const [variantPicker, setVariantPicker] = useState<{ item: PosItem; variants: ProductVariant[]; opts: AddOptions } | null>(null);
  const [picker, setPicker] = useState<ReactNode>(null);
  const [checkout, setCheckout] = useState<{ mode: PosCheckoutMode; method?: PaymentMethod } | null>(null);
  const [lastSale, setLastSale] = useState<PosLastSaleFull | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ── Adding lines ── */
  const limitFor = (item: PosItem, opts: AddOptions) =>
    opts.oversell ? Number.MAX_SAFE_INTEGER : opts.variant?.stock != null ? Number(opts.variant.stock) : item.stock;

  const pushLine = useCallback((item: PosItem, unit: PosUnitOption, qty: number, opts: AddOptions) => {
    const limit = limitFor(item, opts);
    const baseQty = qty * unit.conversionRate;
    const price = opts.variant?.price != null && unit.conversionRate === 1 ? Number(opts.variant.price) : unit.price;
    setCart((prev) => {
      const existing = !opts.serial && prev.find((l) =>
        l.productId === item.id && l.unitName === unit.unitName && l.unitPrice === price && (l.variantId ?? '') === (opts.variant?.id ?? '') && !l.serialId);
      if (existing) {
        const nq = Number((existing.quantity + qty).toFixed(3));
        const nb = nq * unit.conversionRate;
        if (nb > existing.baseStock) { toast.error(`Stock sirf ${Number(item.stock.toFixed(2))} ${item.unit}`); return prev; }
        toast.success(`${item.name} +${qty}`, { duration: 800 });
        return prev.map((l) => (l.id === existing.id ? { ...l, quantity: nq, baseQuantity: nb, lineTotal: nq * l.unitPrice } : l));
      }
      if (baseQty > limit) { toast.error(`Stock sirf ${Number(Math.max(limit, 0).toFixed(2))} ${item.unit}`); return prev; }
      toast.success(`${item.name}${opts.variant ? ` · ${opts.variant.name}` : ''} — ${qty} ${unit.unitName}`, { duration: 800 });
      const notes = [
        unit.conversionRate !== 1 ? `${qty} ${unit.unitName} = ${Number(baseQty.toFixed(3))} ${item.unit}` : '',
        opts.serial ? `S/N: ${opts.serial.serialNumber}${opts.serial.imei ? ` · IMEI: ${opts.serial.imei}` : ''}` : '',
        opts.oversell ? 'Stock chadhe bagair becha' : '',
        opts.note ?? '',
      ].filter(Boolean);
      return [...prev, {
        id: posLineId(), type: 'product', productId: item.id, name: item.name, image: item.image,
        unitName: unit.unitName, unitLabel: unit.label, emoji: unit.emoji,
        unitPrice: price, basePrice: price,
        quantity: qty, baseQuantity: baseQty, conversionRate: unit.conversionRate, baseUnit: item.unit, baseStock: limit,
        lineTotal: qty * price, note: notes.join(' • ') || undefined,
        variantId: opts.variant?.id, variantName: opts.variant?.name,
        serialId: opts.serial?.id, serialNumber: opts.serial?.serialNumber, imei: opts.serial?.imei ?? undefined,
        warrantyMonths: opts.warrantyMonths, lockQty: !!opts.serial,
      }];
    });
  }, []);

  const unitsFor = useCallback(async (item: PosItem): Promise<PosUnitOption[]> => {
    let api: any[] = unitIndex.byProduct.get(item.id) ?? [];
    if (api.length === 0 && navigator.onLine) {
      try {
        const res = await productUnitsApi.byProduct(item.id);
        api = Array.isArray(res) ? res : ((res as any)?.items ?? []);
      } catch { /* offline or no units */ }
    }
    const base = derivePosUnits({ ...item.product, price: item.price, unit: item.unit } as any, api);
    return config.extraUnits ? config.extraUnits(item, base) : base;
  }, [unitIndex, config]);

  const placeUnit = useCallback((item: PosItem, unit: PosUnitOption, opts: AddOptions, qty = 1) => {
    if (isWeightUnit(unit.unitName)) { setWeigh({ item, unit, opts }); return; }
    pushLine(item, unit, qty, opts);
  }, [pushLine]);

  const engineApiRef = useRef<PosEngineApi>(null as unknown as PosEngineApi);

  const addItem = useCallback(async (item: PosItem, opts: AddOptions = {}) => {
    if (config.beforeAdd && config.beforeAdd(item, opts, engineApiRef.current) === 'handled') return;
    if (item.price <= 0 && !opts.variant) { toast.error(`${item.name} ka rate set nahi — pehle product mein rate daalein`); return; }
    if (!opts.oversell && !opts.variant && item.stock <= 0 && !item.hasVariants) { toast.error(`${item.name} — stock khatam`); return; }

    if (item.hasVariants && !opts.variant) {
      try {
        const variants = (await productVariantsApi.list(item.id)).filter((v) => v.isActive);
        if (variants.length) { setVariantPicker({ item, variants, opts }); return; }
      } catch { toast.error('Variants load nahi hue'); return; }
    }
    if (opts.serial || opts.unit) { placeUnit(item, opts.unit ?? derivePosUnits({ ...item.product, price: item.price, unit: item.unit } as any, [])[0], opts, opts.qty ?? 1); return; }

    const units = await unitsFor(item);
    if (units.length > 1 && !opts.variant) { setUnitPicker({ item, units, opts }); return; }
    placeUnit(item, units[0], opts, opts.qty ?? 1);
  }, [config, placeUnit, unitsFor]);

  const addBundle = useCallback((b: PosBundle, qty = 1) => {
    for (const it of b.items) {
      const p = itemsById.get(it.productId);
      if (p && p.stock < it.quantity * qty) { toast.error(`${p.name} — stock sirf ${p.stock}, chahiye ${it.quantity * qty}`); return; }
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.comboId === b.id);
      if (existing) {
        toast.success(`${b.name} +${qty}`, { duration: 800 });
        return prev.map((l) => (l.id === existing.id ? { ...l, quantity: l.quantity + qty, lineTotal: (l.quantity + qty) * l.unitPrice } : l));
      }
      toast.success(b.name, { duration: 800 });
      return [...prev, {
        id: posLineId(), type: 'combo', comboId: b.id, name: b.name, image: b.image,
        unitName: 'combo', unitLabel: 'COMBO', emoji: '🎁',
        unitPrice: b.price, basePrice: b.price, quantity: qty, baseQuantity: qty, conversionRate: 1, baseUnit: 'combo', baseStock: 9999,
        lineTotal: qty * b.price, comboItems: b.items, savings: b.savings ?? 0,
        note: `${b.items.length} cheezein${b.savings ? ` · bachat ${formatPKR(b.savings)}` : ''}`,
      }];
    });
  }, [itemsById]);

  const addQuickKey = useCallback((qk: QuickKey) => {
    if (qk.comboId) { const b = bundles.find((x) => x.id === qk.comboId); return b ? addBundle(b) : toast.error('Combo nahi mila'); }
    if (qk.productId) { const it = itemsById.get(qk.productId); return it ? addItem(it) : toast.error('Product nahi mila'); }
    toast.error('Quick key set nahi hai');
  }, [bundles, itemsById, addBundle, addItem]);

  engineApiRef.current = {
    addItem: (item, opts) => { void addItem(item, opts); },
    openPicker: setPicker,
    closePicker: () => setPicker(null),
    itemById: (id) => itemsById.get(id),
    findItemByCode: (code) => {
      const c = code.trim().toLowerCase();
      return items.find((i) => (i.product.barcode ?? '').toLowerCase() === c || (i.product.sku ?? '').toLowerCase() === c);
    },
    cart,
  };

  /* ── Line edits ── */
  const changeQty = (id: string, delta: number) => setCart((prev) => prev.flatMap((l) => {
    if (l.id !== id) return [l];
    if (l.lockQty && delta > 0) { toast.error('Serial wala item — ek hi'); return [l]; }
    const nq = Number((l.quantity + delta * qtyStep(l.unitName)).toFixed(3));
    if (nq <= 0) return [];
    const nb = nq * l.conversionRate;
    if (l.type === 'product' && nb > l.baseStock) { toast.error(`Stock sirf ${l.baseStock} ${l.baseUnit}`); return [l]; }
    return [{ ...l, quantity: nq, baseQuantity: nb, lineTotal: nq * l.unitPrice }];
  }));
  const setQty = (id: string, qty: number) => setCart((prev) => prev.flatMap((l) => {
    if (l.id !== id) return [l];
    if (qty <= 0) return [];
    if (l.lockQty && qty > 1) { toast.error('Serial wala item — ek hi'); return [l]; }
    const nb = qty * l.conversionRate;
    if (l.type === 'product' && nb > l.baseStock) { toast.error(`Stock sirf ${l.baseStock} ${l.baseUnit}`); return [l]; }
    return [{ ...l, quantity: qty, baseQuantity: nb, lineTotal: qty * l.unitPrice }];
  }));
  const setPrice = (id: string, price: number) => {
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, unitPrice: Math.max(price, 0), lineTotal: l.quantity * Math.max(price, 0) } : l)));
    setPriceEditId(null);
  };
  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  /** One less of a product: its most recent bill line goes down a step. */
  const decrementItem = (productId: string) => {
    const line = [...cart].reverse().find((l) => l.productId === productId);
    if (line) changeQty(line.id, -1);
  };
  const clearCart = useCallback(() => {
    setCart([]); setCustomerId(''); setDiscountPct(0); setDiscountRs(0);
    setDelivery(emptyDelivery()); setReceiver(emptyReceiver());
  }, []);

  const hold = () => {
    if (!cart.length) return;
    setHeldCarts((p) => [...p, { id: posHeldId(), lines: cart, customerId, total, heldAt: Date.now() }]);
    clearCart();
    toast.success('Bill hold ho gaya');
  };
  const resume = (h: PosHeldCart) => {
    if (cart.length) setHeldCarts((p) => [...p.filter((x) => x.id !== h.id), { id: posHeldId(), lines: cart, customerId, total, heldAt: Date.now() }]);
    else setHeldCarts((p) => p.filter((x) => x.id !== h.id));
    setCart(h.lines);
    setCustomerId(h.customerId);
    toast.success('Bill wapas aa gaya');
  };
  const deleteHeld = (id: string) => setHeldCarts((p) => p.filter((h) => h.id !== id));

  /* ── Barcode ── */
  const handleBarcode = useCallback(async (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    const lower = code.toLowerCase();
    if (config.scan && await config.scan(code, engineApiRef.current)) return;

    const bundle = bundles.find((b) => (b.barcode ?? '').toLowerCase() === lower || (b.sku ?? '').toLowerCase() === lower);
    if (bundle) { addBundle(bundle); return; }

    // Pack barcode (carton/dozen): the barcode already says which pack, so no unit picker.
    const pack = unitIndex.byBarcode.get(lower) ?? unitIndex.bySku.get(lower);
    if (pack) {
      const it = itemsById.get(pack.productId);
      if (it) {
        const rate = Number(pack.conversionRate) || 1;
        const unit: PosUnitOption = {
          id: pack.id, unitName: pack.unitName, label: (pack.unitLabel || pack.unitName).toUpperCase(), emoji: unitEmoji(pack.unitName),
          conversionRate: rate, price: Number(pack.price) || it.price * rate, wholesalePrice: pack.wholesalePrice ?? null,
        };
        void addItem(it, { unit });
        return;
      }
    }

    const local = items.find((i) => (i.product.barcode ?? '').toLowerCase() === lower || (i.product.sku ?? '').toLowerCase() === lower);
    if (local) { void addItem(local); return; }

    try {
      const p = await offlineProductsApi.byBarcode(code);
      const it = itemsById.get(p.id);
      if (it) { void addItem(it); return; }
    } catch { /* not a product barcode */ }
    toast.error(`Barcode "${code}" nahi mila`);
  }, [config, bundles, addBundle, unitIndex, itemsById, items, addItem]);

  /** Search box Enter: exact code scans; otherwise the first result goes on the bill. */
  const submitSearch = useCallback(() => {
    const q = search.trim();
    if (!q) return;
    const lower = q.toLowerCase();
    const exact = items.find((i) => (i.product.barcode ?? '').toLowerCase() === lower || (i.product.sku ?? '').toLowerCase() === lower)
      || unitIndex.byBarcode.has(lower) || bundles.some((b) => (b.barcode ?? '').toLowerCase() === lower);
    if (exact || /^\d{6,}$/.test(q) || (config.scan && /^[\w-]{8,}$/.test(q) && filtered.length === 0)) {
      void handleBarcode(q);
    } else if (view === 'products' && filtered.length > 0) {
      void addItem(filtered[0]);
    } else if (view === 'combos' && filteredBundles.length > 0) {
      addBundle(filteredBundles[0]);
    } else {
      toast.error(`"${q}" nahi mila`);
      return;
    }
    setSearch('');
  }, [search, items, unitIndex, bundles, config.scan, filtered, view, filteredBundles, handleBarcode, addItem, addBundle]);

  /* ── Voice ── */
  const aliases = useMemo(() => ({ ...BASE_VOICE_ALIASES, ...(config.voiceAliases ?? {}) }), [config.voiceAliases]);
  const findVoice = useCallback((spoken: string): PosItem | null => {
    const q = spoken.toLowerCase().trim();
    if (!q) return null;
    let terms = q;
    Object.entries(aliases).forEach(([a, t]) => { if (q.includes(a)) terms = `${q} ${t}`; });
    const words = terms.split(/\s+/).filter((w) => w.length >= 2);
    let best: PosItem | null = null;
    let bestScore = 0;
    for (const it of items) {
      const n = it.name.toLowerCase();
      let score = n === q ? 100 : n.startsWith(q) ? 60 : n.includes(q) ? 40 : 0;
      for (const w of words) if (n.includes(w)) score += 10;
      if (score > bestScore) { bestScore = score; best = it; }
    }
    return bestScore >= 20 ? best : null;
  }, [items, aliases]);

  const onVoice = useCallback(async (cmd: VoiceCommand) => {
    if (cmd.kind === 'add') {
      const it = findVoice(cmd.productQuery);
      if (!it) { toast.error(`"${cmd.productQuery}" nahi mila`); return; }
      const units = await unitsFor(it);
      let unit = units[0];
      if (cmd.unit) unit = units.find((u) => unitKeyOf(u.unitName) === cmd.unit) ?? unit;
      if (cmd.byMoney) {
        if (isWeightUnit(unit.unitName) && unit.price > 0) pushLine(it, unit, Number((cmd.byMoney / unit.price).toFixed(3)), {});
        else setWeigh({ item: it, unit, opts: {}, prefillMoney: cmd.byMoney });
        return;
      }
      if (units.length > 1 && !cmd.unit) { setUnitPicker({ item: it, units, opts: {} }); return; }
      pushLine(it, unit, cmd.qty || 1, {});
      return;
    }
    if (cmd.kind === 'checkout') {
      if (!cart.length) { toast.error('Bill khaali hai'); return; }
      const credit = (cmd as { mode?: string }).mode === 'credit';
      if (credit && !customerId) { toast.error('Udhaar ke liye pehle customer chunein'); return; }
      setCheckout({ mode: credit ? 'credit' : 'full' });
      return;
    }
    if (cmd.kind === 'discount') {
      if (cmd.pct) { setDiscountMode('pct'); setDiscountPct(Math.min(cmd.pct, 100)); setDiscountRs(0); }
      else if (cmd.rs) { setDiscountMode('rs'); setDiscountRs(cmd.rs); setDiscountPct(0); }
      return;
    }
    if (cmd.kind === 'clear') { clearCart(); toast.success('Bill saaf'); return; }
    toast.warning(`Samjha nahi: "${cmd.text}"`);
  }, [findVoice, unitsFor, pushLine, cart.length, customerId, clearCart]);

  /* ── Checkout ── */
  const receiptFor = useCallback((sale: { saleNumber?: string }, paid: number, method: PaymentMethod, credit: number): ReceiptPayload => ({
    saleNumber: sale.saleNumber || 'N/A',
    date: new Date(),
    shopName: tenant?.name || 'Shop',
    shopPhone: user?.assignedShop?.phone || (tenant as { phone?: string } | null)?.phone || '',
    shopAddress: user?.assignedShop?.address || (tenant as { address?: string } | null)?.address || '',
    customerName: selectedCustomer?.name,
    receivedByName: receiver.name.trim() || undefined,
    receivedByPhone: receiver.phone.trim() || undefined,
    previousDue: Number(selectedCustomer?.balance) || 0,
    lines: cart.map((l) => ({
      name: l.variantName ? `${l.name} (${l.variantName})` : l.name,
      qty: l.quantity, unit: l.unitName, price: l.unitPrice, total: l.lineTotal,
      note: [l.serialNumber ? `S/N ${l.serialNumber}` : '', l.imei ? `IMEI ${l.imei}` : '', l.warrantyMonths ? `Warranty ${l.warrantyMonths} mahine` : ''].filter(Boolean).join(' · ') || undefined,
    })),
    subtotal, discount: discountAmount, total,
    deliveryCharge: deliveryFee || undefined,
    riderDelivery: deliveryRiderAmount(delivery) || undefined,
    deliveryAddress: delivery.on ? delivery.address || undefined : undefined,
    paid,
    paymentLabel: credit > 0 ? `Paid (${POS_PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method}) · Udhaar ${formatPKR(credit)}`
      : `Paid (${POS_PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method})`,
    cashierName: user?.fullName,
    footerNote: config.receiptFooter,
  }), [tenant, user, selectedCustomer, receiver, cart, subtotal, discountAmount, total, deliveryFee, delivery, config.receiptFooter]);

  const checkoutMutation = useMutation({
    mutationFn: async (d: PosCheckoutResult) => {
      if (!shopId) throw new Error('Pehle shop chunein');
      const items: any[] = [];
      for (const l of cart) {
        if (l.type === 'combo' && l.comboItems) {
          // Spread the combo price over its products in proportion to their normal prices.
          const orig = l.comboItems.reduce((s: number, it: any) => s + Number(it.quantity || 0) * (Number(it.originalPrice) || 0), 0);
          const factor = orig > 0 ? l.unitPrice / orig : 1;
          for (const ci of l.comboItems as any[]) {
            const op = Number(ci.originalPrice) || 0;
            const dp = op * factor;
            items.push({ productId: ci.productId, variantId: ci.variantId || undefined, quantity: Number(ci.quantity) * l.quantity,
              priceOverride: Number.isFinite(dp) && dp > 0 ? dp : op, note: `Combo: ${l.name}` });
          }
        } else if (l.productId) {
          items.push({
            productId: l.productId,
            variantId: l.variantId,
            quantity: l.baseQuantity,
            priceOverride: l.unitPrice / l.conversionRate,
            note: l.note,
            ...(l.serialId ? { serialId: l.serialId } : {}),
          });
        }
      }
      // An advance kept in khata is not change: the sale records the total,
      // and the extra goes to the customer's ledger as a payment.
      const paidAmount = d.depositExtra ? Math.min(d.paidAmount, total) : d.paidAmount;
      const sale = await offlineSalesApi.create({
        shopId,
        customerId: customerId || undefined,
        paymentMethod: d.paymentMethod,
        soldById,
        paidAmount,
        discount: discountAmount,
        serviceCharges: deliveryServiceCharge(delivery),
        receivedByName: receiver.name.trim() || undefined,
        receivedByPhone: receiver.phone.trim() || undefined,
        items,
      });
      let deposited = false;
      if (d.depositExtra && customerId && d.paidAmount > total) {
        try {
          await customerLedgerApi.receivePayment(customerId, {
            amount: Number((d.paidAmount - total).toFixed(2)),
            reference: (sale as { saleNumber?: string }).saleNumber,
            note: `Bill ${(sale as { saleNumber?: string }).saleNumber ?? ''} par zyada diya — advance`,
          });
          deposited = true;
        } catch {
          toast.error('Advance khate mein jama nahi hua — customer ko wapas dein ya Khata se jama karein');
        }
      }
      return { sale, deposited, paidAmount };
    },
    onSuccess: ({ sale, deposited, paidAmount }, d) => {
      const s = sale as { id: string; saleNumber: string };
      const credit = Math.max(total - paidAmount, 0);
      const change = Math.max(d.paidAmount - total, 0);
      const printPayload = receiptFor(s, paidAmount, d.paymentMethod, credit);
      setLastSale({ id: s.id, number: s.saleNumber, change, total, deposited, credit, printPayload, customerPhone: selectedCustomer?.phone });
      setCheckout(null);
      clearCart();
      [...refreshKeys, ...SALE_REFRESH].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (prefs.autoPrint && !printReceiptDirect(printPayload, prefs.printerWidth)) toast.error('Popup band hai — browser mein popups allow karein');
      if (prefs.autoClose) successTimer.current = setTimeout(() => setLastSale(null), 3500);
    },
    onError: (e: unknown) => {
      if (!navigator.onLine) toast.info('Offline — sale save ho gayi, net aate hi chali jayegi');
      else toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || (e as Error).message || 'Sale nahi hui');
    },
  });

  const instantCash = useCallback(() => {
    if (!cart.length) { toast.error('Bill khaali hai'); return; }
    if (!shopId) { toast.error('Pehle shop chunein'); return; }
    if (checkoutMutation.isPending) return;
    checkoutMutation.mutate({ paymentMethod: 'CASH', paidAmount: total, isCredit: false, depositExtra: false });
  }, [cart.length, shopId, checkoutMutation, total]);

  const openCheckout = useCallback((mode: PosCheckoutMode = 'full', method?: PaymentMethod) => { if (cart.length) setCheckout({ mode, method }); }, [cart.length]);

  const closeSuccess = useCallback(() => { clearTimeout(successTimer.current); setLastSale(null); }, []);
  useEffect(() => () => clearTimeout(successTimer.current), []);

  /** WhatsApp text of the last bill. */
  const shareLastSale = useCallback(() => {
    if (!lastSale) return;
    const p = lastSale.printPayload;
    const lines = [
      `*${p.shopName}*`, `Bill ${p.saleNumber} · ${p.date.toLocaleString('en-PK')}`, '',
      ...p.lines.map((l) => `${l.qty} ${l.unit} ${l.name} — ${formatPKR(l.total)}`), '',
      p.discount ? `Discount: -${formatPKR(p.discount)}` : '',
      `*Total: ${formatPKR(p.total)}*`, p.paymentLabel, '', 'Shukriya!',
    ].filter((x) => x !== '');
    const phone = (lastSale.customerPhone ?? '').replace(/\D/g, '').replace(/^0/, '92');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  }, [lastSale]);

  return {
    config, prefs, shopId, tenant,
    // catalog
    items, loading, filtered, visible, setVisible, categories, filterCounts, bundles, filteredBundles, quickKeys, groupedQuickKeys,
    search, setSearch, submitSearch, categoryId, setCategoryId, filterId, setFilterId, view, setView, inCartBy,
    // bill
    cart, customers, customerId, setCustomerId, selectedCustomer, receiver, setReceiver, soldById, setSoldById,
    delivery, setDelivery, deliveryFee, discountMode, discountPct, discountRs, discountAmount, subtotal, total, totalSavings, totalQty,
    setDiscount: (m: PosDiscountMode, p: number, r: number) => { setDiscountMode(m); setDiscountPct(p); setDiscountRs(r); },
    priceEditId, setPriceEditId, changeQty, setQty, setPrice, removeLine, decrementItem, clearCart,
    heldCarts, hold, resume, deleteHeld,
    // actions
    addItem: (it: PosItem, o?: AddOptions) => void addItem(it, o), addBundle, addQuickKey, handleBarcode, onVoice,
    pushLine, placeUnit,
    // modals
    unitPicker, setUnitPicker, weigh, setWeigh, variantPicker, setVariantPicker, picker, setPicker,
    checkout, setCheckout, openCheckout, instantCash, checkoutMutation, lastSale, closeSuccess, shareLastSale,
    limitFor,
  };
}

export type PosEngine = ReturnType<typeof usePosEngine>;
