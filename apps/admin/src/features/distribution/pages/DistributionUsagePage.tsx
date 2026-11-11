/**
 * Distribution usage: every business that uses wholesale and distribution,
 * with its booker logins (what we bill per login), bookers active in the
 * last 30 days and orders booked. A plan gets the feature in Plans.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Lightbulb, ReceiptText, Truck, UserCheck, Users } from 'lucide-react';
import { Badge, FilterBar, FilterChip, PageHero, PageShell, SearchField, Switch, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminDistributionApi } from '@/api/admin-distribution.api';
import { formatPKR } from '@/lib/format';
import { industryForType } from '@/lib/industries';
import { ListCard, StatusBadge, useListParams } from '@/ui';

const num = (n: number) => n.toLocaleString('en-PK');

export default function DistributionUsagePage() {
  const guide = usePageGuide();
  const list = useListParams({ on: '0' });
  const onlyOn = list.filters.on === '1';
  const query = { search: list.debouncedSearch || undefined, onlyOn: onlyOn || undefined };

  const usage = useQuery({
    queryKey: ['admin', 'distribution', query, list.page, list.limit],
    queryFn: () => adminDistributionApi.usage({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const t = usage.data?.totals;
  const rows = usage.data?.tenants ?? [];

  return (
    <PageShell>
      <PageHero
        title="Distribution usage"
        chip={t ? `${num(t.tenants)} businesses` : undefined}
        busy={usage.isFetching}
        loading={usage.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={t ? [
          { label: 'Booker logins', value: num(t.bookerLogins), hint: 'The billable count' },
          { label: 'Switched on', value: num(t.switchedOn ?? t.tenants), hint: `of ${num(t.tenants)} businesses` },
          { label: 'Orders, 30 days', value: num(t.orders30d ?? 0) },
          { label: 'Order value, 30 days', value: formatPKR(t.orderValue30d ?? 0) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search business name" />}
        chips={onlyOn ? [<FilterChip key="on" onRemove={() => list.setFilter('on', '0')}>Only switched on</FilterChip>] : undefined}
        onClear={list.clear}
      >
        <div className="flex h-11 items-center rounded-2xl bg-slate-100/80 px-3">
          <Switch size="sm" label="Only switched on" checked={onlyOn} onChange={(e) => list.setFilter('on', e.target.checked ? '1' : '0')} />
        </div>
      </FilterBar>

      <ListCard
        loading={usage.isLoading}
        empty={!rows.length}
        emptyIcon={<Truck className="h-6 w-6" />}
        emptyTitle="No business uses distribution"
        emptyText="Businesses appear here once they switch on wholesale and distribution."
        page={list.page} limit={list.limit} total={usage.data?.meta?.total ?? rows.length} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="58rem">
          <THead>
            <Tr><Th>Business</Th><Th>Plan</Th><Th>Switch</Th><Th align="right">Booker logins</Th><Th align="right">Active bookers, 30d</Th><Th align="right">Orders, 30d</Th><Th align="right">Order value, 30d</Th></Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.tenantId}>
                <Td>
                  <Link to={`/tenants/${r.tenantId}`} className="font-semibold text-slate-900 hover:text-brand-700">{r.name}</Link>
                  <div className="text-[0.75rem] text-slate-500">{industryForType(r.businessType ?? 'NONE').label} · <StatusBadge value={r.status} /></div>
                </Td>
                <Td>
                  {r.plan ? (
                    <>
                      <Badge variant={r.plan.featureDistribution ? 'success' : 'danger'}>{r.plan.name}{r.plan.featureDistribution ? '' : ', not included'}</Badge>
                      {r.subscriptionStatus && <div className="mt-0.5 text-[0.75rem] text-slate-500">{r.subscriptionStatus.replace(/_/g, ' ').toLowerCase()}</div>}
                    </>
                  ) : <span className="text-[0.8125rem] text-slate-400">No plan</span>}
                </Td>
                <Td><StatusBadge value={r.enabled ? 'ENABLED' : 'DISABLED'} label={r.enabled ? 'On' : 'Off'} /></Td>
                <Td align="right"><span className="inline-flex items-center gap-1 font-bold tabular-nums text-slate-900"><Users className="h-3.5 w-3.5 text-slate-400" />{num(r.bookerLogins)}</span></Td>
                <Td align="right"><span className="inline-flex items-center gap-1 tabular-nums text-slate-700"><UserCheck className="h-3.5 w-3.5 text-slate-400" />{num(r.activeBookers30d)}</span></Td>
                <Td align="right" className="tabular-nums">{num(r.orders30d)}</Td>
                <Td align="right" className="font-semibold tabular-nums">{formatPKR(r.orderValue30d)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Distribution usage"
          description="Businesses that run wholesale and distribution, and how many booker logins each one uses."
          flowTitle="How usage is counted"
          flow={[
            { label: 'Plan includes it', icon: Boxes, color: '#4f46e5' },
            { label: 'Business switches on', icon: Truck, color: '#0284c7' },
            { label: 'Adds booker logins', hint: 'Billed per login', icon: Users, color: '#d97706' },
            { label: 'Bookers take orders', icon: ReceiptText, color: '#059669' },
          ]}
          steps={[
            { icon: Users, color: '#d97706', title: 'Booker logins', text: 'An active staff user, not the owner, who is allowed to book orders. This is what we bill.' },
            { icon: UserCheck, color: '#059669', title: 'Active bookers', text: 'Bookers who booked at least one order in the last 30 days.' },
            { icon: Boxes, color: '#4f46e5', title: 'Plan not included', text: 'A red plan means the business uses distribution but its plan does not include it. Fix this in Plans.' },
          ]}
          tips={['Click a business name to open its profile.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
