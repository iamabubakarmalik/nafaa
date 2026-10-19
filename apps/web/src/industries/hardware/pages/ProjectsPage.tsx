/**
 * Contractor sites (projects): which sites are running, how much was
 * quoted, billed and delivered to each, and what is still to send. Money
 * comes live from bills linked through challans and billed quotations.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, CheckCircle2, Download, GraduationCap, HardHat, ListChecks, MapPin, PauseCircle, Plus, Truck } from 'lucide-react';
import { FilterBar, FilterChip, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { projectsApi, type HardwareProject, type ProjectStatus } from '../api/projects.api';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { PROJECT_STATUS } from '../lib/projects';

type Tab = 'running' | 'planning' | 'hold' | 'done' | 'all';
const TABS: Array<{ id: Tab; label: string; icon: typeof ListChecks; match: (s: ProjectStatus) => boolean }> = [
  { id: 'running', label: 'Chal rahi', icon: HardHat, match: (s) => s === 'APPROVED' || s === 'IN_PROGRESS' },
  { id: 'planning', label: 'Shuru hone wali', icon: Building2, match: (s) => s === 'PLANNING' || s === 'QUOTED' },
  { id: 'hold', label: 'Ruki hui', icon: PauseCircle, match: (s) => s === 'ON_HOLD' },
  { id: 'done', label: 'Mukammal / band', icon: CheckCircle2, match: (s) => s === 'COMPLETED' || s === 'CANCELLED' },
  { id: 'all', label: 'Sab', icon: ListChecks, match: () => true },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('running');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const q = useDebounced(search.trim());

  const { data = [], isLoading, isFetching } = useQuery({ queryKey: ['hardware-projects', 'list', q], queryFn: () => projectsApi.list({ active: true, search: q || undefined }) });
  usePageKeys(searchRef, { n: () => setCreating(true) });

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, data.filter((p) => t.match(p.status)).length])) as Record<Tab, number>, [data]);
  const rows = useMemo(() => data.filter((p) => TABS.find((t) => t.id === tab)!.match(p.status)), [data, tab]);
  const running = data.filter((p) => TABS[0].match(p.status));
  const sum = (k: keyof HardwareProject) => running.reduce((s, p) => s + Number(p[k] || 0), 0);

  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me koi site nahi'); return; }
    downloadCsv('sites.csv', [
      ['Number', 'Site', 'Malik', 'Phone', 'Thekedar', 'Pata', 'Status', 'Quotation', 'Bill / maal', 'Pohancha', 'Baqi'],
      ...rows.map((p) => [p.projectNumber, p.name, p.customerName, p.customerPhone, p.contractorName, p.siteAddress, PROJECT_STATUS[p.status].label, p.totalQuoted, p.totalOrdered, p.totalDelivered, p.totalPending]),
    ]);
  };

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Sites — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Building2, color: '#2563eb', title: 'Site banayein', text: 'Har construction site ek baar banayein — malik, thekedar aur pata.' },
            { icon: HardHat, color: '#a16207', title: 'Quotation aur challan', text: 'Quotation aur challan banate waqt site chunein — sab is site ke hisaab me jurta hai.' },
            { icon: Truck, color: '#16a34a', title: 'Kitna pohancha', text: 'Card par bill ka maal, pohancha hua maal aur baqi — sab live.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'nayi site'], ['G', 'guide']]} />
      )}

      <PageHero title="Sites / projects" chip={`${counts.running} chal rahi`} busy={isFetching && !isLoading} loading={isLoading}
        meta="Thekedar ki construction sites — quotation, bill aur challan ek jagah"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setCreating(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" />Nayi site</button>
        </>}
        stats={[
          { label: 'Chalti sites ka maal (bill)', value: money(sum('totalOrdered')) },
          { label: 'Pohanch chuka', value: money(sum('totalDelivered')) },
          { label: 'Bhejna baqi', value: money(sum('totalPending')) },
        ]} />

      <KpiRow cols={4}>
        {isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={HardHat} color="#a16207" label="Chal rahi" value={counts.running} onClick={() => setTab('running')} active={tab === 'running'} />
            <KpiCard icon={Building2} color="#2563eb" label="Shuru hone wali" value={counts.planning} hint="Quotation de di" onClick={() => setTab('planning')} active={tab === 'planning'} />
            <KpiCard icon={PauseCircle} color="#d97706" label="Ruki hui" value={counts.hold} onClick={() => setTab('hold')} active={tab === 'hold'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Mukammal" value={counts.done} onClick={() => setTab('done')} active={tab === 'done'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Site, malik, phone ya number…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')} />

      <ViewTabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: counts[t.id] }))} hint="Site par click kar ke poora hisaab" />

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <section className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200/80">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Building2 className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{search ? 'Is search me koi site nahi' : 'Is list me koi site nahi'}</h3>
          <p className="mt-1 text-[0.875rem] text-slate-500">Thekedar ki har site banayein — quotation aur challan us se jurenge.</p>
          <button type="button" onClick={() => setCreating(true)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Nayi site</button>
        </section>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const st = PROJECT_STATUS[p.status];
            const pct = p.totalOrdered > 0 ? Math.min(Math.round((p.totalDelivered / p.totalOrdered) * 100), 100) : 0;
            return (
              <Link key={p.id} to={`/hardware/projects/${p.id}`} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{p.name}</p>
                    <p className="truncate text-[0.75rem] text-slate-500">{p.projectNumber} · {p.customerName}{p.contractorName ? ` · ${p.contractorName}` : ''}</p>
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', st.tone)}>{st.label}</span>
                </div>
                <p className="mt-2 flex items-center gap-1 truncate text-[0.8125rem] text-slate-600"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />{p.siteAddress}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-[0.75rem]">
                  <div><dt className="text-slate-500">Bill</dt><dd className="font-semibold tabular-nums text-slate-900">{money(p.totalOrdered)}</dd></div>
                  <div><dt className="text-slate-500">Pohancha</dt><dd className="font-semibold tabular-nums text-emerald-700">{money(p.totalDelivered)}</dd></div>
                  <div><dt className="text-slate-500">Baqi</dt><dd className="font-semibold tabular-nums text-amber-700">{money(p.totalPending)}</dd></div>
                </dl>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
              </Link>
            );
          })}
        </div>
      )}

      {creating && <ProjectFormModal onClose={() => setCreating(false)} onSaved={(p) => navigate(`/hardware/projects/${p.id}`)} />}
    </PageShell>
  );
}
