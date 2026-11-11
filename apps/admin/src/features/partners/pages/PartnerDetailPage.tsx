/**
 * Partner 360: one partner's profile, numbers against target, balance, and
 * tabs for their shops, leads, visits, earnings, payouts, targets and team,
 * with the admin actions (approve, suspend, reset password, sign out, edit,
 * adjust balance), each shown only to admins allowed to use it.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity, AlertTriangle, Banknote, CheckCircle2, CircleAlert, ClipboardList, KeyRound, Lightbulb, LogOut, MapPin, Pencil, PlusCircle, Store, Target, UserCheck, Users, Wallet, XCircle,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Alert, Button, Card, EmptyState, FilterBar, FilterMenu, Input, PageHero, PageShell, SearchField, Skeleton, Table, TBody, Td, Th, THead, Tr, ViewTabs, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { adminPartnersApi, type PartnerDetail, type PartnerNumbers } from '@/api/admin-partners.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { formatDate, formatDateTime, formatPKR, formatPKRFull, formatRelative, num } from '@/lib/format';
import { DetailList, LastSeen, ListCard, StatusBadge, statusLabel, useListParams } from '@/ui';
import { LEAD_STAGES, SOURCE_LABEL, STAGE_LABEL, STAGE_TONE, TYPE_LABEL, currentMonth, methodLabel, monthLabel } from '../lib/partner-text';
import { AdjustmentModal } from '../components/AdjustmentModal';
import { EarningsTable } from '../components/EarningsTable';
import { LeadsTable } from '../components/LeadsTable';
import { PartnerFormModal } from '../components/PartnerFormModal';
import { PayoutsTable } from '../components/PayoutsTable';
import { ReasonModal } from '../components/ReasonModal';
import { TempPasswordModal } from '../components/TempPasswordModal';
import { VisitsTable } from '../components/VisitsTable';

type Tab = 'overview' | 'shops' | 'leads' | 'visits' | 'earnings' | 'payouts' | 'targets' | 'team';
type ListState = ReturnType<typeof useListParams<{ tab: string; filter: string }>>;

function Progress({ label, value, target }: { label: string; value: number; target?: number | null }) {
  const pct = target ? Math.min(100, Math.round((value / target) * 100)) : null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-900"><b>{num(value)}</b>{target ? <span className="text-slate-500"> / {num(target)}</span> : null}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', pct == null ? 'bg-slate-300' : pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-brand-500' : 'bg-amber-500')} style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  );
}

function NumbersGrid({ n }: { n: PartnerNumbers }) {
  const items: Array<[string, string]> = [
    ['Visits', num(n.visits)], ['Leads added', num(n.leads)], ['Signed up', num(n.signups)],
    ['Activated', num(n.activations)], ['Paid', num(n.paid)], ['Earned', formatPKRFull(n.earned)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          <dt className="text-[0.75rem] text-slate-500">{label}</dt>
          <dd className="text-[1rem] font-bold tabular-nums text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function OverviewTab({ p, canManage, canPay, onAdjust }: { p: PartnerDetail; canManage: boolean; canPay: boolean; onAdjust: () => void }) {
  const b = p.balances;
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        {p.status === 'APPLIED' && <Alert tone="warning" title="Waiting for approval">They can sign in but only see “under review” until you approve them.</Alert>}
        {p.status === 'REJECTED' && <Alert tone="danger" title="Application rejected">{p.rejectReason ?? 'No reason given.'}</Alert>}
        {p.status === 'SUSPENDED' && <Alert tone="danger" title="Suspended">They cannot use the partner portal and earn nothing new until you reactivate them.</Alert>}
        {!!p.flaggedOpen && (
          <Alert tone="warning" title={`${num(p.flaggedOpen)} flagged visits to check`} action={<Link to={`/partners/visits?partner=${p.id}&flagged=1&review=none`} className="text-[0.8125rem] font-semibold text-amber-800 hover:underline">Review</Link>}>
            Some visits failed a location or time check.
          </Alert>
        )}
        <Card title={`This month (${monthLabel(p.month)})`} description={p.target ? 'Against the target you set.' : 'No target set for this month. Set one in the Targets tab.'}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Progress label="Visits" value={p.thisMonth.visits} target={p.target?.visits} />
            <Progress label="Signups" value={p.thisMonth.signups} target={p.target?.signups} />
            <Progress label="Activations" value={p.thisMonth.activations} target={p.target?.activations} />
          </div>
          <div className="mt-4"><NumbersGrid n={p.thisMonth} /></div>
        </Card>
        <Card title="Profile">
          <DetailList cols={3} items={[
            { label: 'Partner code', value: <code className="font-semibold">{p.code}</code> },
            { label: 'Type', value: TYPE_LABEL[p.type] },
            { label: 'Area manager', value: p.isManager ? `Yes · ${num(p.team.length)} in team` : 'No' },
            { label: 'Mobile', value: p.phone },
            { label: 'Email', value: p.email },
            { label: 'CNIC', value: p.cnic },
            { label: 'City', value: p.city },
            { label: 'Territory', value: p.territory },
            { label: 'Reports to', value: p.manager ? <Link to={`/partners/${p.manager.id}`} className="text-brand-700 hover:underline">{p.manager.fullName}</Link> : null },
            { label: 'Commission plan', value: <Link to="/partners/plans" className="text-brand-700 hover:underline">{p.plan.name}{p.usesDefaultPlan ? ' (default)' : ''}</Link> },
            { label: 'Earns commission', value: p.incentivesOn ? 'Yes' : 'No (switched off)' },
            { label: 'Monthly salary', value: p.salary != null ? `${formatPKRFull(p.salary)} (paid outside Nafaa)` : null, hidden: p.type !== 'EMPLOYEE' },
            { label: 'Payout to', value: p.payoutMethod ? `${methodLabel(p.payoutMethod)}${p.bankName ? ` · ${p.bankName}` : ''}` : 'Not set' },
            { label: 'Account', value: p.payoutAccount ? <span className="font-mono">{p.payoutAccount}</span> : null },
            { label: 'Account title', value: p.payoutTitle },
            { label: 'Applied', value: formatDateTime(p.appliedAt) },
            { label: 'Approved', value: p.approvedAt ? `${formatDateTime(p.approvedAt)}${p.approvedByName ? ` by ${p.approvedByName}` : ''}` : null },
          ]} />
          {p.notes && <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-100"><b>Notes:</b> {p.notes}</div>}
        </Card>
        <Card title="All time"><NumbersGrid n={p.allTime} /></Card>
      </div>
      <div className="space-y-4">
        <Card title="Balance" description="Commission is paid by hand outside Nafaa."
          actions={canManage ? <Button size="sm" variant="outline" leftIcon={<PlusCircle className="h-3.5 w-3.5" />} onClick={onAdjust}>Adjust</Button> : undefined}>
          <dl className="space-y-2 text-[0.875rem]">
            {([
              ['On hold', b.pending, 'Waiting for the hold period to end'],
              ['Available', b.available, 'Can be requested now'],
              ['In payout requests', b.requested, canPay ? 'Waiting for you to pay' : 'Waiting for payment'],
              ['Paid so far', b.paid, null],
              ['Reversed', b.reversed, null],
            ] as Array<[string, number, string | null]>).map(([label, amount, hint]) => (
              <div key={label} className="flex items-start justify-between gap-3">
                <dt><span className="text-slate-700">{label}</span>{hint && <span className="block text-[0.6875rem] text-slate-400">{hint}</span>}</dt>
                <dd className={cn('font-semibold tabular-nums', amount < 0 ? 'text-rose-700' : 'text-slate-900')}>{formatPKRFull(amount)}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2"><dt className="font-semibold text-slate-900">Owed now</dt><dd className="text-[1.0625rem] font-bold tabular-nums text-slate-900">{formatPKRFull(b.owed)}</dd></div>
          </dl>
        </Card>
        <Card title="Sign-in">
          <DetailList items={[
            { label: 'Signs in with', value: `${p.phone}${p.email ? ` or ${p.email}` : ''}` },
            { label: 'Last seen', value: <LastSeen at={p.user.lastSeenAt ?? p.user.lastLoginAt} via={p.user.lastSeenVia} never="Never signed in" /> },
            { label: 'Last sign-in', value: p.user.lastLoginAt ? formatDateTime(p.user.lastLoginAt) : 'Never' },
            { label: 'Signed in on', value: `${num(p.user.activeSessions)} device${p.user.activeSessions === 1 ? '' : 's'}` },
          ]} />
        </Card>
        {p.isManager && p.team.length > 0 && (
          <Card title="Team" description={`${num(p.team.length)} people report to ${p.fullName}`} flush>
            <ul className="divide-y divide-slate-100">
              {p.team.slice(0, 8).map((m) => (
                <li key={m.id}><Link to={`/partners/${m.id}`} className="flex items-center gap-2 px-4 py-2.5 text-[0.8125rem] hover:bg-slate-50 sm:px-5">
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{m.fullName}</span><StatusBadge value={m.status} />
                </Link></li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function ShopsTab({ id, list }: { id: string; list: ListState }) {
  const q = useQuery({
    queryKey: ['admin', 'partner', id, 'shops', list.debouncedSearch, list.page, list.limit],
    queryFn: () => adminPartnersApi.shops(id, { search: list.debouncedSearch || undefined, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = q.data?.items ?? [];
  return (
    <div className="space-y-4">
      <FilterBar search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop name" />} />
      <ListCard loading={q.isLoading} empty={!rows.length} emptyIcon={<Store className="h-6 w-6" />} emptyTitle="No shops yet" emptyText="Shops that sign up with this partner’s code or lead show here."
        page={list.page} limit={list.limit} total={q.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
        <Table minWidth="58rem">
          <THead><Tr><Th>Shop</Th><Th>Stage</Th><Th>Plan</Th><Th>Shop status</Th><Th align="right">Payments</Th><Th align="right">Linked</Th></Tr></THead>
          <TBody>
            {rows.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <Link to={`/tenants/${t.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{t.name}</Link>
                  <div className="text-[0.75rem] text-slate-500">@{t.slug}{t.phone ? ` · ${t.phone}` : ''} · joined {formatDate(t.createdAt)}</div>
                </Td>
                <Td>{t.stage ? <StatusBadge value={t.stage} label={STAGE_LABEL[t.stage]} variant={STAGE_TONE[t.stage]} /> : <span className="text-slate-400">—</span>}</Td>
                <Td>{t.planName ?? <span className="text-slate-400">No plan</span>}{t.subscriptionStatus && <div className="text-[0.6875rem] text-slate-500">{statusLabel(t.subscriptionStatus)}</div>}</Td>
                <Td><StatusBadge value={t.status} /></Td>
                <Td align="right" className="whitespace-nowrap font-semibold">{formatPKRFull(t.paymentsTotal)}</Td>
                <Td align="right" className="whitespace-nowrap text-[0.75rem] text-slate-500">
                  {t.partnerAttributedAt ? formatDate(t.partnerAttributedAt) : '—'}
                  {t.partnerSource && <div>{SOURCE_LABEL[t.partnerSource] ?? t.partnerSource}</div>}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>
    </div>
  );
}

function LeadsTab({ id, list }: { id: string; list: ListState }) {
  const stage = list.filters.filter;
  const q = useQuery({
    queryKey: ['admin', 'partners', 'leads', id, list.debouncedSearch, stage, list.page, list.limit],
    queryFn: () => adminPartnersApi.leads({ partnerId: id, search: list.debouncedSearch || undefined, stage: stage === 'ALL' ? undefined : stage, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = q.data?.items ?? [];
  return (
    <div className="space-y-4">
      <FilterBar search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop, owner or phone" />}>
        <FilterMenu icon={ClipboardList} label="Stage" value={stage} active={stage !== 'ALL'} onChange={(v) => list.setFilter('filter', v)}
          options={[{ value: 'ALL', label: 'All stages' }, ...LEAD_STAGES.map((s) => ({ value: s, label: `${STAGE_LABEL[s]} (${num(q.data?.stages.find((x) => x.stage === s)?.count)})` }))]} />
      </FilterBar>
      <ListCard loading={q.isLoading} empty={!rows.length} emptyIcon={<ClipboardList className="h-6 w-6" />} emptyTitle="No leads" emptyText="Shops this partner adds in the portal show here."
        page={list.page} limit={list.limit} total={q.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
        <LeadsTable rows={rows} showPartner={false} />
      </ListCard>
    </div>
  );
}

function VisitsTab({ id, list, canManage }: { id: string; list: ListState; canManage: boolean }) {
  const flagged = list.filters.filter === 'flagged';
  const q = useQuery({
    queryKey: ['admin', 'partners', 'visits', id, flagged, list.page, list.limit],
    queryFn: () => adminPartnersApi.visits({ partnerId: id, flagged: flagged ? '1' : undefined, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = q.data?.items ?? [];
  return (
    <div className="space-y-4">
      <FilterBar>
        <FilterMenu icon={AlertTriangle} label="Show" value={flagged ? 'flagged' : 'ALL'} active={flagged} onChange={(v) => list.setFilter('filter', v)}
          options={[{ value: 'ALL', label: 'All visits' }, { value: 'flagged', label: `Flagged only (${num(q.data?.stats.flaggedOpen)} to check)` }]} />
      </FilterBar>
      <ListCard loading={q.isLoading} empty={!rows.length} emptyIcon={<MapPin className="h-6 w-6" />} emptyTitle="No visits" emptyText="Field visits logged in the portal show here."
        page={list.page} limit={list.limit} total={q.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
        <VisitsTable rows={rows} canManage={canManage} showPartner={false} />
      </ListCard>
    </div>
  );
}

function EarningsTab({ id, list, canManage }: { id: string; list: ListState; canManage: boolean }) {
  const status = list.filters.filter;
  const q = useQuery({
    queryKey: ['admin', 'partners', 'earnings', id, status, list.page, list.limit],
    queryFn: () => adminPartnersApi.earnings({ partnerId: id, status: status === 'ALL' ? undefined : status, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = q.data?.items ?? [];
  const total = (s: string) => q.data?.totals.find((t) => t.status === s);
  return (
    <div className="space-y-4">
      <FilterBar>
        <FilterMenu icon={Wallet} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('filter', v)}
          options={[
            { value: 'ALL', label: 'All earnings' },
            { value: 'PENDING', label: `On hold (${formatPKRFull(total('PENDING')?.amount ?? 0)})` },
            { value: 'AVAILABLE', label: 'Available (not in a payout)' },
            { value: 'PAYABLE', label: `Payable (${formatPKRFull(total('PAYABLE')?.amount ?? 0)})` },
            { value: 'PAID', label: `Paid (${formatPKRFull(total('PAID')?.amount ?? 0)})` },
            { value: 'REVERSED', label: 'Reversed' },
          ]} />
      </FilterBar>
      <ListCard loading={q.isLoading} empty={!rows.length} emptyIcon={<Wallet className="h-6 w-6" />} emptyTitle="No earnings" emptyText="Earnings appear when this partner's shops activate or pay."
        page={list.page} limit={list.limit} total={q.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
        <EarningsTable rows={rows} canManage={canManage} showPartner={false} />
      </ListCard>
    </div>
  );
}

function PayoutsTab({ id, list, canPay }: { id: string; list: ListState; canPay: boolean }) {
  const q = useQuery({
    queryKey: ['admin', 'partners', 'payouts', id, list.page, list.limit],
    queryFn: () => adminPartnersApi.payouts({ partnerId: id, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = q.data?.items ?? [];
  return (
    <ListCard loading={q.isLoading} empty={!rows.length} emptyIcon={<Banknote className="h-6 w-6" />} emptyTitle="No payouts yet" emptyText="Payout requests made in the partner portal show here."
      page={list.page} limit={list.limit} total={q.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
      <PayoutsTable rows={rows} canPay={canPay} showPartner={false} />
    </ListCard>
  );
}

function TargetsTab({ id, canManage }: { id: string; canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'partner', id, 'targets'], queryFn: () => adminPartnersApi.targets(id) });
  const [form, setForm] = useState({ month: currentMonth(), visits: '', signups: '', activations: '' });
  useEffect(() => {
    const row = q.data?.items.find((r) => r.month === form.month);
    setForm((f) => ({ ...f, visits: String(row?.target?.visits ?? ''), signups: String(row?.target?.signups ?? ''), activations: String(row?.target?.activations ?? '') }));
  }, [q.data, form.month]);
  const save = useMutation({
    mutationFn: () => adminPartnersApi.setTarget(id, form.month, { visits: Number(form.visits) || 0, signups: Number(form.signups) || 0, activations: Number(form.activations) || 0 }),
    onSuccess: () => { toast.success(`Target saved for ${monthLabel(form.month)}`); qc.invalidateQueries({ queryKey: ['admin', 'partner', id] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card title="Targets by month" description="Target and what was reached. Fake visits do not count." className="xl:col-span-2" flush>
        {q.isLoading ? <div className="p-4"><Skeleton className="h-40 rounded-2xl" /></div> : (
          <Table minWidth="36rem">
            <THead><Tr><Th>Month</Th><Th align="right">Visits</Th><Th align="right">Signups</Th><Th align="right">Activations</Th></Tr></THead>
            <TBody>
              {(q.data?.items ?? []).map((r) => {
                const cell = (a: number, t?: number) => (
                  <span className={cn('tabular-nums', t && a >= t ? 'font-semibold text-emerald-700' : 'text-slate-900')}>{num(a)}{t ? <span className="text-slate-400"> / {num(t)}</span> : null}</span>
                );
                return (
                  <Tr key={r.month} interactive={canManage} onClick={canManage ? () => setForm((f) => ({ ...f, month: r.month })) : undefined}>
                    <Td className="font-medium text-slate-900">{monthLabel(r.month)}{r.month === q.data?.currentMonth && <span className="ms-2 text-[0.6875rem] text-brand-700">this month</span>}</Td>
                    <Td align="right">{cell(r.actual.visits, r.target?.visits)}</Td>
                    <Td align="right">{cell(r.actual.signups, r.target?.signups)}</Td>
                    <Td align="right">{cell(r.actual.activations, r.target?.activations)}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
      {canManage && (
        <Card title="Set a target" description="Pick a month and the numbers to reach. The partner sees it on their dashboard.">
          <div className="space-y-3">
            <Input label="Month" type="month" value={form.month} onChange={(e) => e.target.value && setForm({ ...form, month: e.target.value })} />
            <div className="grid grid-cols-3 gap-2">
              <Input label="Visits" type="number" min={0} value={form.visits} onChange={(e) => setForm({ ...form, visits: e.target.value })} />
              <Input label="Signups" type="number" min={0} value={form.signups} onChange={(e) => setForm({ ...form, signups: e.target.value })} />
              <Input label="Activations" type="number" min={0} value={form.activations} onChange={(e) => setForm({ ...form, activations: e.target.value })} />
            </div>
            <Button className="w-full" loading={save.isPending} leftIcon={<Target className="h-4 w-4" />} onClick={() => save.mutate()}>Save target</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function TeamTab({ id, list }: { id: string; list: ListState }) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['admin', 'partners', 'list', 'team', id, list.page, list.limit],
    queryFn: () => adminPartnersApi.list({ managerId: id, sort: 'name', page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = q.data?.items ?? [];
  return (
    <ListCard loading={q.isLoading} empty={!rows.length} emptyIcon={<Users className="h-6 w-6" />} emptyTitle="No one in this team" emptyText="Set “Reports to” on a partner to add them to this team."
      page={list.page} limit={list.limit} total={q.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
      <Table minWidth="52rem">
        <THead><Tr><Th>Partner</Th><Th>Status</Th><Th align="right">Leads</Th><Th align="right">Shops</Th><Th align="right">Paid</Th><Th>Last seen</Th></Tr></THead>
        <TBody>
          {rows.map((m) => (
            <Tr key={m.id} interactive onClick={() => navigate(`/partners/${m.id}`)}>
              <Td><div className="font-semibold text-slate-900">{m.fullName}</div><div className="text-[0.75rem] text-slate-500">{TYPE_LABEL[m.type]}{m.city ? ` · ${m.city}` : ''}</div></Td>
              <Td><StatusBadge value={m.status} /></Td>
              <Td align="right">{num(m.leads)}</Td>
              <Td align="right">{num(m.signups)}</Td>
              <Td align="right" className="font-semibold">{num(m.paid)}</Td>
              <Td><LastSeen at={m.lastSeenAt} compact never="Never signed in" /></Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </ListCard>
  );
}

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const can = useCan();
  const canManage = can('partners.manage');
  const canPay = can('partners.payouts');
  const guide = usePageGuide();
  const list = useListParams({ tab: 'overview', filter: 'ALL' });
  const tab = list.filters.tab as Tab;
  const [editing, setEditing] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [password, setPassword] = useState<string | null>(null);

  const detail = useQuery({ queryKey: ['admin', 'partner', id], queryFn: () => adminPartnersApi.get(id!), enabled: !!id });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin', 'partner', id] }); qc.invalidateQueries({ queryKey: ['admin', 'partners'] }); };
  const action = useMutation({
    mutationFn: (kind: 'approve' | 'suspend' | 'reactivate') => adminPartnersApi[kind](id!),
    onSuccess: (_, kind) => { toast.success(kind === 'approve' ? 'Partner approved' : kind === 'suspend' ? 'Partner suspended and signed out' : 'Partner reactivated'); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const reject = useMutation({
    mutationFn: (reason: string) => adminPartnersApi.reject(id!, reason),
    onSuccess: () => { toast.success('Application rejected'); setRejecting(false); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const reset = useMutation({ mutationFn: () => adminPartnersApi.resetPassword(id!), onSuccess: (r) => { setPassword(r.temporaryPassword); refresh(); }, onError: (e) => toast.error(apiError(e)) });
  const signOut = useMutation({ mutationFn: () => adminPartnersApi.signOut(id!), onSuccess: (r) => { toast.success(`Signed out of ${r.ended} device${r.ended === 1 ? '' : 's'}`); refresh(); }, onError: (e) => toast.error(apiError(e)) });

  if (detail.isError) {
    return <PageShell><EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Partner not found" description="The link may be wrong." action={<Link to="/partners" className="font-semibold text-brand-700 hover:underline">Back to partners</Link>} /></PageShell>;
  }
  if (!detail.data) return <PageShell><PageHero title="Partner" back="/partners" loading /><Skeleton className="h-96 rounded-3xl" /></PageShell>;

  const p = detail.data;
  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Activity },
    { id: 'shops' as const, label: 'Shops', icon: Store, count: p.allTime.signups },
    { id: 'leads' as const, label: 'Leads', icon: ClipboardList, count: p.allTime.leads },
    { id: 'visits' as const, label: 'Visits', icon: MapPin, count: p.flaggedOpen || null },
    { id: 'earnings' as const, label: 'Earnings', icon: Wallet },
    { id: 'payouts' as const, label: 'Payouts', icon: Banknote },
    { id: 'targets' as const, label: 'Targets', icon: Target },
    ...(p.isManager ? [{ id: 'team' as const, label: 'Team', icon: Users, count: p.team.length }] : []),
  ];
  const setTab = (t: Tab) => { list.setSearch(''); list.setFilter('tab', t); list.setFilter('filter', 'ALL'); };

  return (
    <PageShell>
      <PageHero
        title={p.fullName}
        back="/partners"
        backLabel="Partners"
        chip={p.status === 'APPLIED' ? 'Waiting for approval' : statusLabel(p.status)}
        busy={detail.isFetching}
        meta={<span className="inline-flex flex-wrap items-center gap-x-2"><code>{p.code}</code><span>· {TYPE_LABEL[p.type]}{p.isManager ? ' (area manager)' : ''}</span><span>· {p.phone}</span>{p.city && <span>· {p.city}</span>}</span>}
        actions={
          <>
            {canManage && (p.status === 'APPLIED' || p.status === 'REJECTED') && (
              <button type="button" className={heroPrimaryButton} disabled={action.isPending}
                onClick={async () => { if (await confirmDialog({ title: `Approve ${p.fullName}?`, text: 'They can add leads, share their code and earn commission.', yes: 'Approve' })) action.mutate('approve'); }}>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
            )}
            {canManage && p.status === 'APPLIED' && <button type="button" className={heroButton} onClick={() => setRejecting(true)}><XCircle className="h-4 w-4" /> Reject</button>}
            {canManage && p.status === 'SUSPENDED' && <button type="button" className={heroButton} disabled={action.isPending} onClick={() => action.mutate('reactivate')}><CheckCircle2 className="h-4 w-4" /> Reactivate</button>}
            {canManage && <button type="button" className={heroButton} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Edit</span></button>}
            {canManage && <button type="button" className={heroButton} aria-label="Give a temporary password" title="Give a temporary password"
              onClick={async () => { if (await confirmDialog({ title: `Give ${p.fullName} a temporary password?`, text: 'Their current password stops working and they are signed out everywhere. You will see the new password once.', yes: 'Create password', danger: true })) reset.mutate(); }}>
              <KeyRound className="h-4 w-4" />
            </button>}
            {canManage && <button type="button" className={heroButton} aria-label="Sign out everywhere" title="Sign out everywhere"
              onClick={async () => { if (await confirmDialog({ title: `Sign ${p.fullName} out everywhere?`, text: 'They can sign in again with their password.', yes: 'Sign out' })) signOut.mutate(); }}>
              <LogOut className="h-4 w-4" />
            </button>}
            {canManage && p.status === 'ACTIVE' && (
              <button type="button" className={heroButton} disabled={action.isPending}
                onClick={async () => { if (await confirmDialog({ title: `Suspend ${p.fullName}?`, text: 'They are signed out, cannot use the partner portal and earn nothing new. Earnings already made stay.', yes: 'Suspend', danger: true })) action.mutate('suspend'); }}>
                <XCircle className="h-4 w-4" /> <span className="hidden sm:inline">Suspend</span>
              </button>
            )}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Shops signed up', value: num(p.allTime.signups), hint: `${num(p.thisMonth.signups)} this month` },
          { label: 'Paid signups', value: num(p.allTime.paid), hint: `${num(p.thisMonth.paid)} this month` },
          { label: 'Owed now', value: formatPKR(p.balances.owed), hint: `${formatPKRFull(p.balances.pending)} on hold` },
          { label: 'Last seen', value: p.user.lastSeenAt ? formatRelative(p.user.lastSeenAt) : p.user.lastLoginAt ? formatRelative(p.user.lastLoginAt) : 'Never', hint: `${num(p.thisMonth.visits)} visits this month` },
        ]}
      />

      <ViewTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' && <OverviewTab p={p} canManage={canManage} canPay={canPay} onAdjust={() => setAdjusting(true)} />}
      {tab === 'shops' && <ShopsTab id={p.id} list={list} />}
      {tab === 'leads' && <LeadsTab id={p.id} list={list} />}
      {tab === 'visits' && <VisitsTab id={p.id} list={list} canManage={canManage} />}
      {tab === 'earnings' && (
        <div className="space-y-3">
          {canManage && <div className="flex justify-end"><Button size="sm" variant="outline" leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => setAdjusting(true)}>Adjust balance</Button></div>}
          <EarningsTab id={p.id} list={list} canManage={canManage} />
        </div>
      )}
      {tab === 'payouts' && <PayoutsTab id={p.id} list={list} canPay={canPay} />}
      {tab === 'targets' && <TargetsTab id={p.id} canManage={canManage} />}
      {tab === 'team' && <TeamTab id={p.id} list={list} />}

      <PartnerFormModal open={editing} onClose={() => setEditing(false)} partner={p} />
      <AdjustmentModal open={adjusting} onClose={() => setAdjusting(false)} partnerId={p.id} partnerName={p.fullName} />
      <ReasonModal open={rejecting} onClose={() => setRejecting(false)} busy={reject.isPending} danger yes="Reject"
        title={`Reject ${p.fullName}?`} description="They can no longer sign in to the partner portal. They see your reason."
        label="Reason" placeholder="e.g. Could not verify the CNIC" onConfirm={(r) => reject.mutate(r)} />
      <TempPasswordModal password={password} name={p.fullName} login={p.phone} onClose={() => setPassword(null)} />

      {guide.isOpen && (
        <PageGuide
          title="Partner"
          description="Everything about one partner: what they did, what they earned and what they are owed."
          flowTitle="From a visit to a payout"
          flow={[
            { label: 'Visit / lead', icon: MapPin, color: '#4f46e5' },
            { label: 'Shop signs up', icon: Store, color: '#0284c7' },
            { label: 'Shop pays', hint: 'Earning on hold', icon: Wallet, color: '#d97706' },
            { label: 'Payable', hint: 'After hold days', icon: UserCheck, color: '#7c3aed' },
            { label: 'Paid by hand', icon: Banknote, color: '#059669' },
          ]}
          steps={[
            { icon: Activity, color: '#4f46e5', title: 'Overview', text: 'This month against target, the profile, the balance and how they sign in.' },
            { icon: MapPin, color: '#d97706', title: 'Visits', text: 'Check flagged visits: open the photo and the map, then mark OK or Fake.' },
            { icon: Wallet, color: '#059669', title: 'Earnings', text: 'Reverse an earning on hold, or add a plus or minus adjustment with a note.' },
            { icon: Target, color: '#0284c7', title: 'Targets', text: 'Set visits, signups and activations for any month. The partner sees them on their dashboard.' },
          ]}
          tips={[
            'Suspending signs the partner out and stops new earnings. Earnings already made stay.',
            'Payouts are sent by hand outside Nafaa; mark them paid with the transfer reference.',
          ]}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

