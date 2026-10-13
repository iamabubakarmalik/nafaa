/**
 * New booking: pick or add the customer, add items by name, SKU or barcode
 * scan (variants, IMEIs and carpet rolls / cut pieces open their pickers),
 * set the pickup date, discount and advance, then save. Stock is not taken
 * at booking; IMEIs and cut pieces are reserved until the sale or cancel.
 *
 * Keys: Ctrl+Enter save · / items search · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, BookmarkPlus, CalendarClock, GraduationCap, Layers, Package, Scissors, Search, ShoppingCart, Smartphone,
  StickyNote, Trash2, UserPlus, UserRound, Wallet, X,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Button, Card, Kbd, Modal, PageHero, PageShell, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isTempId } from '@core/lib/offline/db';
import { offlineProductsApi } from '@core/lib/offline/offlineProducts';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useBusinessFeatures } from '@core/hooks/useBusinessFeatures';
import { useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';
import { productVariantsApi, type ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import type { Product } from '@modules/inventory/products/api/products.api';
import { BranchPicker } from '@modules/inventory/stock-adjustments/components/BranchPicker';
import { ProductSearch } from '@modules/inventory/stock-adjustments/components/ProductSearch';
import { usePurchaseSources, type Source, type UnitChoice } from '@modules/purchasing/purchases/editor/sources';
import { ServiceChargesPanel } from '@modules/pos/components/ServiceChargesPanel';
import { VariantPicker } from '@modules/pos/components/VariantPicker';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import type { PaymentMethod, ServiceChargeItem } from '@modules/sales/sales/api/sales.api';
import { CarpetRollPicker } from '@/industries/carpet/components/pos-extensions/CarpetRollPicker';
import { CarpetCutPiecePicker } from '@/industries/carpet/components/pos-extensions/CarpetCutPiecePicker';
import { useOfflineCarpetSummary } from '@industries/carpet/hooks/useOfflineCarpetSummary';
import { ImeiPickerModal } from '@industries/mobile/components/ImeiPickerModal';
import { bookingsApi, type CreateBookingItem } from '../api/bookings.api';
import { useRefreshBookings } from '../components/ActionModals';
import { apiError, qtyText } from '../components/meta';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);
const MOBILE_WORDS = ['mobile', 'phone', 'smartphone', 'iphone', 'samsung', 'oppo', 'vivo', 'realme', 'xiaomi', 'tecno', 'infinix'];

interface Line extends CreateBookingItem {
  key: string;
  name: string;
  unit: string;
  /** Shown under the line: variant, IMEI, roll cut, pack size. */
  tag?: string;
  /** Fixed by a picker (IMEI, roll cut, cut piece): quantity cannot change. */
  locked?: boolean;
  stock?: number;
}

type RollData = Parameters<ComponentProps<typeof CarpetRollPicker>['onConfirm']>[0];
type CutPiece = Parameters<ComponentProps<typeof CarpetCutPiecePicker>['onSelect']>[0];
type Imei = Parameters<ComponentProps<typeof ImeiPickerModal>['onSelect']>[0];

const lineKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const toLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const inputCls = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const cellCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-sm tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

export default function BookingFormPage() {
  const navigate = useNavigate();
  const shopId = useShopParam();
  const allShops = useIsAllShops();
  const { cost: costText, costHidden } = useMasked();
  const { businessType, features } = useBusinessFeatures();
  const refresh = useRefreshBookings();
  const guide = usePageGuide();

  const type = (businessType ?? '').toUpperCase();
  const isCarpet = type === 'CARPET' || type === 'FLOORING' || features?.lengthWidthCalc === true;
  const imeiOn = features?.imei === true;

  const [customer, setCustomer] = useState<Pick<Customer, 'id' | 'name' | 'phone' | 'balance'> | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickup, setPickup] = useState('');
  const [expires, setExpires] = useState('');
  const [discount, setDiscount] = useState('');
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [charges, setCharges] = useState<ServiceChargeItem[]>([]);
  const [variantPicker, setVariantPicker] = useState<{ product: Product; variants: ProductVariant[] } | null>(null);
  const [rollPicker, setRollPicker] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [piecePicker, setPiecePicker] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const [imeiPicker, setImeiPicker] = useState<{ product: Product; variant?: ProductVariant } | null>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  const { sources, byCode, loading } = usePurchaseSources(false);
  const productsQ = useQuery({ queryKey: ['purchase-sources', 'products'], queryFn: () => offlineProductsApi.list({ page: 1, limit: 100_000 }), staleTime: 60_000 });
  const productMap = useMemo(() => new Map(((productsQ.data?.items ?? []) as Product[]).map((p) => [p.id, p])), [productsQ.data]);
  const carpetIds = useMemo(() => (isCarpet ? [...productMap.values()].filter((p) => CARPET_UNITS.has(p.unit)).map((p) => p.id) : []), [isCarpet, productMap]);
  const { data: carpetSummary = [] } = useOfflineCarpetSummary(carpetIds, isCarpet && carpetIds.length > 0);
  const carpetSqft = useMemo(() => new Map(carpetSummary.map((s: { productId: string; totalSqft: number }) => [s.productId, s.totalSqft])), [carpetSummary]);
  const sellable = useMemo(() => sources.filter((s) => s.kind === 'product'), [sources]);

  const isCarpetProduct = (p: Product) => isCarpet && CARPET_UNITS.has(p.unit);
  const needsImei = (p: Product) => imeiOn && MOBILE_WORDS.some((w) => p.name.toLowerCase().includes(w) || (p.category?.name ?? '').toLowerCase().includes(w));

  /* ── totals ── */
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const lineOff = lines.reduce((s, l) => s + (l.lineDiscount ?? 0), 0);
  const billOff = Number(discount) || 0;
  const svc = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const total = Math.max(subtotal - lineOff - billOff + svc, 0);
  const adv = Number(advance) || 0;
  const balance = Math.max(total - adv, 0);
  const cost = lines.reduce((s, l) => s + (l.costPrice ?? 0) * l.quantity, 0);
  const profit = total - svc - cost;

  const issues: string[] = [];
  if (!customer) issues.push('Customer chunein');
  if (!lines.length) issues.push('Kam se kam ek cheez dalein');
  if (adv > total + 0.01) issues.push('Advance kul se zyada nahi ho sakta');
  if (billOff > subtotal - lineOff + 0.01) issues.push('Discount kul se zyada hai');
  if (lines.some((l) => !(l.quantity > 0))) issues.push('Har cheez ki quantity likhein');
  if (pickup && expires && new Date(expires) < new Date(pickup)) issues.push('Aakhri din pickup se pehle nahi ho sakta');
  const warnings: string[] = [];
  if (pickup && new Date(pickup).getTime() < Date.now()) warnings.push('Pickup ki date guzar chuki hai');
  if (lines.length && !adv && !pickup) warnings.push('Advance ya pickup ki date me se ek zaroor rakhein');
  if (!costHidden && cost > 0 && profit < 0) warnings.push(`Ghaate ki booking: cost ${formatPKR(cost)} hai`);
  const short = lines.filter((l) => l.stock !== undefined && !l.locked && l.quantity > l.stock);
  if (short.length) warnings.push(`${short.map((l) => l.name).join(', ')}: stock kam hai — sale se pehle maal mangwayein`);

  /* ── adding items ── */
  const addLine = (l: Omit<Line, 'key'>) => setLines((prev) => [...prev, { ...l, key: lineKey() }]);

  const addStandard = (p: Product, v: ProductVariant | null, unit?: UnitChoice) => {
    const rate = unit?.rate ?? 1;
    const existing = !v && !unit?.id ? lines.find((l) => l.productId === p.id && !l.variantId && !l.locked) : undefined;
    if (existing) {
      setLines((prev) => prev.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l)));
      toast.success(`${p.name} +1`);
      return;
    }
    addLine({
      productId: p.id, variantId: v?.id, name: v ? `${p.name} (${v.name})` : p.name, unit: v?.unit ?? p.unit,
      quantity: rate, price: v?.price ?? p.price, costPrice: v?.costPrice ?? p.costPrice ?? 0, lineDiscount: 0,
      stock: v?.stock ?? p.stock, tag: rate !== 1 ? `1 ${unit?.name} = ${qtyText(rate)} ${p.unit}` : undefined,
    });
    toast.success(`${p.name} add ho gaya`);
  };

  const route = async (p: Product, unit?: UnitChoice) => {
    if (isCarpetProduct(p) && !((carpetSqft.get(p.id) ?? 0) > 0)) { toast.error(`${p.name}: koi chalu roll nahi`); return; }
    if (p.hasVariants) {
      try {
        const variants = (await productVariantsApi.list(p.id)).filter((v) => v.isActive);
        if (!variants.length) { toast.error('Is product ki koi chalu type nahi'); return; }
        setVariantPicker({ product: p, variants });
      } catch { toast.error('Qismein load nahi hui'); }
      return;
    }
    if (isCarpetProduct(p)) { setRollPicker({ product: p }); return; }
    if (needsImei(p)) { setImeiPicker({ product: p }); return; }
    addStandard(p, null, unit);
  };

  const onPick = (s: Source, unit: UnitChoice) => {
    const p = productMap.get(s.id);
    if (!p) { toast.error('Product load nahi hua, dobara koshish karein'); return; }
    void route(p, unit);
  };

  const onVariant = (v: ProductVariant) => {
    if (!variantPicker) return;
    const { product } = variantPicker;
    setVariantPicker(null);
    if (isCarpetProduct(product)) setRollPicker({ product, variant: v });
    else if (needsImei(product)) setImeiPicker({ product, variant: v });
    else addStandard(product, v);
  };

  const onRoll = (d: RollData) => {
    if (!rollPicker) return;
    const { product, variant } = rollPicker;
    const inch = d.lengthInch > 0 ? ` ${d.lengthInch}in` : '';
    addLine({
      productId: product.id, variantId: variant?.id, rollId: d.roll.id, name: variant ? `${product.name} (${variant.name})` : product.name, unit: product.unit,
      quantity: d.cutSqft, price: d.pricePerSqft, costPrice: d.roll.costPerSqft ?? 0, lineDiscount: 0, locked: true,
      cutWidthFt: d.customerWidthFt, cutLengthFt: d.lengthFt, cutLengthInch: d.lengthInch, cutSqft: d.cutSqft,
      note: `Cut from ${d.roll.rollNumber}: ${d.customerWidthFt}ft × ${d.lengthFt}ft${inch} = ${d.cutSqft.toFixed(2)} sqft`,
      tag: `Roll ${d.roll.rollNumber}`,
    });
    setRollPicker(null);
  };

  const onPiece = (piece: CutPiece) => {
    if (!piecePicker) return;
    const { product, variant } = piecePicker;
    addLine({
      productId: product.id, variantId: variant?.id, cutPieceId: piece.id, name: product.name, unit: product.unit,
      quantity: piece.totalSqft, price: piece.salePrice / Math.max(piece.totalSqft, 0.01), costPrice: 0, lineDiscount: 0, locked: true,
      note: `Cut piece ${piece.pieceCode} • ${piece.widthFt}ft × ${piece.lengthFt}ft`, tag: `Piece ${piece.pieceCode}`,
    });
    setPiecePicker(null);
  };

  const onImei = (imei: Imei) => {
    if (!imeiPicker) return;
    const { product, variant } = imeiPicker;
    addLine({
      productId: product.id, variantId: variant?.id, imeiId: imei.id, name: variant ? `${product.name} (${variant.name})` : product.name,
      unit: variant?.unit ?? product.unit, quantity: 1, price: variant?.price ?? product.price,
      costPrice: imei.costPrice ?? variant?.costPrice ?? product.costPrice ?? 0, lineDiscount: 0, locked: true,
      note: `IMEI: ${imei.imei1}`, tag: `IMEI ${imei.imei1}`,
    });
    setImeiPicker(null);
  };

  const patch = (key: string, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const pickupIn = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(12, 0, 0, 0); setPickup(toLocal(d)); };

  /* ── save ── */
  const save = useMutation({
    mutationFn: () => bookingsApi.create({
      shopId: shopId!,
      customerId: customer!.id,
      expectedPickupAt: pickup ? new Date(pickup).toISOString() : undefined,
      expiresAt: expires ? new Date(expires).toISOString() : undefined,
      discount: billOff,
      initialAdvance: adv,
      paymentMethod: method,
      serviceCharges: charges.length ? charges : undefined,
      notes: notes.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      items: lines.map(({ key: _k, name: _n, unit: _u, tag: _t, locked: _l, stock: _s, ...item }) => item),
    }),
    onSuccess: (b) => { toast.success(`Booking ${b.bookingNumber} ban gayi`); refresh(); navigate(`/bookings/${b.id}`); },
    onError: (e) => toast.error(apiError(e, 'Booking nahi bani')),
  });
  const submit = () => {
    if (save.isPending) return;
    if (!shopId) { toast.error('Pehle branch chunein'); return; }
    if (issues.length) { toast.error(issues[0]); return; }
    save.mutate();
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submitRef.current(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); itemsRef.current?.querySelector('input')?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const carpetProducts = useMemo(() => [...productMap.values()].filter(isCarpetProduct), [productMap, isCarpet]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageShell>
      <Link to="/bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700"><ArrowLeft className="h-4 w-4" />Bookings</Link>

      <PageHero
        title="Nayi booking"
        chip={<><BookmarkPlus /> Advance aur reserve</>}
        meta="Customer advance de, maal rakha jaye, pickup par bill bane"
        actions={<>
          {isCarpet && carpetProducts.length > 0 && (
            <button type="button" onClick={() => setPiecePicker({ product: carpetProducts[0] })} className={heroButton}><Scissors className="h-4 w-4" />Cut pieces</button>
          )}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={submit} disabled={save.isPending} title="Save (Ctrl+Enter)" className={heroPrimaryButton}><BookmarkPlus className="h-4 w-4" />{save.isPending ? 'Ban rahi hai…' : 'Booking banayein'}</button>
        </>}
        stats={[
          { label: 'Kul', value: formatPKR(total), hint: `${lines.length} cheez` },
          { label: 'Advance', value: formatPKR(adv), hint: total > 0 ? `${Math.round((adv / total) * 100)}%` : undefined },
          { label: 'Baqi', value: formatPKR(balance) },
        ]}
      />

      {allShops && !shopId ? <BranchPicker what="Booking" /> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="rounded-3xl" title={<Step n={1} icon={UserRound}>Customer</Step>} description="Booking hamesha kisi customer ke naam hoti hai — advance us ke khate me jama hota hai">
              <CustomerField value={customer} onChange={setCustomer} />
            </Card>

            <Card className="rounded-3xl" title={<Step n={2} icon={Package}>Cheezen</Step>}
              description={isCarpet ? 'Carpet ka roll ya cut piece chunein; baqi maal naam, SKU ya barcode se' : imeiOn ? 'Mobile chunne par IMEI chunein — woh is booking ke liye reserve ho jata hai' : 'Naam, SKU ya barcode likhein ya scan karein; Enter pehli cheez chun leta hai'}>
              <div ref={itemsRef}><ProductSearch sources={sellable} byCode={byCode} loading={loading} onPick={onPick} /></div>
              <p className="mt-1 text-[0.6875rem] text-slate-500"><Kbd>/</Kbd> se yahan aayein. Stock booking par nahi ghatta, sale par ghatta hai.</p>

              {!lines.length ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center">
                  <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">Abhi koi cheez nahi — upar se search</p>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                  {lines.map((l) => (
                    <li key={l.key} className="grid grid-cols-2 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem_5.5rem_6.5rem_2rem] sm:items-center">
                      <div className="col-span-2 min-w-0 sm:col-span-1">
                        <p className="truncate font-medium text-slate-900">{l.name}</p>
                        <p className="flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-slate-500">
                          {l.tag && <span className="inline-flex items-center gap-1">{l.imeiId ? <Smartphone className="h-3 w-3" /> : <Layers className="h-3 w-3" />}{l.tag}</span>}
                          {l.stock !== undefined && !l.locked && <span className={cn(l.quantity > l.stock && 'font-medium text-amber-700')}>Stock {qtyText(l.stock)} {l.unit}</span>}
                        </p>
                        <input value={l.note ?? ''} onChange={(e) => patch(l.key, { note: e.target.value || undefined })} placeholder="Note (slip par chhapta hai) — maslan: size, rang"
                          aria-label="Line note" className="mt-1 h-8 w-full rounded-lg border border-transparent bg-slate-50 px-2 text-[0.75rem] text-slate-700 outline-none focus:border-brand-500 focus:bg-white" />
                      </div>
                      <label className="text-[0.6875rem] text-slate-500 sm:text-transparent">Quantity
                        <input type="number" inputMode="decimal" min={0} step="any" value={l.quantity} disabled={l.locked} aria-label="Quantity"
                          onChange={(e) => patch(l.key, { quantity: Number(e.target.value) })} className={cn(cellCls, l.locked && 'bg-slate-50 text-slate-500')} />
                      </label>
                      <label className="text-[0.6875rem] text-slate-500 sm:text-transparent">Rate
                        <input type="number" inputMode="decimal" min={0} step="any" value={l.price} aria-label="Rate"
                          onChange={(e) => patch(l.key, { price: Number(e.target.value) })} className={cellCls} />
                      </label>
                      <label className="text-[0.6875rem] text-slate-500 sm:text-transparent">Discount
                        <input type="number" inputMode="decimal" min={0} step="any" value={l.lineDiscount || ''} placeholder="0" aria-label="Line discount"
                          onChange={(e) => patch(l.key, { lineDiscount: Number(e.target.value) || 0 })} className={cellCls} />
                      </label>
                      <p className="self-end text-right font-semibold tabular-nums text-slate-900 sm:self-center">{formatPKR(l.price * l.quantity - (l.lineDiscount ?? 0))}</p>
                      <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} aria-label="Hatayein"
                        className="justify-self-end rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {isCarpet && (
              <Card className="rounded-3xl" title="Service charges" description="Fitting, delivery, cutting — kul me jud jate hain">
                <ServiceChargesPanel charges={charges} onChange={setCharges} />
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="rounded-3xl" title={<Step n={3} icon={CalendarClock}>Pickup</Step>}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="bk-pickup" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Customer kab lega</label>
                  <input id="bk-pickup" type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} className={inputCls} />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[['Aaj', 0], ['Kal', 1], ['3 din', 3], ['1 hafta', 7], ['2 hafte', 14]].map(([l, d]) => (
                      <Chip key={l} onClick={() => pickupIn(Number(d))}>{l}</Chip>
                    ))}
                  </div>
                  <p className="mt-1 text-[0.6875rem] text-slate-500">Upcoming list, calendar aur WhatsApp yaad dihani isi se chalti hai.</p>
                </div>
                <div>
                  <label htmlFor="bk-expires" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Aakhri din (marzi)</label>
                  <input id="bk-expires" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className={inputCls} />
                  <p className="mt-1 text-[0.6875rem] text-slate-500">Is ke baad booking par laal nishan aata hai; khud cancel nahi hoti.</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl" title={<Step n={4} icon={Wallet}>Paise</Step>}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="bk-discount" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Bill par discount</label>
                  <input id="bk-discount" type="number" inputMode="decimal" min={0} step="any" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className={inputCls} />
                  <p className="mt-1 text-[0.6875rem] text-slate-500">Rupay me. Har line ki alag discount upar likhein.</p>
                </div>
                <div>
                  <label htmlFor="bk-advance" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Advance abhi</label>
                  <input id="bk-advance" type="number" inputMode="decimal" min={0} step="any" value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="0"
                    className={cn(inputCls, 'h-12 text-lg font-semibold tabular-nums')} />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[0.1, 0.25, 0.5, 1].map((f) => <Chip key={f} disabled={!total} onClick={() => setAdvance(String(Math.round(total * f)))}>{f === 1 ? 'Poora' : `${f * 100}%`}</Chip>)}
                  </div>
                  <p className="mt-1 text-[0.6875rem] text-slate-500">Customer ke khate me jama hota hai; sale par bill me lag jata hai.</p>
                </div>
                {adv > 0 && (
                  <div>
                    <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Advance kaise diya</p>
                    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Kaise diya">
                      {POS_PAYMENT_METHODS.map((m) => (
                        <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id as PaymentMethod)}
                          className={cn('inline-flex h-9 items-center justify-center gap-1 rounded-xl text-[0.75rem] font-medium ring-1 transition',
                            method === m.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                          <m.icon className="h-3.5 w-3.5" />{m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <dl className="space-y-1 rounded-2xl bg-slate-50 p-3 text-[0.8125rem] ring-1 ring-slate-200">
                  <Row k="Cheezon ka jor" v={formatPKR(subtotal)} />
                  {lineOff + billOff > 0 && <Row k="Discount" v={`−${formatPKR(lineOff + billOff)}`} />}
                  {svc > 0 && <Row k="Service charges" v={`+${formatPKR(svc)}`} />}
                  <Row k="Kul" v={formatPKR(total)} strong />
                  <Row k="Advance" v={formatPKR(adv)} />
                  <Row k="Baqi (pickup par)" v={formatPKR(balance)} />
                  {cost > 0 && <Row k="Andaazan profit" v={costHidden ? costText(profit) : formatPKR(profit)} />}
                </dl>
              </div>
            </Card>

            <Card className="rounded-3xl" title={<span className="inline-flex items-center gap-2"><StickyNote className="h-4 w-4 text-amber-500" />Notes</span>}>
              <div className="space-y-3">
                <div>
                  <label htmlFor="bk-notes" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Customer ke liye</label>
                  <textarea id="bk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} placeholder="Maslan: naap, rang, design"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
                  <p className="mt-1 text-[0.6875rem] text-slate-500">Booking slip par chhapta hai.</p>
                </div>
                <div>
                  <label htmlFor="bk-internal" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Team ke liye</label>
                  <textarea id="bk-internal" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} maxLength={2000} placeholder="Maslan: supplier se mangwana hai"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
                  <p className="mt-1 text-[0.6875rem] text-slate-500">Sirf staff ko dikhta hai, slip par nahi.</p>
                </div>
              </div>
            </Card>

            {(issues.length > 0 || warnings.length > 0) && lines.length > 0 && (
              <ul className="space-y-1.5">
                {issues.map((t) => <li key={t} className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200"><X className="h-4 w-4 shrink-0" />{t}</li>)}
                {warnings.map((t) => <li key={t} className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />{t}</li>)}
              </ul>
            )}

            <Button size="lg" fullWidth loading={save.isPending} disabled={issues.length > 0} onClick={submit} leftIcon={<BookmarkPlus className="h-4 w-4" />}>
              Booking banayein {adv > 0 ? `· ${formatPKR(adv)} advance` : ''}
            </Button>
            <p className="text-center text-[0.6875rem] text-slate-500"><Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> se bhi save</p>
          </div>
        </div>
      )}

      {variantPicker && (
        <VariantPicker product={variantPicker.product} variants={variantPicker.variants} onSelect={onVariant} onClose={() => setVariantPicker(null)}
          ignoreStock />
      )}
      {rollPicker && <CarpetRollPicker product={rollPicker.product} variant={rollPicker.variant} onConfirm={onRoll} onClose={() => setRollPicker(null)} />}
      {piecePicker && <CarpetCutPiecePicker product={piecePicker.product} variant={piecePicker.variant} onSelect={onPiece} onClose={() => setPiecePicker(null)} />}
      {imeiPicker && (
        <ImeiPickerModal productId={imeiPicker.product.id} productName={imeiPicker.product.name} variantId={imeiPicker.variant?.id} variantName={imeiPicker.variant?.name}
          excludeIds={lines.filter((l) => l.imeiId).map((l) => l.imeiId!)} onSelect={onImei} onClose={() => setImeiPicker(null)} />
      )}

      {guide.isOpen && (
        <PageGuide title="Nayi booking — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#2563eb', title: '1. Customer', text: 'Naam ya phone likh kar chunein. Naya ho to "Naya customer" se wahin bana lein.' },
            { icon: Package, color: '#7c3aed', title: '2. Cheezen', text: 'Naam, SKU ya barcode likhein ya scan karein. Type (size/rang), IMEI aur carpet roll ke liye picker khud khulta hai.' },
            { icon: CalendarClock, color: '#d97706', title: '3. Pickup', text: 'Customer kab lega — Aaj, Kal, 3 din, hafta. Isi se yaad dihani aur calendar chalte hain.' },
            { icon: Wallet, color: '#16a34a', title: '4. Advance', text: 'Jitna advance mila likhein (10%, 25%, 50% ke buttons). Baqi pickup par.' },
          ]}
          tips={[
            'Booking par stock nahi ghatta — sale par ghatta hai. Stock kam ho to peela nishan aata hai.',
            'IMEI aur cut piece booking ke liye reserve ho jate hain; counter par nahi bikte.',
            'Line ka note slip par chhapta hai; team note sirf staff ke liye.',
          ]}
          shortcuts={[['/', 'cheez search'], ['Ctrl+Enter', 'save'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Step({ n, icon: I, children }: { n: number; icon: typeof Search; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[0.75rem] font-bold text-white">{n}</span>
      <I className="h-4 w-4 text-brand-600" />{children}
    </span>
  );
}

function Chip({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50">{children}</button>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'border-t border-slate-200 pt-1.5 text-base font-bold text-slate-900')}>
      <dt className={strong ? '' : 'text-slate-500'}>{k}</dt><dd className="tabular-nums">{v}</dd>
    </div>
  );
}

type PickedCustomer = Pick<Customer, 'id' | 'name' | 'phone' | 'balance'>;

/** Server search by name or phone (arrows + Enter), with quick add. */
function CustomerField({ value, onChange }: { value: PickedCustomer | null; onChange: (c: PickedCustomer | null) => void }) {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  useEffect(() => { const t = setTimeout(() => setQuery(text.trim()), 200); return () => clearTimeout(t); }, [text]);
  useEffect(() => setHi(0), [query]);
  const q = useQuery({
    queryKey: ['customers', 'booking-pick', query],
    queryFn: () => customersApi.list({ search: query || undefined, scope: 'all', limit: 8, sortBy: query ? 'name' : 'createdAt', sortOrder: query ? 'asc' : 'desc' }),
    enabled: open, placeholderData: (p) => p, staleTime: 30_000,
  });
  const rows = q.data?.items ?? [];
  const pick = (c: PickedCustomer) => { onChange(c); setText(''); setOpen(false); };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50/60 px-3 py-2.5 ring-1 ring-brand-100">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-100"><UserRound className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{value.name}</p>
          <p className="text-[0.75rem] text-slate-600">
            {value.phone || 'Phone nahi'}
            {value.balance ? <> · Khata: <b className={value.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}>{value.balance > 0 ? `${formatPKR(value.balance)} dena` : `${formatPKR(-value.balance)} jama`}</b></> : null}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Badlein</Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={text} autoFocus aria-label="Customer search" placeholder="Naam ya phone…"
            onChange={(e) => { setText(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, rows.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
              else if (e.key === 'Enter' && rows[hi]) { e.preventDefault(); pick(rows[hi]); }
            }}
            className={cn(inputCls, 'pl-9')} />
        </div>
        <Button variant="secondary" className="h-11" onClick={() => setAdding(true)} leftIcon={<UserPlus className="h-4 w-4" />}><span className="hidden sm:inline">Naya customer</span></Button>
      </div>
      <p className="mt-1 text-[0.6875rem] text-slate-500">↑ ↓ se chunein, Enter se pakka karein. Har branch ke customer milte hain.</p>
      {open && (
        <div className="absolute inset-x-0 top-12 z-30 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {q.isLoading ? <p className="p-4 text-center text-sm text-slate-500">Dhoond rahe hain…</p>
            : !rows.length ? (
              <div className="p-4 text-center text-sm text-slate-500">
                Koi customer nahi mila.{' '}
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setAdding(true)} className="font-medium text-brand-700 underline">Naya banayein</button>
              </div>
            ) : rows.map((c, i) => (
              <button key={c.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)} onMouseEnter={() => setHi(i)}
                className={cn('flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-0', i === hi && 'bg-slate-50')}>
                <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{c.name}</span><span className="block text-[0.75rem] text-slate-500">{c.phone || '—'}</span></span>
                {!!c.balance && <span className={cn('shrink-0 text-[0.75rem] tabular-nums', c.balance > 0 ? 'text-rose-700' : 'text-emerald-700')}>{formatPKR(Math.abs(c.balance))} {c.balance > 0 ? 'dena' : 'jama'}</span>}
              </button>
            ))}
        </div>
      )}
      {adding && <AddCustomer initial={text} onClose={() => setAdding(false)} onDone={pick} />}
    </div>
  );
}

function AddCustomer({ initial, onClose, onDone }: { initial: string; onClose: () => void; onDone: (c: PickedCustomer) => void }) {
  const looksPhone = /^[\d+\s-]{6,}$/.test(initial.trim());
  const [name, setName] = useState(looksPhone ? '' : initial.trim());
  const [phone, setPhone] = useState(looksPhone ? initial.trim() : '');
  const add = useMutation({
    mutationFn: () => customersApi.create({ name: name.trim(), phone: phone.trim() || undefined }),
    onSuccess: (c) => {
      if (isTempId(c.id)) { toast.error('Internet nahi — naya customer booking ke liye online banana zaroori hai'); return; }
      toast.success(`${c.name} ban gaya`);
      onDone(c);
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Customer nahi bana')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Naya customer" description="Sirf naam zaroori hai; phone ho to WhatsApp yaad dihani ja sakti hai"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={add.isPending} disabled={!name.trim()} onClick={() => add.mutate()} leftIcon={<UserPlus className="h-4 w-4" />}>Banayein</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (name.trim() && !add.isPending) add.mutate(); }}>
        <div>
          <label htmlFor="nc-name" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Naam</label>
          <input id="nc-name" value={name} onChange={(e) => setName(e.target.value)} data-autofocus className={inputCls} placeholder="Customer ka naam" />
        </div>
        <div>
          <label htmlFor="nc-phone" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Phone</label>
          <input id="nc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} placeholder="03XX XXXXXXX" />
          <p className="mt-1 text-[0.6875rem] text-slate-500">Marzi hai, magar is ke bagair WhatsApp nahi ja sakta.</p>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
