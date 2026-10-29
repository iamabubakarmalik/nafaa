/**
 * Office order entry and edit: pick the customer, then type lines in a fast
 * grid (product search → pack → quantity, Enter moves on). Prices, schemes,
 * free goods and the credit check come live from /orders/preview, so the
 * office sees exactly what the server will save. Typed rates are kept only
 * for users with the price-override permission.
 *
 * Keys: Enter next field / new line · ↑↓ in the product list · Ctrl+Enter save · Esc close.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Gift, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { Alert, Button, Input, Kbd, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import {
  DIST_KEY, distError, distributionApi, type BootProduct, type OrderDetail, type OrderLine, type OrderPreview, type PricedLine,
} from '../api/distribution.api';
import { packText, rs, trim } from '../lib/meta';
import { useCustomerRoster, type RosterCustomer } from '../setup/shared';

interface Line { key: string; productId: string | null; variantId: string | null; unitId: string | null; qty: string; price: string }
interface Option { productId: string; variantId: string | null; label: string; sub: string; product: BootProduct }
interface Row {
  l: Line; i: number; p: BootProduct | undefined; packs: { id: string; name: string; rate: number }[]; pack: { id: string; name: string; rate: number };
  isReady: boolean; pr: PricedLine | undefined; label: string;
}

const newKey = () => Math.random().toString(36).slice(2);
const blank = (): Line => ({ key: newKey(), productId: null, variantId: null, unitId: null, qty: '', price: '' });

function optionsOf(products: BootProduct[]): Option[] {
  return products.filter((p) => p.isActive).flatMap((p): Option[] => (p.variants.length
    ? p.variants.map((v) => ({ productId: p.id, variantId: v.id, label: `${p.name} · ${v.name}`, sub: [p.sku, p.brandName].filter(Boolean).join(' · '), product: p }))
    : [{ productId: p.id, variantId: null, label: p.name, sub: [p.sku, p.brandName, p.categoryName].filter(Boolean).join(' · '), product: p }]));
}

function packsOf(p: BootProduct | undefined, variantId: string | null) {
  const units = (p?.units ?? []).filter((u) => !u.variantId || u.variantId === variantId);
  return [{ id: '', name: p?.unit || 'pcs', rate: 1 }, ...units.map((u) => ({ id: u.id, name: u.unitName, rate: u.conversionRate }))];
}

export function OrderEditor({ order, onClose, onSaved }: { order?: OrderDetail | null; onClose: () => void; onSaved?: (o: OrderDetail) => void }) {
  const qc = useQueryClient();
  const canOverride = usePermission(PERMISSIONS.DISTRIBUTION_PRICE_OVERRIDE);
  const productsQ = useQuery({ queryKey: [DIST_KEY, 'boot', 'products'], queryFn: distributionApi.bootProducts, staleTime: 5 * 60_000 });
  // Every customer, with or without a route (the office books for walk-in and phone orders too).
  const customersQ = useCustomerRoster(!order);
  const [clientRef] = useState(() => (crypto.randomUUID?.() ?? newKey() + newKey()));
  const [customer, setCustomer] = useState<{ id: string; name: string; sub: string } | null>(
    order?.customer ? { id: order.customer.id, name: order.customer.businessName || order.customer.name, sub: order.customer.businessName ? order.customer.name : '' } : null,
  );
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ? order.deliveryDate.slice(0, 10) : '');
  const [note, setNote] = useState(order?.note ?? '');
  const [lines, setLines] = useState<Line[]>(() => (order
    ? [...order.items.map((i) => ({ key: newKey(), productId: i.productId, variantId: i.variantId, unitId: i.unitId, qty: trim(i.qty), price: '' })), blank()]
    : [blank()]));
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const focusRef = useRef<{ key: string; field: 'product' | 'qty' } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => optionsOf(productsQ.data ?? []), [productsQ.data]);
  const byId = useMemo(() => new Map((productsQ.data ?? []).map((p) => [p.id, p])), [productsQ.data]);

  const ready = lines.filter((l) => l.productId && Number(l.qty) > 0);
  const payload: OrderLine[] = ready.map((l) => ({
    productId: l.productId!, variantId: l.variantId, unitId: l.unitId || null, qty: Number(l.qty),
    ...(canOverride && l.price !== '' && Number(l.price) > 0 ? { price: Number(l.price) } : {}),
  }));
  const sig = JSON.stringify([customer?.id, payload]);

  useEffect(() => {
    if (!customer || !payload.length) { setPreview(null); return; }
    setPreviewing(true);
    const t = window.setTimeout(() => {
      distributionApi.previewOrder({ customerId: customer.id, items: payload })
        .then(setPreview).catch(() => setPreview(null)).finally(() => setPreviewing(false));
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => {
    const f = focusRef.current;
    if (!f) return;
    focusRef.current = null;
    // The grid (wide screens) and the cards (phones) both carry the fields; focus the one on screen.
    const all = gridRef.current?.querySelectorAll<HTMLInputElement>(`[data-line="${f.key}"][data-field="${f.field}"]`) ?? [];
    [...all].find((el) => el.offsetParent !== null)?.focus();
  });

  const save = useMutation({
    mutationFn: () => {
      if (!customer) throw new Error('Customer chunein');
      if (!payload.length) throw new Error('Kam se kam ek product aur quantity likhein');
      const body = { items: payload, deliveryDate: deliveryDate || undefined, note: note.trim() || undefined };
      return order
        ? distributionApi.updateOrder(order.id, { ...body, deliveryDate: deliveryDate || '' })
        : distributionApi.createOrder({ ...body, clientRef, customerId: customer.id });
    },
    onSuccess: (r) => {
      toast.success(order ? `${r.order.orderNumber} save ho gaya` : `${r.order.orderNumber} ban gaya`);
      r.warnings.forEach((w) => toast.warning(w));
      qc.invalidateQueries({ queryKey: [DIST_KEY] });
      onSaved?.(r.order);
      onClose();
    },
    onError: (e) => toast.error(distError(e, 'Order save nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) { e.preventDefault(); if (!save.isPending) save.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const pickProduct = (key: string, o: Option) => {
    // Wholesale orders go in the default pack, else the biggest one (usually the carton).
    const units = o.product.units.filter((u) => !u.variantId || u.variantId === o.variantId);
    const def = units.find((u) => u.isDefault) ?? [...units].sort((a, b) => b.conversionRate - a.conversionRate)[0];
    setLine(key, { productId: o.productId, variantId: o.variantId, unitId: def?.id ?? '', price: '' });
    focusRef.current = { key, field: 'qty' };
  };
  const nextLine = (key: string) => {
    const idx = lines.findIndex((l) => l.key === key);
    const after = lines[idx + 1];
    if (after) { focusRef.current = { key: after.key, field: after.productId ? 'qty' : 'product' }; setLines([...lines]); return; }
    const n = blank();
    focusRef.current = { key: n.key, field: 'product' };
    setLines([...lines, n]);
  };
  const removeLine = (key: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : [blank()]));

  const priced = new Map((preview?.lines ?? []).map((p) => [p.index, p]));
  let readyIdx = -1;
  const rows: Row[] = lines.map((l, i) => {
    const p = l.productId ? byId.get(l.productId) : undefined;
    const packs = packsOf(p, l.variantId);
    const pack = packs.find((x) => x.id === (l.unitId ?? '')) ?? packs[0];
    const isReady = !!l.productId && Number(l.qty) > 0;
    if (isReady) readyIdx += 1;
    const pr = isReady ? priced.get(readyIdx) : undefined;
    const label = p ? `${p.name}${l.variantId ? ` · ${p.variants.find((v) => v.id === l.variantId)?.name ?? ''}` : ''}` : '';
    return { l, i, p, packs, pack, isReady, pr, label };
  });

  const productCell = ({ l, p, pack, pr, label }: Row) => (
    <>
      <ProductCell lineKey={l.key} label={label} options={options} loading={productsQ.isLoading} onPick={(o) => pickProduct(l.key, o)} />
      {pr?.schemeNote && <div className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] font-medium text-violet-700"><Gift className="h-3 w-3" />{pr.schemeNote}
        {pr.freeBaseQty > 0 && <> · {packText(pr.freeBaseQty, pr.freeProductId ? null : pack.rate, pack.name, p?.unit)} free</>}</div>}
    </>
  );
  const packSelect = ({ l, p, packs }: Row) => (
    <select value={l.unitId ?? ''} disabled={!p} aria-label="Pack" onChange={(e) => setLine(l.key, { unitId: e.target.value, price: '' })}
      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] outline-none focus:border-brand-500 disabled:opacity-50">
      {packs.map((x) => <option key={x.id} value={x.id}>{x.name}{x.rate > 1 ? ` (${trim(x.rate)})` : ''}</option>)}
    </select>
  );
  const qtyInput = ({ l, p, pack }: Row) => (
    <>
      <input data-line={l.key} data-field="qty" inputMode="decimal" value={l.qty} disabled={!p} aria-label="Quantity"
        onChange={(e) => setLine(l.key, { qty: e.target.value.replace(/[^\d.]/g, '') })}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); nextLine(l.key); } }}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right text-[0.875rem] font-semibold tabular-nums outline-none focus:border-brand-500 disabled:opacity-50" />
      {p && pack.rate > 1 && Number(l.qty) > 0 && <div className="mt-0.5 text-right text-[0.6875rem] text-slate-500">{trim(Number(l.qty) * pack.rate)} {p.unit}</div>}
    </>
  );
  const rateCell = ({ l, p, pr }: Row) => (
    <>
      {canOverride && p ? (
        <input inputMode="decimal" value={l.price} aria-label="Rate" placeholder={pr ? String(pr.listPrice) : ''} onChange={(e) => setLine(l.key, { price: e.target.value.replace(/[^\d.]/g, '') })}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-right tabular-nums outline-none focus:border-brand-500" />
      ) : <div className="tabular-nums text-slate-600 sm:pt-2">{pr ? rs(pr.price) : '—'}</div>}
      {pr?.priceSource === 'OVERRIDE' && <div className="mt-0.5 text-[0.6875rem] text-amber-700">List {rs(pr.listPrice)}</div>}
    </>
  );
  const amountCell = ({ isReady, pr }: Row) => (pr ? <>
    <div className="font-semibold text-slate-900">{rs(pr.total)}</div>
    {pr.schemeDiscount + pr.discount > 0 && <div className="text-[0.6875rem] text-success-700">−{rs(pr.schemeDiscount + pr.discount)}</div>}
  </> : <span className="text-slate-300">{isReady && previewing ? '…' : '—'}</span>);
  const removeBtn = ({ l }: Row) => (l.productId || lines.length > 1) && (
    <button type="button" onClick={() => removeLine(l.key)} aria-label="Line hatayein" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
  );

  return (
    <Modal open onClose={onClose} size="full" title={order ? `${order.orderNumber} badlein` : 'Naya order'}
      description={order ? 'Sirf Booked order badla ja sakta hai' : 'Customer chunein, phir product, pack aur quantity — Enter se agli line'}
      footer={<>
        <span className="mr-auto hidden items-center gap-1.5 text-[0.75rem] text-slate-500 md:inline-flex"><Kbd>Enter</Kbd> agla · <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} disabled={!customer || !payload.length} onClick={() => save.mutate()}>{order ? 'Save karein' : 'Order banayein'}</Button>
      </>}>
      <div className="flex h-full flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
          {order ? (
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Customer</div>
              <div className="truncate text-[0.875rem] font-semibold text-slate-900">{customer?.name}</div>
            </div>
          ) : (
            <CustomerPicker list={customersQ.data ?? []} loading={customersQ.isLoading} value={customer}
              onPick={(c) => { setCustomer(c); focusRef.current = { key: lines[0].key, field: 'product' }; setLines([...lines]); }} />
          )}
          <Input size="sm" type="date" label="Delivery date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          <Input size="sm" label="Note" placeholder="Zaroori nahi" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div ref={gridRef} className="min-h-0 flex-1 overflow-auto rounded-2xl ring-1 ring-slate-200/80">
          <table className="hidden w-full min-w-[46rem] text-[0.8125rem] sm:table">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="w-8 px-3 py-2">#</th><th className="px-2 py-2">Product</th><th className="w-32 px-2 py-2">Pack</th>
                <th className="w-24 px-2 py-2 text-right">Quantity</th><th className="w-28 px-2 py-2 text-right">Rate</th>
                <th className="w-32 px-2 py-2 text-right">Amount</th><th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.l.key} className="align-top">
                  <td className="px-3 py-2 pt-3.5 text-slate-400">{r.i + 1}</td>
                  <td className="px-2 py-1.5">{productCell(r)}</td>
                  <td className="px-2 py-1.5">{packSelect(r)}</td>
                  <td className="px-2 py-1.5">{qtyInput(r)}</td>
                  <td className="px-2 py-1.5 text-right">{rateCell(r)}</td>
                  <td className="px-2 py-1.5 pt-3 text-right tabular-nums">{amountCell(r)}</td>
                  <td className="px-2 py-1.5 pt-2.5">{removeBtn(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-slate-100 text-[0.8125rem] sm:hidden">
            {rows.map((r) => (
              <li key={r.l.key} className="space-y-2 px-3 py-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2 w-5 shrink-0 text-slate-400">{r.i + 1}</span>
                  <div className="min-w-0 flex-1">{productCell(r)}</div>
                  <div className="pt-1">{removeBtn(r)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 pl-7">
                  <label className="block"><span className="mb-0.5 block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Pack</span>{packSelect(r)}</label>
                  <label className="block"><span className="mb-0.5 block text-right text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Quantity</span>{qtyInput(r)}</label>
                </div>
                {r.p && (
                  <div className="grid grid-cols-2 items-start gap-2 pl-7">
                    <div><span className="mb-0.5 block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Rate</span>{rateCell(r)}</div>
                    <div className="text-right tabular-nums"><span className="mb-0.5 block text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">Amount</span>{amountCell(r)}</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => nextLine(lines[lines.length - 1].key)} className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-slate-50">
            <Plus className="h-4 w-4" /> Line
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-2">
            {preview?.credit?.message && <Alert tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>{preview.credit.message} — Invoice par manager ka PIN lagega</Alert>}
            {preview?.warnings.map((w) => <Alert key={w} tone="info">{w}</Alert>)}
            {preview?.customer && (
              <p className="text-[0.8125rem] text-slate-500">
                Khata {rs(preview.customer.balance)}{preview.customer.creditLimit ? ` · had ${rs(preview.customer.creditLimit)}` : ''}{preview.customer.creditDays ? ` · ${preview.customer.creditDays} din` : ''}
              </p>
            )}
          </div>
          <div className="space-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-[0.8125rem]">
            <Sum label="Gross" value={preview ? rs(preview.subtotal) : '—'} />
            {!!preview?.schemeDiscount && <Sum label="Scheme discount" value={`−${rs(preview.schemeDiscount)}`} />}
            {!!preview?.discount && <Sum label="Discount" value={`−${rs(preview.discount)}`} />}
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-[1rem] font-bold text-slate-900"><span>Total</span><span className="tabular-nums">{preview ? rs(preview.total) : '—'}</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Sum({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-slate-600"><span>{label}</span><span className="tabular-nums">{value}</span></div>;
}

function ProductCell({ lineKey, label, options, loading, onPick }: { lineKey: string; label: string; options: Option[]; loading: boolean; onPick: (o: Option) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return options.slice(0, 8);
    const words = t.split(/\s+/);
    const score = (o: Option) => {
      const name = o.label.toLowerCase();
      if (o.product.barcode === t || o.product.sku?.toLowerCase() === t) return 0;
      if (name.startsWith(t)) return 1;
      return words.every((w) => name.includes(w)) ? 2 : 3;
    };
    return options
      .filter((o) => words.every((w) => `${o.label} ${o.sub} ${o.product.barcode ?? ''}`.toLowerCase().includes(w)))
      .sort((a, b) => score(a) - score(b))
      .slice(0, 8);
  }, [q, options]);
  useEffect(() => setHi(0), [q]);
  const pick = (o: Option) => { onPick(o); setQ(''); setOpen(false); };
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
      <input data-line={lineKey} data-field="product" value={open ? q : label} placeholder={loading ? 'Products aa rahe hain…' : 'Product dhoondein'}
        onFocus={() => { setOpen(true); setQ(''); }} onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, found.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && found[hi]) { e.preventDefault(); pick(found[hi]); }
          else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); }
        }}
        className={cn('h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[0.875rem] outline-none focus:border-brand-500', label && !open && 'font-semibold text-slate-900')} />
      {open && (
        <ul className="absolute left-0 right-0 top-10 z-30 max-h-72 overflow-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200">
          {!found.length ? <li className="px-3 py-2 text-[0.8125rem] text-slate-500">Koi product nahi mila</li> : found.map((o, i) => (
            <li key={`${o.productId}-${o.variantId}`}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setHi(i)}
                className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left', i === hi && 'bg-brand-50')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{o.label}</span>
                  {o.sub && <span className="block truncate text-[0.6875rem] text-slate-500">{o.sub}</span>}
                </span>
                {o.product.units.length > 0 && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 text-[0.6875rem] text-slate-600">{o.product.units.map((u) => u.unitName).join(' / ')}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerPicker({ list, loading, value, onPick }: {
  list: RosterCustomer[]; loading: boolean; value: { id: string; name: string; sub: string } | null; onPick: (c: { id: string; name: string; sub: string }) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(!value);
  const [hi, setHi] = useState(0);
  const found = useMemo(() => {
    const t = q.trim().toLowerCase();
    const active = list.filter((c) => c.isActive);
    if (!t) return active.slice(0, 8);
    return active.filter((c) => `${c.name} ${c.businessName ?? ''} ${c.phone ?? ''} ${c.area ?? ''}`.toLowerCase().includes(t)).slice(0, 8);
  }, [q, list]);
  useEffect(() => setHi(0), [q]);
  const pick = (c: RosterCustomer) => {
    onPick({ id: c.id, name: c.businessName || c.name, sub: [c.businessName ? c.name : '', c.area].filter(Boolean).join(' · ') });
    setOpen(false); setQ('');
  };
  return (
    <div className="relative">
      <label className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Customer</label>
      <div className="relative">
        <UserRound className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <input autoFocus={!value} value={open ? q : value ? `${value.name}${value.sub ? ` · ${value.sub}` : ''}` : ''} placeholder={loading ? 'Customers aa rahe hain…' : 'Naam, dukaan, phone ya area'}
          onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, found.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === 'Enter' && found[hi]) { e.preventDefault(); pick(found[hi]); }
            else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); }
          }}
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-[0.875rem] font-semibold text-slate-900 outline-none focus:border-brand-500" />
      </div>
      {open && (
        <ul className="absolute left-0 right-0 top-[4.25rem] z-30 max-h-72 overflow-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200">
          {!found.length ? <li className="px-3 py-2 text-[0.8125rem] text-slate-500">Koi customer nahi mila</li> : found.map((c, i) => (
            <li key={c.id}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(c); }} onMouseEnter={() => setHi(i)}
                className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left', i === hi && 'bg-brand-50')}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{c.businessName || c.name}</span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">{[c.businessName ? c.name : '', c.area, c.phone].filter(Boolean).join(' · ')}</span>
                </span>
                {c.balance != null && c.balance > 0 && <span className="shrink-0 text-[0.75rem] font-semibold tabular-nums text-amber-700">{rs(c.balance)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
