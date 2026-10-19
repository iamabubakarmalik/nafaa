/**
 * Old parts (cores) taken back from customers: held in the shop, sent back
 * to the supplier, or scrapped. Each one was taken off a bill as a
 * trade-in, at the counter or at the vehicle hand-over.
 *
 * Keys: N new · / search · 1-4 views.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, ListChecks, Plus, Recycle, Trash2, Truck, Undo2 } from 'lucide-react';
import {
  Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { coreReturnsApi, type CoreReturn, type CoreStatus, type CoreView } from '../api/core-returns.api';
import { CORE_KEY, apiError, dateTime, money } from '../components/meta';

const VIEWS: Array<{ id: CoreView; label: string; icon: typeof Archive }> = [
  { id: 'HELD', label: 'Dukaan me', icon: Archive },
  { id: 'SENT_TO_SUPPLIER', label: 'Supplier ko gaye', icon: Truck },
  { id: 'SCRAPPED', label: 'Kabar', icon: Trash2 },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const STATUS: Record<CoreStatus, { label: string; cls: string }> = {
  HELD: { label: 'Dukaan me', cls: 'bg-amber-50 text-amber-700' },
  SENT_TO_SUPPLIER: { label: 'Supplier ko gaya', cls: 'bg-sky-50 text-sky-700' },
  SCRAPPED: { label: 'Kabar', cls: 'bg-slate-100 text-slate-600' },
};

export default function CoreReturnsPage() {
  const qc = useQueryClient();
  const canAdd = usePermission(PERMISSIONS.POS_USE);
  const canMove = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<CoreView>('HELD');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, query]);
  const q = { view, search: query || undefined, page, limit: 40 };
  const listQ = useQuery({ queryKey: [CORE_KEY, 'page', q], queryFn: () => coreReturnsApi.page(q), placeholderData: (p) => p });
  const data = listQ.data;
  const c = data?.counts;

  const move = useMutation({
    mutationFn: (v: { id: string; status: CoreStatus }) => coreReturnsApi.setStatus(v.id, v.status),
    onSuccess: (_r, v) => { toast.success(`${STATUS[v.status].label} — likh liya`); qc.invalidateQueries({ queryKey: [CORE_KEY] }); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canAdd) { e.preventDefault(); setAdding(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const i = Number(e.key) - 1;
      if (i >= 0 && i < VIEWS.length) setView(VIEWS[i].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAdd]);

  return (
    <PageShell>
      <PageHero
        title="Purane parts"
        chip={<><Recycle /> Core returns</>}
        meta="Customer se wapas liye purane part — supplier ko bhejein ya kabar me dein"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={canAdd ? <button type="button" onClick={() => setAdding(true)} title="Naya (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Purana part</button> : undefined}
        stats={c ? [
          { label: 'Dukaan me', value: c.HELD.count },
          { label: 'Dukaan me qeemat', value: formatPKR(c.HELD.value) },
          { label: 'Supplier ko', value: c.SENT_TO_SUPPLIER.count },
        ] : [{ label: 'Dukaan me', value: '—' }]}
      />
      <KpiRow cols={3}>
        {!c ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Archive} color="#d97706" label="Dukaan me" value={c.HELD.count} hint={formatPKR(c.HELD.value)} onClick={() => setView('HELD')} active={view === 'HELD'} />
          <KpiCard icon={Truck} color="#0284c7" label="Supplier ko gaye" value={c.SENT_TO_SUPPLIER.count} hint={formatPKR(c.SENT_TO_SUPPLIER.value)} onClick={() => setView('SENT_TO_SUPPLIER')} active={view === 'SENT_TO_SUPPLIER'} />
          <KpiCard icon={Trash2} color="#64748b" label="Kabar" value={c.SCRAPPED.count} hint={formatPKR(c.SCRAPPED.value)} onClick={() => setView('SCRAPPED')} active={view === 'SCRAPPED'} />
        </>}
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Part ka naam…" label="Search" />} />
      <ViewTabs value={view} onChange={setView} hint={<>{canAdd && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>4</Kbd> list</>}
        tabs={VIEWS.map((v) => ({ id: v.id, label: v.label, icon: v.icon, count: c ? c[v.id].count : null }))} />
      {listQ.isLoading ? <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        : !data?.items.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Recycle className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{query ? 'Koi part nahi mila' : 'Is list me koi purana part nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Counter par "Purana part liya" ya gaari dete waqt likhein — qeemat bill se Trade-in ban kar katti hai.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {data.items.map((r) => <CoreRow key={r.id} r={r} canMove={canMove} busy={move.isPending && move.variables?.id === r.id} onMove={(status) => move.mutate({ id: r.id, status })} />)}
          </ul>
        )}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {data.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}
      {adding && <AddCoreModal onClose={() => setAdding(false)} onDone={() => { setAdding(false); qc.invalidateQueries({ queryKey: [CORE_KEY] }); }} />}
    </PageShell>
  );
}

function CoreRow({ r, canMove, busy, onMove }: { r: CoreReturn; canMove: boolean; busy: boolean; onMove: (s: CoreStatus) => void }) {
  const st = STATUS[r.status];
  return (
    <li className="flex flex-wrap items-start gap-3 px-3 py-3 sm:flex-nowrap sm:px-4">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Recycle className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-900">{r.description}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium', st.cls)}>{st.label}</span>
        </p>
        <p className="mt-0.5 text-[0.8125rem] text-slate-600">
          {r.sale ? <>Bill {r.sale.saleNumber}{r.sale.status === 'VOIDED' ? ' (void)' : ''}{r.sale.customer ? ` · ${r.sale.customer.name}` : ''}</> : 'Abhi kisi bill par nahi'}
          {r.job && <> · <Link to={`/autoparts/jobs/${r.job.id}`} className="font-medium text-brand-700 hover:underline">{r.job.jobNumber}</Link>{r.job.registrationNumber ? ` ${r.job.registrationNumber}` : ''}</>}
        </p>
        <p className="mt-0.5 text-[0.75rem] text-slate-500">{dateTime(r.createdAt)}{r.product ? ` · ${r.product.name}` : ''}</p>
      </div>
      <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto">
        <span className="mr-1 font-semibold tabular-nums text-slate-900">{formatPKR(r.value)}</span>
        {canMove && r.status === 'HELD' && <>
          <Button size="sm" variant="secondary" disabled={busy} leftIcon={<Truck className="h-3.5 w-3.5" />} onClick={() => onMove('SENT_TO_SUPPLIER')}>Supplier ko</Button>
          <Button size="sm" variant="ghost" disabled={busy} leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onMove('SCRAPPED')}>Kabar</Button>
        </>}
        {canMove && r.status !== 'HELD' && <Button size="sm" variant="ghost" disabled={busy} leftIcon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => onMove('HELD')}>Wapas dukaan me</Button>}
      </div>
    </li>
  );
}

function AddCoreModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const amount = Number(value) || 0;
  const save = useMutation({
    mutationFn: () => coreReturnsApi.create({ description: name.trim(), value: amount }),
    onSuccess: () => { toast.success('Purana part likh liya — counter par Trade-in me chunein'); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Nahi likha')),
  });
  const ok = !!name.trim() && amount > 0;
  return (
    <Modal open onClose={onClose} size="sm" title="Purana part" description="Customer ne jo part wapas diya — qeemat agle bill se katti hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!ok} loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ok) save.mutate(); }}>
        <Input label="Kaunsa part" value={name} onChange={(e) => setName(e.target.value)} placeholder="Purani battery 12V" data-autofocus />
        <Input label="Qeemat" inputMode="decimal" value={value} onChange={(e) => setValue(money(e.target.value))} placeholder="1500" />
      </form>
    </Modal>
  );
}
