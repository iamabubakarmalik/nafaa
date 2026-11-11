/**
 * Referrals: shops that brought other shops to Nafaa, the rewards paid, and
 * the top referrers. The list is filtered and paged on the server.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Crown, Download, Gift, Lightbulb, Search, Store, Tag, UserPlus, Wallet } from 'lucide-react';
import {
  Card, DateRangeMenu, EmptyState, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Skeleton, Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminReferralsApi, type AdminReferral } from '@/api/admin-referrals.api';
import { formatDate, formatPKR } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '../../shared/period';
import { num } from '@/lib/format';

const STATUSES = ['ALL', 'PENDING', 'CONVERTED', 'PAID', 'EXPIRED'];
const MEDAL = ['bg-amber-100 text-amber-700', 'bg-slate-200 text-slate-700', 'bg-orange-100 text-orange-700'];

export default function ReferralsPage() {
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', ...PERIOD_DEFAULTS });
  const { status } = list.filters;
  const range = periodChip(list.filters);
  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status, ...periodQuery(list.filters) };

  const referrals = useQuery({
    queryKey: ['admin', 'referrals', query, list.page, list.limit],
    queryFn: () => adminReferralsApi.listPaged({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'referrals', 'stats'], queryFn: adminReferralsApi.stats, staleTime: 60_000 });
  const board = useQuery({ queryKey: ['admin', 'referrals', 'leaderboard'], queryFn: adminReferralsApi.leaderboard, staleTime: 60_000 });
  const s = stats.data;
  const rows = referrals.data?.items ?? [];
  const top = (board.data ?? []).slice(0, 10);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminReferralsApi.listPaged({ ...query, page, limit: 100 }));
      downloadCsv<AdminReferral>('referrals', all, [
        { label: 'Date', value: (r) => r.createdAt.slice(0, 10) },
        { label: 'Referrer', value: (r) => r.referrer.name },
        { label: 'New shop', value: (r) => r.referee.name },
        { label: 'Code', value: (r) => r.code },
        { label: 'Status', value: (r) => r.status },
        { label: 'Reward', value: (r) => r.rewardAmount },
      ]);
      toast.success(`${num(all.length)} referrals exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    range && <FilterChip key="d" onRemove={() => clearPeriod(list)}>{range}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Referrals"
        chip={s ? `${num(s.total)} total` : undefined}
        busy={referrals.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Rewards earned', value: formatPKR(s.totalRewardsPaid) },
          { label: 'Waiting to convert', value: num(s.pending), hint: 'New shop has not paid yet' },
          { label: 'Converted', value: num(s.converted) },
          { label: 'Paid out', value: num(s.paid) },
        ] : undefined}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <FilterBar
            search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop name or code" />}
            chips={chips.length ? chips : undefined}
            onClear={list.clear}
          >
            <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} />
            <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)} align="right"
              options={STATUSES.map((v) => ({ value: v, label: v === 'ALL' ? 'All statuses' : statusLabel(v) }))} />
          </FilterBar>

          <ListCard
            loading={referrals.isLoading}
            empty={!rows.length}
            emptyIcon={<Gift className="h-6 w-6" />}
            emptyTitle="No referrals match"
            emptyText="Referrals appear when a shop signs up with another shop's code."
            page={list.page} limit={list.limit} total={referrals.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
          >
            <Table minWidth="44rem">
              <THead><Tr><Th>Referrer</Th><Th>New shop</Th><Th>Code</Th><Th>Status</Th><Th align="right">Reward</Th><Th align="right">Date</Th></Tr></THead>
              <TBody>
                {rows.map((r) => (
                  <Tr key={r.id}>
                    <Td><Link to={`/tenants/${r.referrer.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{r.referrer.name}</Link></Td>
                    <Td><Link to={`/tenants/${r.referee.id}`} className="font-medium text-slate-900 hover:text-brand-700">{r.referee.name}</Link></Td>
                    <Td className="font-mono text-[0.8125rem] text-slate-600">{r.code}</Td>
                    <Td><StatusBadge value={r.status} /></Td>
                    <Td align="right" className={r.rewardAmount > 0 ? 'font-semibold text-emerald-700' : 'text-slate-400'}>{r.rewardAmount > 0 ? `+${formatPKR(r.rewardAmount)}` : '—'}</Td>
                    <Td align="right" className="whitespace-nowrap text-slate-500">{formatDate(r.createdAt)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </ListCard>
        </div>

        <Card title="Top referrers" description="By rewards earned" className="h-fit">
          {board.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}</div>
          ) : top.length === 0 ? (
            <EmptyState icon={<Crown className="h-6 w-6" />} title="No referrers yet" description="Shops that bring in paying shops appear here." />
          ) : (
            <ul className="space-y-1">
              {top.map((t, i) => (
                <li key={t.id}>
                  <Link to={`/tenants/${t.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-50">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold', MEDAL[i] ?? 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-medium text-slate-900">{t.name}</span>
                      <span className="block font-mono text-[0.75rem] text-slate-500">{t.referralCode}</span>
                    </span>
                    <span className="text-end">
                      <span className="block text-[0.875rem] font-semibold text-emerald-700">{formatPKR(t.totalEarned)}</span>
                      <span className="block text-[0.75rem] text-slate-500">{t.successfulReferrals} referrals</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Referrals"
          description="Shops earn a reward when a shop they refer becomes a paying customer."
          flowTitle="How a referral pays off"
          flow={[
            { label: 'Shop shares code', icon: Store, color: '#4f46e5' },
            { label: 'New shop signs up', hint: 'Pending', icon: UserPlus, color: '#0284c7' },
            { label: 'New shop pays', hint: 'Converted', icon: Wallet, color: '#d97706' },
            { label: 'Reward added', hint: 'Account credit', icon: Gift, color: '#059669' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Find a referral', text: 'Search by either shop name or the code, and filter by status or date.' },
            { icon: Crown, color: '#d97706', title: 'Top referrers', text: 'The list on the right ranks shops by the rewards they have earned.' },
            { icon: ArrowRight, color: '#059669', title: 'Open a shop', text: 'Click a shop name to see its profile and account credit.' },
          ]}
          tips={['Pending means the new shop has signed up but not paid yet.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
