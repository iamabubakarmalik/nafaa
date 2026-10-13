/**
 * Damage and wastage for every industry. Staff report damaged, expired or
 * spoilt goods; a manager approves (stock goes out and the line shows on the
 * Adjustments page) or rejects. Tabs: the approval queue, the full record
 * for a period, and analytics of where the loss comes from.
 *
 * Keys: N new report · / search · A analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Camera, CheckCircle2, ChevronDown, Clock, ClipboardList, Filter, GraduationCap, ListChecks, MessageSquareText,
  PackageCheck, PackageX, Plus, ShieldCheck, SlidersHorizontal, Store, TriangleAlert, XCircle,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { damageApi, type DamageLog, type DamageQuery, type DamageReasonCode, type DamageStatus } from '../api/damage.api';
import { DamageAnalytics } from '../components/DamageAnalytics';
import { DamageReportForm } from '../components/DamageReportForm';
import { DecideModal } from '../components/DecideModal';
import { DAMAGE_KEY, FILTER_REASONS, STATUS, ageHours, itemLabel, qtyLabel, reasonOf, when } from '../components/meta';
import { damageDoc } from '../components/print';

type Tab = 'pending' | 'all' | 'analytics';
type StatusFilter = 'all' | DamageStatus;
type ReasonFilter = '' | DamageReasonCode;

export default function DamagePage() {
  const startHour = useBusinessDayStart();
  const { cost: money } = useMasked();
  const canApprove = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [status, setStatus] = useState<StatusFilter>('all');
  const [reason, setReason] = useState<ReasonFilter>('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('pending');
  const [form, setForm] = useState(false);
  const [decide, setDecide] = useState<{ mode: 'approve' | 'reject'; rows: DamageLog[] } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const guide = usePageGuide();

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); setPicked(new Set()); }, [range, status, reason, query, tab]);

  const period = resolveRange(range, startHour);
  const base = { reasonCode: reason || undefined, search: query || undefined };
  const periodFilters = { ...(period ?? {}), ...base };
  // The approval queue shows every waiting report, whatever the period.
  const filters: Omit<DamageQuery, 'page' | 'limit'> = tab === 'pending'
    ? { ...base, status: 'REPORTED' }
    : { ...periodFilters, status: status === 'all' ? undefined : status };
  const q: DamageQuery = { ...filters, page, limit: 30 };

  const listQ = useQuery({ queryKey: [DAMAGE_KEY, 'list', q], queryFn: () => damageApi.list(q), placeholderData: (prev) => prev, enabled: tab !== 'analytics' });
  const periodQ = useQuery({ queryKey: [DAMAGE_KEY, 'list', { ...periodFilters, page: 1, limit: 1 }], queryFn: () => damageApi.list({ ...periodFilters, page: 1, limit: 1 }), placeholderData: (prev) => prev });
  const queueQ = useQuery({ queryKey: [DAMAGE_KEY, 'queue'], queryFn: damageApi.queue, refetchInterval: 60_000 });
  const statsQ = useQuery({ queryKey: [DAMAGE_KEY, 'analytics', periodFilters], queryFn: () => damageApi.analytics(periodFilters), placeholderData: (p) => p });

  const data = listQ.data;
  const pt = periodQ.data?.totals;
  const queue = queueQ.data;
  const top = statsQ.data?.byReason[0];
  const topMeta = top ? reasonOf((top.key.startsWith('OTHER:') ? 'OTHER' : top.key) as DamageReasonCode, top.label) : null;
  const filtered = !!reason || !!query || (tab === 'all' && status !== 'all');
  const rows = data?.items ?? [];
  const pickable = canApprove && tab === 'pending';
  const pickedRows = rows.filter((r) => picked.has(r.id));

  const filterText = [tab === 'pending' ? 'Approval baqi' : status !== 'all' && STATUS[status].label, reason && FILTER_REASONS.find((r) => r.code === reason)?.label, query && `"${query}"`].filter(Boolean).join(' · ');
  const printDoc = async () => damageDoc(await damageApi.list({ ...filters, page: 1, limit: 200 }), tab === 'pending' || !period ? 'Sab tareekhen' : `${period.from} — ${period.to}`, filterText);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setForm(true); }
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setTab('analytics'); }
      if (e.key === '/') { e.preventDefault(); setTab((t) => (t === 'analytics' ? 'all' : t)); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clear = () => { setStatus('all'); setReason(''); setSearch(''); };
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <PageShell>
      <PageHero
        title="Kharab maal"
        chip={<><PackageX /> Damage & wastage</>}
        meta="Toota, expiry, kharab — report, approval aur nuqsan ka hisaab"
        busy={(listQ.isFetching && !listQ.isLoading) || periodQ.isFetching}
        loading={periodQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab === 'analytics' || !rows.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setForm(true)} title="Naya report (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Report karein</button>
        </>}
        stats={pt ? [
          { label: 'Is period ka nuqsan', value: money(pt.lost), hint: 'manzoor' },
          { label: 'Approval baqi', value: queue?.pending ?? '—', hint: queue?.pending ? money(queue.pendingValue) : undefined },
          { label: 'Reports', value: pt.reported + pt.approved + pt.rejected },
          { label: 'Rad hui', value: pt.rejected },
        ] : [{ label: 'Is period ka nuqsan', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!queue || !pt ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color="#d97706" label="Approval ka intezar" value={queue.pending}
            hint={queue.aging ? `${queue.aging} report ${queue.agingHours} ghante se purani` : queue.pending ? money(queue.pendingValue) : 'Sab faislay ho chuke'}
            onClick={() => setTab('pending')} active={tab === 'pending'} />
          <KpiCard icon={PackageX} color="#e11d48" label="Nuqsan (is period)" value={money(pt.lost)} hint={`${pt.approved} approve report`}
            onClick={() => { setTab('all'); setStatus('APPROVED'); }} active={tab === 'all' && status === 'APPROVED'} />
          <KpiCard icon={topMeta?.icon ?? MessageSquareText} color={topMeta?.color ?? '#64748b'} label="Sab se bari wajah" value={topMeta?.label ?? '—'}
            hint={top ? `${money(top.value + top.pending)} · ${top.count} report` : 'Abhi koi report nahi'}
            onClick={top && !top.key.startsWith('OTHER:') ? () => { setTab('all'); setReason(top.key as DamageReasonCode); } : undefined} />
          <KpiCard icon={XCircle} color="#475569" label="Rad hui" value={pt.rejected} hint="In se stock nahi badla"
            onClick={() => { setTab('all'); setStatus('REJECTED'); }} active={tab === 'all' && status === 'REJECTED'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Product, SKU, report number ya wajah…" label="Search" />}
        chips={filtered ? <>
          {tab === 'all' && status !== 'all' && <FilterChip onRemove={() => setStatus('all')}>{STATUS[status].label}</FilterChip>}
          {reason && <FilterChip onRemove={() => setReason('')}>{FILTER_REASONS.find((r) => r.code === reason)?.label}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        {tab === 'all' && (
          <FilterMenu icon={Filter} label="Haal" value={status} active={status !== 'all'} onChange={setStatus}
            options={[{ value: 'all', label: 'Sab' }, ...(Object.keys(STATUS) as DamageStatus[]).map((k) => ({ value: k, label: STATUS[k].label, icon: STATUS[k].icon, color: STATUS[k].color }))]} />
        )}
        <FilterMenu icon={MessageSquareText} label="Wajah" value={reason} active={!!reason} onChange={setReason} align="right"
          options={[{ value: '' as ReasonFilter, label: 'Sab wajah' }, ...FILTER_REASONS.map((r) => ({ value: r.code as ReasonFilter, label: r.label, icon: r.icon, color: r.color }))]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={tab === 'pending' ? <>Period ka filter yahan nahi lagta — har baqi report dikhti hai</> : <><Kbd>N</Kbd> report · <Kbd>A</Kbd> analytics · <Kbd>/</Kbd> search</>}
        tabs={[
          { id: 'pending', label: 'Approval baqi', icon: Clock, count: queue?.pending ?? null },
          { id: 'all', label: 'Sab record', icon: ListChecks },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <DamageAnalytics filters={periodFilters} money={money} /> : (<>
        {pickable && rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200/80">
            <label className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={pickedRows.length === rows.length}
                onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
              Sab chunein
            </label>
            <span className="text-[0.75rem] text-slate-500">{pickedRows.length ? `${pickedRows.length} chuni · ${money(pickedRows.reduce((s, r) => s + r.netLoss, 0))}` : 'Kai reports ek sath approve ya rad karein'}</span>
            <span className="ml-auto flex gap-2">
              <Button size="sm" variant="secondary" disabled={!pickedRows.length} onClick={() => setDecide({ mode: 'reject', rows: pickedRows })} leftIcon={<XCircle className="h-4 w-4" />}>Rad</Button>
              <Button size="sm" disabled={!pickedRows.length} onClick={() => setDecide({ mode: 'approve', rows: pickedRows })} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Approve</Button>
            </span>
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[4.5rem] rounded-xl" />)}</div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            {tab === 'pending' ? <PackageCheck className="mx-auto h-10 w-10 text-emerald-400" /> : <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />}
            <p className="mt-3 font-semibold text-slate-900">
              {tab === 'pending' ? (filtered ? 'Is filter me koi baqi report nahi' : 'Koi report approval ke intezar me nahi') : filtered ? 'Is filter me koi report nahi' : 'Is period me koi kharab maal report nahi hua'}
            </p>
            <p className="mt-1 text-sm text-slate-500">Maal toota, expire hua ya chuhe ne kaata? Report karein taake stock aur nuqsan ka hisaab sahi rahe.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setForm(true)} leftIcon={<Plus className="h-4 w-4" />}>Report karein</Button>
              {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
            </div>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80 divide-y divide-slate-100">
            {rows.map((d) => (
              <Row key={d.id} d={d} money={money} canApprove={canApprove} pickable={pickable} picked={picked.has(d.id)} onPick={() => toggle(d.id)}
                onDecide={(mode) => setDecide({ mode, rows: [d] })} />
            ))}
          </ul>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
            <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
          </div>
        )}
      </>)}

      {form && <DamageReportForm canApprove={canApprove} onClose={() => setForm(false)} />}
      {decide && <DecideModal mode={decide.mode} rows={decide.rows} onClose={() => setDecide(null)} onDone={() => setPicked(new Set())} />}

      {guide.isOpen && (
        <PageGuide title="Kharab maal — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#e11d48', title: 'Report karein', text: '"Report karein" dabayein, product search ya scan karein, quantity likhein aur wajah chunein: expiry, toota, kharab, chuha/keera, wapas aaya kharab ya kuch aur.' },
            { icon: Camera, color: '#7c3aed', title: 'Photo lagayein', text: 'Phone par camera khul jata hai. Photo se manager ko yaqeen hota hai aur supplier se claim me kaam aati hai.' },
            { icon: ShieldCheck, color: '#16a34a', title: 'Manager approve kare', text: 'Report se stock foran nahi ghatta. Manager "Approval baqi" me dekh kar approve ya rad karta hai. Kai reports ek sath bhi ho sakti hain.' },
            { icon: SlidersHorizontal, color: '#2563eb', title: 'Stock aur hisaab', text: 'Approval par maal branch ke stock se nikal jata hai aur Stock adjustments me "Kharab" (chori ho to "Gum") ban kar dikhta hai — cost ke saath.' },
            { icon: BarChart3, color: '#d97706', title: 'Analytics dekhein', text: 'Kis wajah, kis product aur kis category me sab se zyada nuqsan hai — roz ka hisaab karobari din ke mutabiq.' },
            { icon: Store, color: '#0891b2', title: 'Branch ka usool', text: 'Report hamesha khuli branch ki hoti hai. "Sab branches" par pehle branch chunein. Staff sirf apni branch ki report approve kar sakta hai.' },
          ]}
          tips={[
            'Approval ke liye "Stock adjustments" ki permission chahiye — Team settings me de sakte hain.',
            `${queue?.agingHours ?? 48} ghante se purani baqi report par laal nishan aata hai — jaldi faisla karein.`,
            'Batch wale maal me expiry wala batch chunein — approval par us batch ki ginti bhi kam hoti hai.',
            'Roll ya IMEI wala maal Stock adjustments page se likhein.',
          ]}
          shortcuts={[['N', 'naya report'], ['A', 'analytics'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Row({ d, money, canApprove, pickable, picked, onPick, onDecide }: {
  d: DamageLog; money: (n: number) => string; canApprove: boolean; pickable: boolean; picked: boolean;
  onPick: () => void; onDecide: (mode: 'approve' | 'reject') => void;
}) {
  const [open, setOpen] = useState(false);
  const r = reasonOf(d.reasonCode, d.reason);
  const s = STATUS[d.status];
  const pending = d.status === 'REPORTED';
  const old = pending && ageHours(d.createdAt) > 48;
  const thumb = d.photos[0] ?? d.product.images?.[0]?.url;
  const meta = [when(d.createdAt), d.shop?.name, d.reportedBy?.fullName].filter(Boolean).join(' · ');
  return (
    <li className={cn(picked && 'bg-brand-50/50')}>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4">
        {pickable && <input type="checkbox" aria-label="Chunein" className="h-4 w-4 shrink-0 rounded border-slate-300" checked={picked} onChange={onPick} />}
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-slate-200" style={{ backgroundColor: `${r.color}14`, color: r.color }}>
          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <r.icon className="h-4 w-4" />}
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-slate-900">{itemLabel(d)}</span>
            <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1" style={{ backgroundColor: `${r.color}12`, color: r.color, borderColor: r.color }}>{r.label}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', s.tone)}><s.icon className="h-3 w-3" />{s.label}</span>
            {old && <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[0.6875rem] font-semibold text-white"><TriangleAlert className="h-3 w-3" />Purani</span>}
            {d.photos.length > 0 && <span className="inline-flex items-center gap-0.5 text-[0.6875rem] text-slate-500"><Camera className="h-3 w-3" />{d.photos.length}</span>}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400">
            <span className="font-mono">{d.damageNumber}</span> · {meta}{d.batch ? ` · Batch ${d.batch.batchNumber}` : ''}
          </span>
        </button>
        <div className="ml-auto text-right">
          <p className="text-base font-bold tabular-nums text-rose-700">−{qtyLabel(d)}</p>
          <p className="text-[0.75rem] tabular-nums text-slate-500">{money(d.netLoss)}</p>
        </div>
        {pending && canApprove && (
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => onDecide('reject')} aria-label="Rad karein"><XCircle className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => onDecide('approve')} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Approve</Button>
          </div>
        )}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Details" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] text-slate-700 sm:pl-[4.25rem]">
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            <Fact k="Cost (1 unit)" v={money(d.unitCost)} />
            <Fact k="Kul cost" v={money(d.costImpact)} />
            {d.salvageValue > 0 && <Fact k="Wapas mila" v={money(d.salvageValue)} />}
            {d.batch?.expiryDate && <Fact k="Expiry" v={new Date(d.batch.expiryDate).toLocaleDateString('en-PK')} />}
            {d.decidedBy && <Fact k={d.status === 'REJECTED' ? 'Rad kiya' : 'Approve kiya'} v={`${d.decidedBy.fullName}${d.approvedAt || d.rejectedAt ? ` · ${when((d.approvedAt ?? d.rejectedAt)!)}` : ''}`} />}
            {d.product.category && <Fact k="Category" v={d.product.category.name} />}
          </dl>
          {d.notes && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">{d.notes}</p>}
          {d.rejectionReason && <p className="rounded-xl bg-rose-50 px-3 py-2 text-rose-800 ring-1 ring-rose-200">Rad ki wajah: {d.rejectionReason}</p>}
          {d.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {d.photos.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="block h-20 w-20 overflow-hidden rounded-xl ring-1 ring-slate-200">
                  <img src={url} alt="Report ki photo" loading="lazy" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 sm:block"><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className="font-medium tabular-nums text-slate-900">{v}</dd></div>;
}
