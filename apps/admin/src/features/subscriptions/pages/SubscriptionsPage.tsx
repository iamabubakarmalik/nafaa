/**
 * Subscriptions: every shop's plan. Search and filters run on the server.
 * Admins can give a plan to a shop (free or paid), extend a period, cancel
 * a plan or bring it back.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarPlus, CreditCard, Download, Layers, Lightbulb, Pause, Play, Plus, Repeat, Tag, Timer } from 'lucide-react';
import {
  Button, Checkbox, FilterBar, FilterChip, FilterMenu, Input, Modal, PageHero, PageShell, SearchField, Select, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminSubscriptionsApi, type AdminSubscription, type BillingInterval, type SubscriptionStatus } from '@/api/admin-subscriptions.api';
import { adminPlansApi } from '@/api/admin-plans.api';
import { formatDate, formatPKR } from '@/lib/format';
import { ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { ShopPicker, type PickedShop } from '../../shared/ShopPicker';
import { num } from '@/lib/format';

const STATUSES: Array<SubscriptionStatus | 'ALL'> = ['ALL', 'ACTIVE', 'TRIAL', 'PENDING_PAYMENT', 'PAST_DUE', 'CANCELLED', 'EXPIRED'];
const INTERVALS: BillingInterval[] = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
const daysLeft = (v: string) => Math.ceil((new Date(v).getTime() - Date.now()) / 86_400_000);

export default function SubscriptionsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [extending, setExtending] = useState<AdminSubscription | null>(null);

  const list = useListParams({ status: 'ALL', plan: 'ALL', interval: 'ALL', ending: 'ALL' });
  const { status, plan, interval, ending } = list.filters;
  const query = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : (status as SubscriptionStatus),
    planId: plan === 'ALL' ? undefined : plan,
    interval: interval === 'ALL' ? undefined : interval,
    endingInDays: ending === 'ALL' ? undefined : Number(ending),
  };

  const subs = useQuery({
    queryKey: ['admin', 'subscriptions', query, list.page, list.limit],
    queryFn: () => adminSubscriptionsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'subscriptions', 'stats'], queryFn: adminSubscriptionsApi.stats, staleTime: 60_000 });
  const plans = useQuery({ queryKey: ['admin', 'plans'], queryFn: adminPlansApi.list, staleTime: 5 * 60_000 });
  const s = stats.data;
  const rows = subs.data?.items ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] });
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Something went wrong');

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminSubscriptionsApi.cancel(id, reason),
    onSuccess: () => { toast.success('Subscription cancelled'); refresh(); },
    onError: fail,
  });
  const activate = useMutation({
    mutationFn: adminSubscriptionsApi.activate,
    onSuccess: () => { toast.success('Subscription activated'); refresh(); },
    onError: fail,
  });

  const onCancel = async (x: AdminSubscription) => {
    if (await confirmDialog({ title: `Cancel ${x.tenant.name}'s plan?`, text: 'The shop loses the plan features when this ends.', yes: 'Cancel plan', danger: true })) cancel.mutate({ id: x.id });
  };
  const onActivate = async (x: AdminSubscription) => {
    if (await confirmDialog({ title: `Activate ${x.plan.name} for ${x.tenant.name}?`, yes: 'Activate' })) activate.mutate(x.id);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminSubscriptionsApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminSubscription>('subscriptions', all, [
        { label: 'Shop', value: (x) => x.tenant.name },
        { label: 'Username', value: (x) => x.tenant.slug },
        { label: 'Plan', value: (x) => x.plan.name },
        { label: 'Status', value: (x) => x.status },
        { label: 'Billing', value: (x) => x.interval },
        { label: 'Amount', value: (x) => x.amount },
        { label: 'Period ends', value: (x) => x.currentPeriodEnd.slice(0, 10) },
      ]);
      toast.success(`${num(all.length)} subscriptions exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const planName = (id: string) => plans.data?.find((p) => p.id === id)?.name ?? 'Plan';
  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    plan !== 'ALL' && <FilterChip key="p" onRemove={() => list.setFilter('plan', 'ALL')}>{planName(plan)}</FilterChip>,
    interval !== 'ALL' && <FilterChip key="i" onRemove={() => list.setFilter('interval', 'ALL')}>{statusLabel(interval)}</FilterChip>,
    ending !== 'ALL' && <FilterChip key="e" onRemove={() => list.setFilter('ending', 'ALL')}>Ending in {ending} days</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Subscriptions"
        chip={s ? `${num(s.total)} total` : undefined}
        busy={subs.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroPrimaryButton} onClick={() => setAssignOpen(true)}><Plus className="h-4 w-4" /> Give a plan</button>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Monthly recurring revenue', value: formatPKR(s.mrrEstimate), hint: 'From active plans' },
          { label: 'Active', value: num(s.active), hint: `${num(s.trial)} on trial` },
          { label: 'Ending in 7 days', value: num(s.endingSoon ?? 0) },
          { label: 'Past due', value: num(s.pastDue), hint: `${num(s.expired)} expired` },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop name or username" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={STATUSES.map((v) => ({ value: v, label: v === 'ALL' ? 'All statuses' : statusLabel(v) }))} />
        <FilterMenu icon={Layers} label="Plan" value={plan} active={plan !== 'ALL'} onChange={(v) => list.setFilter('plan', v)} width="w-64"
          options={[{ value: 'ALL', label: 'All plans' }, ...(plans.data ?? []).map((p) => ({ value: p.id, label: p.name }))]} />
        <FilterMenu icon={Repeat} label="Billing" value={interval} active={interval !== 'ALL'} onChange={(v) => list.setFilter('interval', v)}
          options={[{ value: 'ALL', label: 'Any billing' }, ...INTERVALS.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        <FilterMenu icon={Timer} label="Ends" value={ending} active={ending !== 'ALL'} onChange={(v) => list.setFilter('ending', v)} align="right"
          options={[{ value: 'ALL', label: 'Any time' }, { value: '3', label: 'Within 3 days' }, { value: '7', label: 'Within 7 days' }, { value: '30', label: 'Within 30 days' }]} />
      </FilterBar>

      <ListCard
        loading={subs.isLoading}
        empty={!rows.length}
        emptyIcon={<CreditCard className="h-6 w-6" />}
        emptyTitle="No subscriptions match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={subs.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="52rem">
          <THead><Tr><Th>Shop</Th><Th>Plan</Th><Th>Status</Th><Th align="right">Amount</Th><Th>Period ends</Th><Th align="right"><span className="sr-only">Actions</span></Th></Tr></THead>
          <TBody>
            {rows.map((x) => {
              const d = daysLeft(x.currentPeriodEnd);
              const running = x.status === 'ACTIVE' || x.status === 'TRIAL';
              return (
                <Tr key={x.id}>
                  <Td>
                    <Link to={`/tenants/${x.tenant.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{x.tenant.name}</Link>
                    <div className="text-[0.75rem] text-slate-500">@{x.tenant.slug}</div>
                  </Td>
                  <Td><div className="font-medium text-slate-900">{x.plan.name}</div><div className="text-[0.75rem] text-slate-500">{statusLabel(x.interval)}</div></Td>
                  <Td><StatusBadge value={x.status} /></Td>
                  <Td align="right" className="font-medium">{formatPKR(x.amount)}</Td>
                  <Td className="whitespace-nowrap">
                    {formatDate(x.currentPeriodEnd)}
                    {running && <div className={d <= 3 ? 'text-[0.75rem] font-medium text-rose-600' : 'text-[0.75rem] text-slate-500'}>{d < 0 ? 'Ended' : d === 0 ? 'Ends today' : `${d} days left`}</div>}
                  </Td>
                  <Td align="right">
                    <div className="inline-flex gap-1">
                      <Button size="xs" variant="secondary" leftIcon={<CalendarPlus className="h-3.5 w-3.5" />} onClick={() => setExtending(x)}>Extend</Button>
                      {running
                        ? <Button size="xs" variant="critical" leftIcon={<Pause className="h-3.5 w-3.5" />} onClick={() => onCancel(x)}>Cancel</Button>
                        : <Button size="xs" variant="secondary" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={() => onActivate(x)}>Activate</Button>}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </ListCard>

      {assignOpen && <AssignModal onClose={() => setAssignOpen(false)} onDone={refresh} />}
      {extending && <ExtendModal sub={extending} onClose={() => setExtending(null)} onDone={refresh} />}

      {guide.isOpen && (
        <PageGuide
          title="Subscriptions"
          description="The plan each shop is on, when it ends, and what it pays."
          flowTitle="A plan's life"
          flow={[
            { label: 'Trial', hint: 'Free days', icon: Timer, color: '#0284c7' },
            { label: 'Pays', hint: 'Approved payment', icon: CreditCard, color: '#4f46e5' },
            { label: 'Active', icon: Play, color: '#059669' },
            { label: 'Ends', hint: 'Renew or expire', icon: CalendarPlus, color: '#d97706' },
          ]}
          steps={[
            { icon: Plus, color: '#4f46e5', title: 'Give a plan', text: 'Give any shop a plan for free or mark it unpaid. This replaces its current plan.' },
            { icon: CalendarPlus, color: '#0284c7', title: 'Extend', text: 'Add extra days to a plan, for example as a goodwill gesture.' },
            { icon: Pause, color: '#e11d48', title: 'Cancel or activate', text: 'Cancel stops the plan. Activate brings a cancelled or expired plan back.' },
          ]}
          tips={['Use Ends to find plans that finish this week.', 'Monthly recurring revenue spreads quarterly and yearly plans over their months.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function AssignModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [shop, setShop] = useState<PickedShop | null>(null);
  const [planId, setPlanId] = useState('');
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const [days, setDays] = useState('');
  const [paid, setPaid] = useState(true);
  const [notes, setNotes] = useState('');
  const plans = useQuery({ queryKey: ['admin', 'plans'], queryFn: adminPlansApi.list });

  const assign = useMutation({
    mutationFn: adminSubscriptionsApi.assign,
    onSuccess: () => { toast.success('Plan given'); onDone(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not give the plan'),
  });

  const submit = () => {
    if (!shop) return toast.error('Pick a shop');
    if (!planId) return toast.error('Pick a plan');
    assign.mutate({ tenantId: shop.id, planId, interval, customDays: days ? Number(days) : undefined, markAsPaid: paid, notes: notes || undefined });
  };

  return (
    <Modal open onClose={onClose} title="Give a plan to a shop" description="Gives the plan right away, for free or unpaid. It replaces the shop's current plan."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={assign.isPending}>Give plan</Button></>}>
      <div className="space-y-4">
        <ShopPicker value={shop} onChange={setShop} />
        <Select label="Plan" value={planId} onChange={(e) => setPlanId(e.target.value)} placeholder="Choose a plan"
          options={(plans.data ?? []).map((p) => ({ value: p.id, label: `${p.name} (${formatPKR(p.priceMonthly)} / month)` }))} />
        <Select label="Billing" value={interval} onChange={(e) => setInterval(e.target.value as BillingInterval)}
          options={INTERVALS.map((v) => ({ value: v, label: statusLabel(v) }))} />
        <Input label="Custom days (optional)" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} hint="Replaces the billing length, for example 90 for three months." />
        <Checkbox checked={paid} onChange={(e) => setPaid(e.target.checked)} label="Mark as paid" description="Activates the plan now with no invoice. Leave off to wait for a payment." />
        <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="For example: free promo for an early shop" />
      </div>
    </Modal>
  );
}

function ExtendModal({ sub, onClose, onDone }: { sub: AdminSubscription; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState('30');
  const [reason, setReason] = useState('');
  const extend = useMutation({
    mutationFn: () => adminSubscriptionsApi.extend(sub.id, Number(days), reason || undefined),
    onSuccess: () => { toast.success('Subscription extended'); onDone(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not extend'),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Extend plan" description={`${sub.tenant.name} · ${sub.plan.name}, ends ${formatDate(sub.currentPeriodEnd)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={extend.isPending} onClick={() => { if (!Number(days) || Number(days) <= 0) return toast.error('Enter a number of days'); extend.mutate(); }}>Extend</Button></>}>
      <div className="space-y-4">
        <Input label="Extra days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: goodwill" />
      </div>
    </Modal>
  );
}
