/**
 * Jewelry counter. Every piece is priced from its weight at today's rate
 * for its karat, plus banwai, kaat and stones; the cashier can change the
 * rate or banwai while bargaining, or add a piece by hand. Old gold from
 * the customer is weighed, its karat and kaat set, and counted as trade-in
 * on the bill. Checkout uses the shared dialog: cash, card, wallet, split,
 * part payment or udhaar. The bill is saved through the jewelry API, which
 * posts the shared sale (stock, khata, drawer, reports) and keeps the
 * weight breakdown for the receipt.
 *
 * Keys: / search · F9 checkout · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BadgePercent, Coins, Gem, GraduationCap, Plus, Receipt, Repeat, Scale, Search, Sparkles, Trash2, TrendingUp, Wallet, X,
} from 'lucide-react';
import { Button, Input, Kbd, Modal, Select } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { withManagerPin } from '@core/security/ManagerPin';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import {
  PosCheckoutModal, PosCustomerAddModal, PosCustomerPicker, PosEmptyState, PosItemCard, RequireShop, type PosCheckoutResult,
} from '@modules/pos/components';
import { useProductCatalog } from '@modules/pos/engine';
import { keepAdvance, salePayment } from '@modules/pos/lib/posCheckout';
import { jewelrySalesApi } from '../api/sales.api';
import type { Purity } from '../api/metal-rates.api';
import type { JewelryCategory } from '../api/products.api';
import { ChipPicker, KaratPill } from '../components/ui';
import { useJewelryFacts } from '../hooks/useJewelryFacts';
import {
  COMMON_PURITIES, GOLD_KARATS, KEYS, MAIN_CATEGORIES, CATEGORY_LABEL, apiError, categoryLabel, grams, metalOf, oldGoldValue, piecePrice,
  purityLabel, r2, r3, rateFor, stonesOf,
} from '../lib/meta';

/** One piece on the bill. Rate and banwai can be changed while bargaining. */
interface Line {
  key: string;
  productId?: string;
  name: string;
  category: JewelryCategory;
  purity: Purity | 'OTHER';
  grossWeight: number;
  netWeight: number;
  rate: number;
  /** Banwai for the piece in rupees (per-gram, fixed and percent folded together). */
  making: number;
  wastagePct: number;
  wastageGrams: number;
  stones: number;
  other: number;
  hallmark?: string;
  qty: number;
  stock?: number;
  /** A plain product with no jewelry profile: sold at its own price. */
  plain?: boolean;
}

const lineTotal = (l: Line) => (l.plain ? r2(l.making * l.qty) : r2(piecePrice({
  netWeight: l.netWeight, ratePerGram: l.rate, makingChargeFixed: l.making, wastagePct: l.wastagePct, wastageGrams: l.wastageGrams,
  polishCharges: l.other, stoneValue: l.stones,
}).total * l.qty));

const num = (v: string) => Math.max(Number(v.replace(/[^\d.]/g, '')) || 0, 0);

function NumBox({ label, value, onChange, suffix, className }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <label className={cn('block', className)}>
      <span className="block text-[0.6875rem] font-medium text-slate-500">{label}</span>
      <span className="relative block">
        <input inputMode="decimal" value={text ?? (value ? String(value) : '')} placeholder="0"
          onChange={(e) => { setText(e.target.value); onChange(num(e.target.value)); }} onBlur={() => setText(null)}
          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 pr-7 text-[0.8125rem] tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
        {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.6875rem] text-slate-400">{suffix}</span>}
      </span>
    </label>
  );
}

function JewelryCounter() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const { items, loading } = useProductCatalog();
  const { byProduct, rates, rateList } = useJewelryFacts();
  const { data: rules } = useQuery({ queryKey: ['settings', 'counter'], queryFn: () => settingsApi.counter(), staleTime: 5 * 60_000 });
  const { data: customersData } = useQuery({ queryKey: ['customers-for-pos'], queryFn: () => customersApi.list({ page: 1, limit: 500 }), staleTime: 60_000 });
  const customers: any[] = customersData?.items ?? [];

  const [search, setSearch] = useState('');
  const [karat, setKarat] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [lines, setLines] = useState<Line[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [addCustomer, setAddCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [old, setOld] = useState<{ open: boolean; grams: number; purity: Purity; kaat: number; value: number | null }>({ open: false, grams: 0, purity: 'KARAT_22', kaat: 0, value: null });
  const [handPiece, setHandPiece] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [notes, setNotes] = useState('');

  /* ── Catalog with today's price per piece ── */
  const catalog = useMemo(() => items.map((it) => {
    const f = byProduct.get(it.id);
    return { it, f, price: f?.price?.total ?? it.price };
  }), [items, byProduct]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter(({ it, f }) => {
      if (karat && f?.purity !== karat) return false;
      if (category === 'bridal' ? !f?.isBridalCollection : category && f?.category !== category) return false;
      if (!q) return true;
      return [it.name, it.product.sku, it.product.barcode, f?.designNumber, f?.itemCode, f?.hallmarkNumber, f ? categoryLabel(f.category) : '']
        .filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
    }).slice(0, 120);
  }, [catalog, search, karat, category]);

  const inBill = (productId: string) => lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0);

  const add = (productId: string) => {
    const row = catalog.find((c) => c.it.id === productId);
    if (!row) return;
    const { it, f } = row;
    const have = inBill(it.id);
    if (have + 1 > it.stock && !rules?.allowNegativeStock) { toast.error(`${it.name} stock me nahi`); return; }
    const existing = lines.find((l) => l.productId === it.id);
    if (existing) { setLines(lines.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l))); return; }
    if (!f) {
      setLines([...lines, { key: crypto.randomUUID(), productId: it.id, name: it.name, category: 'OTHER', purity: 'OTHER', grossWeight: 0, netWeight: 0, rate: 0, making: it.price, wastagePct: 0, wastageGrams: 0, stones: 0, other: 0, qty: 1, stock: it.stock, plain: true }]);
      return;
    }
    const rate = rateFor(rates, f.metalType, f.purity);
    if (!rate) toast.warning(`${purityLabel(f.purity)} ka aaj ka rate set nahi — rate khud likhein`);
    const r = rate?.ratePerGram ?? 0;
    const metal = r2(f.netWeight * r);
    setLines([...lines, {
      key: crypto.randomUUID(), productId: it.id, name: it.name, category: f.category, purity: f.purity,
      grossWeight: f.grossWeight, netWeight: f.netWeight, rate: r,
      making: r2(f.makingChargePerGram * f.netWeight + f.makingChargeFixed + (metal * f.makingChargePct) / 100),
      wastagePct: f.wastagePct, wastageGrams: f.wastageGrams, stones: stonesOf(f),
      other: r2(f.polishCharge + f.designerCharge + f.otherCharges + f.hallmarkCharge), hallmark: f.hallmarkNumber ?? undefined, qty: 1, stock: it.stock,
    }]);
  };
  const patch = (key: string, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  /* ── Totals ── */
  const subtotal = r2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const weight = r3(lines.reduce((s, l) => s + l.netWeight * l.qty, 0));
  const oldCalc = oldGoldValue(old.grams, old.purity, rates, old.kaat);
  const oldValue = old.open && old.grams > 0 ? r2(old.value ?? oldCalc.value) : 0;
  const disc = Math.min(discount, subtotal);
  const total = r2(Math.max(subtotal - disc - oldValue, 0));
  const customer = customers.find((c) => c.id === customerId);
  const catalogLines = lines.filter((l) => l.productId);

  const reset = () => {
    setLines([]); setDiscount(0); setCustomerId(''); setNotes('');
    setOld({ open: false, grams: 0, purity: 'KARAT_22', kaat: 0, value: null });
  };

  const sell = useMutation({
    mutationFn: async (d: PosCheckoutResult) => {
      const pay = salePayment(d, total);
      const body = {
        customerId: customerId || undefined,
        customerName: customer?.name, customerPhone: customer?.phone ?? undefined,
        items: lines.map((l) => ({
          productId: l.productId, productName: l.name, category: l.category,
          metalType: l.plain ? 'OTHER' : metalOf(l.purity), purity: l.purity,
          ratePerGram: l.rate, grossWeight: l.grossWeight, netWeight: l.netWeight,
          makingChargeFixed: l.making, wastagePct: l.wastagePct, wastageGrams: l.wastageGrams,
          polishCharges: l.other, stoneValue: l.stones, quantity: l.qty, hallmarkNumber: l.hallmark,
        })),
        discount: disc || undefined,
        paymentMethod: pay.paymentMethod,
        paidAmount: pay.paidAmount,
        ...(pay.payments && { payments: pay.payments.filter((p) => p.method !== 'TRADE_IN') }),
        ...(oldValue > 0 && { exchangeMetalGrams: old.grams, exchangeMetalPurity: old.purity, exchangeValue: oldValue }),
        customerNotes: notes || undefined,
      };
      const res = await withManagerPin('Is bill ke liye malik ka PIN', (managerPin) => jewelrySalesApi.create({ ...body, ...(managerPin && { managerPin }) }),
        d.isCredit ? 'credit' : 'discount');
      await keepAdvance(d, total, customerId || undefined, (res as { saleNumber?: string }).saleNumber);
      return res;
    },
    onSuccess: (res) => {
      [KEYS.sales, KEYS.metal, KEYS.exchanges, 'products-for-pos', 'customers-for-pos', 'sales-history', 'dashboard-overview', 'cash-register']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`Bill ban gaya — ${(res as { saleNumber?: string }).saleNumber ?? res.invoiceNumber}`);
      setCheckout(false);
      reset();
      if (res.saleId) window.open(`/sales/${res.saleId}/receipt?auto=1`, '_blank');
    },
    onError: (e) => toast.error(apiError(e, 'Bill save nahi hua')),
  });

  const createCustomer = useMutation({
    mutationFn: (v: { name: string; phone?: string }) => customersApi.create(v as any),
    onSuccess: (c: any) => { qc.invalidateQueries({ queryKey: ['customers-for-pos'] }); setCustomerId(c.id); setAddCustomer(null); toast.success('Customer ban gaya'); },
    onError: (e) => toast.error(apiError(e, 'Customer save nahi hua')),
  });

  const openCheckout = () => {
    if (!catalogLines.length) { toast.error('Kam az kam ek zewar catalog se chunein — stock usi se kam hota hai'); return; }
    if (lines.some((l) => !l.plain && !(l.rate > 0))) { toast.error('Har zewar ka rate likhein'); return; }
    if (old.open && old.grams > 0 && !(oldValue > 0)) { toast.error('Purane sone ki qeemat likhein'); return; }
    setCheckout(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F9' && !isDialogOpen()) { e.preventDefault(); openCheckout(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const goldRates = rateList.filter((r) => r.isActive && (GOLD_KARATS as string[]).includes(r.purity));
  const silver = rateList.find((r) => r.isActive && r.purity === 'SILVER_999');

  return (
    <div className="mx-auto grid w-full max-w-[var(--page-max,96rem)] gap-4 pb-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
      {/* Left: rates, search, pieces */}
      <section className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-amber-950 shadow-sm ring-1 ring-amber-200">
          <TrendingUp className="h-4 w-4 text-amber-700" />
          <span className="text-[0.8125rem] font-semibold">Aaj ka rate</span>
          {goldRates.length === 0 && !silver
            ? <span className="text-[0.8125rem] text-amber-800">Set nahi —</span>
            : [...goldRates, ...(silver ? [silver] : [])].map((r) => (
              <span key={r.id} className="rounded-lg bg-white px-2 py-0.5 text-[0.75rem] font-semibold tabular-nums ring-1 ring-amber-200">
                {purityLabel(r.purity)} {formatPKR(r.ratePerGram)}/g
              </span>
            ))}
          <Link to="/jewelry/metal-rates" className="ml-auto text-[0.75rem] font-semibold text-amber-900 underline-offset-2 hover:underline">Rate badlein</Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white ring-1 ring-amber-200 hover:bg-amber-100"><GraduationCap className="h-4 w-4" /></button>
        </div>

        <div className="space-y-2 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
          <label className="group relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Naam, design number, hallmark, barcode…" aria-label="Zewar dhoondein"
              onKeyDown={(e) => { if (e.key === 'Enter' && shown[0]) { add(shown[0].it.id); setSearch(''); } }}
              className="h-11 w-full rounded-2xl bg-slate-100/80 pl-12 pr-10 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500" />
            {search ? <button type="button" aria-label="Saaf" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
              : <Kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[{ v: '', l: 'Sab karat' }, ...COMMON_PURITIES.map((p) => ({ v: p, l: purityLabel(p) }))].map((o) => (
              <button key={o.v || 'all'} type="button" onClick={() => setKarat(o.v)}
                className={cn('h-8 rounded-full px-3 text-[0.75rem] font-semibold ring-1', karat === o.v ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{o.l}</button>
            ))}
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Zewar ki type"
              className="h-8 rounded-full bg-white px-3 text-[0.75rem] font-semibold text-slate-600 ring-1 ring-slate-200">
              <option value="">Har type</option>
              <option value="bridal">Bridal collection</option>
              {MAIN_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
            <button type="button" onClick={() => setHandPiece(true)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-full px-3 text-[0.75rem] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">
              <Plus className="h-3.5 w-3.5" />Hath se piece
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        ) : shown.length === 0 ? (
          <PosEmptyState icon={Gem} title={search || karat || category ? 'Is filter me koi zewar nahi' : 'Abhi koi zewar nahi'}
            hint={search || karat || category ? undefined : 'Products me "Add jewelry item" se zewar daalein'}
            onClear={search || karat || category ? () => { setSearch(''); setKarat(''); setCategory(''); } : undefined} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map(({ it, f, price }) => (
              <PosItemCard key={it.id} name={it.name} image={it.image} price={price} unit={it.unit} stock={it.stock} lowStock={it.lowStock}
                inCart={inBill(it.id)} onClick={() => add(it.id)}
                onDecrement={() => setLines((ls) => ls.flatMap((l) => (l.productId === it.id ? (l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []) : [l])))}
                subline={f ? `${purityLabel(f.purity)} · ${grams(f.netWeight)}${f.price ? '' : ' · rate nahi'}` : undefined}
                badges={f?.isBridalCollection ? [{ label: 'Bridal', tone: 'info', icon: Sparkles }] : undefined}
                tint="from-amber-100 to-yellow-50" fallback={<Gem className="h-8 w-8 text-amber-400" />} />
            ))}
          </div>
        )}
      </section>

      {/* Right: the bill */}
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-500" />
            <h2 className="text-[0.9375rem] font-bold text-slate-900">Bill</h2>
            {weight > 0 && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-amber-800">{grams(weight)}</span>}
            {lines.length > 0 && <button type="button" onClick={reset} className="ml-auto text-[0.75rem] font-semibold text-rose-600 hover:underline">Saaf karein</button>}
          </div>
          <PosCustomerPicker customers={customers} customerId={customerId} setCustomerId={setCustomerId} selectedCustomer={customer}
            onAddCustomer={() => setAddCustomer({ name: '', phone: '' })} />

          {lines.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-8 text-center text-[0.8125rem] text-slate-500">Zewar par click karein — bill yahan banega</p>
          ) : (
            <ul className="mt-3 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {lines.map((l) => (
                <li key={l.key} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.875rem] font-semibold text-slate-900">{l.qty > 1 ? `${l.qty} × ` : ''}{l.name}</p>
                      {!l.plain && <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[0.75rem] text-slate-500"><KaratPill purity={l.purity} />{grams(l.netWeight)}{l.hallmark ? ' · hallmark' : ''}{!l.productId ? ' · hath se' : ''}</p>}
                    </div>
                    <span className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{formatPKR(lineTotal(l))}</span>
                    <button type="button" aria-label="Hatayein" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {l.plain ? (
                    <div className="mt-2 grid grid-cols-2 gap-2"><NumBox label="Qeemat" value={l.making} onChange={(v) => patch(l.key, { making: v })} suffix="Rs" /></div>
                  ) : (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <NumBox label="Rate / g" value={l.rate} onChange={(v) => patch(l.key, { rate: v })} suffix="Rs" />
                      <NumBox label="Banwai" value={l.making} onChange={(v) => patch(l.key, { making: v })} suffix="Rs" />
                      <NumBox label="Kaat" value={l.wastagePct} onChange={(v) => patch(l.key, { wastagePct: Math.min(v, 30) })} suffix="%" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <button type="button" onClick={() => setOld((o) => ({ ...o, open: !o.open }))} aria-expanded={old.open}
            className="flex w-full items-center gap-2 text-left">
            <Repeat className="h-4 w-4 text-yellow-700" />
            <span className="text-[0.875rem] font-semibold text-slate-900">Purana sona (exchange)</span>
            <span className="ml-auto text-[0.8125rem] font-semibold tabular-nums text-yellow-800">{oldValue > 0 ? `− ${formatPKR(oldValue)}` : old.open ? '' : 'Shamil karein'}</span>
          </button>
          {old.open && (
            <div className="mt-3 space-y-2">
              <ChipPicker value={old.purity} onChange={(p) => setOld({ ...old, purity: p, value: null })}
                options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
              <div className="grid grid-cols-3 gap-2">
                <NumBox label="Wazan" value={old.grams} onChange={(v) => setOld({ ...old, grams: v, value: null })} suffix="g" />
                <NumBox label="Kaat" value={old.kaat} onChange={(v) => setOld({ ...old, kaat: Math.min(v, 50), value: null })} suffix="%" />
                <NumBox label="Qeemat" value={old.value ?? oldCalc.value} onChange={(v) => setOld({ ...old, value: v })} suffix="Rs" />
              </div>
              <p className="text-[0.75rem] text-slate-500">
                {oldCalc.perGram ? `${purityLabel(old.purity)} khareed rate ${formatPKR(oldCalc.perGram)}/g · poora ${formatPKR(oldCalc.full)}` : `${purityLabel(old.purity)} ka rate set nahi — qeemat khud likhein`}
                {' '}· Sona metal stock me jata hai, bill par trade-in.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex justify-between text-[0.875rem]"><span className="text-slate-500">Zewar</span><span className="font-semibold tabular-nums">{formatPKR(subtotal)}</span></div>
          <div className="flex items-center justify-between gap-3 text-[0.875rem]">
            <span className="inline-flex items-center gap-1 text-slate-500"><BadgePercent className="h-4 w-4" />Discount</span>
            <NumBox label="" value={discount} onChange={(v) => setDiscount(v)} suffix="Rs" className="w-32" />
          </div>
          {oldValue > 0 && <div className="flex justify-between text-[0.875rem]"><span className="text-yellow-800">Purana sona {grams(old.grams)}</span><span className="font-semibold tabular-nums text-yellow-800">− {formatPKR(oldValue)}</span></div>}
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bill par note (ikhtiyari)" maxLength={200}
            className="h-9 w-full rounded-xl border border-slate-200 px-3 text-[0.8125rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
          <div className="flex items-end justify-between border-t border-slate-100 pt-2">
            <span className="text-[0.875rem] font-semibold text-slate-700">Customer dega</span>
            <span className="text-[1.5rem] font-bold tabular-nums text-slate-900">{formatPKR(total)}</span>
          </div>
          <Button fullWidth size="lg" onClick={openCheckout} disabled={!lines.length} leftIcon={<Wallet className="h-5 w-5" />}>
            Payment lein <Kbd className="ml-1 bg-white/20 text-white">F9</Kbd>
          </Button>
        </div>
      </aside>

      {handPiece && <HandPieceModal rates={rates} onClose={() => setHandPiece(false)} onAdd={(l) => { setLines((ls) => [...ls, l]); setHandPiece(false); }} />}
      {addCustomer && (
        <PosCustomerAddModal value={addCustomer} onChange={setAddCustomer} saving={createCustomer.isPending}
          onSubmit={(v) => createCustomer.mutate(v)} onClose={() => setAddCustomer(null)} />
      )}
      {checkout && (
        <PosCheckoutModal total={total} itemCount={lines.reduce((s, l) => s + l.qty, 0)} loading={sell.isPending}
          customerName={customer?.name} customerBalance={Number(customer?.balance ?? 0)} hasCustomer={!!customerId}
          initMode="full" initMethod={(rules?.defaultPaymentMethod as PosCheckoutResult['paymentMethod'] | undefined) || 'CASH'}
          allowCredit={rules?.allowCredit ?? true}
          onConfirm={(d) => sell.mutate(d)} onClose={() => { if (!sell.isPending) setCheckout(false); }} />
      )}
      {guide.isOpen && (
        <PageGuide title="Jewelry counter — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: TrendingUp, color: '#d97706', title: 'Subah rate', text: 'Din shuru hote hi "Rate badlein" se aaj ka 24K rate likhein. Har zewar ki qeemat usi se banti hai.' },
            { icon: Gem, color: '#7c3aed', title: 'Zewar chunein', text: 'Click karein ya barcode/design number likh kar Enter. Rate, banwai aur kaat bill par hi badal sakte hain — mol-tol yahin.' },
            { icon: Repeat, color: '#a16207', title: 'Purana sona', text: 'Customer ka purana sona tol kar karat aur kaat likhein. Qeemat bill se kat jati hai, sona metal stock me jata hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Payment', text: 'Cash, card, bank, JazzCash ya kai tareeqon se (split). Baqi ho to customer chun kar udhaar — khate me jata hai.' },
            { icon: Scale, color: '#0891b2', title: 'Hath se piece', text: 'Jo zewar catalog me nahi, "Hath se piece" se wazan aur karat likh kar daalein. Bill me kam az kam ek catalog zewar zaroori hai.' },
          ]}
          tips={['Receipt par har zewar ka karat, wazan, rate aur banwai alag chhapti hai.', 'Bill cancel ya wapas karna ho to Sales history se — stock, khata aur purana sona khud theek hote hain.']}
          shortcuts={[['/', 'dhoondein'], ['Enter', 'pehla zewar'], ['F9', 'payment'], ['G', 'guide']]}
        />
      )}
    </div>
  );
}

/** A piece not in the catalog (old stock, made on the spot): weight, karat, rate and banwai. */
function HandPieceModal({ rates, onAdd, onClose }: { rates: ReturnType<typeof useJewelryFacts>['rates']; onAdd: (l: Line) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<JewelryCategory>('OTHER');
  const [purity, setPurity] = useState<Purity>('KARAT_22');
  const [weight, setWeight] = useState(0);
  const [making, setMaking] = useState(0);
  const rate = rateFor(rates, metalOf(purity), purity)?.ratePerGram ?? 0;
  const [ownRate, setOwnRate] = useState<number | null>(null);
  const r = ownRate ?? rate;
  const ok = name.trim() && weight > 0 && r > 0;
  return (
    <Modal open onClose={onClose} title="Hath se piece" description="Jo zewar catalog me nahi — stock se kuch nahi kat-ta" size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Rehne dein</Button><Button disabled={!ok} onClick={() => onAdd({
        key: crypto.randomUUID(), name: name.trim(), category, purity, grossWeight: weight, netWeight: weight, rate: r, making,
        wastagePct: 0, wastageGrams: 0, stones: 0, other: 0, qty: 1,
      })}>Bill me daalein · {formatPKR(r2(weight * r + making))}</Button></>}>
      <div className="space-y-3">
        <Input label="Naam" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Jaise: purani choori 22K" />
        <Select label="Type" value={category} onChange={(e) => setCategory(e.target.value as JewelryCategory)}
          options={MAIN_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
        <ChipPicker label="Karat" value={purity} onChange={(p) => { setPurity(p); setOwnRate(null); }} options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
        <div className="grid grid-cols-3 gap-2">
          <NumBox label="Wazan" value={weight} onChange={setWeight} suffix="g" />
          <NumBox label="Rate / g" value={r} onChange={(v) => setOwnRate(v)} suffix="Rs" />
          <NumBox label="Banwai" value={making} onChange={setMaking} suffix="Rs" />
        </div>
        {!rate && <p className="flex items-center gap-1.5 text-[0.75rem] text-amber-700"><Coins className="h-3.5 w-3.5" />{purityLabel(purity)} ka aaj ka rate set nahi — rate khud likhein</p>}
      </div>
    </Modal>
  );
}

export default function JewelryPosPage() {
  return <RequireShop action="Jewelry bill banane"><JewelryCounter /></RequireShop>;
}
