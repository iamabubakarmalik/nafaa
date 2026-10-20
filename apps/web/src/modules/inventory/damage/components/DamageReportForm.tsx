/**
 * Report damaged, expired or wasted goods: one or many products found by
 * name or scan, each with its variant, pack unit, batch and quantity; one
 * reason, photos and a note for the whole report. Nothing leaves stock until
 * a manager approves; a manager can approve in the same step.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Camera, Layers, Loader2, PackageSearch, Trash2, X } from 'lucide-react';
import { Button, Kbd, Modal, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useImageUpload } from '@core/hooks/useImageUpload';
import { useIsAllShops } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { usePurchaseSources, type Source, type UnitChoice } from '@modules/purchasing/purchases/editor/sources';
import { BranchPicker } from '@modules/inventory/stock-adjustments/components/BranchPicker';
import { ProductSearch } from '@modules/inventory/stock-adjustments/components/ProductSearch';
import { STOCK_KEYS } from '@modules/inventory/stock-adjustments/components/meta';
import { damageApi, type DamageOptions } from '../api/damage.api';
import { DAMAGE_KEY, REASONS, apiError, qtyText, type ReasonChip } from './meta';

interface Line {
  key: string;
  source: Source;
  unit: UnitChoice;
  qty: string;
  variantId: string;
  batchId: string;
  salvage: string;
}

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const labelCls = 'mb-1.5 block text-[0.8125rem] font-medium text-slate-700';
const hintCls = 'mt-1 text-[0.6875rem] text-slate-500';

/** Goods counted one piece at a time: they go through Stock adjustments, where the exact piece is chosen. */
const TRACKED: Record<NonNullable<DamageOptions['tracked']>, { short: string; help: string }> = {
  roll: {
    short: 'roll',
    help: 'Is product ka har roll alag ginta hai. Kharab roll Stock adjustments page se likhein — wahan sahi roll chun sakte hain.',
  },
  imei: {
    short: 'IMEI',
    help: 'Is product ka har phone (IMEI) alag ginta hai. Kharab phone Stock adjustments page se likhein — wahan sahi IMEI chun sakte hain.',
  },
  serial: {
    short: 'serial',
    help: 'Is product ka har unit apne serial number se ginta hai. Kharab unit Stock adjustments page se likhein, aur note me us ka serial number likh dein.',
  },
};

const dayText = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' });
const expired = (iso?: string | null) => !!iso && new Date(iso).getTime() < Date.now();

/** Base quantity, cost and branch stock for one line. */
function preview(l: Line, o: DamageOptions | undefined) {
  if (!o) return null;
  const v = l.variantId ? o.variants.find((x) => x.id === l.variantId) : undefined;
  if (o.variants.length && !v) return null;
  const b = l.batchId ? o.batches.find((x) => x.id === l.batchId) : undefined;
  const base = (Number(l.qty) || 0) * l.unit.rate;
  const cost = Number(b?.costPrice) || Number(v?.costPrice) || Number(o.product.costPrice) || l.source.cost;
  const before = Number((v ? v.branchStock ?? v.stock : o.product.branchStock ?? o.product.stock) ?? 0);
  return { base, cost, value: base * cost, before, after: before - base, branch: (v ? v.branchStock : o.product.branchStock) !== null };
}

export function DamageReportForm({ canApprove, onClose }: { canApprove: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const allShops = useIsAllShops();
  const { cost: money } = useMasked();
  const { sources, byCode, loading } = usePurchaseSources(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [reason, setReason] = useState<ReasonChip | null>(null);
  const [detail, setDetail] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [claim, setClaim] = useState(false);
  const [approveNow, setApproveNow] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploader = useImageUpload({ purpose: 'document', maxFiles: 6, maxSizeMB: 8, onUploaded: (r) => setPhotos((p) => [...p, ...r.map((x) => x.url)].slice(0, 6)) });

  const settingsQ = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 5 * 60_000 });
  const allowNegative = !!settingsQ.data?.settings?.allowNegativeStock;
  const optionsQs = useQueries({
    queries: lines.map((l) => ({ queryKey: [DAMAGE_KEY, 'options', l.source.id], queryFn: () => damageApi.options(l.source.id), staleTime: 30_000 })),
  });
  const optionsOf = (i: number) => optionsQs[i]?.data;

  const add = (s: Source, unit: UnitChoice) => setLines((prev) => {
    const same = !s.hasVariants ? prev.findIndex((l) => l.source.id === s.id && l.unit.name === unit.name) : -1;
    if (same >= 0) return prev.map((l, i) => (i === same ? { ...l, qty: String((Number(l.qty) || 0) + 1) } : l));
    return [...prev, { key: `${s.id}-${Date.now()}`, source: s, unit, qty: '1', variantId: '', batchId: '', salvage: '' }];
  });
  const patch = (key: string, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));

  const problems: string[] = [];
  if (!lines.length) problems.push('Kam se kam ek product jorein');
  lines.forEach((l, i) => {
    const o = optionsOf(i);
    const n = l.source.name;
    if (!o) problems.push(optionsQs[i]?.isError ? `${n}: details load nahi hui` : `${n}: load ho raha hai`);
    else if (o.tracked) problems.push(`${n}: ${TRACKED[o.tracked].short} wala maal Stock adjustments se likhein`);
    else if (o.variants.length && !l.variantId) problems.push(`${n}: type (variant) chunein`);
    if (!(Number(l.qty) > 0)) problems.push(`${n}: quantity likhein`);
  });
  if (!reason) problems.push('Wajah chunein');
  if (reason?.id === 'OTHER' && !detail.trim()) problems.push('"Kuch aur" ke sath wajah likhein');
  const total = lines.reduce((s, l, i) => s + (preview(l, optionsOf(i))?.value ?? 0) - (Number(l.salvage) || 0), 0);

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const r = reason!;
      const text = detail.trim();
      const done: string[] = [];
      let approved = 0;
      try {
        for (const l of lines) {
          const row = await damageApi.create({
            productId: l.source.id,
            variantId: l.variantId || undefined,
            batchId: l.batchId || undefined,
            unitId: l.unit.rate !== 1 && l.unit.id ? l.unit.id : undefined,
            quantity: Number(l.qty),
            salvageValue: Number(l.salvage) || undefined,
            reason: r.id === 'OTHER' ? text : r.label,
            reasonCode: r.code,
            notes: r.id === 'OTHER' ? undefined : text || undefined,
            photos: photos.length ? photos : undefined,
            supplierClaim: claim || undefined,
          });
          done.push(l.key);
          if (approveNow && canApprove) { await damageApi.approve(row.id); approved++; }
        }
      } catch (e) {
        // Keep only the lines that were not reported, so a retry does not repeat them.
        if (done.length) setLines((prev) => prev.filter((l) => !done.includes(l.key)));
        throw e;
      }
      return { count: done.length, approved };
    },
    onSuccess: ({ count, approved }) => {
      toast.success(approved ? `${count} report approve — stock se nikal gaya` : `${count} report save — manager ki approval ka intezar`);
      qc.invalidateQueries({ queryKey: [DAMAGE_KEY] });
      if (approved) STOCK_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => {
      toast.error(apiError(e, 'Save nahi hua'));
      qc.invalidateQueries({ queryKey: [DAMAGE_KEY] });
    },
  });

  // Ctrl/Cmd + Enter saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !save.isPending) { e.preventDefault(); save.mutate(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Modal open onClose={onClose} size="xl" title="Kharab maal report karein" closeOnBackdrop={false}
      description="Toota, expiry, kharab ya chuhe ka kaata maal — approval ke baad stock se nikalta hai"
      footer={allShops ? <Button variant="secondary" onClick={onClose}>Band karein</Button> : <>
        <span className="mr-auto hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!lines.length || uploader.uploading}>
          {approveNow && canApprove ? 'Report aur approve' : 'Report karein'}{lines.length > 1 ? ` (${lines.length})` : ''}
        </Button>
      </>}>
      {allShops ? <BranchPicker what="Damage report" /> : (
        <div className="space-y-4">
          <div>
            <ProductSearch sources={sources} byCode={byCode} loading={loading} onPick={add} />
            <p className={hintCls}>Naam likh kar Enter dabayein ya barcode scan karein. Carton ka barcode carton hi jorta hai. Kai products ek sath report ho sakte hain.</p>
          </div>

          {!lines.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <PackageSearch className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Upar se kharab product search</p>
              <p className="mt-0.5 text-[0.8125rem] text-slate-500">Har product ki quantity, type aur batch yahan aayega</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {lines.map((l, i) => (
                <LineCard key={l.key} line={l} options={optionsOf(i)} failed={!!optionsQs[i]?.isError} money={money} allowNegative={allowNegative}
                  onChange={(p) => patch(l.key, p)} onRemove={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} />
              ))}
            </ul>
          )}

          <div>
            <p className={labelCls}>Kya hua? <span className="text-rose-600">*</span></p>
            <div role="radiogroup" aria-label="Wajah" className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
              {REASONS.map((r) => {
                const on = reason?.id === r.id;
                return (
                  <button key={r.id} type="button" role="radio" aria-checked={on} onClick={() => setReason(r)}
                    className={cn('inline-flex h-10 items-center gap-2 rounded-xl px-3 text-left text-[0.8125rem] font-semibold ring-1 transition', on ? 'text-white shadow-sm' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}
                    style={on ? { backgroundColor: r.color, boxShadow: `0 0 0 1px ${r.color}` } : undefined}>
                    <r.icon className="h-4 w-4 shrink-0" style={on ? undefined : { color: r.color }} /><span className="truncate">{r.label}</span>
                  </button>
                );
              })}
            </div>
            <p className={hintCls}>Sahi wajah chunein — Analytics me isi se pata chalta hai sab se zyada nuqsan kahan se ho raha hai. "Chori / gum" approval par "Gum" me jata hai, baqi sab "Kharab" me.</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div>
              <label htmlFor="dmg-detail" className={labelCls}>{reason?.id === 'OTHER' ? <>Wajah <span className="text-rose-600">*</span></> : 'Details'}</label>
              <textarea id="dmg-detail" value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={reason?.id === 'OTHER' ? 200 : 1000} rows={3}
                placeholder={reason?.id === 'OTHER' ? 'Maslan: Garmi se pighal gaya' : 'Zaroorat ho to — kahan mila, kis ne dekha…'}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
              <p className={hintCls}>{reason?.id === 'OTHER' ? 'Chhoti si wajah likhein, report me yahi dikhegi.' : 'Marzi hai. Manager ko faisla karne me madad milti hai.'}</p>
            </div>
            <div>
              <p className={labelCls}>Photo</p>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
                onChange={(e) => { if (e.target.files?.length) void uploader.upload(Array.from(e.target.files)); e.target.value = ''; }} />
              <div className="flex flex-wrap gap-2">
                {photos.map((url) => (
                  <span key={url} className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-slate-200">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setPhotos((p) => p.filter((x) => x !== url))} aria-label="Photo hatayein"
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {photos.length < 6 && (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploader.uploading}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-slate-300 text-[0.6875rem] font-medium text-slate-500 hover:border-brand-400 hover:text-brand-700">
                    {uploader.uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    {uploader.uploading ? 'Upload…' : 'Photo'}
                  </button>
                )}
              </div>
              <p className={hintCls}>Phone par camera khulta hai. Photo se manager ko yaqeen hota hai aur supplier claim me kaam aati hai.</p>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <Switch checked={claim} onChange={(e) => setClaim(e.target.checked)} size="sm"
              label="Supplier se claim ho sakta hai" description="Company ka nuqs ya expiry return wala maal — baad me supplier se paise ya maal wapas lene ke liye nishan." />
            {canApprove && (
              <Switch checked={approveNow} onChange={(e) => setApproveNow(e.target.checked)} size="sm"
                label="Sath hi approve karein" description="Aap ke paas approval ki permission hai. On karein to report save hote hi stock se nikal jayega aur Adjustments me aa jayega." />
            )}
          </div>

          {lines.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200">
              <span className="text-[0.8125rem] text-rose-900">{lines.length} line · andaazan nuqsan (cost par)</span>
              <span className="text-lg font-bold tabular-nums text-rose-700">−{money(Math.max(total, 0))}</span>
            </div>
          )}
          {lines.length > 0 && problems.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {problems[0]}{problems.length > 1 ? ` (+${problems.length - 1} aur)` : ''}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ───────────────────────── one line ───────────────────────── */

function LineCard({ line: l, options: o, failed, money, allowNegative, onChange, onRemove }: {
  line: Line;
  options?: DamageOptions;
  failed: boolean;
  money: (n: number) => string;
  allowNegative: boolean;
  onChange: (p: Partial<Line>) => void;
  onRemove: () => void;
}) {
  const p = preview(l, o);
  // A batch belongs to one variant (or to the plain item), the same as its stock.
  const batches = (o?.batches ?? []).filter((b) => (b.variantId ?? '') === (l.variantId || ''));
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><Layers className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{l.source.name}</p>
          <p className="text-[0.75rem] text-slate-500">
            {l.source.sku ? `${l.source.sku} · ` : ''}
            {!o ? (failed ? 'Details load nahi hui' : 'Load ho raha hai…') : o.variants.length ? `${o.variants.length} variants` : `Branch stock ${qtyText(o.product.branchStock ?? o.product.stock)} ${l.source.baseUnit}`}
          </p>
        </div>
        <button type="button" onClick={onRemove} aria-label="Hatayein" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </div>

      {o?.tracked && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
          {TRACKED[o.tracked].help}
        </p>
      )}

      {!!o?.variants.length && (
        <div className="mt-3">
          <p className="mb-1 text-[0.75rem] font-medium text-slate-600">Type (variant) <span className="text-rose-600">*</span></p>
          <div className="flex flex-wrap gap-1.5">
            {o.variants.map((v) => (
              <button key={v.id} type="button" onClick={() => onChange({ variantId: v.id, batchId: '' })}
                className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 transition', l.variantId === v.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                {v.colorHex && <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: v.colorHex }} />}
                {v.name}<span className="opacity-70">· {qtyText(v.branchStock ?? v.stock)}</span>
              </button>
            ))}
          </div>
          <p className={hintCls}>Jis type ka maal kharab hua woh chunein — usi ka stock kam hoga.</p>
        </div>
      )}

      {!o?.tracked && (
        <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <div>
            <div className="flex">
              <input inputMode="decimal" value={l.qty} onChange={(e) => onChange({ qty: e.target.value.replace(/[^\d.]/g, '') })} aria-label="Quantity"
                className={cn('h-10 w-full min-w-0 border border-slate-200 bg-white px-3 text-right text-base font-semibold tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15', l.source.units.length > 1 ? 'rounded-l-xl' : 'rounded-xl')} />
              {l.source.units.length > 1 && (
                <select value={l.unit.name} onChange={(e) => onChange({ unit: l.source.units.find((u) => u.name === e.target.value) ?? l.unit })} aria-label="Unit"
                  className="h-10 rounded-r-xl border border-l-0 border-slate-200 bg-slate-50 px-2 text-[0.8125rem] font-medium text-slate-700 outline-none">
                  {l.source.units.map((u) => <option key={u.name} value={u.name}>{u.name}{u.rate !== 1 ? ` (${qtyText(u.rate)})` : ''}</option>)}
                </select>
              )}
            </div>
            <p className={hintCls}>{l.unit.rate !== 1 ? `1 ${l.unit.name} = ${qtyText(l.unit.rate)} ${l.source.baseUnit}` : `Kitne ${l.source.baseUnit} kharab hue`}</p>
          </div>
          {p && (
            <div className={cn('flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 ring-1', p.after < 0 ? 'bg-amber-50 ring-amber-200' : 'bg-slate-50 ring-slate-200')}>
              <span className="text-[0.8125rem] text-slate-600">
                {p.branch ? 'Branch me' : 'Stock'} <b className="tabular-nums text-slate-900">{qtyText(p.before)}</b>
                <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-slate-400" />
                approval ke baad <b className={cn('tabular-nums', p.after < 0 ? 'text-rose-700' : 'text-slate-900')}>{qtyText(p.after)}</b> {l.source.baseUnit}
              </span>
              <span className="text-sm font-bold tabular-nums text-rose-700">−{money(p.value)}</span>
              {p.after < 0 && (
                <span className="w-full text-[0.6875rem] text-amber-900">
                  {allowNegative ? 'Stock minus me chala jayega — settings me permission hai.' : 'Branch me itna stock nahi. Report ho jayegi, magar approval tab hogi jab stock theek ho.'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {!o?.tracked && batches.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-[0.75rem] font-medium text-slate-600">Batch</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => onChange({ batchId: '' })}
              className={cn('rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 transition', !l.batchId ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
              Koi khaas nahi
            </button>
            {batches.map((b) => (
              <button key={b.id} type="button" onClick={() => onChange({ batchId: b.id })}
                className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 transition', l.batchId === b.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                {b.batchNumber}
                {b.expiryDate && <span className={cn(l.batchId === b.id ? 'opacity-80' : expired(b.expiryDate) ? 'text-rose-600' : 'text-slate-400')}>· {expired(b.expiryDate) ? 'expire ' : ''}{dayText(b.expiryDate)}</span>}
                <span className="opacity-70">· {qtyText(b.quantity)}</span>
              </button>
            ))}
          </div>
          <p className={hintCls}>Expiry wala maal ho to us ka batch chunein — approval par usi batch ki ginti bhi kam hogi. Laal date = expire ho chuka.</p>
        </div>
      )}

      {!o?.tracked && (
        <div className="mt-3 max-w-xs">
          <label className="mb-1 block text-[0.75rem] font-medium text-slate-600" htmlFor={`salvage-${l.key}`}>Kuch paise wapas mile?</label>
          <input id={`salvage-${l.key}`} inputMode="decimal" value={l.salvage} onChange={(e) => onChange({ salvage: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0"
            className={cn(inputCls, 'h-9 text-right tabular-nums')} />
          <p className={hintCls}>Sasta bech diya ya kabari ko diya to amount likhein — asal nuqsan us se kam ginta hai.</p>
        </div>
      )}
    </li>
  );
}
