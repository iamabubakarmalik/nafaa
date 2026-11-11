/**
 * Partners: everyone in the partner programme (referral partners, field
 * agents, resellers, trainers and Nafaa employees) with server-side search,
 * filters and CSV export. With `applications` the page shows only people
 * waiting for approval, with Approve and Reject on each row.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownUp, Banknote, Check, ClipboardList, Download, Handshake, Lightbulb, MapPin, Play, Plus, Tag, UserCheck, UserPlus, Users, X,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPartnersApi, type PartnerRow } from '@/api/admin-partners.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatDate, formatDateTime, formatPKR, formatPKRFull, num } from '@/lib/format';
import { LastSeen, ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { PARTNER_TYPES, TYPE_LABEL } from '../lib/partner-text';
import { PartnerFormModal } from '../components/PartnerFormModal';
import { ReasonModal } from '../components/ReasonModal';

const STATUSES = ['ALL', 'ACTIVE', 'APPLIED', 'SUSPENDED', 'REJECTED'];
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'last_seen', label: 'Last seen' },
];

export default function PartnersListPage({ applications = false }: { applications?: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('partners.manage');
  const [exporting, setExporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState<PartnerRow | null>(null);
  const list = useListParams({ status: 'ALL', type: 'ALL', city: '', sort: applications ? 'oldest' : 'newest' });
  const { type, city, sort } = list.filters;
  const status = applications ? 'APPLIED' : list.filters.status;

  const query = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    type: type === 'ALL' ? undefined : type,
    city: city || undefined,
    sort,
  };
  const partners = useQuery({
    queryKey: ['admin', 'partners', 'list', query, list.page, list.limit],
    queryFn: () => adminPartnersApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'partners', 'stats'], queryFn: adminPartnersApi.stats, staleTime: 30_000 });
  const s = stats.data;
  const rows = partners.data?.items ?? [];

  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin', 'partners'] }); qc.invalidateQueries({ queryKey: ['admin', 'partner'] }); };
  const approve = useMutation({ mutationFn: (id: string) => adminPartnersApi.approve(id), onSuccess: (p) => { toast.success(`${p.fullName} approved. They can start now.`); refresh(); }, onError: (e) => toast.error(apiError(e)) });
  const reject = useMutation({
    mutationFn: (reason: string) => adminPartnersApi.reject(rejecting!.id, reason),
    onSuccess: (p) => { toast.success(`${p.fullName}'s application rejected`); setRejecting(null); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const run = useMutation({
    mutationFn: adminPartnersApi.runCommissions,
    onSuccess: (r) => {
      if (r.running) toast.info('The commission job is already running. Try again in a minute.');
      else {
        const x = r.result ?? {};
        toast.success(`Done: ${num(x.linked)} shops linked, ${num(x.activations)} activations, ${num(x.payments)} payment earnings, ${num(x.settled)} earnings settled`);
      }
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminPartnersApi.list({ ...query, page, limit: 100 }));
      downloadCsv<PartnerRow>(applications ? 'partner-applications' : 'partners', all, [
        { label: 'Name', value: (p) => p.fullName },
        { label: 'Code', value: (p) => p.code },
        { label: 'Phone', value: (p) => p.phone },
        { label: 'Email', value: (p) => p.email },
        { label: 'Type', value: (p) => TYPE_LABEL[p.type] },
        { label: 'Status', value: (p) => p.status },
        { label: 'City', value: (p) => p.city },
        { label: 'Territory', value: (p) => p.territory },
        { label: 'Area manager', value: (p) => (p.isManager ? 'Yes' : '') },
        { label: 'Reports to', value: (p) => p.manager?.fullName },
        { label: 'Plan', value: (p) => p.plan?.name ?? 'Default' },
        { label: 'Leads', value: (p) => p.leads },
        { label: 'Shops signed up', value: (p) => p.signups },
        { label: 'Paid signups', value: (p) => p.paid },
        { label: 'Owed (PKR)', value: (p) => Math.round(p.owed) },
        { label: 'Applied', value: (p) => formatDateTime(p.appliedAt) },
        { label: 'Last seen', value: (p) => (p.lastSeenAt ? formatDateTime(p.lastSeenAt) : '') },
      ]);
      toast.success(`${num(all.length)} partners exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = [
    !applications && status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    type !== 'ALL' && <FilterChip key="t" onRemove={() => list.setFilter('type', 'ALL')}>{TYPE_LABEL[type as keyof typeof TYPE_LABEL] ?? type}</FilterChip>,
    city && <FilterChip key="c" onRemove={() => list.setFilter('city', '')}>City: {city}</FilterChip>,
  ].filter(Boolean);
  const cities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad', 'Sialkot', 'Gujranwala'];

  return (
    <PageShell>
      <PageHero
        title={applications ? 'Applications' : 'Partners'}
        chip={s ? (applications ? `${num(s.applied)} waiting` : `${num(s.active)} active`) : undefined}
        busy={partners.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            {canManage && !applications && <button type="button" className={heroPrimaryButton} onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add partner</button>}
            {canManage && !applications && (
              <button type="button" className={heroButton} disabled={run.isPending} title="Runs every 30 minutes on its own"
                onClick={async () => { if (await confirmDialog({ title: 'Run the commission job now?', text: 'It links new shops to partner leads, adds earnings for new payments and activations, and makes earnings past their hold period payable. Running it twice never pays twice.', yes: 'Run now' })) run.mutate(); }}>
                <Play className="h-4 w-4" /> <span className="hidden sm:inline">{run.isPending ? 'Running…' : 'Run commissions'}</span>
              </button>
            )}
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export CSV'}</span></button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Active partners', value: num(s.active), hint: `${num(s.suspended)} suspended` },
          { label: 'Applications waiting', value: num(s.applied) },
          { label: 'Paid signups this month', value: num(s.paidSignupsThisMonth), hint: `${num(s.signupsThisMonth)} signed up` },
          { label: 'Owed to partners', value: formatPKR(s.owed), hint: 'Payable, not yet paid' },
        ] : undefined}
      />

      {!applications && s && (
        <KpiRow cols={5}>
          <KpiCard icon={Banknote} color="#059669" label="Payout requests" value={num(s.requestedPayouts.count)} hint={`${formatPKRFull(s.requestedPayouts.amount)} · ${num(s.approvedPayouts.count)} approved`} onClick={() => navigate('/partners/payouts')} />
          <KpiCard icon={AlertTriangle} color="#d97706" label="Visits to check" value={num(s.flaggedVisits)} hint="Flagged, not reviewed" onClick={() => navigate('/partners/visits?flagged=1&review=none')} />
          {s.byType.filter((t) => t.type !== 'TRAINER' || t.count > 0).slice(0, 3).map((t) => (
            <KpiCard key={t.type} icon={t.type === 'EMPLOYEE' ? UserCheck : t.type === 'FIELD_AGENT' ? MapPin : Users} color="#4f46e5" label={TYPE_LABEL[t.type]} value={num(t.count)} hint="Active"
              active={type === t.type} onClick={() => list.setFilter('type', type === t.type ? 'ALL' : t.type)} />
          ))}
        </KpiRow>
      )}

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, phone, email or code" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        {!applications && (
          <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
            options={STATUSES.map((v) => ({ value: v, label: v === 'ALL' ? 'All statuses' : v === 'APPLIED' ? 'Applied (waiting)' : statusLabel(v) }))} />
        )}
        <FilterMenu icon={Handshake} label="Type" value={type} active={type !== 'ALL'} onChange={(v) => list.setFilter('type', v)}
          options={[{ value: 'ALL', label: 'All types' }, ...PARTNER_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))]} />
        <FilterMenu icon={MapPin} label="City" value={city || 'ALL'} active={!!city} onChange={(v) => list.setFilter('city', v === 'ALL' ? '' : v)}
          options={[{ value: 'ALL', label: 'All cities' }, ...cities.map((c) => ({ value: c, label: c }))]} />
        <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} onChange={(v) => list.setFilter('sort', v)} options={SORTS} align="right" />
      </FilterBar>

      <ListCard
        loading={partners.isLoading}
        empty={!rows.length}
        emptyIcon={applications ? <ClipboardList className="h-6 w-6" /> : <Handshake className="h-6 w-6" />}
        emptyTitle={applications ? 'No applications waiting' : 'No partners match'}
        emptyText={applications ? 'New applications from the partner portal show here.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={partners.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth={applications ? '56rem' : '68rem'}>
          <THead>
            <Tr>
              <Th>Partner</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              {applications ? <Th>Applied</Th> : (
                <>
                  <Th align="right">Leads</Th>
                  <Th align="right">Shops</Th>
                  <Th align="right">Paid</Th>
                  <Th align="right">Owed</Th>
                  <Th>Last seen</Th>
                </>
              )}
              {applications && canManage && <Th align="right"><span className="sr-only">Actions</span></Th>}
            </Tr>
          </THead>
          <TBody>
            {rows.map((p) => (
              <Tr key={p.id} interactive onClick={() => navigate(`/partners/${p.id}`)}>
                <Td>
                  <div className="font-semibold text-slate-900">{p.fullName}</div>
                  <div className="text-[0.75rem] text-slate-500">{p.phone} · <span className="font-mono">{p.code}</span></div>
                </Td>
                <Td>
                  <div className="text-slate-900">{TYPE_LABEL[p.type]}{p.isManager && <span className="ms-1.5 rounded-md bg-brand-50 px-1.5 py-px text-[0.6875rem] font-semibold text-brand-700">Manager</span>}</div>
                  <div className="text-[0.75rem] text-slate-500">{[p.city, p.manager ? `under ${p.manager.fullName}` : null].filter(Boolean).join(' · ') || '—'}</div>
                </Td>
                <Td><StatusBadge value={p.status} label={p.status === 'APPLIED' ? 'Waiting' : undefined} variant={p.status === 'APPLIED' ? 'warning' : undefined} /></Td>
                {applications ? (
                  <Td className="whitespace-nowrap text-[0.8125rem] text-slate-600" title={formatDateTime(p.appliedAt)}>{formatDate(p.appliedAt)}</Td>
                ) : (
                  <>
                    <Td align="right" className="tabular-nums">{num(p.leads)}</Td>
                    <Td align="right" className="tabular-nums">{num(p.signups)}</Td>
                    <Td align="right" className="tabular-nums font-semibold">{num(p.paid)}</Td>
                    <Td align="right" className="whitespace-nowrap tabular-nums">{p.owed ? formatPKRFull(p.owed) : <span className="text-slate-400">—</span>}</Td>
                    <Td><LastSeen at={p.lastSeenAt} compact never="Never signed in" /></Td>
                  </>
                )}
                {applications && canManage && (
                  <Td align="right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      <Button size="xs" leftIcon={<Check className="h-3.5 w-3.5" />} loading={approve.isPending && approve.variables === p.id}
                        onClick={async () => { if (await confirmDialog({ title: `Approve ${p.fullName}?`, text: `They become an active ${TYPE_LABEL[p.type].toLowerCase()} and can add leads and earn commission.`, yes: 'Approve' })) approve.mutate(p.id); }}>Approve</Button>
                      <Button size="xs" variant="ghost" className="text-rose-700" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => setRejecting(p)}>Reject</Button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <PartnerFormModal open={adding} onClose={() => setAdding(false)} onCreated={(id) => navigate(`/partners/${id}`)} />
      <ReasonModal open={!!rejecting} onClose={() => setRejecting(null)} busy={reject.isPending} danger yes="Reject"
        title={rejecting ? `Reject ${rejecting.fullName}?` : 'Reject'} description="They can no longer sign in to the partner portal. They see your reason."
        label="Reason" placeholder="e.g. Could not verify the CNIC" onConfirm={(r) => reject.mutate(r)} />

      {guide.isOpen && (
        <PageGuide
          title={applications ? 'Applications' : 'Partners'}
          description={applications
            ? 'People who applied from the partner portal. Approve them to let them add leads and earn commission.'
            : 'Everyone who brings shops to Nafaa: referral partners, field agents, resellers, trainers and Nafaa employees.'}
          flowTitle="How a partner works"
          flow={[
            { label: 'Applies', hint: 'Or added by you', icon: UserPlus, color: '#4f46e5' },
            { label: 'Approved', icon: UserCheck, color: '#0284c7' },
            { label: 'Brings shops', hint: 'Code or visits', icon: MapPin, color: '#d97706' },
            { label: 'Shop pays', hint: 'Commission earned', icon: Banknote, color: '#059669' },
          ]}
          steps={applications ? [
            { icon: Check, color: '#059669', title: 'Approve', text: 'Approved partners can sign in fully, add leads and share their code.' },
            { icon: X, color: '#e11d48', title: 'Reject', text: 'Write a reason. They see it and cannot sign in any more.' },
            { icon: Users, color: '#4f46e5', title: 'Open a row', text: 'See the full application, payout details and notes before you decide.' },
          ] : [
            { icon: Plus, color: '#4f46e5', title: 'Add partner', text: 'Add Nafaa employees or partners directly. They are active at once and you get a temporary password to give them.' },
            { icon: Tag, color: '#0284c7', title: 'Filter', text: 'Narrow by status, type and city. Filters stay in the address, so you can share the link.' },
            { icon: Handshake, color: '#d97706', title: 'Open a partner', text: 'See their shops, leads, visits, earnings, payouts, targets and team.' },
            { icon: Play, color: '#059669', title: 'Run commissions', text: 'The job runs every 30 minutes by itself. Run it now after approving a payment if you want earnings at once.' },
          ]}
          tips={[
            'Owed is everything payable that has not been paid yet, including amounts in open payout requests.',
            'A new partner gets the default commission plan unless you pick another.',
          ]}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
