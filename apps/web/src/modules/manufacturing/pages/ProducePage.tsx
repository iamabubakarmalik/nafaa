/**
 * New production: pick what to make and how much (units or batches), see
 * the raw materials it takes against the branch stock with shortages in red,
 * the cost per unit, then confirm. Raw materials leave stock and the made
 * goods come in at that cost, all in one go.
 *
 * Keys: Enter next field · Ctrl/Cmd+Enter confirm · A add a line.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, CheckCircle2, Factory, History, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Kbd, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { MFG_KEY, errText, manufacturingApi, qty, type Preview, type ProduceItem } from '../api';
import { useManufacturingSwitch } from '../hooks';
import { MfgNav, MfgOff } from '../components/MfgNav';
import { wholeUnits } from '../units';
import { t as tr } from '@core/i18n';

interface Row { key: string; productId: string; amount: string; mode: 'units' | 'batches'; batchNumber: string; expiryDate: string; showBatch: boolean }

let seq = 0;
const newRow = (productId = ''): Row => ({ key: `r${++seq}`, productId, amount: '', mode: 'units', batchNumber: '', expiryDate: '', showBatch: false });
const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

export default function ProducePage() {
  const sw = useManufacturingSwitch();
  const enabled = sw === 'on';
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const { cost: money } = useMasked();
  const recipesQ = useQuery({ queryKey: [MFG_KEY, 'recipes'], queryFn: () => manufacturingApi.recipes(), enabled });
  const recipes = useMemo(() => (recipesQ.data ?? []).filter((r) => r.isActive && !r.makeOnSale && r.lines.length), [recipesQ.data]);
  const [rows, setRows] = useState<Row[]>(() => [newRow(params.get('product') ?? '')]);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Array<{ id: string; runNumber: string; name: string; quantity: number; unitCost?: number }> | null>(null);

  const items: ProduceItem[] = useMemo(() => rows
    .filter((r) => r.productId && Number(r.amount) > 0)
    .map((r) => ({
      productId: r.productId,
      ...(r.mode === 'units' ? { quantity: Number(r.amount) } : { batches: Number(r.amount) }),
      ...(r.batchNumber.trim() && { batchNumber: r.batchNumber.trim() }),
      ...(r.expiryDate && { expiryDate: r.expiryDate }),
    })), [rows]);
  const itemsKey = JSON.stringify(items.map((i) => [i.productId, i.quantity, i.batches]));

  // Live preview, a moment after typing stops.
  useEffect(() => {
    if (!items.length) { setPreview(null); setPreviewError(''); return; }
    let live = true;
    const t = setTimeout(async () => {
      setPreviewing(true);
      try { const p = await manufacturingApi.preview({ items }); if (live) { setPreview(p); setPreviewError(''); } }
      catch (e) { if (live) { setPreview(null); setPreviewError(errText(e)); } }
      finally { if (live) setPreviewing(false); }
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [itemsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const addRow = () => setRows((rs) => [...rs, newRow()]);

  const confirm = async () => {
    if (busy || !items.length) return;
    if (preview && !preview.canProduce) { toast.error(preview.shortCount ? tr('Raw maal kam hai — pehle Purchase karein') : tr('Recipe ki unit theek karein')); return; }
    if (new Set(items.map((i) => i.productId)).size !== items.length) { toast.error(tr('Ek product do dafa hai — quantity jor dein')); return; }
    setBusy(true);
    try {
      const res = await manufacturingApi.produce({ items, notes: notes.trim() || undefined });
      setDone(res.runs);
      toast.success(tr('Ban gaya — stock update ho gaya'));
      setRows([newRow()]); setNotes(''); setPreview(null);
      void qc.invalidateQueries({ queryKey: [MFG_KEY] });
      ['products', 'product', 'product-insights', 'purchase-sources'].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) { toast.error(errText(e, tr('Production nahi hui'))); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void confirm(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); addRow(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (sw === 'loading') return <PageShell><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;
  if (!enabled) return <PageShell><MfgOff /></PageShell>;

  const byId = new Map(recipes.map((r) => [r.productId, r]));
  const previewOf = (productId: string) => preview?.items.find((i) => i.productId === productId);

  return (
    <PageShell>
      <PageHero back="/manufacturing" backLabel={tr('Banayein')} title={tr('Nayi production')} subtitle={tr('Kya aur kitna banana hai — raw maal khud stock se kam hoga')}
        meta={<span className="inline-flex items-center gap-1.5"><Kbd>Enter</Kbd> {' '}{tr('agla ·')}{' '} <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> {' '}{tr('bana dein ·')}{' '} <Kbd>A</Kbd> {' '}{tr('aur line')}</span>} />
      <MfgNav />

      {done && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-success-50 px-4 py-3 ring-1 ring-success-200">
          <CheckCircle2 className="h-5 w-5 text-success-600" />
          <p className="flex-1 text-[0.875rem] text-success-900">
            {done.map((r) => <span key={r.id} className="me-3 inline-block"><strong>{r.name}</strong> × {qty(r.quantity)}{r.unitCost != null && <> {' '}{tr('· Cost {{unitCost}}', { unitCost: money(r.unitCost) })}</>} <span className="text-success-700">({r.runNumber})</span></span>)}
          </p>
          <Link to="/manufacturing/history" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-success-800 hover:underline"><History className="h-4 w-4" />{tr('History')}</Link>
        </div>
      )}

      {recipesQ.isLoading ? <Skeleton className="h-72 rounded-2xl" /> : !recipes.length ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{tr('Banane ke liye koi Recipe nahi')}</p>
          <p className="mt-1 text-[0.875rem] text-slate-500">{tr('Pehle Recipe banayein. "Bikte waqt" wali Recipes yahan nahi aatin — woh bill par khud banti hain.')}</p>
          <Link to="/manufacturing/recipes?new=1" className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-brand-fg hover:bg-brand-700"><Plus className="h-4 w-4" />{tr('Recipe banayein')}</Link>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 space-y-4">
            <section data-enter-next className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
              <h2 className="text-[0.9375rem] font-semibold text-slate-900">{tr('Kya banana hai')}</h2>
              <ul className="mt-3 space-y-3">
                {rows.map((row, i) => {
                  const r = byId.get(row.productId);
                  const pv = previewOf(row.productId);
                  return (
                    <li key={row.key} className="rounded-xl bg-slate-50 p-3">
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_8.5rem_auto]">
                        <select aria-label={tr('Product')} autoFocus={i === 0 && !row.productId} value={row.productId} onChange={(e) => patch(row.key, { productId: e.target.value })} className={inputCls}>
                          <option value="">{tr('Product chunein…')}</option>
                          {recipes.map((x) => <option key={x.productId} value={x.productId}>{x.product.name}</option>)}
                        </select>
                        <input type="number" min={0} step="any" inputMode="decimal" aria-label={tr('Kitna')} autoFocus={i === 0 && !!row.productId} placeholder={row.mode === 'units' ? tr('Kitne {{value}}', { value: r?.product.unit ?? '' }) : tr('Kitne batch')}
                          value={row.amount} onChange={(e) => patch(row.key, { amount: e.target.value })} className={cn(inputCls, 'tabular-nums')} />
                        <select aria-label={tr('Unit ya batch')} value={row.mode} onChange={(e) => patch(row.key, { mode: e.target.value as Row['mode'] })} className={inputCls}>
                          <option value="units">{r?.product.unit ?? tr('Units')}</option>
                          <option value="batches">{tr('Batch')}</option>
                        </select>
                        <div className="flex gap-1">
                          <button type="button" tabIndex={-1} title={tr('Batch / expiry')} aria-label={tr('Batch number aur expiry')} onClick={() => patch(row.key, { showBatch: !row.showBatch })}
                            className={cn('flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-slate-200', row.showBatch || row.batchNumber || row.expiryDate ? 'bg-brand-50 text-brand-700' : 'bg-white text-slate-500 hover:bg-slate-100')}><CalendarClock className="h-4 w-4" /></button>
                          {rows.length > 1 && <button type="button" tabIndex={-1} aria-label={tr('Line hatayein')} onClick={() => setRows((rs) => rs.filter((x) => x.key !== row.key))}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      </div>
                      {row.showBatch && (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <label className="block text-[0.75rem] font-medium text-slate-600">{tr('Batch number (zaroori nahi)')}
                            <input value={row.batchNumber} onChange={(e) => patch(row.key, { batchNumber: e.target.value })} placeholder={tr('Khali = production number')} className={cn(inputCls, 'mt-1')} />
                          </label>
                          <label className="block text-[0.75rem] font-medium text-slate-600">{tr('Expiry (zaroori nahi)')}
                            <input type="date" value={row.expiryDate} onChange={(e) => patch(row.key, { expiryDate: e.target.value })} className={cn(inputCls, 'mt-1')} />
                          </label>
                        </div>
                      )}
                      {r && !pv && <p className="mt-2 text-[0.75rem] text-slate-500">{tr('1 batch = {{yieldQty}} {{unit}} · stock se {{qty}} ban sakta', { yieldQty: qty(r.yieldQty), unit: r.product.unit, qty: qty(wholeUnits(r.canMake.units, r.product.unit)) })}</p>}
                      {pv && (
                        <p className="mt-2 text-[0.75rem] text-slate-600">
                          {tr('{{quantity}} {{unit}} = {{batches}} batch', { quantity: qty(pv.quantity), unit: pv.unit, batches: qty(pv.batches) })}
                          {pv.unitCost != null && <> {' '}{tr('· Cost')}{' '} <strong className="tabular-nums">{money(pv.unitCost)}</strong> / {pv.unit}</>}
                          {pv.margin != null && <> {' '}{tr('· Profit')}{' '} <strong className={cn(pv.margin < 0 ? 'text-rose-600' : 'text-success-700')}>{pv.margin.toFixed(1)}%</strong></>}
                          {r && r.canMake.units < pv.quantity && <span className="ms-1 text-rose-600">{tr('· stock se sirf {{qty}} ban sakta', { qty: qty(wholeUnits(r.canMake.units, r.product.unit)) })}</span>}
                        </p>
                      )}
                      {pv?.badUnits.length ? <p className="mt-1 text-[0.75rem] text-rose-600">{tr('Unit theek karein: {{value}}', { value: pv.badUnits.join(', ') })}</p> : null}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={addRow} leftIcon={<Plus className="h-4 w-4" />}>{tr('Aur product (A)')}</Button>
              </div>
              <label className="mt-4 block text-[0.8125rem] font-medium text-slate-700">{tr('Note (zaroori nahi)')}
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr('Jaise: Eid order ke liye')} className={cn(inputCls, 'mt-1')} />
              </label>
            </section>
          </div>

          <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[0.9375rem] font-semibold text-slate-900">{tr('Raw maal lagega')}</h2>
                {previewing && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
              {previewError ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800">{previewError}</p>
                : !preview ? <p className="mt-3 text-[0.8125rem] text-slate-500">{tr('Product aur quantity likhein — yahan dikhega ke kya kitna lagega.')}</p>
                  : (
                    <>
                      <ul className="mt-2 divide-y divide-slate-100">
                        {preview.materials.map((m) => (
                          <li key={m.productId} className={cn('flex items-center justify-between gap-3 py-2 text-[0.8125rem]', m.short > 0 && 'text-rose-700')}>
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{m.name}</span>
                              <span className={cn('block text-[0.6875rem]', m.short > 0 ? 'text-rose-600' : 'text-slate-500')}>{tr('Stock {{have}} {{unit}}{{value}}', { have: qty(m.have), unit: m.unit, value: m.short > 0 ? tr(' · {{short}} kam', { short: qty(m.short) }) : '' })}</span>
                            </span>
                            <span className="shrink-0 text-end tabular-nums">
                              <span className="block font-semibold">{qty(m.need)} {m.unit}</span>
                              {m.cost != null && <span className="block text-[0.6875rem] text-slate-500">{money(m.cost)}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {preview.totalCost != null && <p className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-[0.875rem] font-semibold"><span>{tr('Kul Cost')}</span><span className="tabular-nums">{money(preview.totalCost)}</span></p>}
                      {preview.shortCount > 0 && (
                        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[0.75rem] text-rose-800">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {preview.allowNegative ? tr('Kuch raw maal kam hai — stock minus me chala jayega (Settings me minus stock chalu hai).') : tr('Kuch raw maal kam hai — pehle Purchase karein ya quantity kam karein.')}
                        </p>
                      )}
                    </>
                  )}
            </section>
            <Button fullWidth size="lg" onClick={() => void confirm()} loading={busy} disabled={!items.length || previewing || (!!preview && !preview.canProduce) || !!previewError}
              leftIcon={<Factory className="h-4 w-4" />}>{tr('Bana dein')}</Button>
            <p className="text-center text-[0.75rem] text-slate-500">{tr('Ghalti ho jaye to History me "Wapas karein" se sab wapas ho jata hai.')}</p>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
