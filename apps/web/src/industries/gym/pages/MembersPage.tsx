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

type Tab = MemberView | 'analytics';
const VIEWS: Array<{ id: MemberView; label: string; icon: typeof Users }> = [
  { id: 'running', label: 'Chal rahi', icon: Dumbbell },
  { id: 'expiring', label: 'Jald khatam', icon: AlarmClock },
  { id: 'expired', label: 'Khatam', icon: UserX },
  { id: 'dues', label: 'Fee baqi', icon: HandCoins },
  { id: 'frozen', label: 'Freeze', icon: PauseCircle },
  { id: 'none', label: 'Plan nahi', icon: UserPlus },
  { id: 'all', label: 'Sab', icon: Users },
  { id: 'left', label: 'Chhor gaye', icon: UserMinus },
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

  const viewLabel = VIEWS.find((v) => v.id === view)?.label ?? 'Sab';
  const line = (m: GymMember) => [m.memberNumber, m.customer?.name ?? '', m.customer?.phone ?? '', m.current?.plan?.name ?? '', m.current ? dateOf(m.current.endDate) : '', MEMBER_STATE[m.state ?? 'NONE'].label, formatPKR(m.due ?? 0)];
  const printDoc = (): PrintDoc => ({
    title: 'Members', subtitle: viewLabel, meta: [['Members', String(data?.total ?? rows.length)]],
    sections: [{ kind: 'table', columns: [{ label: 'Number', wideOnly: true }, { label: 'Naam' }, { label: 'Phone', wideOnly: true }, { label: 'Plan' }, { label: 'Khatam' }, { label: 'Haal' }, { label: 'Baqi', align: 'right' }], rows: rows.map(line) }],
  });
  const exportCsv = () => downloadCsv(`gym-members-${view}.csv`, [['Number', 'Naam', 'Phone', 'Plan', 'Khatam', 'Haal', 'Baqi'], ...rows.map(line)]);

  return (
    <PageShell>
      <PageHero
        title="Members"
        chip={<><Dumbbell /> Gym</>}
        meta="Kaun chal raha hai, kis ki membership khatam ho rahi hai, kis ki fee baqi hai"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={summaryQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={!rows.length || tab === 'analytics'} />
          <button type="button" onClick={exportCsv} disabled={!rows.length} title="Excel (CSV)" className={heroIconButton}><Download className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.members && <Link to="/gym/members/new" title="Naya member (N)" className={heroPrimaryButton}><UserPlus className="h-4 w-4" /> Naya member</Link>}
        </>}
        stats={[
          { label: 'Kul members', value: s?.total ?? 0 },
          { label: 'Is mahine aaye', value: s?.joinedThisMonth ?? 0 },
          { label: 'Fee baqi', value: formatPKR(s?.duesAmount ?? 0) },
        ]}
      />

      <KpiRow cols={4}>
        {summaryQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Dumbbell} color="#16a34a" label="Chal rahi" value={s?.running ?? 0} hint="Aaj andar aa sakte hain" onClick={() => setTab('running')} active={tab === 'running'} />
          <KpiCard icon={AlarmClock} color={(s?.expiring ?? 0) ? '#d97706' : '#64748b'} label="7 din me khatam" value={s?.expiring ?? 0} hint="Renew ke liye yaad dilayein" onClick={() => setTab('expiring')} active={tab === 'expiring'} />
          <KpiCard icon={UserX} color="#e11d48" label="Khatam" value={s?.expired ?? 0} hint="Wapas bulayein" onClick={() => setTab('expired')} active={tab === 'expired'} />
          <KpiCard icon={HandCoins} color="#ca8a04" label="Fee baqi" value={formatPKR(s?.duesAmount ?? 0)} hint={`${s?.duesCount ?? 0} memberships`} onClick={() => setTab('dues')} active={tab === 'dues'} />
        </>}
      </KpiRow>

      {tab !== 'analytics' && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone, CNIC, MEM number ya card…" />}
          chips={query || planId ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {planId && <FilterChip onRemove={() => setPlanId('')}>{plansQ.data?.find((p) => p.id === planId)?.name ?? 'Plan'}</FilterChip>}
          </> : undefined}
          onClear={() => { setSearch(''); setPlanId(''); }}>
          <FilterMenu icon={Target} label={plansQ.data?.find((p) => p.id === planId)?.name ?? 'Plan'} value={planId} active={!!planId} onChange={setPlanId}
            options={[{ value: '', label: 'Sab plans' }, ...(plansQ.data ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{can.members && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>8</Kbd> · <Kbd>A</Kbd> analytics</>}
        tabs={[...VIEWS.map((v) => ({ id: v.id as Tab, label: v.label, icon: v.icon, count: data?.counts?.[v.id] ?? null })), { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? <Analytics /> : listQ.isLoading ? <ListSkeleton /> : listQ.isError ? <LoadFailed what="Members" retry={() => listQ.refetch()} /> : !rows.length ? (
        <EmptyList icon={Users} title={query ? 'Is search me koi nahi' : `${viewLabel}: koi member nahi`} text="Naya member banayein: naam, phone, CNIC aur plan. Fee ka bill Sales me jata hai, baqi khate me.">
          {can.members && <Button onClick={() => navigate('/gym/members/new')} leftIcon={<Plus className="h-4 w-4" />}>Naya member</Button>}
        </EmptyList>
      ) : (
        <>
          <Panel>
            <Table minWidth="52rem">
              <THead><Tr><Th>Member</Th><Th>Plan</Th><Th>Khatam</Th><Th align="right">Baqi fee</Th><Th>Aakhri visit</Th><Th /></Tr></THead>
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
                        <div><Badge size="xs" variant={st.variant}>{m.state === 'ACTIVE' || m.state === 'EXPIRING' ? `${left} din baqi` : st.label}</Badge></div>
                      </Td>
                      <Td align="right" className="tabular-nums">{(m.due ?? 0) > 0 ? <span className="font-semibold text-amber-700">{formatPKR(m.due ?? 0)}</span> : <span className="text-slate-400">—</span>}</Td>
                      <Td>{m.lastVisitAt ? dateOf(m.lastVisitAt) : '—'}<p className="text-[0.75rem] text-slate-500">{m.totalVisits} visits</p></Td>
                      <Td align="right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {cur && ['EXPIRING', 'EXPIRED'].includes(m.state ?? '') && <ReminderLink membership={cur} compact />}
                          {can.bill && cur && cur.totalPrice - cur.paidAmount > 0.01 && cur.status !== 'CANCELLED' && <Button size="sm" variant="secondary" onClick={() => setPay(cur)}>Fee lein</Button>}
                          {can.bill && cur && m.isActive && <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setRenew(cur)}>Renew</Button>}
                          {can.bill && !cur && m.isActive && <Button size="sm" onClick={() => setSell(toPicked(m))}>Plan bechein</Button>}
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
        <PageGuide title="Members — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserPlus, color: '#2563eb', title: 'Naya member', text: 'Naam, phone, CNIC, emergency contact aur photo. Sath hi plan chunein aur jo paisa mila likhein — baqi khate me udhaar.' },
            { icon: AlarmClock, color: '#d97706', title: 'Jald khatam', text: '7 din me khatam hone wali memberships. WhatsApp ka button dabayein — yaad dihani ka paigham tayyar milta hai.' },
            { icon: RefreshCw, color: '#16a34a', title: 'Renew', text: 'Renew pichli membership ke baad se shuru hota hai, is liye jaldi renew karne wale ka koi din zaya nahi hota. Admission dobara nahi lagti.' },
            { icon: HandCoins, color: '#ca8a04', title: 'Fee baqi', text: '"Fee lein" se baqi paisa lein. Cash drawer me, JazzCash ya bank apne account me ginta hai.' },
          ]}
          shortcuts={[['N', 'naya member'], ['/', 'dhoondein'], ['1-8', 'views'], ['A', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Analytics() {
  const q = useQuery({ queryKey: [GYM_KEYS.members, 'summary'], queryFn: gymMembersApi.summary });
  const s = q.data;
  if (q.isLoading) return <ListSkeleton />;
  if (!s) return <LoadFailed what="Analytics" retry={() => q.refetch()} />;
  const gender = (g: string) => (g === 'MALE' ? 'Mard' : g === 'FEMALE' ? 'Aurat' : 'Maloom nahi');
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Users} label="Kul members" value={s.total} sub={`${s.joinedThisMonth} is mahine`} />
        <StatTile icon={Dumbbell} label="Chal rahi" value={s.running} sub={s.total ? `${Math.round((s.running / s.total) * 100)}% members` : undefined} tone="green" />
        <StatTile icon={UserX} label="Khatam" value={s.expired} sub="Wapas bulane ka mauqa" tone="rose" />
        <StatTile icon={HandCoins} label="Fee baqi" value={formatPKR(s.duesAmount)} sub={`${s.duesCount} memberships`} tone="amber" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-4"><p className="mb-3 font-semibold text-slate-900"><CardTitle icon={Target}>Plan ke hisaab se</CardTitle></p>
          <RankedBars rows={s.byPlan.map((p) => ({ key: p.planId, label: p.name, value: p.count, display: p.count }))} empty="Koi chalti membership nahi" /></Panel>
        <Panel className="p-4"><p className="mb-3 font-semibold text-slate-900"><CardTitle icon={Dumbbell}>Maqsad</CardTitle></p>
          <RankedBars rows={s.byGoal.map((g) => ({ key: g.primaryGoal, label: goalLabel(g.primaryGoal), value: g._count._all, display: g._count._all }))} /></Panel>
        <Panel className="p-4"><p className="mb-3 font-semibold text-slate-900"><CardTitle icon={Users}>Mard / aurat</CardTitle></p>
          <RankedBars rows={s.byGender.map((g) => ({ key: g.gender, label: gender(g.gender), value: g.count, display: g.count }))} /></Panel>
      </div>
    </div>
  );
}
