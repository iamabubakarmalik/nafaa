/**
 * Partner payouts: requests from the partner portal, waiting to be approved
 * and paid. Nafaa does not move money; an admin sends it by hand (JazzCash,
 * Easypaisa or bank) and marks the payout paid with the transfer reference.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, CheckCircle2, Download, Filter, HandCoins, Lightbulb, ReceiptText, Send, Wallet, XCircle } from 'lucide-react';
import { Alert, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPartnersApi, type PartnerPayout } from '@/api/admin-partners.api';
import { useCan } from '@/lib/access';
import { formatDateTime, formatPKR, formatPKRFull, num } from '@/lib/format';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { methodLabel } from '../lib/partner-text';
import { PayoutsTable } from '../components/PayoutsTable';

const STATUSES = [
  { value: 'OPEN', label: 'Waiting (requested or approved)' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'APPROVED', label: 'Approved, not paid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All payouts' },
];

export default function PayoutsPage() {
  const guide = usePageGuide();
  const can = useCan();
  const canPay = can('partners.payouts');
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'OPEN', partner: '' });
  const { status, partner } = list.filters;
  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status, partnerId: partner || undefined };
  const payouts = useQuery({
    queryKey: ['admin', 'partners', 'payouts', 'queue', query, list.page, list.limit],
    queryFn: () => adminPartnersApi.payouts({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = payouts.data?.items ?? [];
  const t = (s: string) => payouts.data?.totals.find((x) => x.status === s);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminPartnersApi.payouts({ ...query, page, limit: 100 }));
      downloadCsv<PartnerPayout>('partner-payouts', all, [
        { label: 'Partner', value: (p) => p.partner.fullName },
        { label: 'Code', value: (p) => p.partner.code },
        { label: 'Phone', value: (p) => p.partner.phone },
        { label: 'Amount (PKR)', value: (p) => p.amount },
        { label: 'Status', value: (p) => p.status },
        { label: 'Method', value: (p) => methodLabel(p.method) },
        { label: 'Account', value: (p) => p.account },
        { label: 'Account title', value: (p) => p.accountTitle },
        { label: 'Reference', value: (p) => p.reference },
        { label: 'Requested', value: (p) => formatDateTime(p.requestedAt) },
        { label: 'Paid', value: (p) => (p.paidAt ? formatDateTime(p.paidAt) : '') },
        { label: 'Reject reason', value: (p) => p.rejectReason },
      ]);
      toast.success(`${num(all.length)} payouts exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = [
    status !== 'OPEN' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'OPEN')}>{STATUSES.find((x) => x.value === status)?.label}</FilterChip>,
    partner && <FilterChip key="p" onRemove={() => list.setFilter('partner', '')}>{rows[0]?.partner.id === partner ? rows[0].partner.fullName : 'One partner'}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Partner payouts"
        chip={payouts.data ? `${num((t('REQUESTED')?.count ?? 0) + (t('APPROVED')?.count ?? 0))} waiting` : undefined}
        busy={payouts.isFetching}
        loading={payouts.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export CSV'}</span></button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={payouts.data ? [
          { label: 'To approve', value: num(t('REQUESTED')?.count), hint: formatPKRFull(t('REQUESTED')?.amount ?? 0) },
          { label: 'Approved, to send', value: num(t('APPROVED')?.count), hint: formatPKRFull(t('APPROVED')?.amount ?? 0) },
          { label: 'Paid so far', value: formatPKR(t('PAID')?.amount ?? 0), hint: `${num(t('PAID')?.count)} payouts` },
          { label: 'Rejected', value: num(t('REJECTED')?.count) },
        ] : undefined}
      />

      <Alert tone="warning" title="Payouts are paid by hand">
        Nafaa does not send money. Approve a request, send the amount yourself by JazzCash, Easypaisa or bank to the account shown, then press Mark paid and enter the transaction reference.
      </Alert>

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search partner, phone, code, account or reference" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Filter} label="Status" value={status} active={status !== 'OPEN'} onChange={(v) => list.setFilter('status', v)} options={STATUSES} width="w-72" />
      </FilterBar>

      <ListCard loading={payouts.isLoading} empty={!rows.length}
        emptyIcon={<Banknote className="h-6 w-6" />}
        emptyTitle={status === 'OPEN' ? 'No payouts waiting' : 'No payouts match'}
        emptyText={status === 'OPEN' ? 'Partners ask for payouts from their portal once they have PKR 500 or more available.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={payouts.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
        <PayoutsTable rows={rows} canPay={canPay} />
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Partner payouts"
          description="Partners ask for their available balance from the portal. You approve, send the money by hand, and record it here."
          flowTitle="A payout"
          flow={[
            { label: 'Partner asks', hint: 'Min PKR 500', icon: HandCoins, color: '#4f46e5' },
            { label: 'You approve', icon: CheckCircle2, color: '#0284c7' },
            { label: 'You send money', hint: 'Outside Nafaa', icon: Send, color: '#d97706' },
            { label: 'Mark paid', hint: 'With reference', icon: ReceiptText, color: '#059669' },
          ]}
          steps={[
            { icon: CheckCircle2, color: '#0284c7', title: 'Approve', text: 'Check the account and the partner, then approve. Approving does not send money.' },
            { icon: Banknote, color: '#059669', title: 'Mark paid', text: 'After the transfer, enter the transaction reference (TID). The partner sees it, and the earnings in the payout become paid.' },
            { icon: XCircle, color: '#e11d48', title: 'Reject', text: 'The amount goes back to the partner’s available balance and they can ask again.' },
            { icon: Wallet, color: '#4f46e5', title: 'One at a time', text: 'A partner can have only one open request. Earnings that become payable later wait for the next request.' },
          ]}
          tips={['Click the account number to copy it.', 'Only admins with “Approve and pay partner payouts” see the buttons.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
