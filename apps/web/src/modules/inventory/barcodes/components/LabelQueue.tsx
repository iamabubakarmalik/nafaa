/**
 * Builds the print queue: search or scan items, add a whole category,
 * pick the pack unit per line and set how many labels each line gets.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, Layers, Loader2, Minus, PackageSearch, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { Button, Modal, SearchField } from '@/design-system/components';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { cn } from '@core/lib/cn';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { ProductUnit } from '@modules/inventory/products/api/product-units.api';
import type { Category } from '@modules/inventory/categories/api/categories.api';
import { MAX_QTY, unitName, unitsFor, type ResolvedLine } from './labelLines';
import { labelPrice } from './renderLabels';

interface Props {
  products: Product[];
  loading: boolean;
  categories: Category[];
  unitsByProduct: Map<string, ProductUnit[]>;
  lines: ResolvedLine[];
  busy: boolean;
  onAdd: (p: Product) => void;
  onScan: (code: string) => void;
  onAddCategory: (categoryId: string) => void;
  onQty: (id: string, qty: number) => void;
  onAllQty: (qty: number | 'stock') => void;
  onUnit: (id: string, unitId: string | undefined) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSaveCode: (r: ResolvedLine, code: string) => Promise<boolean>;
}

export function LabelQueue(p: Props) {
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [editing, setEditing] = useState<ResolvedLine | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return p.products.filter((x) => x.name.toLowerCase().includes(q) || (x.sku ?? '').toLowerCase().includes(q) || (x.barcode ?? '').toLowerCase().includes(q)).slice(0, 30);
  }, [p.products, search]);

  const total = p.lines.reduce((s, r) => s + (r.data ? r.line.qty : 0), 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onEnter = () => {
    if (!search.trim()) return;
    // A scanner types the code and presses Enter; one search hit is added the same way.
    if (results.length === 1) p.onAdd(results[0]);
    else p.onScan(search.trim());
    setSearch('');
  };

  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">Kis cheez ke label</h2>
            <p className="text-[0.75rem] text-slate-500">{p.lines.length} cheezein · <b className="tabular-nums">{total}</b> label</p>
          </div>
          {p.busy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Load ho raha hai" />}
        </div>

        <div className="mt-3">
          <SearchField ref={searchRef} value={search} onChange={setSearch} onEnter={onEnter} label="Product search"
            placeholder={p.loading ? 'Products aa rahe hain…' : 'Naam, SKU ya barcode — ya scan karein'}
            trailing={
              <button type="button" onClick={() => setScanning(true)} title="Camera se scan" aria-label="Camera se scan"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-600 hover:bg-slate-200"><Camera className="h-4 w-4" /></button>
            } />
        </div>
        <p className="mt-1 text-[0.6875rem] text-slate-500">Scanner gun se seedha scan karein — cheez khud list me aa jayegi. Variant wali cheez ke har variant ka alag label banta hai.</p>

        {search.trim() && (
          <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
            {results.length === 0 ? (
              <li className="p-4 text-center text-[0.8125rem] text-slate-500">Kuch nahi mila. Enter dabayein to barcode se dhoondenge.</li>
            ) : results.map((x) => {
              const units = unitsFor(p.unitsByProduct.get(x.id));
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => { p.onAdd(x); setSearch(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{x.name}</span>
                      <span className="block truncate font-mono text-[0.6875rem]">
                        {x.barcode ? <span className="text-slate-500">{x.barcode}</span> : <span className="text-amber-600">barcode nahi</span>}
                        {x.hasVariants && <span className="ml-2 font-sans text-violet-600">variants</span>}
                        {units.length > 0 && <span className="ml-2 font-sans text-sky-600">{units.length} pack</span>}
                      </span>
                    </span>
                    <span className="text-[0.8125rem] tabular-nums text-slate-700">{labelPrice(x.price)}</span>
                    <Plus className="h-4 w-4 text-brand-600" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3">
          <select value="" onChange={(e) => e.target.value && p.onAddCategory(e.target.value)} aria-label="Category se dalain"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-[0.8125rem] text-slate-700 outline-none focus:border-brand-500">
            <option value="">Poori category ek saath dalain…</option>
            {p.categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c._count ? ` (${c._count.products})` : ''}</option>)}
          </select>
          <p className="mt-1 text-[0.6875rem] text-slate-500">Category ki har cheez list me aa jayegi — naya maal aaya ho to kaam ka hai</p>
        </div>
      </div>

      {p.lines.length === 0 ? (
        <div className="p-8 text-center">
          <PackageSearch className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 font-semibold text-slate-900">List khaali hai</p>
          <p className="mt-1 text-[0.8125rem] text-slate-500">Upar se cheez search ya scan karein. Products ke safhe se bhi "Label" dabane par cheezein yahan aati hain.</p>
        </div>
      ) : (
        <>
          <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
            {p.lines.map((r) => <Row key={r.line.id} r={r} p={p} onEdit={() => setEditing(r)} />)}
          </ul>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 p-3">
            <span className="mr-1 text-[0.75rem] text-slate-500">Sab ko:</span>
            {[1, 2, 5, 10].map((n) => (
              <button key={n} type="button" onClick={() => p.onAllQty(n)} className="h-8 rounded-lg px-2.5 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">×{n}</button>
            ))}
            <button type="button" onClick={() => p.onAllQty('stock')} className="h-8 rounded-lg px-2.5 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Stock jitne</button>
            <button type="button" onClick={p.onClear} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.75rem] font-medium text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Saaf karein</button>
          </div>
        </>
      )}

      {scanning && <BarcodeScanner title="Label ke liye scan" hint="Cheez ka barcode dabbe me rakhein" onClose={() => setScanning(false)} onDetected={(code) => { setScanning(false); p.onScan(code); }} />}
      {editing && <EditCode r={editing} onClose={() => setEditing(null)} onSave={(code) => p.onSaveCode(editing, code).then((ok) => { if (ok) setEditing(null); })} />}
    </div>
  );
}

function Row({ r, p, onEdit }: { r: ResolvedLine; p: Props; onEdit: () => void }) {
  const { line, data } = r;
  if (!r.product || !data) {
    return (
      <li className="flex items-center gap-3 px-4 py-3 text-[0.8125rem] text-slate-500">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="flex-1">Ye cheez ab nahi mili (shayad delete ho gayi)</span>
        <button type="button" onClick={() => p.onRemove(line.id)} aria-label="Hatayein" className="text-slate-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
      </li>
    );
  }
  const units = unitsFor(p.unitsByProduct.get(line.productId), line.variant?.id);
  const step = (d: number) => p.onQty(line.id, Math.min(MAX_QTY, Math.max(1, line.qty + d)));
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {data.name}{data.variant && <span className="text-slate-500"> — {data.variant}</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]">
            {data.code
              ? <span className="font-mono text-slate-500">{data.code}</span>
              : <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" /> Barcode nahi — label bina barcode chhapega</span>}
            <button type="button" onClick={onEdit} className="inline-flex items-center gap-0.5 text-brand-700 hover:underline"><Pencil className="h-3 w-3" /> {data.code ? 'Badlein' : 'Likhein'}</button>
          </p>
        </div>
        <span className="shrink-0 text-right text-[0.8125rem] font-semibold tabular-nums text-slate-900">
          {labelPrice(data.price)}
          {data.oldPrice ? <span className="block text-[0.6875rem] font-normal text-slate-400 line-through">{labelPrice(data.oldPrice)}</span> : null}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {units.length > 0 && (
          <label className="inline-flex items-center gap-1 text-[0.75rem] text-slate-600">
            <Layers className="h-3.5 w-3.5" />
            <select value={line.unitId ?? ''} onChange={(e) => p.onUnit(line.id, e.target.value || undefined)} aria-label="Unit"
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[0.75rem] text-slate-800 outline-none focus:border-brand-500">
              <option value="">{r.product.unit || 'Piece'} (khula)</option>
              {units.map((u) => <option key={u.id} value={u.id}>{unitName(u)} · {u.conversionRate} {r.product?.unit}{u.barcode ? '' : ' · barcode nahi'}</option>)}
            </select>
          </label>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} aria-label="Kam" className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-slate-200 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button>
          <input type="number" min={1} max={MAX_QTY} value={line.qty} aria-label="Kitne label"
            onChange={(e) => { const n = Math.floor(Number(e.target.value)); if (n > 0) p.onQty(line.id, Math.min(MAX_QTY, n)); }}
            className="h-8 w-16 rounded-lg border border-slate-200 bg-white text-center text-sm tabular-nums text-slate-900 outline-none focus:border-brand-500" />
          <button type="button" onClick={() => step(1)} aria-label="Zyada" className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-slate-200 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => p.onQty(line.id, Math.min(MAX_QTY, Math.max(1, r.stock)))} disabled={r.stock < 1} title="Jitna stock hai utne label"
            className={cn('h-8 rounded-lg px-2 text-[0.75rem] ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40', line.qty === r.stock && 'bg-brand-50 text-brand-700 ring-brand-200')}>
            <Tags className="mr-1 inline h-3.5 w-3.5" />Stock {r.stock}
          </button>
          <button type="button" onClick={() => p.onRemove(line.id)} aria-label="Hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
        </div>
      </div>
    </li>
  );
}

function EditCode({ r, onClose, onSave }: { r: ResolvedLine; onClose: () => void; onSave: (code: string) => Promise<unknown> }) {
  const [code, setCode] = useState(r.data?.code ?? '');
  const [saving, setSaving] = useState(false);
  const what = r.unit ? `${unitName(r.unit)} ka` : r.line.variant ? 'is variant ka' : 'is cheez ka';
  const save = () => { setSaving(true); onSave(code.trim()).finally(() => setSaving(false)); };
  return (
    <Modal open onClose={onClose} size="sm" title="Barcode likhein" description={`${r.data?.name ?? ''} — ${what} barcode`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={save} loading={saving} disabled={!code.trim()}>Save</Button>
      </>}>
      <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && code.trim()) save(); }} autoFocus
        placeholder="Dabbe par chhapa barcode scan karein ya likhein" aria-label="Barcode"
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
      <p className="mt-1.5 text-[0.75rem] text-slate-500">Company ka barcode pehle se cheez par ho to wohi likhein. Naya chahiye to page ke upar "Barcode banayen" dabayein.</p>
    </Modal>
  );
}
