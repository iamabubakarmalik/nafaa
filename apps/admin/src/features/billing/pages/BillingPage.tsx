/**
 * Payment approvals: manual payments shops send in (bank transfer, wallet,
 * cash). An admin checks the receipt and approves or rejects each one.
 * Approving turns on the shop's plan.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, CheckCircle2, Clock, Download, Eye, FileCheck2, Landmark, Lightbulb, Receipt, Search, Wallet, XCircle } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Modal, PageHero, PageShell, SearchField, Table, TBody, Td, Textarea, Th, THead, Tr, ViewTabs, confirmDialog, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminBillingApi, type AdminPayment, type PaymentProvider, type PaymentStatus } from '@/api/admin-billing.api';
import { formatDate, formatPKR, formatRelative } from '@/lib/format';
import { ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '../../shared/period';
import { num } from '@/lib/format';

const TABS = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const;
type Tab = (typeof TABS)[number];
const PROVIDERS: PaymentProvider[] = ['MANUAL_BANK', 'JAZZCASH', 'EASYPAISA', 'STRIPE', 'CASH'];

export default function BillingPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const [rejecting, setRejecting] = useState<AdminPayment | null>(null);
  const [reason, setReason] = useState('');

  const list = useListParams({ tab: 'PENDING', provider: 'ALL', ...PERIOD_DEFAULTS });
  const { tab, provider } = list.filters;
  const range = periodChip(list.filters);
  const query = {
    status: tab === 'ALL' ? undefined : (tab as PaymentStatus),
    provider: provider === 'ALL' ? undefined : provider,
    search: list.debouncedSearch || undefined,
    ...periodQuery(list.filters),
  };

  const payments = useQuery({
    queryKey: ['admin', 'billing', query, list.page, list.limit],
    queryFn: () => adminBillingApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'billing', 'stats'], queryFn: adminBillingApi.stats, staleTime: 30_000 });
  const s = stats.data;
  const rows = payments.data?.items ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'billing'] });
  const approve = useMutation({
    mutationFn: (id: string) => adminBillingApi.approve(id),
    onSuccess: () => { toast.success('Payment approved'); refresh(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not approve'),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminBillingApi.reject(id, reason),
    onSuccess: () => { toast.success('Payment rejected'); setRejecting(null); setReason(''); refresh(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not reject'),
  });

  const onApprove = async (p: AdminPayment) => {
    if (await confirmDialog({ title: `Approve ${formatPKR(p.amount)} from ${p.tenant.name}?`, text: 'The shop’s plan is turned on once the invoice is fully paid.', yes: 'Approve' })) approve.mutate(p.id);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminBillingApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminPayment>('payments', all, [
        { label: 'Date', value: (p) => p.createdAt.slice(0, 10) },
        { label: 'Shop', value: (p) => p.tenant.name },
        { label: 'Amount', value: (p) => p.amount },
        { label: 'Status', value: (p) => p.status },
        { label: 'Method', value: (p) => p.provider },
        { label: 'Payer', value: (p) => p.payerName },
        { label: 'Transaction', value: (p) => p.transactionId },
        { label: 'Invoice', value: (p) => p.invoice?.invoiceNumber },
        { label: 'Bill lines', value: (p) => p.invoice?.items?.map((i) => i.description).join(' + ') },
        { label: 'Rejection reason', value: (p) => p.rejectionReason },
      ]);
      toast.success(`${num(all.length)} payments exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = [
    provider !== 'ALL' && <FilterChip key="p" onRemove={() => list.setFilter('provider', 'ALL')}>{statusLabel(provider)}</FilterChip>,
    range && <FilterChip key="d" onRemove={() => clearPeriod(list)}>{range}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Payment approvals"
        chip={s ? `${num(s.pending)} waiting` : undefined}
        busy={payments.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Waiting for approval', value: num(s.pending), hint: s.pendingAmount ? formatPKR(s.pendingAmount) : undefined },
          { label: 'Approved today', value: formatPKR(s.todayApproved) },
          { label: 'Approved, all time', value: formatPKR(s.totalApproved), hint: `${num(s.approved)} payments` },
          { label: 'Rejected', value: num(s.rejected) },
        ] : undefined}
      />

      <ViewTabs
        tabs={TABS.map((t) => ({ id: t, label: t === 'ALL' ? 'All' : statusLabel(t), count: s ? (t === 'PENDING' ? s.pending : t === 'APPROVED' ? s.approved : t === 'REJECTED' ? s.rejected : null) : null }))}
        value={tab as Tab}
        onChange={(v) => list.setFilter('tab', v)}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search transaction, shop or payer" />}
        chips={chips.length ? chips : undefined}
        onClear={() => { clearPeriod(list); list.setFilter('provider', 'ALL'); }}
      >
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} />
        <FilterMenu icon={Landmark} label="Method" value={provider} active={provider !== 'ALL'} onChange={(v) => list.setFilter('provider', v)} align="right"
          options={[{ value: 'ALL', label: 'All methods' }, ...PROVIDERS.map((v) => ({ value: v, label: statusLabel(v) }))]} />
      </FilterBar>

      <ListCard
        loading={payments.isLoading}
        empty={!rows.length}
        emptyIcon={tab === 'PENDING' ? <CheckCircle2 className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
        emptyTitle={tab === 'PENDING' && !range && provider === 'ALL' && !list.debouncedSearch ? 'Nothing waiting' : 'No payments match'}
        emptyText="New payments from shops appear here for you to check."
        page={list.page} limit={list.limit} total={payments.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="58rem">
          <THead><Tr><Th>Shop</Th><Th align="right">Amount</Th><Th>Method</Th><Th>Details</Th><Th>Status</Th><Th>Sent</Th><Th align="right"><span className="sr-only">Actions</span></Th></Tr></THead>
          <TBody>
            {rows.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <Link to={`/tenants/${p.tenant.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{p.tenant.name}</Link>
                  <div className="text-[0.75rem] text-slate-500">{p.invoice ? <>Invoice <span className="font-mono">{p.invoice.invoiceNumber}</span>{p.invoice.subscription ? ` · ${p.invoice.subscription.plan.name}` : ''}</> : '—'}</div>
                  {!!p.invoice?.items?.length && (
                    <ul className="mt-1 space-y-0.5 text-[0.75rem] text-slate-600">
                      {p.invoice.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{i.description}</span><span className="shrink-0 tabular-nums text-slate-500">{formatPKR(i.amount)}</span></li>
                      ))}
                    </ul>
                  )}
                </Td>
                <Td align="right" className="whitespace-nowrap font-bold text-slate-900">{formatPKR(p.amount)}</Td>
                <Td><StatusBadge value={p.provider} variant="default" /></Td>
                <Td className="text-[0.8125rem] text-slate-600">
                  <div>{p.payerName || <span className="text-slate-400">No payer name</span>}</div>
                  {p.transactionId && <div className="font-mono text-[0.75rem] text-slate-500">{p.transactionId}</div>}
                  {p.bankName && <div className="text-[0.75rem] text-slate-500">From {p.bankName}</div>}
                  {p.rejectionReason && <div className="mt-1 text-[0.75rem] text-rose-600">Rejected: {p.rejectionReason}</div>}
                </Td>
                <Td><StatusBadge value={p.status} /></Td>
                <Td className="whitespace-nowrap text-slate-500" title={formatDate(p.createdAt)}>{formatRelative(p.createdAt)}</Td>
                <Td align="right">
                  <div className="inline-flex flex-wrap justify-end gap-1">
                    {p.upload && (
                      <a href={p.upload.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                        <Eye className="h-3.5 w-3.5" /> Receipt
                      </a>
                    )}
                    {p.status === 'PENDING' && (
                      <>
                        <Button size="xs" variant="success" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} loading={approve.isPending && approve.variables === p.id} onClick={() => onApprove(p)}>Approve</Button>
                        <Button size="xs" variant="critical" leftIcon={<XCircle className="h-3.5 w-3.5" />} onClick={() => { setRejecting(p); setReason(''); }}>Reject</Button>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} size="sm" title="Reject this payment?"
        description={rejecting ? `${formatPKR(rejecting.amount)} from ${rejecting.tenant.name}. The shop is told why.` : undefined}
        footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="danger" loading={reject.isPending} onClick={() => { if (!reason.trim()) return toast.error('Write a reason'); if (rejecting) reject.mutate({ id: rejecting.id, reason: reason.trim() }); }}>Reject payment</Button></>}>
        <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="For example: the receipt does not match the amount" />
      </Modal>

      {guide.isOpen && (
        <PageGuide
          title="Payment approvals"
          description="Shops pay by bank transfer or wallet and upload a receipt. You check it and approve or reject."
          flowTitle="How a payment turns on a plan"
          flow={[
            { label: 'Shop pays', hint: 'Bank or wallet', icon: Banknote, color: '#4f46e5' },
            { label: 'Uploads receipt', icon: Receipt, color: '#0284c7' },
            { label: 'You check', hint: 'Approve or reject', icon: FileCheck2, color: '#d97706' },
            { label: 'Plan is on', icon: CheckCircle2, color: '#059669' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Find the payment', text: 'Waiting payments show first. Search by transaction, shop or payer name.' },
            { icon: Eye, color: '#0284c7', title: 'Check the receipt', text: 'Open the receipt and match the amount and the transaction number.' },
            { icon: CheckCircle2, color: '#059669', title: 'Approve or reject', text: 'Approving turns on the plan. Rejecting needs a reason, which the shop sees.' },
          ]}
          tips={['A payment that does not cover the full invoice keeps the invoice open.', 'Days follow Pakistan time.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
