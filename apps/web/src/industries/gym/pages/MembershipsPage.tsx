/**
 * Memberships: every card sold, by state (running, ending soon, ended,
 * fee due, frozen, starting later, cancelled), with totals for the view
 * and the row actions: renew, take the due, freeze or unfreeze, cancel and
 * the WhatsApp reminder. Selling one posts a bill in Sales.
 *
 * Keys: N sell · / search · 1-8 views · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlarmClock, Award, Ban, CalendarClock, Download, GraduationCap, HandCoins, ListChecks, MessageCircle, PauseCircle, PlayCircle, Plus, RefreshCw, Target, UserX } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PrintDoc } from '@core/print';
import {
  Badge, Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton,
  Table, TBody, Td, Th, THead, Tr, ViewTabs, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { membershipsApi, type Membership, type MembershipView } from '../api/memberships.api';
import { CancelModal, FreezeModal, PayModal, ReminderLink, RenewModal, SellModal, usePlans } from '../components/MembershipModals';
import { EmptyList, HeroPrint, ListSkeleton, LoadFailed, Pager, Panel, TotalsStrip } from '../components/ui';
import { GYM_KEYS, MEMBERSHIP_STATUS, apiError, dateOf, daysLeft } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

const VIEWS: Array<{ id: MembershipView; label: string; icon: typeof Award }> = [
  { id: 'running', label: 'Chal rahi', icon: Award },
  { id: 'expiring', label: 'Jald khatam', icon: AlarmClock },
  { id: 'expired', label: 'Khatam', icon: UserX },
  { id: 'dues', label: 'Fee baqi', icon: HandCoins },
  { id: 'frozen', label: 'Freeze', icon: PauseCircle },
  { id: 'upcoming', label: 'Aage shuru', icon: CalendarClock },
  { id: 'cancelled', label: 'Cancel', icon: Ban },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const PAGE = 25;
type Action = { kind: 'renew' | 'pay' | 'freeze' | 'cancel'; m: Membership };

export default function MembershipsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const can = useGymCan();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<MembershipView>('running');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [planId, setPlanId] = useState('');
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [selling, setSelling] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => setPage(1), [view, planId, days]);

  const listQ = useQuery({
    queryKey: [GYM_KEYS.memberships, 'page', view, query, planId, days, page],
    queryFn: () => membershipsApi.page({ view, search: query || undefined, planId: planId || undefined, expiringDays: days, page, limit: PAGE }),
    placeholderData: (p) => p,
  });
  const plansQ = usePlans();
  const data = listQ.data;
  const rows = data?.items ?? [];
  const c = data?.counts;

  const unfreeze = useMutation({
    mutationFn: (id: string) => membershipsApi.unfreeze(id),
    onSuccess: (r) => { toast.success(`Freeze khatam — ab ${dateOf(r.endDate)} tak`); qc.invalidateQueries({ queryKey: [GYM_KEYS.memberships] }); qc.invalidateQueries({ queryKey: [GYM_KEYS.members] }); },
    onError: (e) => toast.error(apiError(e, 'Unfreeze nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.bill) { e.preventDefault(); setSelling(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const i = Number(e.key);
      if (i >= 1 && i <= VIEWS.length) setView(VIEWS[i - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const label = VIEWS.find((v) => v.id === view)?.label ?? '';
  const line = (m: Membership) => [m.membershipNumber, m.member?.customer?.name ?? '', m.member?.customer?.phone ?? '', m.plan?.name ?? '', dateOf(m.startDate), dateOf(m.endDate), formatPKR(m.totalPrice), formatPKR(m.paidAmount), formatPKR(Math.max(m.totalPrice - m.paidAmount, 0))];
  const head = ['Number', 'Member', 'Phone', 'Plan', 'Shuru', 'Khatam', 'Kul', 'Mila', 'Baqi'];
  const printDoc = (): PrintDoc => ({
    title: 'Memberships', subtitle: label,
    meta: [['Kul', String(data?.total ?? 0)], ['Qeemat', formatPKR(data?.totals.price ?? 0)], ['Baqi', formatPKR(data?.totals.due ?? 0)]],
    sections: [{ kind: 'table', columns: head.map((h, i) => ({ label: h, align: i >= 6 ? 'right' as const : undefined, wideOnly: i === 0 || i === 2 || i === 4 })), rows: rows.map(line) }],
  });

  return (
    <PageShell>
      <PageHero
        title="Memberships"
        chip={<><Award /> Gym</>}
        meta="Renewal, baqi fee aur freeze — sab ek jagah"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={!rows.length} />
          <button type="button" onClick={() => downloadCsv(`gym-memberships-${view}.csv`, [head, ...rows.map(line)])} disabled={!rows.length} title="Excel (CSV)" className={heroIconButton}><Download className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.bill && <button type="button" onClick={() => setSelling(true)} title="Membership bechein (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Membership bechein</button>}
        </>}
        stats={[
          { label: 'Chal rahi', value: c?.running ?? 0 },
          { label: `${days} din me khatam`, value: c?.expiring ?? 0 },
          { label: 'Fee baqi', value: c?.dues ?? 0 },
        ]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Award} color="#16a34a" label="Chal rahi" value={c?.running ?? 0} hint="Aaj andar aa sakte hain" onClick={() => setView('running')} active={view === 'running'} />
          <KpiCard icon={AlarmClock} color={(c?.expiring ?? 0) ? '#d97706' : '#64748b'} label="Jald khatam" value={c?.expiring ?? 0} hint="WhatsApp se yaad dilayein" onClick={() => setView('expiring')} active={view === 'expiring'} />
          <KpiCard icon={UserX} color="#e11d48" label="Khatam" value={c?.expired ?? 0} hint="Renew nahi hui" onClick={() => setView('expired')} active={view === 'expired'} />
          <KpiCard icon={HandCoins} color="#ca8a04" label="Fee baqi" value={c?.dues ?? 0} hint="Memberships par udhaar" onClick={() => setView('dues')} active={view === 'dues'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Member ka naam, phone, MEM ya membership number…" />}
        chips={query || planId ? <>
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          {planId && <FilterChip onRemove={() => setPlanId('')}>{plansQ.data?.find((p) => p.id === planId)?.name ?? 'Plan'}</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setPlanId(''); }}>
        <FilterMenu icon={Target} label={plansQ.data?.find((p) => p.id === planId)?.name ?? 'Plan'} value={planId} active={!!planId} onChange={setPlanId}
          options={[{ value: '', label: 'Sab plans' }, ...(plansQ.data ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterMenu icon={AlarmClock} label={`${days} din`} value={String(days)} active={days !== 7} onChange={(v) => setDays(Number(v))}
          options={[3, 7, 15, 30].map((d) => ({ value: String(d), label: `${d} din me khatam` }))} />
      </FilterBar>

      <ViewTabs value={view} onChange={setView} hint={<>{can.bill && <><Kbd>N</Kbd> bechein · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>8</Kbd></>}
        tabs={VIEWS.map((v) => ({ id: v.id, label: v.label, icon: v.icon, count: c?.[v.id] ?? null }))} />

      {data && rows.length > 0 && (
        <TotalsStrip>
          <span><b className="tabular-nums">{data.total}</b> memberships</span>
          <span>Qeemat <b className="tabular-nums">{formatPKR(data.totals.price)}</b></span>
          <span>Mila <b className="tabular-nums text-success-700">{formatPKR(data.totals.paid)}</b></span>
          <span>Baqi <b className="tabular-nums text-amber-700">{formatPKR(data.totals.due)}</b></span>
        </TotalsStrip>
      )}

      {listQ.isLoading ? <ListSkeleton /> : listQ.isError ? <LoadFailed what="Memberships" retry={() => listQ.refetch()} /> : !rows.length ? (
        <EmptyList icon={Award} title={query ? 'Is search me koi nahi' : `${label}: kuch nahi`} text="Member ko plan bechein. Bill Sales me jata hai; jo paisa abhi na mile woh khate me udhaar.">
          {can.bill && <Button onClick={() => setSelling(true)} leftIcon={<Plus className="h-4 w-4" />}>Membership bechein</Button>}
        </EmptyList>
      ) : (
        <>
          <Panel>
            <Table minWidth="56rem">
              <THead><Tr><Th>Member</Th><Th>Plan</Th><Th>Muddat</Th><Th align="right">Kul / mila</Th><Th align="right">Baqi</Th><Th /></Tr></THead>
              <TBody>
                {rows.map((m) => {
                  const due = Math.max(m.totalPrice - m.paidAmount, 0);
                  const left = daysLeft(m.endDate);
                  const st = MEMBERSHIP_STATUS[m.status];
                  const running = ['ACTIVE', 'FROZEN'].includes(m.status) && left >= 0;
                  return (
                    <Tr key={m.id} interactive onClick={() => m.member && navigate(`/gym/members/${m.member.id}`)}>
                      <Td><p className="font-medium text-slate-900">{m.member?.customer?.name ?? '—'}</p><p className="text-[0.75rem] text-slate-500">{m.member?.memberNumber} · {m.membershipNumber}</p></Td>
                      <Td>{m.plan?.name}{m.visitsRemaining != null && <p className="text-[0.75rem] text-slate-500">{m.visitsRemaining} visits baqi</p>}</Td>
                      <Td>
                        {dateOf(m.startDate)} – {dateOf(m.endDate)}
                        <div className="flex gap-1">
                          <Badge size="xs" variant={running && m.status === 'ACTIVE' ? (left <= 7 ? 'warning' : 'success') : st.variant}>{running && m.status === 'ACTIVE' ? `${left} din baqi` : m.status === 'ACTIVE' ? 'Khatam' : st.label}</Badge>
                          {m.renewalReminded && <Badge size="xs" variant="ghost"><MessageCircle className="h-3 w-3" /> yaad dilaya</Badge>}
                        </div>
                      </Td>
                      <Td align="right" className="tabular-nums">{formatPKR(m.totalPrice)}<p className="text-[0.75rem] text-slate-500">{formatPKR(m.paidAmount)} mila</p></Td>
                      <Td align="right" className="tabular-nums">{due > 0.01 && m.status !== 'CANCELLED' ? <span className="font-semibold text-amber-700">{formatPKR(due)}</span> : '—'}</Td>
                      <Td align="right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {m.status !== 'CANCELLED' && (view === 'expiring' || view === 'expired' || view === 'dues') && <ReminderLink membership={m} compact />}
                          {can.bill && due > 0.01 && m.status !== 'CANCELLED' && <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'pay', m })}>Fee lein</Button>}
                          {can.bill && m.status !== 'CANCELLED' && <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setAction({ kind: 'renew', m })}>Renew</Button>}
                          {can.members && m.status === 'ACTIVE' && running && m.plan?.allowFreeze && <Button size="sm" variant="ghost" leftIcon={<PauseCircle className="h-3.5 w-3.5" />} onClick={() => setAction({ kind: 'freeze', m })}>Freeze</Button>}
                          {can.members && m.status === 'FROZEN' && <Button size="sm" variant="ghost" leftIcon={<PlayCircle className="h-3.5 w-3.5" />} loading={unfreeze.isPending && unfreeze.variables === m.id} onClick={() => unfreeze.mutate(m.id)}>Unfreeze</Button>}
                          {can.members && m.status !== 'CANCELLED' && <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'cancel', m })}>Cancel</Button>}
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

      {selling && <SellModal onClose={() => setSelling(false)} />}
      {action?.kind === 'renew' && <RenewModal membership={action.m} onClose={() => setAction(null)} />}
      {action?.kind === 'pay' && <PayModal membership={action.m} onClose={() => setAction(null)} />}
      {action?.kind === 'freeze' && <FreezeModal membership={action.m} onClose={() => setAction(null)} />}
      {action?.kind === 'cancel' && <CancelModal membership={action.m} onClose={() => setAction(null)} />}

      {guide.isOpen && (
        <PageGuide title="Memberships — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Bechna', text: 'Member aur plan chunein, jo paisa mila likhein. Pehli dafa admission lagti hai. Bill Sales me, baqi paisa khate me udhaar.' },
            { icon: AlarmClock, color: '#d97706', title: 'Jald khatam', text: 'In ko WhatsApp se yaad dilayein. Jis ko paigham gaya us par "yaad dilaya" ka nishan lag jata hai.' },
            { icon: PauseCircle, color: '#2563eb', title: 'Freeze', text: 'Plan me freeze ki ijazat ho to din rok sakte hain. Khatam ki date utne din aage chali jati hai. Jaldi wapas aaye to Unfreeze — bache din wapas mil jate hain.' },
            { icon: Ban, color: '#e11d48', title: 'Cancel aur wapas paisa', text: 'Cancel sirf membership band karta hai. Paisa wapas karne ke liye Sales me us ka bill Return ya Void karein — membership khud cancel ho jati hai.' },
          ]}
          shortcuts={[['N', 'bechein'], ['/', 'dhoondein'], ['1-8', 'views'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
