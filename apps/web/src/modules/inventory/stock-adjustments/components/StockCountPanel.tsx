/**
 * Physical stock count: add products by search, scan or a whole category,
 * type what is on the shelf, and see the system figure, the difference and
 * its value live. A summary is confirmed before saving; the server books
 * each difference in or out and returns what was gained and lost. Counted
 * extra is Stock faida and counted short Stock nuksan, at cost; a count
 * marked as a data correction moves stock without touching profit.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FolderOpen, Info, Trash2 } from 'lucide-react';
import { Button, FilterMenu, Modal, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { usePurchaseSources, type Source } from '@modules/purchasing/purchases/editor/sources';
import { stockAdjustmentsApi, type AdjustmentOptions, type StockCountResult } from '../api/stock-adjustments.api';
import { BranchPicker } from './BranchPicker';
import { ProductSearch } from './ProductSearch';
import { ADJ_KEY, CORRECTION_WARNING, EFFECTS, REASONS, STOCK_KEYS, qtyText } from './meta';

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
  const canCorrect = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_CORRECT);
  const [correction, setCorrection] = useState(false);
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
      shopId, note: note.trim() || undefined, ...(correction && canCorrect && { correction: true }),
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
            <Tile label={result.correction ? 'Zyada nikla' : 'Stock faida'} value={`+${money(result.gained)}`} tone="text-emerald-700" />
            <Tile label={result.correction ? 'Kam nikla' : 'Stock nuksan'} value={`−${money(result.lost)}`} tone="text-rose-700" />
            <Tile label={result.correction ? 'Kul farq' : 'Profit par asar'} value={`${result.net >= 0 ? '+' : '−'}${money(Math.abs(result.net))}`} tone={result.net >= 0 ? 'text-emerald-700' : 'text-rose-700'} />
          </div>
          <p className="mt-3 text-[0.75rem] text-slate-500">
            {result.correction ? 'Data correction — stock theek hua, Profit par asar nahi.' : 'Zyada nikla maal Stock faida (Profit mein plus), kam nikla Stock nuksan (Profit se minus) — cost par.'}
          </p>
        </div>
      ) : step === 'confirm' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="Gini" value={String(entered.length)} />
            <Tile label="Farq wali" value={String(changed.length)} />
            <Tile label={correction ? 'Zyada nikla' : EFFECTS.GAIN.label} value={`+${money(gained)}`} tone="text-emerald-700" />
            <Tile label={correction ? 'Kam nikla' : EFFECTS.LOSS.label} value={`−${money(lost)}`} tone="text-rose-700" />
          </div>
          <p className="-mt-2 text-[0.75rem] text-slate-500">
            {correction
              ? 'Data correction: stock ginti ke barabar ho jayega, Profit par asar nahi.'
              : `Zyada nikla = ${EFFECTS.GAIN.label} (${EFFECTS.GAIN.note.toLowerCase()}), kam nikla = ${EFFECTS.LOSS.label} (${EFFECTS.LOSS.note.toLowerCase()}) — cost par. Profit par asar ${gained - lost >= 0 ? '+' : '−'}${money(Math.abs(gained - lost))}.`}
          </p>
          {canCorrect && changed.length > 0 && (
            <label className={cn('flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 ring-1', correction ? 'bg-amber-50 ring-amber-300' : 'bg-white ring-slate-200')}>
              <input type="checkbox" checked={correction} onChange={(e) => setCorrection(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-600" />
              <span>
                <span className="block text-[0.8125rem] font-semibold text-slate-900">{REASONS.CORRECTION.label}</span>
                <span className="mt-0.5 flex items-start gap-1.5 text-[0.75rem] text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{CORRECTION_WARNING}</span>
              </span>
            </label>
          )}
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
          <p className="-mt-2 text-[0.75rem] text-slate-500">Product search, scan karein ya poori category ek sath layein. Jo khana khali chhorein woh gina nahi jayega.</p>

          {!picked.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <ClipboardCheck className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Ginti shuru karein</p>
              <p className="mt-0.5 text-[0.8125rem] text-slate-500">Ek rack ya ek category se shuru karna aasaan hai</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200">
              <Table minWidth="36rem" className="[&>table]:text-sm">
                <THead className="bg-slate-50 text-left text-[0.75rem] text-slate-500">
                  <Tr><Th className="px-3 py-2 font-medium">Cheez</Th><Th className="px-3 py-2 text-right font-medium">System</Th><Th className="px-3 py-2 text-right font-medium">Shelf par</Th><Th className="px-3 py-2 text-right font-medium">Farq</Th><Th className="px-3 py-2 text-right font-medium">Amount</Th><Th className="p-0 w-8" /></Tr>
                </THead>
                <TBody className="divide-y divide-slate-100">
                  {groups.map((g) => {
                    const remove = <button type="button" onClick={() => setPicked((prev) => prev.filter((p) => p.id !== g.source.id))} aria-label="Hatayein" className="rounded-md p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>;
                    if (!g.rows) return <Tr key={g.source.id}><Td colSpan={5} className="px-3 py-2 text-slate-500">{g.source.name} — {g.failed ? 'load nahi hua' : 'load ho raha hai…'}</Td><Td className="p-0 text-inherit">{remove}</Td></Tr>;
                    if (!g.rows.length) return <Tr key={g.source.id}><Td colSpan={5} className="px-3 py-2 text-[0.8125rem] text-slate-500"><Info className="mr-1 inline h-3.5 w-3.5" />{g.source.name} — roll ya IMEI wala maal; is ki correction "Naya adjustment" se device / roll chun kar karein</Td><Td className="p-0 text-inherit">{remove}</Td></Tr>;
                    return g.rows.map((r, j) => {
                      const v = counted[r.key];
                      const diff = v !== undefined && v !== '' ? Number(v) - r.system : null;
                      return (
                        <Tr key={r.key}>
                          <Td className="max-w-[16rem] truncate px-3 py-1.5 text-slate-800">{r.name}</Td>
                          <Td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{qtyText(r.system)} <span className="text-[0.6875rem]">{r.unit}</span></Td>
                          <Td className="text-inherit px-3 py-1.5 text-right">
                            <input inputMode="decimal" value={v ?? ''} onChange={(e) => setCounted((c) => ({ ...c, [r.key]: e.target.value.replace(/[^\d.]/g, '') }))} placeholder="—" aria-label={`${r.name} ginti`}
                              className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 text-right tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
                          </Td>
                          <Td className={cn('px-3 py-1.5 text-right font-semibold tabular-nums', diff === null ? 'text-slate-300' : diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-slate-500')}>
                            {diff === null ? '—' : diff === 0 ? 'Theek' : `${diff > 0 ? '+' : ''}${qtyText(diff)}`}
                          </Td>
                          <Td className={cn('px-3 py-1.5 text-right tabular-nums', diff && diff > 0 ? 'text-emerald-700' : 'text-rose-700')}>{diff ? `${diff > 0 ? '+' : '−'}${money(Math.abs(diff * r.cost))}` : ''}</Td>
                          <Td className="p-0 text-inherit">{j === 0 && remove}</Td>
                        </Tr>
                      );
                    });
                  })}
                </TBody>
              </Table>
            </div>
          )}

          {entered.length > 0 && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-2xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-slate-200">
              <span className="text-slate-500">{entered.length} gini · {changed.length} me farq</span>
              <span>{EFFECTS.GAIN.label} <b className="tabular-nums text-emerald-700">+{money(gained)}</b></span>
              <span>{EFFECTS.LOSS.label} <b className="tabular-nums text-rose-700">−{money(lost)}</b></span>
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
