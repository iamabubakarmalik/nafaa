/**
 * New purchase or order. Items come from search or the barcode scanner
 * (a pack barcode brings its pack unit). Each line can be bought in any
 * unit — pieces, a product's carton/box, or a purchase-only unit such as
 * "bori = 50 kg" — and bakeries can buy raw materials on the same bill.
 * Freight, tax and discount spread into the cost; paid defaults to the
 * full bill; an order puts nothing in stock until it is received.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Boxes, CalendarClock, ChevronDown, ClipboardList, PackagePlus, Plus, Save, ScanLine, Search, Trash2, Truck, UserPlus, Wheat, X } from 'lucide-react';
import { Button, Modal, PageHero, Segmented, heroButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useShopParam } from '@core/stores/auth.store';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import { suppliersApi, type Supplier } from '../../suppliers/api/suppliers.api';
import { purchasesApi } from '../api/purchases.api';
import { QuickProductModal, QuickSupplierModal } from '../components/QuickAddModals';
import { usePurchaseDraft, type DraftLine } from './draft';
import { searchSources, usePurchaseSources, type Source, type UnitChoice } from './sources';

export interface PurchaseEditorConfig {
  /** Small badge next to a product line, e.g. electronics "Serial". */
  lineBadge?: (productId: string) => ReactNode;
  productWizardPath?: string;
}

const money = (n: number) => formatPKR(n);
const qtyText = (n: number) => Number(n.toFixed(3)).toLocaleString('en-PK');
const field = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

export function PurchaseEditorPage({ config = {} }: { config?: PurchaseEditorConfig }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const shopId = useShopParam();
  const industry = useCurrentIndustry();
  const withIngredients = industry?.id === 'bakery';
  const { sources, byCode, loading, refresh } = usePurchaseSources(withIngredients);
  const d = usePurchaseDraft(params.get('order') === '1' ? 'order' : 'receive');
  const { bill, setBill, lines } = d;

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [variantFor, setVariantFor] = useState<{ source: Source; unit: UnitChoice } | null>(null);
  const [customFor, setCustomFor] = useState<DraftLine | null>(null);
  const [newProduct, setNewProduct] = useState<string | null>(null);
  const [newSupplier, setNewSupplier] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const suppliersQ = useQuery({ queryKey: ['suppliers', 'picker'], queryFn: () => suppliersApi.list({ status: 'active', sort: 'recent', limit: 500 }), staleTime: 60_000 });
  const suppliers = suppliersQ.data?.items ?? [];
  const supplier = suppliers.find((s) => s.id === bill.supplierId);

  const results = useMemo(() => searchSources(sources, query), [sources, query]);
  const low = useMemo(() => sources.filter((s) => s.lowAt > 0 && s.stock <= s.lowAt).sort((a, b) => a.stock - b.stock).slice(0, 14), [sources]);

  const addSource = (s: Source, unit: UnitChoice = s.units[0]) => {
    if (s.kind === 'product' && s.hasVariants) { setVariantFor({ source: s, unit }); return; }
    d.add(s, unit);
    setQuery('');
    setOpen(false);
    searchRef.current?.focus();
  };

  const onCode = (raw: string) => {
    const hit = byCode.get(raw.trim().toLowerCase());
    if (hit) { addSource(hit.source, hit.unit); toast.success(`${hit.source.name} · ${hit.unit.name}`, { duration: 900 }); return; }
    toast.error(`"${raw}" nahi mila — naya product bana lein`);
    setNewProduct(raw);
  };

  // "/" search, Ctrl+S save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save.mutate(); return; }
      if (e.key === '/' && !isTyping() && !isDialogOpen()) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const problems = [
    !shopId && 'Upar se branch chunein — maal kis branch me aaya',
    !bill.supplierId && 'Supplier chunein',
    !lines.length && 'Kam se kam ek cheez jorein',
    lines.some((l) => !(l.qty > 0)) && 'Har line ki miqdar likhein',
    bill.discount > d.subtotal && 'Discount bill se zyada hai',
  ].filter(Boolean) as string[];

  const save = useMutation({
    mutationFn: () => {
      if (problems.length) throw new Error(problems[0]);
      return purchasesApi.create(d.payload(shopId));
    },
    onSuccess: (p) => {
      toast.success(bill.mode === 'order' ? `Order ${p.purchaseNumber} ban gaya` : `Kharidari ${p.purchaseNumber} save — stock barh gaya`);
      ['purchases', 'purchase-list', 'purchases-summary', 'suppliers', 'product-catalog', 'products', 'purchase-sources', 'pos-product-units', 'dashboard-overview']
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      d.reset();
      navigate(`/purchases/${p.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Save nahi hua'),
  });

  const order = bill.mode === 'order';

  return (
    <div className="space-y-4 pb-24">
      <PageHero
        title={order ? 'Naya order' : 'Nayi kharidari'}
        chip={<><Truck /> {order ? 'Supplier ko order — maal baad me' : 'Maal aa gaya — stock abhi barhega'}</>}
        meta="Carton, box, pack ya apna unit — sab chalta hai"
        actions={<>
          {(lines.length > 0 || bill.supplierId) && (
            <button type="button" className={heroButton} onClick={() => { if (confirm('Yeh bill saaf kar dein?')) d.reset(); }}>
              <Trash2 className="h-4 w-4" /> Saaf
            </button>
          )}
          <button type="button" className={heroButton} onClick={() => navigate('/purchases')}><ClipboardList className="h-4 w-4" /> Sab kharidari</button>
        </>}
        stats={[
          { label: 'Cheezein', value: lines.length },
          { label: 'Bill', value: money(d.total) },
          { label: order ? 'Order' : 'Udhaar', value: order ? 'Baad me' : money(d.due) },
        ]}
      />

      {d.restored && lines.length > 0 && (
        <p className="rounded-xl bg-blue-50 px-3 py-2 text-[0.8125rem] text-blue-800 ring-1 ring-blue-100">Pichla adhoora bill wapas aa gaya — jahan chhoda tha wahin se jari rakhein.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ─── Items ─── */}
        <div className="min-w-0 space-y-3">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input ref={searchRef} value={query} autoFocus
                  onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const code = byCode.get(query.trim().toLowerCase());
                    if (code) { addSource(code.source, code.unit); return; }
                    if (results[0]) addSource(results[0]);
                    else if (query.trim()) setNewProduct(query.trim());
                  }}
                  placeholder={withIngredients ? 'Product ya raw material, naam ya barcode…  ( / )' : 'Product ka naam, SKU ya barcode…  ( / )'}
                  aria-label="Cheez dhoondein"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
              </div>
              <Button variant="secondary" className="h-11" onClick={() => setScanner(true)} leftIcon={<ScanLine className="h-4 w-4" />}><span className="hidden sm:inline">Scan</span></Button>
              <Button variant="secondary" className="h-11" onClick={() => setNewProduct('')} leftIcon={<PackagePlus className="h-4 w-4" />}><span className="hidden sm:inline">Naya</span></Button>
            </div>
            {open && query.trim() && (
              <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-[26rem] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {loading ? <p className="p-4 text-center text-sm text-slate-500">Load ho raha hai…</p>
                  : results.length === 0 ? (
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setNewProduct(query.trim())}
                      className="flex w-full items-center gap-2 p-4 text-sm text-brand-700 hover:bg-brand-50"><Plus className="h-4 w-4" /> "{query.trim()}" naya product banayein</button>
                  ) : results.map((s) => (
                    <div key={s.key} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50">
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addSource(s)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        {s.kind === 'ingredient' ? <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Wheat className="h-4 w-4" /></span>
                          : <ProductThumb name={s.name} category={s.category} url={s.image} size="sm" />}
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900"><span className="truncate">{s.name}</span>{s.isRaw && <RawBadge />}</span>
                          <span className="block text-[0.75rem] text-slate-500">Stock {qtyText(s.stock)} {s.baseUnit} · cost {money(s.cost)}/{s.baseUnit}</span>
                        </span>
                      </button>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {s.units.map((u) => (
                          <button key={u.name} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => addSource(s, u)}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.75rem] font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-800">
                            + {u.name}{u.rate !== 1 ? ` (${qtyText(u.rate)})` : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {low.length > 0 && !lines.length && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-900"><AlertTriangle className="h-4 w-4" /> Kam stock — ek tap me jorein</p>
              <div className="flex flex-wrap gap-1.5">
                {low.map((s) => (
                  <button key={s.key} type="button" onClick={() => addSource(s)}
                    className="rounded-full bg-white px-2.5 py-1 text-[0.8125rem] text-slate-700 ring-1 ring-amber-200 hover:ring-amber-400">
                    + {s.name} <span className="text-amber-700">({qtyText(s.stock)} {s.baseUnit})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {lines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Boxes className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-900">Abhi koi cheez nahi</p>
              <p className="mt-1 text-sm text-slate-500">Upar naam likhein ya barcode scan karein. Carton/box ka barcode ho to wohi unit khud lagta hai.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {lines.map((l) => <LineRow key={l.key} line={l} d={d} badge={l.source.kind === 'product' ? config.lineBadge?.(l.source.id) : null} onCustomUnit={() => setCustomFor(l)} />)}
            </ul>
          )}
        </div>

        {/* ─── Bill ─── */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
          <Segmented label="Kis tarah" value={bill.mode} onChange={(m) => setBill({ ...bill, mode: m })}
            items={[{ value: 'receive', label: 'Maal aa gaya' }, { value: 'order', label: 'Order dena hai' }]} className="w-full [&>button]:flex-1" />

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">Supplier</p>
            <SupplierPicker suppliers={suppliers} value={bill.supplierId} onChange={(s) => setBill({ ...bill, supplierId: s.id, supplierName: s.name })} onNew={(name) => setNewSupplier(name)} />
            {supplier && (
              <p className="mt-2 text-[0.75rem] text-slate-500">
                {supplier.phone ?? 'Phone nahi'}{supplier.outstandingDue > 0 && <> · <span className="font-medium text-rose-700">pehle se {money(supplier.outstandingDue)} dena hai</span></>}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[0.75rem] text-slate-500">Supplier ka bill #
                <input value={bill.invoiceNo} onChange={(e) => setBill({ ...bill, invoiceNo: e.target.value })} className={cn(field, 'mt-1')} maxLength={60} />
              </label>
              <label className="text-[0.75rem] text-slate-500">{order ? 'Order ki tareekh' : 'Tareekh'}
                <input type="date" value={bill.date} onChange={(e) => setBill({ ...bill, date: e.target.value })} className={cn(field, 'mt-1')} />
              </label>
            </div>
            {order && (
              <label className="mt-2 block text-[0.75rem] text-slate-500">Maal kab tak aayega
                <input type="date" value={bill.expectedAt} onChange={(e) => setBill({ ...bill, expectedAt: e.target.value })} className={cn(field, 'mt-1')} />
              </label>
            )}
          </div>

          <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <Row k={`Cheezein (${lines.length})`} v={money(d.subtotal)} />
            <MoneyRow label="Discount" value={bill.discount} onChange={(v) => setBill({ ...bill, discount: v })} sign="−" />
            <MoneyRow label="Kiraya / loading" value={bill.otherCharges} onChange={(v) => setBill({ ...bill, otherCharges: v })} sign="+" />
            <MoneyRow label="Tax" value={bill.taxAmount} onChange={(v) => setBill({ ...bill, taxAmount: v })} sign="+" />
            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-white">
              <span className="font-semibold">Kul bill</span><span className="text-lg font-bold tabular-nums">{money(d.total)}</span>
            </div>
            {(bill.discount > 0 || bill.otherCharges > 0 || bill.taxAmount > 0) && (
              <p className="text-[0.6875rem] text-slate-500">Discount, kiraya aur tax har cheez ki cost me hisse ke mutabiq jud jate hain.</p>
            )}
          </div>

          {!order && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">Adaigi</p>
              <div className="grid grid-cols-5 gap-1">
                {POS_PAYMENT_METHODS.map((m) => (
                  <button key={m.id} type="button" onClick={() => setBill({ ...bill, paymentMethod: m.id })} aria-pressed={bill.paymentMethod === m.id}
                    className={cn('rounded-lg px-1 py-1.5 text-[0.6875rem] font-medium ring-1 transition', bill.paymentMethod === m.id ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="flex-1 text-[0.75rem] text-slate-500">Abhi diye
                  <input type="number" min={0} inputMode="decimal" value={bill.paid ?? d.total} className={cn(field, 'mt-1 text-right font-semibold tabular-nums')}
                    onChange={(e) => setBill({ ...bill, paid: e.target.value === '' ? 0 : Math.max(Number(e.target.value), 0) })} />
                </label>
                <div className="mt-4 flex gap-1">
                  <button type="button" onClick={() => setBill({ ...bill, paid: null })} className="rounded-lg px-2 py-1.5 text-[0.75rem] ring-1 ring-slate-200 hover:bg-slate-50">Poora</button>
                  <button type="button" onClick={() => setBill({ ...bill, paid: 0 })} className="rounded-lg px-2 py-1.5 text-[0.75rem] ring-1 ring-slate-200 hover:bg-slate-50">Udhaar</button>
                </div>
              </div>
              {d.due > 0 && (
                <div className="mt-3 rounded-xl bg-amber-50 p-2.5 text-[0.8125rem] text-amber-900">
                  <b>{money(d.due)}</b> supplier ke khate me udhaar jayega.
                  <label className="mt-2 flex items-center gap-2 text-[0.75rem]"><CalendarClock className="h-3.5 w-3.5" /> Kab tak dena hai
                    <input type="date" value={bill.dueDate} onChange={(e) => setBill({ ...bill, dueDate: e.target.value })} className="h-8 flex-1 rounded-lg border border-amber-200 bg-white px-2 text-sm" />
                  </label>
                </div>
              )}
            </div>
          )}

          <textarea value={bill.notes} onChange={(e) => setBill({ ...bill, notes: e.target.value })} rows={2} maxLength={500} placeholder="Note (ikhtiyari)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />

          {problems.length > 0 && lines.length > 0 && <p className="text-[0.8125rem] text-rose-700">{problems[0]}</p>}
          <Button className="h-12 w-full text-base" loading={save.isPending} disabled={problems.length > 0} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>
            {order ? 'Order save karein' : 'Kharidari save karein'} <kbd className="ml-1 hidden rounded bg-white/20 px-1 text-[0.6875rem] sm:inline">Ctrl S</kbd>
          </Button>
        </aside>
      </div>

      {scanner && <BarcodeScanner title="Maal scan karein" hint="Product ya carton ka barcode" onClose={() => setScanner(false)} onDetected={(c) => { setScanner(false); onCode(c); }} />}
      {variantFor && <VariantModal target={variantFor} onClose={() => setVariantFor(null)} onPick={(v) => { d.add(variantFor.source, variantFor.unit, v); setVariantFor(null); setQuery(''); }} />}
      {customFor && <CustomUnitModal line={customFor} onClose={() => setCustomFor(null)} onSave={(u) => { d.setUnit(customFor.key, u); setCustomFor(null); }} />}
      {newProduct !== null && (
        <QuickProductModal initialName={/^\d{6,}$/.test(newProduct) ? '' : newProduct} initialBarcode={/^\d{6,}$/.test(newProduct) ? newProduct : ''}
          wizardPath={config.productWizardPath ?? '/products/new'} onClose={() => setNewProduct(null)}
          onCreated={(p) => {
            setNewProduct(null);
            refresh();
            d.add({ key: `p:${p.id}`, kind: 'product', id: p.id, name: p.name, baseUnit: p.unit || 'pcs', stock: 0, lowAt: 0, cost: Number(p.costPrice) || 0, price: Number(p.price) || 0, units: [{ id: null, name: p.unit || 'pcs', rate: 1 }], hay: p.name.toLowerCase() });
          }} />
      )}
      {newSupplier !== null && (
        <QuickSupplierModal initialName={newSupplier} onClose={() => setNewSupplier(null)}
          onCreated={(s) => { setNewSupplier(null); qc.invalidateQueries({ queryKey: ['suppliers'] }); setBill({ ...bill, supplierId: s.id, supplierName: s.name }); }} />
      )}
    </div>
  );
}

function RawBadge() {
  return <span className="rounded bg-amber-100 px-1 text-[0.625rem] font-semibold uppercase text-amber-800">Raw</span>;
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-medium tabular-nums text-slate-900">{v}</span></div>;
}

function MoneyRow({ label, value, onChange, sign }: { label: string; value: number; onChange: (v: number) => void; sign: string }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-1">
        <span className="text-slate-400">{sign}</span>
        <input type="number" min={0} inputMode="decimal" value={value || ''} placeholder="0" onChange={(e) => onChange(Math.max(Number(e.target.value) || 0, 0))}
          className="h-8 w-28 rounded-lg border border-slate-200 px-2 text-right text-sm tabular-nums outline-none focus:border-brand-500" />
      </span>
    </label>
  );
}

function LineRow({ line: l, d, badge, onCustomUnit }: { line: DraftLine; d: ReturnType<typeof usePurchaseDraft>; badge?: ReactNode; onCustomUnit: () => void }) {
  const [more, setMore] = useState(!!(l.batchNo || l.expiry || l.salePrice));
  const base = l.qty * l.unit.rate;
  const perBase = l.cost / (l.unit.rate || 1);
  const was = l.variant?.cost || l.source.cost;
  const change = was > 0 ? ((perBase - was) / was) * 100 : 0;
  const units = l.source.units.some((u) => u.name === l.unit.name) ? l.source.units : [...l.source.units, l.unit];
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900">
            <span className="truncate">{l.source.name}{l.variant ? ` (${l.variant.name})` : ''}</span>
            {l.source.isRaw && <RawBadge />}{badge}
          </p>
          <p className="text-[0.75rem] text-slate-500">
            Stock {qtyText(l.source.stock)} {l.source.baseUnit} · pichli cost {money(was)}/{l.source.baseUnit}
            {Math.abs(change) >= 1 && <span className={cn('ml-1 font-medium', change > 0 ? 'text-rose-600' : 'text-emerald-600')}>{change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}%</span>}
          </p>
        </div>
        <button type="button" onClick={() => d.remove(l.key)} aria-label="Hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="text-[0.6875rem] text-slate-500">Unit
          <select value={l.unit.name} className={cn(field, 'mt-0.5')}
            onChange={(e) => { if (e.target.value === '__new') { onCustomUnit(); return; } const u = units.find((x) => x.name === e.target.value); if (u) d.setUnit(l.key, u); }}>
            {units.map((u) => <option key={u.name} value={u.name}>{u.name}{u.rate !== 1 ? ` = ${qtyText(u.rate)} ${l.source.baseUnit}` : ''}</option>)}
            <option value="__new">+ Apna unit (bori, peti…)</option>
          </select>
        </label>
        <label className="text-[0.6875rem] text-slate-500">Miqdar
          <input type="number" min={0} step="any" inputMode="decimal" value={l.qty || ''} placeholder="0" className={cn(field, 'mt-0.5 text-right font-semibold tabular-nums')}
            onChange={(e) => d.patch(l.key, { qty: Math.max(Number(e.target.value) || 0, 0) })} />
        </label>
        <label className="text-[0.6875rem] text-slate-500">Rate / {l.unit.name}
          <input type="number" min={0} step="any" inputMode="decimal" value={l.cost || ''} placeholder="0" className={cn(field, 'mt-0.5 text-right tabular-nums')}
            onChange={(e) => d.patch(l.key, { cost: Math.max(Number(e.target.value) || 0, 0) })} />
        </label>
        <div className="text-[0.6875rem] text-slate-500">Raqam
          <p className="mt-0.5 flex h-9 items-center justify-end rounded-lg bg-slate-50 px-2.5 text-sm font-semibold tabular-nums text-slate-900">{money(l.qty * l.cost)}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-slate-500">
        {l.unit.rate !== 1 && <span className="font-medium text-brand-700">= {qtyText(base)} {l.source.baseUnit} · {money(perBase)}/{l.source.baseUnit}</span>}
        <button type="button" onClick={() => setMore((m) => !m)} className="inline-flex items-center gap-0.5 text-slate-600 hover:text-slate-900">
          {l.source.kind === 'product' ? 'Bechne ka rate, batch, expiry' : 'Batch, expiry'} <ChevronDown className={cn('h-3.5 w-3.5 transition', more && 'rotate-180')} />
        </button>
      </div>
      {more && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {l.source.kind === 'product' && (
            <label className="text-[0.6875rem] text-slate-500">Naya bechne ka rate / {l.source.baseUnit}
              <input type="number" min={0} step="any" value={l.salePrice ?? ''} placeholder={l.source.price ? String(l.source.price) : '—'} className={cn(field, 'mt-0.5 text-right tabular-nums')}
                onChange={(e) => d.patch(l.key, { salePrice: e.target.value === '' ? null : Math.max(Number(e.target.value), 0) })} />
              {l.salePrice != null && perBase > 0 && <span className={cn('mt-0.5 block', l.salePrice < perBase ? 'text-rose-600' : 'text-emerald-700')}>Munafa {(((l.salePrice - perBase) / perBase) * 100).toFixed(0)}%</span>}
            </label>
          )}
          <label className="text-[0.6875rem] text-slate-500">Batch #
            <input value={l.batchNo} onChange={(e) => d.patch(l.key, { batchNo: e.target.value })} maxLength={60} className={cn(field, 'mt-0.5')} />
          </label>
          <label className="text-[0.6875rem] text-slate-500">Expiry
            <input type="date" value={l.expiry} onChange={(e) => d.patch(l.key, { expiry: e.target.value })} className={cn(field, 'mt-0.5')} />
          </label>
        </div>
      )}
    </li>
  );
}

function SupplierPicker({ suppliers, value, onChange, onNew }: { suppliers: Supplier[]; value: string; onChange: (s: Supplier) => void; onNew: (name: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const current = suppliers.find((s) => s.id === value);
  const list = suppliers.filter((s) => `${s.name} ${s.phone ?? ''} ${s.city ?? ''}`.toLowerCase().includes(q.toLowerCase().trim())).slice(0, 40);
  return (
    <div className="relative">
      <input value={open ? q : current?.name ?? ''} placeholder="Supplier dhoondein…" aria-label="Supplier"
        onFocus={() => { setOpen(true); setQ(''); }} onBlur={() => window.setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)}
        className={cn(field, 'h-10')} />
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {list.map((s) => (
            <button key={s.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(s); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50">
              <span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-900">{s.name}</span><span className="block text-[0.75rem] text-slate-500">{[s.phone, s.city].filter(Boolean).join(' · ')}</span></span>
              {s.outstandingDue > 0 && <span className="shrink-0 text-[0.75rem] font-medium text-rose-700">{formatPKR(s.outstandingDue)}</span>}
            </button>
          ))}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onNew(q.trim()); setOpen(false); }}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
            <UserPlus className="h-4 w-4" /> {q.trim() ? `"${q.trim()}" naya supplier` : 'Naya supplier'}
          </button>
        </div>
      )}
    </div>
  );
}

function VariantModal({ target, onClose, onPick }: { target: { source: Source; unit: UnitChoice }; onClose: () => void; onPick: (v: { id: string; name: string; cost: number }) => void }) {
  const q = useQuery({ queryKey: ['variants', target.source.id], queryFn: () => productVariantsApi.list(target.source.id) });
  const list = (Array.isArray(q.data) ? q.data : []).filter((v: any) => v.isActive !== false);
  return (
    <Modal open onClose={onClose} size="sm" title={`${target.source.name} — kaunsa?`} description="Is product ki qismein hain; jo aaya woh chunein">
      {q.isLoading ? <p className="py-6 text-center text-sm text-slate-500">Load ho raha hai…</p> : (
        <div className="space-y-1">
          {list.map((v: any) => (
            <button key={v.id} type="button" onClick={() => onPick({ id: v.id, name: v.name, cost: Number(v.costPrice) || 0 })}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ring-1 ring-slate-200 hover:bg-slate-50">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                {v.colorHex && <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: v.colorHex }} />}{v.name}
              </span>
              <span className="text-[0.75rem] text-slate-500">Stock {Number(v.stock) || 0}</span>
            </button>
          ))}
          {!list.length && <p className="py-6 text-center text-sm text-slate-500">Koi qism nahi mili</p>}
        </div>
      )}
    </Modal>
  );
}

function CustomUnitModal({ line, onClose, onSave }: { line: DraftLine; onClose: () => void; onSave: (u: UnitChoice) => void }) {
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const ok = name.trim() && Number(rate) > 0;
  const presets = line.source.baseUnit.toLowerCase() === 'kg'
    ? [['Bori', 50], ['Bori', 40], ['Bag', 25], ['Thaila', 10]] : [['Peti', 12], ['Carton', 24], ['Dozen', 12], ['Box', 10]];
  return (
    <Modal open onClose={onClose} size="sm" title="Apna unit" description={`Is kharidari ke liye — kitne ${line.source.baseUnit} ka ek?`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!ok} onClick={() => onSave({ id: null, name: name.trim(), rate: Number(rate) })}>Lagayein</Button></>}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {presets.map(([n, r]) => (
          <button key={`${n}${r}`} type="button" onClick={() => { setName(String(n)); setRate(String(r)); }}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.8125rem] text-slate-700 hover:bg-brand-50">{n} = {r} {line.source.baseUnit}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[0.75rem] text-slate-500">Unit ka naam
          <input data-autofocus value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Bori" className={cn(field, 'mt-1')} />
        </label>
        <label className="text-[0.75rem] text-slate-500">Ek me kitne {line.source.baseUnit}
          <input type="number" min={0} step="any" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="50" className={cn(field, 'mt-1 text-right')} />
        </label>
      </div>
      <p className="mt-3 text-[0.75rem] text-slate-500">Hamesha ke liye unit banana ho to product ki setting me "Units" se banayein — phir POS par bhi bikega.</p>
    </Modal>
  );
}

export default PurchaseEditorPage;
