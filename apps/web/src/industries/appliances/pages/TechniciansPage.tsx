/**
 * Technicians: the people who fit and repair at customers' homes — who is
 * free, who has too much, ratings, the month's work and commission.
 *
 * Keys: N new technician · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, Download, Filter, GraduationCap, HardHat, ListChecks, Pencil, Phone, Plus, Power, Star, Trophy, UserCheck, Users, Wallet, Zap } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { techniciansApi, type TechnicianRow, type TechnicianSummary } from '../api/technicians.api';
import { TechnicianForm } from '../components/TechnicianForm';
import { Bars, ListState, Panel } from '../components/ui';
import { CATEGORY_META, TECH_KEY, apiError } from '../components/meta';

type Tab = 'list' | 'analytics';
type Show = 'active' | 'inactive' | 'all';

export default function TechniciansPage() {
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.STAFF_MANAGE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('list');
  const [show, setShow] = useState<Show>('active');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<TechnicianRow | null | 'new'>(null);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const listQ = useQuery({ queryKey: [TECH_KEY, 'list', show, query], queryFn: () => techniciansApi.list({ active: show === 'all' ? undefined : show === 'active', search: query || undefined }), placeholderData: (p) => p });
  const statsQ = useQuery({ queryKey: [TECH_KEY, 'summary'], queryFn: techniciansApi.summary, refetchInterval: 60_000 });
  const rows = listQ.data ?? [];
  const s = statsQ.data;
  const toggle = useMutation({
    mutationFn: (t: TechnicianRow) => (t.isActive ? techniciansApi.remove(t.id) : techniciansApi.update(t.id, { employeeCode: t.employeeCode, name: t.name, phone: t.phone, isActive: true })),
    onSuccess: () => { toast.success('Technician update'); qc.invalidateQueries({ queryKey: [TECH_KEY] }); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setEditing('new'); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const printDoc = (): PrintDoc => ({
    title: 'Technicians',
    meta: [['Kul', String(rows.length)]],
    sections: [{ kind: 'table', columns: [{ label: 'Code' }, { label: 'Naam' }, { label: 'Phone' }, { label: 'Ilaqa', wideOnly: true }, { label: 'Khule kaam', align: 'right' }, { label: 'Rating', align: 'right' }],
      rows: rows.map((t) => [t.employeeCode, t.name, t.phone, t.currentZone ?? '—', String(t.openJobs), t.avgRating ? Number(t.avgRating).toFixed(1) : '—']) }],
  });
  const exportCsv = () => downloadCsv('technicians.csv', [
    ['Code', 'Naam', 'Phone', 'CNIC', 'Ilaqa', 'Kaam', 'Visit rate', 'Commission %', 'Khule kaam', 'Kul kaam', 'Mukammal', 'Kamai', 'Commission', 'Rating', 'Active'],
    ...rows.map((t) => [t.employeeCode, t.name, t.phone, t.cnic ?? '', t.currentZone ?? '', t.categoriesExpertise.map((c) => CATEGORY_META[c]?.label ?? c).join(' / '), t.visitChargeRate, t.commissionPct,
      t.openJobs, t.totalJobs, t.completedJobs, t.totalRevenue, t.totalCommission, t.avgRating ?? '', t.isActive ? 'Haan' : 'Nahi']),
  ]);

  return (
    <PageShell>
      <PageHero
        title="Technicians"
        chip={<><Zap /> Field team</>}
        meta="Kaun free hai, kis ke paas kitna kaam, rating aur commission"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" onClick={exportCsv} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing('new')} title="Naya (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya technician</button>}
        </>}
        stats={s ? [
          { label: 'Active', value: s.active, hint: s.inactive ? `${s.inactive} band` : undefined },
          { label: 'Khule kaam', value: s.openJobs },
          { label: 'Is mahine kamai', value: sales(s.month.revenue), hint: `${s.month.jobs} kaam` },
        ] : [{ label: 'Active', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={UserCheck} color="#16a34a" label="Free" value={s.free} hint="Koi kaam khula nahi" />
          <KpiCard icon={HardHat} color={s.overloaded ? '#e11d48' : '#64748b'} label="Zyada kaam" value={s.overloaded} hint="Kisi aur ko dein" />
          <KpiCard icon={Star} color="#d97706" label="Team rating" value={s.avgTeamRating ? s.avgTeamRating.toFixed(1) : '—'} hint="Customers ki" />
          <KpiCard icon={Wallet} color="#7c3aed" label="Commission (mahina)" value={sales(s.month.commission)} hint="Banta hai" />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone, code, ilaqa…" label="Search" />}
        chips={query ? <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip> : undefined}
        onClear={() => setSearch('')}>
        <FilterMenu icon={Filter} label={show === 'active' ? 'Active' : show === 'inactive' ? 'Band' : 'Sab'} value={show} active={show !== 'active'} onChange={setShow}
          options={[{ value: 'active' as Show, label: 'Active' }, { value: 'inactive' as Show, label: 'Band' }, { value: 'all' as Show, label: 'Sab' }]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[{ id: 'list', label: 'Team', icon: ListChecks, count: rows.length }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? <Leaderboard s={s} money={sales} /> : (
        <ListState loading={listQ.isLoading} error={listQ.isError && !listQ.data} empty={!rows.length} onRetry={() => listQ.refetch()} icon={Users}
          title={query ? 'Koi nahi mila' : 'Abhi koi technician nahi'} hint="Installation aur repair ke liye apne bande yahan jorein — phir har kaam par lagayein."
          actions={canManage ? <Button onClick={() => setEditing('new')} leftIcon={<Plus className="h-4 w-4" />}>Naya technician</Button> : undefined}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((t) => (
              <li key={t.id} className={cn('flex items-center gap-3 px-3 py-3 sm:px-4', !t.isActive && 'opacity-60')}>
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold', t.openJobs >= 5 ? 'bg-rose-50 text-rose-600' : t.openJobs ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-600')}>{t.name.charAt(0).toUpperCase()}</span>
                <Link to={`/appliances/technicians/${t.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold text-slate-900">{t.name}</span>
                    <span className="font-mono text-[0.6875rem] text-slate-400">{t.employeeCode}</span>
                    {!t.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-600">Band</span>}
                    {t.avgRating ? <span className="inline-flex items-center gap-0.5 text-[0.75rem] text-amber-700"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(t.avgRating).toFixed(1)}</span> : null}
                  </div>
                  <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{[t.phone, t.currentZone, [...new Set(t.categoriesExpertise.map((c) => CATEGORY_META[c]?.group))].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
                  <p className="mt-0.5 text-[0.75rem] text-slate-500">{t.openJobs ? `${t.openJobs} kaam khule (${t.openInstallations} fitting, ${t.openServices} repair)` : 'Free'} · {t.completedJobs} mukammal · {t.completionRate}%</p>
                </Link>
                <div className="flex shrink-0 gap-1">
                  <a href={`tel:${t.phone}`} aria-label="Call" title="Call" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Phone className="h-4 w-4" /></a>
                  {canManage && <button type="button" onClick={() => setEditing(t)} aria-label="Badlein" title="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>}
                  {canManage && <button type="button" onClick={() => toggle.mutate(t)} aria-label={t.isActive ? 'Band karein' : 'Chalu karein'} title={t.isActive ? 'Band karein' : 'Chalu karein'} className={cn('flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100', t.isActive ? 'text-rose-600' : 'text-emerald-600')}><Power className="h-4 w-4" /></button>}
                </div>
              </li>
            ))}
          </ul>
        </ListState>
      )}

      {editing && <TechnicianForm tech={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {guide.isOpen && (
        <PageGuide title="Technicians — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Banda jorein', text: 'Naam, phone, ilaqa aur kya kaam karta hai (AC, fridge, washing machine). Visit rate aur commission % likhein.' },
            { icon: HardHat, color: '#d97706', title: 'Kaam dein', text: 'Installation ya repair kholein → technician lagayein. Yahan dikhta hai kis ke paas kitna kaam hai — free bande ko dein.' },
            { icon: Trophy, color: '#7c3aed', title: 'Rating aur kamai', text: 'Kaam mukammal hone par customer ki rating aur bill isi ke hisaab me judte hain. Analytics me mahine ka leaderboard.' },
            { icon: Power, color: '#e11d48', title: 'Band karna', text: 'Chhor jaye to "Band" karein — purana kaam aur commission ka record rehta hai. Khule kaam pehle kisi aur ko dein.' },
          ]}
          tips={['Commission ka paisa diya ho to Expenses me "Salary / commission" likhein taake galla aur Profit sahi rahein.', 'Technician jorne ke liye "Staff manage" permission chahiye.']}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['1', 'team'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Leaderboard({ s, money }: { s?: TechnicianSummary; money: (n: number) => string }) {
  const rows = useMemo(() => [...(s?.leaderboard ?? [])].sort((a, b) => b.monthRevenue - a.monthRevenue), [s]);
  if (!s) return <Skeleton className="h-60 rounded-3xl" />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Is mahine kamai" hint="Mukammal kaam ke bill">
        <Bars rows={rows.map((r) => ({ key: r.id, label: r.name, value: r.monthRevenue, color: '#2563eb', hint: `${money(r.monthRevenue)} · ${r.monthJobs} kaam` }))} />
      </Panel>
      <Panel title="Commission banta hai" hint="Commission % × mukammal bill">
        <Bars rows={rows.filter((r) => r.monthCommission > 0).map((r) => ({ key: r.id, label: r.name, value: r.monthCommission, color: '#7c3aed', hint: money(r.monthCommission) }))} empty="Is mahine koi commission nahi" />
      </Panel>
    </div>
  );
}
