/**
 * Members: everyone enrolled, by where they stand today (running, ending
 * soon, ended, fee due, frozen, never joined, left), with the actions the
 * desk needs on each row: renew, take the due, WhatsApp reminder. The
 * Analytics tab shows members by plan, goal and gender.
 *
 * Keys: N new member · / search · 1-8 views · A analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlarmClock, BarChart3, Download, Dumbbell, GraduationCap, HandCoins, PauseCircle, Plus, RefreshCw, Target, UserMinus, UserPlus, Users, UserX,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PrintDoc } from '@core/print';
import {
  Avatar, Badge, Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton,
  Table, TBody, Td, Th, THead, Tr, ViewTabs, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { gymMembersApi, type GymMember, type MemberView } from '../api/members.api';
import type { Membership } from '../api/memberships.api';
import { PayModal, ReminderLink, RenewModal, SellModal, usePlans } from '../components/MembershipModals';
import { toPicked, type PickedMember } from '../components/MemberPicker';
import { EmptyList, HeroPrint, ListSkeleton, LoadFailed, Pager, Panel, RankedBars, StatTile, CardTitle } from '../components/ui';
import { GYM_KEYS, MEMBER_STATE, dateOf, daysLeft, goalLabel } from '../lib/meta';
import { useGymCan } from '../lib/permissions';
import { t as tr } from '@core/i18n';

type Tab = MemberView | 'analytics';
const VIEWS: Array<{ id: MemberView; label: string; icon: typeof Users }> = [
  { id: 'running', label: tr('Chal rahi'), icon: Dumbbell },
  { id: 'expiring', label: tr('Jald khatam'), icon: AlarmClock },
  { id: 'expired', label: tr('Khatam'), icon: UserX },
  { id: 'dues', label: tr('Fee baqi'), icon: HandCoins },
  { id: 'frozen', label: tr('Freeze'), icon: PauseCircle },
  { id: 'none', label: tr('Plan nahi'), icon: UserPlus },
  { id: 'all', label: tr('Sab'), icon: Users },
  { id: 'left', label: tr('Chhor gaye'), icon: UserMinus },
];
const PAGE = 25;

export default function MembersPage() {
  const navigate = useNavigate();
  const can = useGymCan();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('running');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [planId, setPlanId] = useState('');
  const [page, setPage] = useState(1);
  const [sell, setSell] = useState<PickedMember | null | false>(false);
  const [renew, setRenew] = useState<Membership | null>(null);
  const [pay, setPay] = useState<Membership | null>(null);
  useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => setPage(1), [tab, planId]);

  const view: MemberView = tab === 'analytics' ? 'all' : tab;
  const listQ = useQuery({
    queryKey: [GYM_KEYS.members, 'page', view, query, planId, page],
    queryFn: () => gymMembersApi.page({ view, search: query || undefined, planId: planId || undefined, page, limit: PAGE }),
    placeholderData: (p) => p,
    enabled: tab !== 'analytics',
  });
  const summaryQ = useQuery({ queryKey: [GYM_KEYS.members, 'summary'], queryFn: gymMembersApi.summary });
  const plansQ = usePlans();
  const s = summaryQ.data;
  const data = listQ.data;
  const rows = data?.items ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.members) { e.preventDefault(); navigate('/gym/members/new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'a' || e.key === 'A') setTab('analytics');
      const i = Number(e.key);
      if (i >= 1 && i <= VIEWS.length) setTab(VIEWS[i - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const viewLabel = VIEWS.find((v) => v.id === view)?.label ?? tr('Sab');
  const line = (m: GymMember) => [m.memberNumber, m.customer?.name ?? '', m.customer?.phone ?? '', m.current?.plan?.name ?? '', m.current ? dateOf(m.current.endDate) : '', MEMBER_STATE[m.state ?? 'NONE'].label, formatPKR(m.due ?? 0)];
  const printDoc = (): PrintDoc => ({
    title: tr('Members'), subtitle: viewLabel, meta: [[tr('Members'), String(data?.total ?? rows.length)]],
    sections: [{ kind: 'table', columns: [{ label: tr('Number'), wideOnly: true }, { label: tr('Naam') }, { label: tr('Phone'), wideOnly: true }, { label: tr('Plan') }, { label: tr('Khatam') }, { label: tr('Haal') }, { label: tr('Baqi'), align: 'right' }], rows: rows.map(line) }],
  });
  const exportCsv = () => downloadCsv(`gym-members-${view}.csv`, [[tr('Number'), tr('Naam'), tr('Phone'), tr('Plan'), tr('Khatam'), tr('Haal'), tr('Baqi')], ...rows.map(line)]);

  return (
    <PageShell>
      <PageHero
        title={tr('Members')}
        chip={<><Dumbbell /> {' '}{tr('Gym')}</>}
        meta={tr('Kaun chal raha hai, kis ki membership khatam ho rahi hai, kis ki fee baqi hai')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={summaryQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={!rows.length || tab === 'analytics'} />
          <button type="button" onClick={exportCsv} disabled={!rows.length} title={tr('Excel (CSV)')} className={heroIconButton}><Download className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.members && <Link to="/gym/members/new" title={tr('Naya member (N)')} className={heroPrimaryButton}><UserPlus className="h-4 w-4" /> {' '}{tr('Naya member')}</Link>}
        </>}
        stats={[
          { label: tr('Kul members'), value: s?.total ?? 0 },
          { label: tr('Is mahine aaye'), value: s?.joinedThisMonth ?? 0 },
          { label: tr('Fee baqi'), value: formatPKR(s?.duesAmount ?? 0) },
        ]}
      />

      <KpiRow cols={4}>
        {summaryQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Dumbbell} color="#16a34a" label={tr('Chal rahi')} value={s?.running ?? 0} hint={tr('Aaj andar aa sakte hain')} onClick={() => setTab('running')} active={tab === 'running'} />
          <KpiCard icon={AlarmClock} color={(s?.expiring ?? 0) ? '#d97706' : '#64748b'} label={tr('7 din me khatam')} value={s?.expiring ?? 0} hint={tr('Renew ke liye yaad dilayein')} onClick={() => setTab('expiring')} active={tab === 'expiring'} />
          <KpiCard icon={UserX} color="#e11d48" label={tr('Khatam')} value={s?.expired ?? 0} hint={tr('Wapas bulayein')} onClick={() => setTab('expired')} active={tab === 'expired'} />
          <KpiCard icon={HandCoins} color="#ca8a04" label={tr('Fee baqi')} value={formatPKR(s?.duesAmount ?? 0)} hint={tr('{{value}} memberships', { value: s?.duesCount ?? 0 })} onClick={() => setTab('dues')} active={tab === 'dues'} />
        </>}
      </KpiRow>

      {tab !== 'analytics' && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Naam, phone, CNIC, MEM number ya card…')} />}
          chips={query || planId ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {planId && <FilterChip onRemove={() => setPlanId('')}>{plansQ.data?.find((p) => p.id === planId)?.name ?? tr('Plan')}</FilterChip>}
          </> : undefined}
          onClear={() => { setSearch(''); setPlanId(''); }}>
          <FilterMenu icon={Target} label={plansQ.data?.find((p) => p.id === planId)?.name ?? tr('Plan')} value={planId} active={!!planId} onChange={setPlanId}
            options={[{ value: '', label: tr('Sab plans') }, ...(plansQ.data ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{can.members && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>1</Kbd>-<Kbd>8</Kbd> · <Kbd>A</Kbd> {' '}{tr('analytics')}</>}
        tabs={[...VIEWS.map((v) => ({ id: v.id as Tab, label: v.label, icon: v.icon, count: data?.counts?.[v.id] ?? null })), { id: 'analytics' as Tab, label: tr('Analytics'), icon: BarChart3 }]} />

      {tab === 'analytics' ? <Analytics /> : listQ.isLoading ? <ListSkeleton /> : listQ.isError ? <LoadFailed what={tr('Members')} retry={() => listQ.refetch()} /> : !rows.length ? (
        <EmptyList icon={Users} title={query ? tr('Is search me koi nahi') : tr('{{viewLabel}}: koi member nahi', { viewLabel })} text={tr('Naya member banayein: naam, phone, CNIC aur plan. Fee ka bill Sales me jata hai, baqi khate me.')}>
          {can.members && <Button onClick={() => navigate('/gym/members/new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya member')}</Button>}
        </EmptyList>
      ) : (
        <>
          <Panel>
            <Table minWidth="52rem">
              <THead><Tr><Th>{tr('Member')}</Th><Th>{tr('Plan')}</Th><Th>{tr('Khatam')}</Th><Th align="right">{tr('Baqi fee')}</Th><Th>{tr('Aakhri visit')}</Th><Th /></Tr></THead>
              <TBody>
                {rows.map((m) => {
                  const st = MEMBER_STATE[m.state ?? 'NONE'];
                  const cur = m.current ? { ...m.current, member: { id: m.id, memberNumber: m.memberNumber, customerId: m.customerId, customer: m.customer } } : null;
                  const left = cur ? daysLeft(cur.endDate) : 0;
                  return (
                    <Tr key={m.id} interactive onClick={() => navigate(`/gym/members/${m.id}`)}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={m.customer?.name ?? m.memberNumber} url={m.photoUrl} size={36} />
                          <div className="min-w-0"><p className="truncate font-medium text-slate-900">{m.customer?.name ?? '—'}</p><p className="truncate text-[0.75rem] text-slate-500">{m.memberNumber}{m.customer?.phone ? ` · ${m.customer.phone}` : ''}</p></div>
                        </div>
                      </Td>
                      <Td>{cur?.plan?.name ?? <span className="text-slate-400">—</span>}<p className="text-[0.75rem] text-slate-500">{goalLabel(m.primaryGoal)}</p></Td>
                      <Td>
                        {cur ? dateOf(cur.endDate) : '—'}
                        <div><Badge size="xs" variant={st.variant}>{m.state === 'ACTIVE' || m.state === 'EXPIRING' ? tr('{{left}} din baqi', { left }) : st.label}</Badge></div>
                      </Td>
                      <Td align="right" className="tabular-nums">{(m.due ?? 0) > 0 ? <span className="font-semibold text-amber-700">{formatPKR(m.due ?? 0)}</span> : <span className="text-slate-400">—</span>}</Td>
                      <Td>{m.lastVisitAt ? dateOf(m.lastVisitAt) : '—'}<p className="text-[0.75rem] text-slate-500">{tr('{{totalVisits}} visits', { totalVisits: m.totalVisits })}</p></Td>
                      <Td align="right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {cur && ['EXPIRING', 'EXPIRED'].includes(m.state ?? '') && <ReminderLink membership={cur} compact />}
                          {can.bill && cur && cur.totalPrice - cur.paidAmount > 0.01 && cur.status !== 'CANCELLED' && <Button size="sm" variant="secondary" onClick={() => setPay(cur)}>{tr('Fee lein')}</Button>}
                          {can.bill && cur && m.isActive && <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setRenew(cur)}>{tr('Renew')}</Button>}
                          {can.bill && !cur && m.isActive && <Button size="sm" onClick={() => setSell(toPicked(m))}>{tr('Plan bechein')}</Button>}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </Panel>
          <Pager page={data?.page ?? 1} pages={data?.pages ?? 1} onPage={setPage} />
        </>
      )}

      {sell !== false && <SellModal member={sell} onClose={() => setSell(false)} />}
      {renew && <RenewModal membership={renew} onClose={() => setRenew(null)} />}
      {pay && <PayModal membership={pay} onClose={() => setPay(null)} />}

      {guide.isOpen && (
        <PageGuide title={tr('Members — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: UserPlus, color: '#2563eb', title: tr('Naya member'), text: tr('Naam, phone, CNIC, emergency contact aur photo. Sath hi plan chunein aur jo paisa mila likhein — baqi khate me udhaar.') },
            { icon: AlarmClock, color: '#d97706', title: tr('Jald khatam'), text: tr('7 din me khatam hone wali memberships. WhatsApp ka button dabayein — yaad dihani ka message tayyar milta hai.') },
            { icon: RefreshCw, color: '#16a34a', title: tr('Renew'), text: tr('Renew pichli membership ke baad se shuru hota hai, is liye jaldi renew karne wale ka koi din zaya nahi hota. Admission dobara nahi lagti.') },
            { icon: HandCoins, color: '#ca8a04', title: tr('Fee baqi'), text: tr('"Fee lein" se baqi paisa lein. Cash drawer me, JazzCash ya bank apne account me ginta hai.') },
          ]}
          shortcuts={[['N', tr('naya member')], ['/', 'dhoondein'], ['1-8', 'views'], ['A', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Analytics() {
  const q = useQuery({ queryKey: [GYM_KEYS.members, 'summary'], queryFn: gymMembersApi.summary });
  const s = q.data;
  if (q.isLoading) return <ListSkeleton />;
  if (!s) return <LoadFailed what={tr('Analytics')} retry={() => q.refetch()} />;
  const gender = (g: string) => (g === 'MALE' ? tr('Mard') : g === 'FEMALE' ? tr('Aurat') : tr('Maloom nahi'));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label={tr('Kul members')} value={s.total} sub={tr('{{joinedThisMonth}} is mahine', { joinedThisMonth: s.joinedThisMonth })} />
        <StatTile icon={Dumbbell} label={tr('Chal rahi')} value={s.running} sub={s.total ? tr('{{value}}% members', { value: Math.round((s.running / s.total) * 100) }) : undefined} tone="green" />
        <StatTile icon={UserX} label={tr('Khatam')} value={s.expired} sub={tr('Wapas bulane ka mauqa')} tone="rose" />
        <StatTile icon={HandCoins} label={tr('Fee baqi')} value={formatPKR(s.duesAmount)} sub={tr('{{duesCount}} memberships', { duesCount: s.duesCount })} tone="amber" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-4"><p className="mb-3 font-semibold text-slate-900"><CardTitle icon={Target}>{tr('Plan ke hisaab se')}</CardTitle></p>
          <RankedBars rows={s.byPlan.map((p) => ({ key: p.planId, label: p.name, value: p.count, display: p.count }))} empty={tr('Koi chalti membership nahi')} /></Panel>
        <Panel className="p-4"><p className="mb-3 font-semibold text-slate-900"><CardTitle icon={Dumbbell}>{tr('Maqsad')}</CardTitle></p>
          <RankedBars rows={s.byGoal.map((g) => ({ key: g.primaryGoal, label: goalLabel(g.primaryGoal), value: g._count._all, display: g._count._all }))} /></Panel>
        <Panel className="p-4"><p className="mb-3 font-semibold text-slate-900"><CardTitle icon={Users}>{tr('Mard / aurat')}</CardTitle></p>
          <RankedBars rows={s.byGender.map((g) => ({ key: g.gender, label: gender(g.gender), value: g.count, display: g.count }))} /></Panel>
      </div>
    </div>
  );
}
