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
import { t as tr } from '@core/i18n';

const when = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const SOURCE: Record<RunRow['source'], string> = { MANUAL: tr('Haath se'), SALE: tr('Bill par bana'), AI: tr('Nafaa AI') };

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
      toast.success(tr('Production wapas ho gayi — stock pehle jaisa'));
      void qc.invalidateQueries({ queryKey: [MFG_KEY] });
      ['products', 'product', 'product-insights', 'purchase-sources'].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
      setAsking(false);
    } catch (e) { toast.error(errText(e, tr('Wapas nahi hui'))); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={r ? `${r.name} × ${qty(r.quantity)} ${r.unit}` : tr('Production')}
      description={r ? `${r.runNumber} · ${when(r.createdAt)}${r.createdBy ? ` · ${r.createdBy}` : ''}${r.shop ? ` · ${r.shop}` : ''}` : undefined}
      footer={r && canProduce && r.status === 'DONE' && r.source !== 'SALE' ? (
        asking ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void reverse(); }} placeholder={tr('Wajah (zaroori nahi)')}
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            <Button variant="secondary" onClick={() => setAsking(false)}>{tr('Rehne dein')}</Button>
            <Button variant="danger" loading={busy} onClick={() => void reverse()} leftIcon={<RotateCcw className="h-4 w-4" />}>{tr('Haan, wapas karein')}</Button>
          </div>
        ) : <Button variant="critical" onClick={() => setAsking(true)} leftIcon={<RotateCcw className="h-4 w-4" />}>{tr('Wapas karein')}</Button>
      ) : undefined}>
      {!r ? <Skeleton className="h-48 rounded-xl" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {r.status === 'REVERSED' ? <Badge variant="danger">{tr('Wapas ho chuki')}</Badge> : <Badge variant="success">{tr('Ban gaya')}</Badge>}
            <Badge variant="default">{SOURCE[r.source]}</Badge>
            {r.batchNumber && <Badge variant="info">{tr('Batch {{batchNumber}}', { batchNumber: r.batchNumber })}</Badge>}
            {r.expiryDate && <Badge variant="warning">{tr('Expiry {{value}}', { value: r.expiryDate.slice(0, 10) })}</Badge>}
          </div>
          {r.status === 'REVERSED' && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800">{r.reversedAt && when(r.reversedAt)}{r.reversedBy && ` · ${r.reversedBy}`}{r.reverseReason && ` — ${r.reverseReason}`}</p>
          )}
          {r.source === 'SALE' && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">{tr('Yeh bill {{reference}} par bikte waqt bana. Wapas karna ho to bill ka return ya void karein.', { reference: r.reference })}</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [tr('Banaya'), `${qty(r.quantity)} ${r.unit}`],
              [tr('Batch'), qty(r.batches)],
              [tr('Cost / unit'), r.unitCost != null ? money(r.unitCost) : '—'],
              [tr('Kul Cost'), r.totalCost != null ? money(r.totalCost) : '—'],
            ].map(([l, v]) => <div key={l} className="rounded-xl bg-slate-50 p-3"><p className="text-[0.6875rem] text-slate-500">{l}</p><p className="truncate font-bold tabular-nums text-slate-900">{v}</p></div>)}
          </div>
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full min-w-[28rem] text-[0.8125rem]">
              <thead className="bg-slate-50 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">{tr('Raw maal')}</th><th className="px-3 py-2 text-end">{tr('Laga')}</th><th className="px-3 py-2 text-end">{tr('Rate')}</th><th className="px-3 py-2 text-end">{tr('Cost')}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {r.lines.map((l) => (
                  <tr key={l.productId}><td className="px-3 py-2">{l.name}</td><td className="px-3 py-2 text-end tabular-nums">{qty(l.quantity)} {l.unit}</td><td className="px-3 py-2 text-end tabular-nums">{l.unitCost != null ? money(l.unitCost) : '—'}</td><td className="px-3 py-2 text-end tabular-nums">{l.totalCost != null ? money(l.totalCost) : '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {(r.extraCost ?? 0) > 0 && <p className="text-[0.8125rem] text-slate-600">{tr('Packing, mazdoori, bijli:')}{' '} <strong className="tabular-nums">{money(r.extraCost ?? 0)}</strong>{r.wastagePercent > 0 && <> {' '}{tr('· Wastage {{wastagePercent}}%', { wastagePercent: r.wastagePercent })}</>}</p>}
          {r.notes && <p className="text-[0.8125rem] text-slate-600">{tr('Note: {{notes}}', { notes: r.notes })}</p>}
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
      <PageHero back="/manufacturing" backLabel={tr('Banayein')} title={tr('Production history')} subtitle={tr('Kab, kis ne, kya banaya — aur kitne ka')}
        stats={data ? [{ label: tr('Production'), value: String(data.totals.runs) }, { label: tr('Kul Cost'), value: data.totals.totalCost != null ? money(data.totals.totalCost) : '—' }] : undefined} loading={q.isLoading} />
      <MfgNav />

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Product, production ya bill number…')} label={tr('History search')} />}
        onClear={status !== 'all' || source !== 'all' || productId ? () => { setStatus('all'); setSource('all'); setParams({}); } : undefined}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={CheckCircle2} label={tr('Halat')} value={status} active={status !== 'all'} onChange={setStatus}
          options={[{ value: 'all', label: tr('Sab') }, { value: 'DONE', label: tr('Ban gaya') }, { value: 'REVERSED', label: tr('Wapas') }]} />
        <FilterMenu icon={Factory} label={tr('Kaise')} value={source} active={source !== 'all'} onChange={setSource}
          options={[{ value: 'all', label: tr('Sab') }, { value: 'MANUAL', label: tr('Haath se') }, { value: 'SALE', label: tr('Bill par bana') }, { value: 'AI', label: tr('Nafaa AI') }]} />
      </FilterBar>

      {q.isLoading ? <Skeleton className="h-80 rounded-2xl" /> : !data?.items.length ? (
        <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80"><EmptyState icon={<History className="h-6 w-6" />} title={tr('Is period me koi production nahi')} description={tr('Period badal kar dekhein ya nayi production karein.')} /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <table className="w-full min-w-[46rem] text-[0.875rem]">
            <thead className="bg-slate-50 text-start text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2.5">{tr('Waqt')}</th><th className="px-3 py-2.5">{tr('Product')}</th><th className="px-3 py-2.5 text-end">{tr('Banaya')}</th><th className="px-3 py-2.5 text-end">{tr('Cost / unit')}</th><th className="px-3 py-2.5 text-end">{tr('Kul Cost')}</th><th className="px-3 py-2.5">{tr('Kis ne')}</th><th className="px-3 py-2.5">{tr('Halat')}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((r) => (
                <tr key={r.id} tabIndex={0} onClick={() => setRun(r.id)} onKeyDown={(e) => { if (e.key === 'Enter') setRun(r.id); }}
                  className={cn('cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none', r.status === 'REVERSED' && 'text-slate-400 line-through decoration-slate-300')}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{when(r.createdAt)}<span className="block text-[0.6875rem] text-slate-400 no-underline">{r.runNumber}</span></td>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{r.name}{r.source === 'SALE' && <Badge className="ms-1.5" size="xs" variant="warning"><Zap className="h-3 w-3" />{r.reference}</Badge>}{r.source === 'AI' && <Badge className="ms-1.5" size="xs" variant="info">{tr('AI')}</Badge>}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{qty(r.quantity)} {r.unit}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{r.unitCost != null ? money(r.unitCost) : '—'}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums">{r.totalCost != null ? money(r.totalCost) : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.createdBy ?? '—'}</td>
                  <td className="px-3 py-2.5">{r.status === 'REVERSED' ? <Badge size="xs" variant="danger">{tr('Wapas')}</Badge> : <Badge size="xs" variant="success">{tr('Ban gaya')}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[0.8125rem]">
              <span className="text-slate-500">{tr('Safha {{page}} / {{pages}}', { page, pages })}</span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{tr('Pichhla')}</Button>
                <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{tr('Agla')}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
