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
import { hasPermission, PERMISSIONS } from '@core/lib/permissions';
import { discountsApi } from '@modules/sales/discounts/api/discounts.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { productUnitsApi } from '@modules/inventory/products/api/product-units.api';
import { freeVariantStock, productVariantsApi, type ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import type { PaymentMethod, SalePaymentPart } from '@modules/sales/sales/api/sales.api';
import type { VoiceCommand, VoiceFeedback } from '@core/components/voice/VoiceSaleButton';
import { matchScore } from '@core/components/voice/voiceMatch';
import { quickKeysApi, type QuickKey } from '../api/quick-keys.api';
import { usePosPreferences } from '../hooks/usePosPreferences';
import { POS_BATCHES_KEY, usePosBatches } from '../hooks/usePosBatches';
import type { PosBatch } from '../api/batches.api';
import { emptyDelivery, deliveryAmount, deliveryRiderAmount, deliveryServiceCharge, type PosDeliveryState } from '../components/PosDeliveryPanel';
import { emptyReceiver, type PosReceiverValue } from '../components/PosReceiverField';
import type { PosCheckoutResult } from '../components/PosCheckoutModal';
import type { PosLastSale } from '../components/PosSuccessModal';
import {
  POS_PAYMENT_METHODS, posHeldId, posLineId,
  type PosCartLine, type PosCheckoutMode, type PosComboSerial, type PosDiscountMode, type PosHeldCart,
} from '../lib/posCart';
import {
  buildUnitScanIndex, derivePosUnits, isWeightUnit, qtyStep, unitEmoji, unitKeyOf, type PosUnitOption,
} from '../lib/posUnits';
import { printReceiptDirect, toReceiptDoc, type ReceiptPayload } from '../lib/thermalReceipt';
import { getReceiptSetup } from '@core/receipt/setup';
import { receiptText } from '@modules/sales/receipt/fromSale';
import { splitReceiptLines } from '../components/PosSplitTender';
import { keepAdvance, salePayment } from '../lib/posCheckout';
import { askManagerPin } from '@core/security/ManagerPin';
import { isTempId } from '@core/lib/offline/db';
import type { AddOptions, PosBundle, PosEngineApi, PosIndustryConfig, PosItem, PosSavedSale, PosUsedPhoneLine } from './types';

/** Customers refresh after a sale (balances change). */
const SALE_REFRESH = [POS_BATCHES_KEY, 'customers-for-pos', 'sales-list', 'sales-history', 'dashboard-overview', 'dashboard-day-report', 'retail-money-map', 'dashboard-list'];

/** Common Urdu/Roman words for everyday goods, for voice search. */
const BASE_VOICE_ALIASES: Record<string, string> = {
  chini: 'cheeni sugar', cheeni: 'cheeni sugar', doodh: 'milk doodh', dudh: 'milk doodh',
  chai: 'tea chai patti', patti: 'patti tea chai', chawal: 'rice chawal', aata: 'aata atta flour', atta: 'aata atta flour',
  tel: 'oil tel', namak: 'salt namak', anda: 'egg anda anday', anday: 'egg anda anday', sabun: 'soap sabun',
  daal: 'daal dal', aloo: 'potato aloo', pyaz: 'onion pyaz', tamatar: 'tomato tamatar', dahi: 'yogurt dahi', paani: 'water paani',
  sugar: 'cheeni sugar', milk: 'doodh milk', egg: 'anday eggs', eggs: 'anday eggs', bread: 'bread double roti', rice: 'chawal rice',
  'چینی': 'cheeni sugar', 'دودھ': 'doodh milk', 'انڈے': 'anday eggs', 'انڈا': 'anday eggs', 'چائے': 'chai tea', 'پتی': 'patti tea',
  'آٹا': 'aata flour', 'چاول': 'chawal rice', 'تیل': 'tel oil', 'گھی': 'ghee', 'نمک': 'namak salt', 'صابن': 'sabun soap',
  'دال': 'daal', 'دہی': 'dahi yogurt', 'پانی': 'paani water', 'ڈبل روٹی': 'bread double roti', 'بسکٹ': 'biscuit',
  // Everyday goods, Urdu script → catalog words
  'مکھن': 'makhan butter', 'پنیر': 'paneer cheese', 'شہد': 'shahad honey', 'جام': 'jam', 'کیچپ': 'ketchup sauce',
  'سرف': 'surf detergent', 'سرخ مرچ': 'lal mirch chilli', 'مرچ': 'mirch chilli', 'ہلدی': 'haldi turmeric', 'دھنیا': 'dhania coriander',
  'زیرہ': 'zeera cumin', 'گرم مصالحہ': 'garam masala', 'مصالحہ': 'masala', 'سویاں': 'sewaiyan vermicelli', 'نوڈلز': 'noodles',
  'چپس': 'chips', 'ٹافی': 'toffee candy', 'چاکلیٹ': 'chocolate', 'جوس': 'juice', 'کولڈ ڈرنک': 'cold drink cola',
  'بوتل': 'bottle drink', 'سگریٹ': 'cigarette', 'ماچس': 'machis matches', 'موم بتی': 'candle', 'شیمپو': 'shampoo',
  'ٹوتھ پیسٹ': 'toothpaste', 'برش': 'brush', 'ٹشو': 'tissue', 'چنے': 'chanay chickpeas', 'بیسن': 'besan gram flour',
  'میدہ': 'maida flour', 'سوجی': 'suji semolina', 'کیلا': 'kela banana', 'سیب': 'seb apple', 'پیاز': 'pyaz onion',
  'ٹماٹر': 'tamatar tomato', 'آلو': 'aloo potato', 'لہسن': 'lehsan garlic', 'ادرک': 'adrak ginger', 'لیموں': 'lemon',
  'کیک': 'cake', 'پیٹیز': 'patties', 'سموسہ': 'samosa', 'رس': 'rusk', 'بن': 'bun', 'پیزا': 'pizza', 'کوکیز': 'cookies',
  makhan: 'makhan butter', butter: 'makhan butter', surf: 'surf detergent', mirch: 'mirch chilli', haldi: 'haldi turmeric',
  machis: 'machis matches', besan: 'besan', maida: 'maida', suji: 'suji', kela: 'kela banana', seb: 'seb apple', lehsan: 'lehsan garlic',
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
  const useTradeIns = config.useTradeIns ?? (() => undefined);
  const tradeIns = useTradeIns();
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
  const { data: ls } = useQuery({ queryKey: ['settings', 'counter'], queryFn: () => settingsApi.counter(), staleTime: 5 * 60_000 });
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

  // The shop's counter rules from Settings; the server checks them again.
  const rules = useMemo(() => ({
    negativeStock: !!ls?.allowNegativeStock,
    requireCustomer: !!ls?.requireCustomerForSale,
    allowDiscount: ls?.allowDiscount ?? true,
    maxDiscountPercent: ls?.maxDiscountPercent ?? 100,
    pinForDiscount: !!ls?.requirePinForDiscount,
    allowCredit: ls?.allowCredit ?? true,
    hasPin: !!ls?.hasManagerPin,
    discountTrusted: hasPermission(user?.role, (user as { permissions?: string[] } | null)?.permissions, PERMISSIONS.POS_DISCOUNT_OVERRIDE),
    defaultMethod: (ls?.defaultPaymentMethod as PaymentMethod | undefined) || 'CASH',
  }), [ls, user]);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  // A new customer must not inherit the previous customer's receiver.
  useEffect(() => { setReceiver(emptyReceiver()); }, [customerId]);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.lineTotal, 0), [cart]);
  const discountAmount = discountMode === 'pct' ? (subtotal * discountPct) / 100 : Math.min(discountRs || 0, subtotal);
  const deliveryFee = deliveryAmount(delivery);

  // ─── Discount code and loyalty points ───
  // The code's discount is checked against the bill (re-checked whenever the
  // bill or customer changes); points pay up to the shop's limits.
  const [promo, setPromo] = useState<{ code: string; discount: number; offline?: boolean } | null>(null);
  const [pointsWanted, setPointsWanted] = useState(0);
  const afterManual = Math.max(subtotal - discountAmount, 0);
  const codeDiscount = promo ? Math.min(promo.discount, afterManual) : 0;
  const loyaltyOn = !!ls?.enableLoyalty && !!selectedCustomer;
  const pointRate = ls?.loyaltyRedemptionRate || 1;
  const pointsAvailable = loyaltyOn ? Number(selectedCustomer?.loyaltyPoints ?? 0) : 0;
  const pointsMax = loyaltyOn
    ? Math.max(0, Math.min(pointsAvailable, Math.floor(((afterManual - codeDiscount) * Math.min(100, ls?.loyaltyMaxRedeemPercent ?? 100) / 100) / pointRate)))
    : 0;
  const pointsMin = ls?.loyaltyMinRedeem ?? 0;
  const pointsUsed = Math.min(pointsWanted, pointsMax) >= Math.max(1, pointsMin) ? Math.min(pointsWanted, pointsMax) : 0;
  const loyaltyDiscount = pointsUsed * pointRate;
  const total = Math.max(afterManual - codeDiscount - loyaltyDiscount, 0) + deliveryFee;

  useEffect(() => { setPointsWanted(0); }, [customerId]);
  const promoCode = promo?.code;
  useEffect(() => {
    if (!promoCode) return;
    let alive = true;
    const t = setTimeout(() => {
      discountsApi.validate(promoCode, subtotal, { customerId: customerId || undefined, shopId })
        .then((v) => { if (alive) setPromo({ code: v.code, discount: v.discount, offline: v.offline }); })
        .catch((e: Error) => { if (alive) { setPromo(null); toast.error(`Code ${promoCode} hata diya: ${e.message}`); } });
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [promoCode, subtotal, customerId, shopId]);
  const applyCode = useCallback(async (code: string) => {
    const v = await discountsApi.validate(code, subtotal, { customerId: customerId || undefined, shopId });
    setPromo({ code: v.code, discount: v.discount, offline: v.offline });
    return v;
  }, [subtotal, customerId, shopId]);
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
    subtotal, discount: discountAmount + codeDiscount + loyaltyDiscount, total,
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
    opts.oversell || rulesRef.current.negativeStock ? Number.MAX_SAFE_INTEGER
      : opts.variant?.stock != null ? Number(opts.variant.stock) : item.stock;

  const pushLine = useCallback((item: PosItem, unit: PosUnitOption, qty: number, opts: AddOptions) => {
    // One tracked unit (serial or IMEI) is one line of exactly 1.
    const single = !!(opts.serial || opts.imei);
    if (opts.imei) qty = 1;
    const limit = opts.imei ? 1 : limitFor(item, opts);
    const baseQty = qty * unit.conversionRate;
    const price = opts.price != null && unit.conversionRate === 1 ? Number(opts.price)
      : opts.variant?.price != null && unit.conversionRate === 1 ? Number(opts.variant.price) : unit.price;
    setCart((prev) => {
      if (opts.imei && prev.some((l) => l.imeiId === opts.imei!.id)) { toast.info('Ye phone pehle se bill mein hai'); return prev; }
      const existing = !single && prev.find((l) =>
        l.productId === item.id && l.unitName === unit.unitName && l.unitPrice === price && (l.variantId ?? '') === (opts.variant?.id ?? '') && !l.serialId && !l.imeiId);
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
        opts.imei ? `IMEI: ${opts.imei.imei1}${opts.imei.imei2 ? ` / ${opts.imei.imei2}` : ''}` : '',
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
        serialId: opts.serial?.id, serialNumber: opts.serial?.serialNumber, imei: opts.imei?.imei1 ?? opts.serial?.imei ?? undefined,
        imeiId: opts.imei?.id,
        warrantyMonths: opts.warrantyMonths, lockQty: single,
      }];
    });
  }, []);

  /** A used phone: no catalog product, quantity 1, its own price. */
  const addUsedPhone = useCallback((u: PosUsedPhoneLine) => {
    if (!(u.price > 0)) { toast.error(`${u.name} ka resale price set nahi`); return; }
    setCart((prev) => {
      if (prev.some((l) => l.usedPhoneId === u.usedPhoneId)) { toast.info('Ye phone pehle se bill mein hai'); return prev; }
      toast.success(`${u.name} — ${u.code}`, { duration: 800 });
      return [...prev, {
        id: posLineId(), type: 'product', name: u.name, image: u.image,
        unitName: 'pcs', unitLabel: 'USED', emoji: '📱',
        unitPrice: u.price, basePrice: u.price, quantity: 1, baseQuantity: 1, conversionRate: 1, baseUnit: 'pcs', baseStock: 1,
        lineTotal: u.price, note: u.note || `Used · ${u.code}`, usedPhoneId: u.usedPhoneId, lockQty: true,
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
    // A known quantity (scale label) goes straight on the bill without the weigh window.
    if (isWeightUnit(unit.unitName) && opts.qty == null) { setWeigh({ item, unit, opts }); return; }
    pushLine(item, unit, qty, opts);
  }, [pushLine]);

  const engineApiRef = useRef<PosEngineApi>(null as unknown as PosEngineApi);

  const addItem = useCallback(async (item: PosItem, opts: AddOptions = {}) => {
    if (config.beforeAdd && config.beforeAdd(item, opts, engineApiRef.current) === 'handled') return;
    if (item.price <= 0 && !opts.variant && !(opts.price != null && opts.price > 0)) { toast.error(`${item.name} ka rate set nahi — pehle product mein rate daalein`); return; }
    if (!opts.oversell && !opts.imei && !rulesRef.current.negativeStock && !opts.variant && item.stock <= 0 && !item.hasVariants) { toast.error(`${item.name} — stock khatam`); return; }

    if (item.hasVariants && !opts.variant && !opts.imei) {
      try {
        const variants = (await productVariantsApi.list(item.id)).filter((v) => v.isActive);
        if (variants.length) { setVariantPicker({ item, variants, opts }); return; }
      } catch { toast.error('Variants load nahi hue'); return; }
    }
    if (opts.serial || opts.imei || opts.unit) { placeUnit(item, opts.unit ?? derivePosUnits({ ...item.product, price: item.price, unit: item.unit } as any, [])[0], opts, opts.qty ?? 1); return; }

    const units = await unitsFor(item);
    // A quantity from a scale label is in the base unit, so no unit picker.
    if (units.length > 1 && !opts.variant && opts.qty == null) { setUnitPicker({ item, units, opts }); return; }
    placeUnit(item, units[0], opts, opts.qty ?? 1);
  }, [config, placeUnit, unitsFor]);

  const addBundle = useCallback((b: PosBundle, qty = 1, serials?: PosComboSerial[]) => {
    if (!serials && config.beforeAddBundle && config.beforeAddBundle(b, qty, engineApiRef.current) === 'handled') return;
    for (const it of b.items) {
      const p = itemsById.get(it.productId);
      if (p && !rulesRef.current.negativeStock && p.stock < it.quantity * qty) { toast.error(`${p.name} — stock sirf ${p.stock}, chahiye ${it.quantity * qty}`); return; }
    }
    // A combo with picked serial units stays its own line, so its units stay with it.
    const picked = serials?.length ? serials : undefined;
    setCart((prev) => {
      const existing = !picked && prev.find((l) => l.comboId === b.id && !l.comboSerials);
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
        comboSerials: picked, lockQty: !!picked,
        note: [
          `${b.items.length} cheezein${b.savings ? ` · bachat ${formatPKR(b.savings)}` : ''}`,
          ...(picked ?? []).map((s) => `S/N: ${s.serialNumber}${s.imei ? ` · IMEI: ${s.imei}` : ''}`),
        ].join(' • '),
      }];
    });
  }, [config, itemsById]);

  const addQuickKey = useCallback(async (qk: QuickKey) => {
    if (qk.comboId) { const b = bundles.find((x) => x.id === qk.comboId); return b ? addBundle(b) : toast.error('Combo nahi mila'); }
    if (!qk.productId) return toast.error('Quick key set nahi hai');
    const it = itemsById.get(qk.productId);
    if (!it) return toast.error('Product nahi mila');
    // A key may fix the pack unit and the variant; otherwise the usual pickers open.
    const unit = qk.unitId ? (await unitsFor(it)).find((u) => u.id === qk.unitId) : undefined;
    let variant: AddOptions['variant'];
    if (qk.variantId) {
      try {
        const v = (await productVariantsApi.list(it.id)).find((x) => x.id === qk.variantId && x.isActive);
        if (v) variant = { id: v.id, name: v.name, price: v.price, stock: freeVariantStock(v), reserved: v.reserved ?? null };
      } catch { /* offline: fall back to the variant picker */ }
    }
    return addItem(it, { ...(unit && { unit }), ...(variant && { variant }) });
  }, [bundles, itemsById, addBundle, addItem, unitsFor]);

  engineApiRef.current = {
    addItem: (item, opts) => { void addItem(item, opts); },
    openPicker: setPicker,
    closePicker: () => setPicker(null),
    itemById: (id) => itemsById.get(id),
    findItemByCode: (code) => {
      const c = code.trim().toLowerCase();
      return items.find((i) => (i.product.barcode ?? '').toLowerCase() === c || (i.product.sku ?? '').toLowerCase() === c);
    },
    addUsedPhone,
    addBundle: (b, qty, serials) => addBundle(b, qty, serials),
    items,
    cart,
  };

  /* ── Line edits ── */
  const changeQty = (id: string, delta: number) => setCart((prev) => prev.flatMap((l) => {
    if (l.id !== id) return [l];
    if (l.lockQty && delta > 0) { toast.error('Serial / IMEI wala item — ek hi'); return [l]; }
    const nq = Number((l.quantity + delta * qtyStep(l.unitName)).toFixed(3));
    if (nq <= 0) return [];
    const nb = nq * l.conversionRate;
    if (l.type === 'product' && nb > l.baseStock) { toast.error(`Stock sirf ${l.baseStock} ${l.baseUnit}`); return [l]; }
    return [{ ...l, quantity: nq, baseQuantity: nb, lineTotal: nq * l.unitPrice }];
  }));
  const setQty = (id: string, qty: number) => setCart((prev) => prev.flatMap((l) => {
    if (l.id !== id) return [l];
    if (qty <= 0) return [];
    if (l.lockQty && qty > 1) { toast.error('Serial / IMEI wala item — ek hi'); return [l]; }
    const nb = qty * l.conversionRate;
    if (l.type === 'product' && nb > l.baseStock) { toast.error(`Stock sirf ${l.baseStock} ${l.baseUnit}`); return [l]; }
    return [{ ...l, quantity: qty, baseQuantity: nb, lineTotal: qty * l.unitPrice }];
  }));
  const setPrice = (id: string, price: number) => {
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, unitPrice: Math.max(price, 0), lineTotal: l.quantity * Math.max(price, 0) } : l)));
    setPriceEditId(null);
  };
  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.id !== id));
  /** Sell this line from a chosen batch; null goes back to the earliest expiry. */
  const setLineBatch = (id: string, batch: PosBatch | null) =>
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, batchId: batch?.id, batchNumber: batch?.batchNumber } : l)));
  const batchOf = usePosBatches(shopId, cart);
  /** One less of a product: its most recent bill line goes down a step. */
  const decrementItem = (productId: string) => {
    const line = [...cart].reverse().find((l) => l.productId === productId);
    if (line) changeQty(line.id, -1);
  };
  const clearCart = useCallback(() => {
    setCart([]); setCustomerId(''); setDiscountPct(0); setDiscountRs(0);
    setDelivery(emptyDelivery()); setReceiver(emptyReceiver()); setPromo(null); setPointsWanted(0);
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
      const p = await offlineProductsApi.byBarcode(code) as Awaited<ReturnType<typeof offlineProductsApi.byBarcode>> & {
        matchedVariant?: { id: string; name: string; price?: number | null; stock?: number | null; isActive?: boolean };
        shopStock?: number | null;
      };
      const it = itemsById.get(p.id);
      // A size/colour barcode names the variant, so it goes on the bill without the picker.
      const mv = p.matchedVariant;
      if (it && mv && mv.isActive !== false) {
        void addItem(it, { variant: { id: mv.id, name: mv.name, price: mv.price ?? null, stock: p.shopStock ?? mv.stock ?? null } });
        return;
      }
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
  /** Best catalog match for a spoken product name, with its score. */
  const findVoice = useCallback((spoken: string): { item: PosItem; score: number } | null => {
    const raw = spoken.toLowerCase().trim();
    if (!raw) return null;
    // Add catalog words people say for a thing ("cheeni" → "sugar").
    let phrase = raw;
    Object.entries(aliases).forEach(([a, t]) => { if (raw.includes(a)) phrase = `${raw} ${t}`; });
    let best: { item: PosItem; score: number } | null = null;
    for (const it of items) {
      const score = Math.max(matchScore(raw, it.name, `${it.searchText ?? ''} ${it.categoryName ?? ''}`), matchScore(phrase, it.name, it.searchText ?? ''));
      if (score > (best?.score ?? 0)) best = { item: it, score };
    }
    return best && best.score >= 14 ? best : null;
  }, [items, aliases]);

  const onVoice = useCallback(async (cmd: VoiceCommand, alternatives: VoiceCommand[] = []): Promise<VoiceFeedback> => {
    if (cmd.kind === 'add') {
      // The recogniser's other hearings may name the product better; take the strongest match.
      const tries = [cmd, ...alternatives.filter((a): a is Extract<VoiceCommand, { kind: 'add' }> => a.kind === 'add')];
      let pick: { cmd: Extract<VoiceCommand, { kind: 'add' }>; item: PosItem; score: number } | null = null;
      for (const c of tries) {
        const m = findVoice(c.productQuery);
        if (m && m.score > (pick?.score ?? 0)) pick = { cmd: c, ...m };
      }
      if (!pick) return { ok: false, text: `"${cmd.productQuery}" nahi mila` };
      const { item: it, cmd: c } = pick;
      const units = await unitsFor(it);
      let unit = units[0];
      if (c.unit) unit = units.find((u) => unitKeyOf(u.unitName) === c.unit) ?? unit;
      if (c.byMoney) {
        if (isWeightUnit(unit.unitName) && unit.price > 0) {
          const q = Number((c.byMoney / unit.price).toFixed(3));
          pushLine(it, unit, q, {});
          return { ok: true, text: `${it.name} — Rs ${c.byMoney} ka (${q} ${unit.unitName})` };
        }
        setWeigh({ item: it, unit, opts: {}, prefillMoney: c.byMoney });
        return { ok: true, text: `${it.name} — wazan check karein` };
      }
      if (units.length > 1 && !c.unit) { setUnitPicker({ item: it, units, opts: {} }); return { ok: true, text: `${it.name} — unit chunein` }; }
      pushLine(it, unit, c.qty || 1, {});
      return { ok: true, text: `${c.qty || 1} ${unit.unitName} ${it.name}` };
    }
    if (cmd.kind === 'checkout') {
      if (!cart.length) return { ok: false, text: 'Bill khaali hai' };
      const credit = cmd.mode === 'credit';
      if (credit && !customerId) return { ok: false, text: 'Udhaar ke liye pehle customer chunein' };
      setCheckout({ mode: credit ? 'credit' : 'full' });
      return { ok: true, text: credit ? 'Udhaar — checkout khul gaya' : 'Checkout khul gaya' };
    }
    if (cmd.kind === 'discount') {
      if (!rules.allowDiscount) return { ok: false, text: 'Is dukaan me discount band hai' };
      if (cmd.pct) { setDiscountMode('pct'); setDiscountPct(Math.min(cmd.pct, 100)); setDiscountRs(0); return { ok: true, text: `${cmd.pct}% discount laga` }; }
      if (cmd.rs) { setDiscountMode('rs'); setDiscountRs(cmd.rs); setDiscountPct(0); return { ok: true, text: `Rs ${cmd.rs} discount laga` }; }
      return { ok: false, text: 'Discount ki amount samajh nahi aayi' };
    }
    if (cmd.kind === 'clear') { clearCart(); return { ok: true, text: 'Bill saaf' }; }
    return { ok: false, text: `Samjha nahi: "${cmd.text}"` };
  }, [findVoice, unitsFor, pushLine, cart.length, customerId, clearCart, rules.allowDiscount]);

  /* ── Checkout ── */
  const receiptFor = useCallback((sale: { saleNumber?: string }, paid: number, method: PaymentMethod, credit: number, parts?: SalePaymentPart[]): ReceiptPayload => ({
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
      note: [l.serialNumber ? `S/N ${l.serialNumber}` : '', ...(l.comboSerials ?? []).map((u) => `S/N ${u.serialNumber}`), l.batchNumber ? `Batch ${l.batchNumber}` : '', l.imei ? `IMEI ${l.imei}` : '', l.warrantyMonths ? `Warranty ${l.warrantyMonths} mahine` : ''].filter(Boolean).join(' · ') || undefined,
    })),
    subtotal, discount: discountAmount + codeDiscount + loyaltyDiscount, total,
    deliveryCharge: deliveryFee || undefined,
    riderDelivery: deliveryRiderAmount(delivery) || undefined,
    deliveryAddress: delivery.on ? delivery.address || undefined : undefined,
    paid,
    paymentLabel: credit > 0 ? `Paid (${POS_PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method}) · Udhaar ${formatPKR(credit)}`
      : `Paid (${POS_PAYMENT_METHODS.find((m) => m.id === method)?.label ?? method})`,
    // Split bills print each part as handed over (cash before change).
    payments: splitReceiptLines(parts),
    cashierName: user?.fullName,
    footerNote: config.receiptFooter,
  }), [tenant, user, selectedCustomer, receiver, cart, subtotal, discountAmount, codeDiscount, loyaltyDiscount, total, deliveryFee, delivery, config.receiptFooter]);

  /**
   * Which rule needs the owner's PIN for this bill: a string to ask for it,
   * null when nothing does, false when the bill cannot go through.
   */
  const pinReason = (credit: number): string | null | false => {
    // Hand discount only; codes and points follow their own rules.
    const manual = discountAmount;
    // A price lowered by hand counts toward the same limit (the server checks it too).
    const priceCut = cart.reduce((s, l) => s + Math.max(0, (Number(l.basePrice) || 0) - (Number(l.unitPrice) || 0)) * (Number(l.quantity) || 0), 0);
    // Staff trusted with "Had se zyada chhoot" skip the limit and its PIN; credit rules below still apply.
    if (manual > 0 && !rules.allowDiscount) { toast.error('Is dukaan me haath se discount band hai (Settings)'); return false; }
    if (manual + priceCut > 0.005 && !rules.discountTrusted) {
      const base = subtotal + priceCut;
      const pct = base > 0 ? ((manual + priceCut) / base) * 100 : 100;
      if (pct > rules.maxDiscountPercent + 0.01) {
        if (!rules.hasPin) { toast.error(`Discount ${rules.maxDiscountPercent}% se zyada nahi ho sakti (Settings)`); return false; }
        return `${rules.maxDiscountPercent}% se zyada discount`;
      }
      if (rules.pinForDiscount && rules.hasPin) return 'Discount';
    }
    if (credit > 0 && selectedCustomer) {
      const limit = Number(selectedCustomer.creditLimit) || 0;
      if (limit > 0 && (Number(selectedCustomer.balance) || 0) + credit > limit + 0.01) {
        if (!rules.hasPin) { toast.error(`${selectedCustomer.name} ki credit limit ${formatPKR(limit)} hai`); return false; }
        return `Credit limit (${formatPKR(limit)}) se zyada udhaar`;
      }
    }
    return null;
  };

  /** The industry's own stop before checkout; shows its message and returns false. */
  const industryAllowsCheckout = () => {
    const stop = config.beforeCheckout?.(cart);
    if (stop) { toast.error(stop); return false; }
    return true;
  };

  const checkoutMutation = useMutation({
    mutationFn: async (d: PosCheckoutResult) => {
      if (!shopId) throw new Error('Pehle shop chunein');
      if (rules.requireCustomer && !customerId) { toast.error('Har bill par customer chunna zaroori hai'); throw new Error('Cancelled'); }
      if (!industryAllowsCheckout()) throw new Error('Cancelled');
      const credit = Math.max(total - d.paidAmount, 0);
      const why = pinReason(credit);
      if (why === false) throw new Error('Cancelled');
      let managerPin: string | undefined;
      if (why) {
        const pin = await askManagerPin(why, /udhaar/i.test(why) ? 'credit' : 'discount');
        if (!pin) throw new Error('Cancelled');
        managerPin = pin;
      }
      const items: any[] = [];
      for (const l of cart) {
        if (l.type === 'combo' && l.comboItems) {
          // Spread the combo price over its products in proportion to their normal prices.
          const orig = l.comboItems.reduce((s: number, it: any) => s + Number(it.quantity || 0) * (Number(it.originalPrice) || 0), 0);
          const factor = orig > 0 ? l.unitPrice / orig : 1;
          // Serial units picked for the combo leave as their own lines of one.
          const picks = [...(l.comboSerials ?? [])];
          for (const ci of l.comboItems as any[]) {
            const op = Number(ci.originalPrice) || 0;
            const dp = op * factor;
            const line = { productId: ci.productId, variantId: ci.variantId || undefined, priceOverride: Number.isFinite(dp) && dp > 0 ? dp : op, note: `Combo: ${l.name}` };
            let qty = Number(ci.quantity) * l.quantity;
            while (qty >= 1) {
              const at = picks.findIndex((p) => p.productId === ci.productId);
              if (at < 0) break;
              items.push({ ...line, quantity: 1, serialId: picks.splice(at, 1)[0].id });
              qty -= 1;
            }
            if (qty > 0) items.push({ ...line, quantity: qty });
          }
        } else if (l.productId) {
          items.push({
            productId: l.productId,
            variantId: l.variantId,
            quantity: l.baseQuantity,
            priceOverride: l.unitPrice / l.conversionRate,
            note: l.note,
            ...(l.serialId ? { serialId: l.serialId } : {}),
            ...(l.imeiId ? { imeiId: l.imeiId } : {}),
            ...(l.batchId ? { batchId: l.batchId } : {}),
          });
        } else if (l.usedPhoneId) {
          items.push({ usedPhoneId: l.usedPhoneId, quantity: 1, priceOverride: l.unitPrice, note: l.note });
        }
      }
      const pay = salePayment(d, total);
      const sale = await offlineSalesApi.create({
        shopId,
        customerId: customerId || undefined,
        soldById,
        ...pay,
        discount: discountAmount,
        discountCode: promo?.code,
        loyaltyPointsToUse: pointsUsed || undefined,
        serviceCharges: deliveryServiceCharge(delivery),
        receivedByName: receiver.name.trim() || undefined,
        receivedByPhone: receiver.phone.trim() || undefined,
        items,
        ...(managerPin && { managerPin }),
      }, { codeDiscount, loyaltyDiscount });
      const deposited = await keepAdvance(d, total, customerId || undefined, (sale as { saleNumber?: string }).saleNumber);
      return { sale, deposited, paidAmount: pay.paidAmount };
    },
    onSuccess: ({ sale, deposited, paidAmount }, d) => {
      const s = sale as { id: string; saleNumber: string };
      const credit = Math.max(total - paidAmount, 0);
      const change = Math.max(d.paidAmount - total, 0);
      const printPayload = receiptFor(s, paidAmount, d.paymentMethod, credit, d.payments);
      setLastSale({ id: s.id, number: s.saleNumber, change, total, deposited, credit, printPayload, customerPhone: selectedCustomer?.phone });
      setCheckout(null);
      clearCart();
      [...refreshKeys, ...SALE_REFRESH].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (prefs.autoPrint && !printReceiptDirect(printPayload, prefs.printerWidth)) toast.error('Popup band hai — browser mein popups allow karein');
      if (prefs.autoClose) successTimer.current = setTimeout(() => setLastSale(null), 3500);
      // Industry follow-up (qist offer…) only for bills the server saved, never for a queued offline one.
      const queued = isTempId(String(s.id ?? '')) || (sale as { status?: string }).status === 'pending';
      if (config.onSale && !queued) {
        try { config.onSale(sale as PosSavedSale); } catch (err) { console.error('[pos] onSale failed', err); }
      }
    },
    onError: (e: unknown) => {
      if ((e as Error)?.message === 'Cancelled') return;
      if (!navigator.onLine) toast.info('Offline — sale save ho gayi, net aate hi chali jayegi');
      else toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || (e as Error).message || 'Sale nahi hui');
    },
  });

  const instantCash = useCallback(() => {
    if (!cart.length) { toast.error('Bill khaali hai'); return; }
    if (!shopId) { toast.error('Pehle shop chunein'); return; }
    if (rules.requireCustomer && !customerId) { toast.error('Har bill par customer chunna zaroori hai'); return; }
    if (checkoutMutation.isPending) return;
    if (!industryAllowsCheckout()) return;
    checkoutMutation.mutate({ paymentMethod: 'CASH', paidAmount: total, isCredit: false, depositExtra: false });
  }, [cart.length, shopId, checkoutMutation, total, rules.requireCustomer, customerId, config, cart]);

  const openCheckout = useCallback((mode: PosCheckoutMode = 'full', method?: PaymentMethod) => {
    if (!cart.length) return;
    if (rules.requireCustomer && !customerId) { toast.error('Har bill par customer chunna zaroori hai'); return; }
    if (mode !== 'full' && !rules.allowCredit) { toast.error('Is dukaan me udhaar band hai'); return; }
    if (!industryAllowsCheckout()) return;
    setCheckout({ mode, method: method ?? rules.defaultMethod });
  }, [cart.length, rules, customerId, config, cart]);

  const closeSuccess = useCallback(() => { clearTimeout(successTimer.current); setLastSale(null); }, []);
  useEffect(() => () => clearTimeout(successTimer.current), []);

  /** WhatsApp text of the last bill. */
  const shareLastSale = useCallback(() => {
    if (!lastSale) return;
    const p = lastSale.printPayload;
    const phone = (lastSale.customerPhone ?? '').replace(/\D/g, '').replace(/^0/, '92');
    const text = receiptText(toReceiptDoc(p), getReceiptSetup(p.shopName).shop.name, getReceiptSetup().design.payAccounts);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }, [lastSale]);

  return {
    config, prefs, shopId, tenant,
    // catalog
    items, loading, filtered, visible, setVisible, categories, filterCounts, bundles, filteredBundles, quickKeys, groupedQuickKeys,
    search, setSearch, submitSearch, categoryId, setCategoryId, filterId, setFilterId, view, setView, inCartBy,
    // bill
    cart, customers, customerId, setCustomerId, selectedCustomer, receiver, setReceiver, soldById, setSoldById,
    delivery, setDelivery, deliveryFee, discountMode, discountPct, discountRs, discountAmount, subtotal, total, totalSavings, totalQty,
    setDiscount: (m: PosDiscountMode, p: number, r: number) => {
      if (!rules.allowDiscount && (p > 0 || r > 0)) { toast.error('Is dukaan me haath se discount band hai'); return; }
      setDiscountMode(m); setDiscountPct(p); setDiscountRs(r);
    },
    rules,
    promo, applyCode, removeCode: () => setPromo(null), codeDiscount,
    loyalty: { on: loyaltyOn, available: pointsAvailable, max: pointsMax, min: pointsMin, rate: pointRate, used: pointsUsed, wanted: pointsWanted, setWanted: setPointsWanted },
    loyaltyDiscount,
    priceEditId, setPriceEditId, changeQty, setQty, setPrice, removeLine, decrementItem, clearCart, batchOf, setLineBatch,
    heldCarts, hold, resume, deleteHeld,
    // actions
    addItem: (it: PosItem, o?: AddOptions) => void addItem(it, o), addBundle, addQuickKey, handleBarcode, onVoice,
    pushLine, placeUnit, addUsedPhone, tradeIns,
    // modals
    unitPicker, setUnitPicker, weigh, setWeigh, variantPicker, setVariantPicker, picker, setPicker,
    checkout, setCheckout, openCheckout, instantCash, checkoutMutation, lastSale, closeSuccess, shareLastSale,
    limitFor,
  };
}

export type PosEngine = ReturnType<typeof usePosEngine>;
