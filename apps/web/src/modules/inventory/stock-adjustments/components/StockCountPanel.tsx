/**
 * Physical stock count: add products by search, scan or a whole category,
 * type what is on the shelf, and see the system figure, the difference and
 * its value live. A summary is confirmed before saving; the server books
 * each difference in or out and returns what was gained and lost.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ClipboardCheck, FolderOpen, Info, Trash2 } from 'lucide-react';
import { Button, FilterMenu, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { usePurchaseSources, type Source } from '@modules/purchasing/purchases/editor/sources';
import { stockAdjustmentsApi, type AdjustmentOptions, type StockCountResult } from '../api/stock-adjustments.api';
import { BranchPicker } from './BranchPicker';
import { ProductSearch } from './ProductSearch';
import { ADJ_KEY, STOCK_KEYS, qtyText } from './meta';

/** One countable row: a product, or one variant of it. */
interface Row { key: string; productId: string; variantId?: string; name: string; unit: string; system: number; cost: number }

const CATEGORY_LIMIT = 150;

function rowsOf(s: Source, o: AdjustmentOptions | undefined): Row[] | null {
  if (!o) return null;
  if (o.carpetRolls.length || o.imeis.length) return [];
  const own = (v: number | null, fallback: number) => Number(v ?? fallback) || 0;
  if (o.variants.length) {
    return o.variants.map((v) => ({
      key: `${s.id}:${v.id}`, productId: s.id, variantId: v.id, name: `${s.name} · ${v.name}`, unit: s.baseUnit,
      system: own(v.branchStock, v.stock), cost: Number(v.costPrice) || Number(o.product.costPrice) || 0,
    }));
  }
  return [{ key: s.id, productId: s.id, name: s.name, unit: s.baseUnit, system: own(o.product.branchStock, o.product.stock), cost: Number(o.product.costPrice) || s.cost }];
}

export function StockCountPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const allShops = useIsAllShops();
  const { cost: money } = useMasked();
  const { sources, byCode, loading } = usePurchaseSources(false);
  const [picked, setPicked] = useState<Source[]>([]);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'count' | 'confirm'>('count');
  const [result, setResult] = useState<StockCountResult | null>(null);

  const optionsQs = useQueries({
    queries: picked.map((s) => ({
      queryKey: [ADJ_KEY, 'options', shopId ?? 'default', s.id],
      queryFn: () => stockAdjustmentsApi.getOptions(s.id),
      staleTime: 30_000,
    })),
  });

  const add = (list: Source[]) => setPicked((prev) => {
    const have = new Set(prev.map((p) => p.id));
    return [...prev, ...list.filter((s) => !have.has(s.id))];
  });

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sources) if (s.kind === 'product' && s.category) m.set(s.category, (m.get(s.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sources]);

  const groups = picked.map((s, i) => ({ source: s, rows: rowsOf(s, optionsQs[i]?.data), failed: !!optionsQs[i]?.isError }));
  const rows = groups.flatMap((g) => g.rows ?? []);
  const entered = rows.filter((r) => counted[r.key] !== undefined && counted[r.key] !== '');
  const diffs = entered.map((r) => {
    const diff = Number(counted[r.key]) - r.system;
    return { row: r, diff, value: diff * r.cost };
  });
  const changed = diffs.filter((d) => Math.abs(d.diff) > 0.0001);
  const gained = changed.filter((d) => d.diff > 0).reduce((s, d) => s + d.value, 0);
  const lost = changed.filter((d) => d.diff < 0).reduce((s, d) => s - d.value, 0);

  const save = useMutation({
    mutationFn: () => stockAdjustmentsApi.count({
      shopId, note: note.trim() || undefined,
      items: entered.map((r) => ({ productId: r.productId, variantId: r.variantId, counted: Number(counted[r.key]) })),
    }),
    onSuccess: (r) => {
      setResult(r);
      toast.success(r.changed ? `Ginti save — ${r.changed} cheezon ka stock theek hua` : 'Ginti save — sab theek tha');
      STOCK_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e: { response?: { data?: { message?: string | string[] } }; message?: string }) => {
      const m = e?.response?.data?.message;
      toast.error((Array.isArray(m) ? m[0] : m) || e?.message || 'Ginti save nahi hui');
    },
  });

  const footer = allShops || result
    ? <Button onClick={onClose}>{result ? 'Theek hai' : 'Band karein'}</Button>
    : step === 'confirm'
      ? <><Button variant="secondary" onClick={() => setStep('count')}>Wapas</Button><Button onClick={() => save.mutate()} loading={save.isPending}>Haan, stock theek karein</Button></>
      : <><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={() => setStep('confirm')} disabled={!entered.length}>Aage — khulasa dekhein ({entered.length})</Button></>;

  return (
    <Modal open onClose={onClose} size="xl" closeOnBackdrop={false} title="Stock ginti"
      description="Shelf par jitna maal hai woh likhein — farq khud barhaya ya kam kiya jayega" footer={footer}>
      {allShops ? <BranchPicker what="Ginti" /> : result ? (
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-2 text-lg font-bold text-slate-900">Ginti save ho gayi</p>
          <p className="text-[0.8125rem] text-slate-500">Ref {result.groupRef} · {result.checked} cheezein gini · {result.changed} me farq tha</p>
          <div className="mx-auto mt-4 grid max-w-lg grid-cols-3 gap-2">
            <Tile label="Zyada nikla" value={`+${money(result.gained)}`} tone="text-emerald-700" />
            <Tile label="Kam nikla" value={`−${money(result.lost)}`} tone="text-rose-700" />
            <Tile label="Kul farq" value={`${result.net >= 0 ? '+' : '−'}${money(Math.abs(result.net))}`} tone={result.net >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
          </div>
        </div>
      ) : step === 'confirm' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Gini" value={String(entered.length)} />
            <Tile label="Farq wali" value={String(changed.length)} />
            <Tile label="Zyada nikla" value={`+${money(gained)}`} tone="text-emerald-700" />
            <Tile label="Kam nikla" value={`−${money(lost)}`} tone="text-rose-700" />
          </div>
          {!changed.length ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[0.8125rem] text-emerald-800 ring-1 ring-emerald-200">Har cheez system ke barabar hai — save karne se sirf ginti ka record banega, stock nahi badlega.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {changed.map((d) => (
                <li key={d.row.key} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.8125rem]">
                  <span className="min-w-0 truncate text-slate-800">{d.row.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{qtyText(d.row.system)} → {qtyText(d.row.system + d.diff)}</span>
                  <span className={cn('w-24 shrink-0 text-right font-semibold tabular-nums', d.diff > 0 ? 'text-emerald-700' : 'text-rose-700')}>{d.diff > 0 ? '+' : ''}{qtyText(d.diff)} {d.row.unit}</span>
                </li>
              ))}
            </ul>
          )}
          <div>
            <label htmlFor="count-note" className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Note</label>
            <input id="count-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Maslan: Mahine ki ginti, rack A"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            <p className="mt-1 text-[0.75rem] text-slate-500">Marzi hai — har badli hui line ke sath likha jayega.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-[14rem] flex-1">
              <ProductSearch sources={sources} byCode={byCode} loading={loading} showUnits={false} onPick={(s) => add([s])} />
            </div>
            {categories.length > 0 && (
              <FilterMenu icon={FolderOpen} label="Category ke sab" value="" align="right" width="w-72"
                options={[{ value: '', label: 'Category chunein' }, ...categories.map(([c, n]) => ({ value: c, label: c, hint: `${n} product` }))]}
                onChange={(c) => {
                  if (!c) return;
                  const list = sources.filter((s) => s.kind === 'product' && s.category === c);
                  add(list.slice(0, CATEGORY_LIMIT));
                  toast.success(list.length > CATEGORY_LIMIT ? `Pehle ${CATEGORY_LIMIT} products jur gaye` : `${list.length} products jur gaye`);
                }} />
            )}
          </div>
          <p className="-mt-2 text-[0.75rem] text-slate-500">Product dhoondein, scan karein ya poori category ek sath layein. Jo khana khali chhorein woh gina nahi jayega.</p>

          {!picked.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <ClipboardCheck className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Ginti shuru karein</p>
              <p className="mt-0.5 text-[0.8125rem] text-slate-500">Ek rack ya ek category se shuru karna aasaan hai</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="bg-slate-50 text-left text-[0.75rem] text-slate-500">
                  <tr><th className="px-3 py-2 font-medium">Cheez</th><th className="px-3 py-2 text-right font-medium">System</th><th className="px-3 py-2 text-right font-medium">Shelf par</th><th className="px-3 py-2 text-right font-medium">Farq</th><th className="px-3 py-2 text-right font-medium">Raqam</th><th className="w-8" /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((g) => {
                    const remove = <button type="button" onClick={() => setPicked((prev) => prev.filter((p) => p.id !== g.source.id))} aria-label="Hatayein" className="rounded-md p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>;
                    if (!g.rows) return <tr key={g.source.id}><td colSpan={5} className="px-3 py-2 text-slate-500">{g.source.name} — {g.failed ? 'load nahi hua' : 'load ho raha hai…'}</td><td>{remove}</td></tr>;
                    if (!g.rows.length) return <tr key={g.source.id}><td colSpan={5} className="px-3 py-2 text-[0.8125rem] text-slate-500"><Info className="mr-1 inline h-3.5 w-3.5" />{g.source.name} — roll ya IMEI wala maal; is ki durusti "Naya adjustment" se device / roll chun kar karein</td><td>{remove}</td></tr>;
                    return g.rows.map((r, j) => {
                      const v = counted[r.key];
                      const diff = v !== undefined && v !== '' ? Number(v) - r.system : null;
                      return (
                        <tr key={r.key}>
                          <td className="max-w-[16rem] truncate px-3 py-1.5 text-slate-800">{r.name}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{qtyText(r.system)} <span className="text-[0.6875rem]">{r.unit}</span></td>
                          <td className="px-3 py-1.5 text-right">
                            <input inputMode="decimal" value={v ?? ''} onChange={(e) => setCounted((c) => ({ ...c, [r.key]: e.target.value.replace(/[^\d.]/g, '') }))} placeholder="—" aria-label={`${r.name} ginti`}
                              className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 text-right tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
                          </td>
                          <td className={cn('px-3 py-1.5 text-right font-semibold tabular-nums', diff === null ? 'text-slate-300' : diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500')}>
                            {diff === null ? '—' : diff === 0 ? 'Theek' : `${diff > 0 ? '+' : ''}${qtyText(diff)}`}
                          </td>
                          <td className={cn('px-3 py-1.5 text-right tabular-nums', diff && diff > 0 ? 'text-emerald-700' : 'text-rose-700')}>{diff ? `${diff > 0 ? '+' : '−'}${money(Math.abs(diff * r.cost))}` : ''}</td>
                          <td>{j === 0 && remove}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          )}

          {entered.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200">
              <span className="text-slate-500">{entered.length} gini · {changed.length} me farq</span>
              <span>Zyada <b className="tabular-nums text-emerald-700">+{money(gained)}</b></span>
              <span>Kam <b className="tabular-nums text-rose-700">−{money(lost)}</b></span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Tile({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
      <p className="text-[0.75rem] text-slate-500">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold tabular-nums', tone)}>{value}</p>
    </div>
  );
}
