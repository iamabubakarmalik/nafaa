/**
 * Production history: every production with who made it and when, what it
 * took and what it cost. A production can be reversed ("Wapas karein"):
 * the made goods come back out and the raw materials go back into stock.
 *
 * Keys: / search.
 */

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Factory, History, RotateCcw, Zap } from 'lucide-react';
import {
  Badge, Button, DateRangeMenu, EmptyState, FilterBar, FilterMenu, Modal, PageHero, PageShell, SearchField, Skeleton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { MFG_KEY, errText, manufacturingApi, qty, type RunRow } from '../api';
import { useManufacturingSwitch } from '../hooks';
import { MfgNav, MfgOff } from '../components/MfgNav';

const when = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const SOURCE: Record<RunRow['source'], string> = { MANUAL: 'Haath se', SALE: 'Bill par bana', AI: 'Nafaa AI' };

function RunModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { cost: money } = useMasked();
  const canProduce = usePermission(PERMISSIONS.MANUFACTURING_PRODUCE);
  const q = useQuery({ queryKey: [MFG_KEY, 'run', id], queryFn: () => manufacturingApi.run(id) });
  const [reason, setReason] = useState('');
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const r = q.data;

  const reverse = async () => {
    setBusy(true);
    try {
      await manufacturingApi.reverse(id, reason.trim() || undefined);
      toast.success('Production wapas ho gayi — stock pehle jaisa');
      void qc.invalidateQueries({ queryKey: [MFG_KEY] });
      ['products', 'product', 'product-insights', 'purchase-sources'].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
      setAsking(false);
    } catch (e) { toast.error(errText(e, 'Wapas nahi hui')); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={r ? `${r.name} × ${qty(r.quantity)} ${r.unit}` : 'Production'}
      description={r ? `${r.runNumber} · ${when(r.createdAt)}${r.createdBy ? ` · ${r.createdBy}` : ''}${r.shop ? ` · ${r.shop}` : ''}` : undefined}
      footer={r && canProduce && r.status === 'DONE' && r.source !== 'SALE' ? (
        asking ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void reverse(); }} placeholder="Wajah (zaroori nahi)"
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            <Button variant="secondary" onClick={() => setAsking(false)}>Rehne dein</Button>
            <Button variant="danger" loading={busy} onClick={() => void reverse()} leftIcon={<RotateCcw className="h-4 w-4" />}>Haan, wapas karein</Button>
          </div>
        ) : <Button variant="critical" onClick={() => setAsking(true)} leftIcon={<RotateCcw className="h-4 w-4" />}>Wapas karein</Button>
      ) : undefined}>
      {!r ? <Skeleton className="h-48 rounded-xl" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {r.status === 'REVERSED' ? <Badge variant="danger">Wapas ho chuki</Badge> : <Badge variant="success">Ban gaya</Badge>}
            <Badge variant="default">{SOURCE[r.source]}</Badge>
            {r.batchNumber && <Badge variant="info">Batch {r.batchNumber}</Badge>}
            {r.expiryDate && <Badge variant="warning">Expiry {r.expiryDate.slice(0, 10)}</Badge>}
          </div>
          {r.status === 'REVERSED' && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800">{r.reversedAt && when(r.reversedAt)}{r.reversedBy && ` · ${r.reversedBy}`}{r.reverseReason && ` — ${r.reverseReason}`}</p>
          )}
          {r.source === 'SALE' && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">Yeh bill {r.reference} par bikte waqt bana. Wapas karna ho to bill ka return ya void karein.</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Banaya', `${qty(r.quantity)} ${r.unit}`],
              ['Batch', qty(r.batches)],
              ['Cost / unit', r.unitCost != null ? money(r.unitCost) : '—'],
              ['Kul Cost', r.totalCost != null ? money(r.totalCost) : '—'],
            ].map(([l, v]) => <div key={l} className="rounded-xl bg-slate-50 p-3"><p className="text-[0.6875rem] text-slate-500">{l}</p><p className="truncate font-bold tabular-nums text-slate-900">{v}</p></div>)}
          </div>
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full min-w-[28rem] text-[0.8125rem]">
              <thead className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Raw maal</th><th className="px-3 py-2 text-right">Laga</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Cost</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {r.lines.map((l) => (
                  <tr key={l.productId}><td className="px-3 py-2">{l.name}</td><td className="px-3 py-2 text-right tabular-nums">{qty(l.quantity)} {l.unit}</td><td className="px-3 py-2 text-right tabular-nums">{l.unitCost != null ? money(l.unitCost) : '—'}</td><td className="px-3 py-2 text-right tabular-nums">{l.totalCost != null ? money(l.totalCost) : '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {(r.extraCost ?? 0) > 0 && <p className="text-[0.8125rem] text-slate-600">Packing, mazdoori, bijli: <strong className="tabular-nums">{money(r.extraCost ?? 0)}</strong>{r.wastagePercent > 0 && <> · Wastage {r.wastagePercent}%</>}</p>}
          {r.notes && <p className="text-[0.8125rem] text-slate-600">Note: {r.notes}</p>}
        </div>
      )}
    </Modal>
  );
}

export default function HistoryPage() {
  const sw = useManufacturingSwitch();
  const enabled = sw === 'on';
  const startHour = useBusinessDayStart();
  const { cost: money } = useMasked();
  const [params, setParams] = useSearchParams();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);
  const productId = params.get('productId') ?? undefined;
  const openRun = params.get('run');

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, status, source, query, productId]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const period = resolveRange(range, startHour);
  const q = useQuery({
    queryKey: [MFG_KEY, 'runs', period, status, source, query, productId, page],
    queryFn: () => manufacturingApi.runs({ ...(period ?? { from: 'all' }), status, source, search: query || undefined, productId, page, limit: 30 }),
    enabled, placeholderData: (p) => p,
  });
  const setRun = (id: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('run', id); else n.delete('run'); return n; });

  if (sw === 'loading') return <PageShell><Skeleton className="h-28 rounded-3xl" /><Skeleton className="h-72 rounded-2xl" /></PageShell>;
  if (!enabled) return <PageShell><MfgOff /></PageShell>;
  const data = q.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <PageShell>
      {openRun && <RunModal id={openRun} onClose={() => setRun(null)} />}
      <PageHero back="/manufacturing" backLabel="Banayein" title="Production history" subtitle="Kab, kis ne, kya banaya — aur kitne ka"
        stats={data ? [{ label: 'Production', value: String(data.totals.runs) }, { label: 'Kul Cost', value: data.totals.totalCost != null ? money(data.totals.totalCost) : '—' }] : undefined} loading={q.isLoading} />
      <MfgNav />

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Product, production ya bill number…" label="History search" />}
        onClear={status !== 'all' || source !== 'all' || productId ? () => { setStatus('all'); setSource('all'); setParams({}); } : undefined}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={CheckCircle2} label="Halat" value={status} active={status !== 'all'} onChange={setStatus}
          options={[{ value: 'all', label: 'Sab' }, { value: 'DONE', label: 'Ban gaya' }, { value: 'REVERSED', label: 'Wapas' }]} />
        <FilterMenu icon={Factory} label="Kaise" value={source} active={source !== 'all'} onChange={setSource}
          options={[{ value: 'all', label: 'Sab' }, { value: 'MANUAL', label: 'Haath se' }, { value: 'SALE', label: 'Bill par bana' }, { value: 'AI', label: 'Nafaa AI' }]} />
      </FilterBar>

      {q.isLoading ? <Skeleton className="h-80 rounded-2xl" /> : !data?.items.length ? (
        <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80"><EmptyState icon={<History className="h-6 w-6" />} title="Is period me koi production nahi" description="Period badal kar dekhein ya nayi production karein." /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <table className="w-full min-w-[46rem] text-[0.875rem]">
            <thead className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2.5">Waqt</th><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5 text-right">Banaya</th><th className="px-3 py-2.5 text-right">Cost / unit</th><th className="px-3 py-2.5 text-right">Kul Cost</th><th className="px-3 py-2.5">Kis ne</th><th className="px-3 py-2.5">Halat</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((r) => (
                <tr key={r.id} tabIndex={0} onClick={() => setRun(r.id)} onKeyDown={(e) => { if (e.key === 'Enter') setRun(r.id); }}
                  className={cn('cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none', r.status === 'REVERSED' && 'text-slate-400 line-through decoration-slate-300')}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{when(r.createdAt)}<span className="block text-[0.6875rem] text-slate-400 no-underline">{r.runNumber}</span></td>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{r.name}{r.source === 'SALE' && <Badge className="ml-1.5" size="xs" variant="warning"><Zap className="h-3 w-3" />{r.reference}</Badge>}{r.source === 'AI' && <Badge className="ml-1.5" size="xs" variant="info">AI</Badge>}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{qty(r.quantity)} {r.unit}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.unitCost != null ? money(r.unitCost) : '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.totalCost != null ? money(r.totalCost) : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.createdBy ?? '—'}</td>
                  <td className="px-3 py-2.5">{r.status === 'REVERSED' ? <Badge size="xs" variant="danger">Wapas</Badge> : <Badge size="xs" variant="success">Ban gaya</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[0.8125rem]">
              <span className="text-slate-500">Safha {page} / {pages}</span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Pichhla</Button>
                <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Agla</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
