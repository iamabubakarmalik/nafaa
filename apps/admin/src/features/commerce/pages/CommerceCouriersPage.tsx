/**
 * Courier accounts per shop (provider, active, last tested, last error,
 * shipments), booking failure rate per courier over 30 days, and the latest
 * courier API errors. API keys are never shown. The account list is searched
 * and paged on the server.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Lightbulb, Plug, Search, Truck } from 'lucide-react';
import { Card, FilterBar, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCommerceApi } from '@/api/admin-commerce.api';
import { ListCard, useListParams } from '@/ui';
import { Empty, MiniTable, num, Pill } from '@/features/shared/kit';
import { dateTime, enumLabel, when } from '../components/CommerceUi';

export default function CommerceCouriersPage() {
  const guide = usePageGuide();
  const list = useListParams();
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-commerce-couriers', list.debouncedSearch, list.page, list.limit],
    queryFn: () => adminCommerceApi.couriers({ search: list.debouncedSearch || undefined, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const booked = (data?.rates ?? []).reduce((s, r) => s + r.booked, 0);
  const failed = (data?.rates ?? []).reduce((s, r) => s + r.failed, 0);
  const a = data?.accountStats;
  const accounts = data?.accounts ?? [];

  return (
    <PageShell>
      <PageHero
        title="Couriers"
        chip={a ? `${num(a.total)} accounts` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={data && a ? [
          { label: 'Active accounts', value: num(a.active), hint: `of ${num(a.total)}` },
          { label: 'Accounts with an error', value: num(a.withError) },
          { label: 'Booked (30 days)', value: num(booked) },
          { label: 'Booking failures (30 days)', value: num(failed), hint: booked + failed ? `${Math.round((failed / (booked + failed)) * 100)}% of attempts` : undefined },
        ] : undefined}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card flush title="Booking failure rate by courier" description="Last 30 days. A failure is an auto-booking that did not go through.">
          <MiniTable minWidth="28rem" head={['Courier', 'Booked', 'Failed', 'Failure rate', 'Shops']} empty="No bookings in the last 30 days."
            rows={(data?.rates ?? []).map((r) => [
              <span key="c" className="font-semibold text-slate-900">{r.courier === 'UNKNOWN' ? 'Not chosen yet' : enumLabel(r.courier)}</span>,
              r.booked, r.failed,
              <span key="r" className={(r.failureRate ?? 0) > 20 ? 'font-bold text-rose-700' : ''}>{r.failureRate == null ? '—' : `${r.failureRate}%`}</span>,
              r.tenants,
            ])} />
        </Card>
        <Card flush title="Recent courier errors" description="Account errors and failed bookings, newest first">
          {!data?.recentErrors.length ? <Empty>No courier errors.</Empty> : (
            <ul className="max-h-[22rem] divide-y divide-slate-100 overflow-y-auto text-[0.875rem]">
              {data.recentErrors.map((e, i) => (
                <li key={i} className="px-4 py-2.5 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={e.kind === 'account' ? 'rose' : 'amber'}>{e.kind === 'account' ? 'Account' : 'Booking'}</Pill>
                    <span className="font-semibold text-slate-800">{e.courier ? enumLabel(e.courier) : 'Courier'}</span>
                    <Link to={`/tenants/${e.tenantId}`} className="text-[0.75rem] text-slate-600 hover:text-brand-700">{e.tenantName}</Link>
                    {e.number && <span className="text-[0.75rem] text-slate-500">Order {e.number}</span>}
                    <span className="ms-auto text-[0.75rem] text-slate-500">{dateTime(e.at)}</span>
                  </div>
                  <p className="mt-0.5 break-words text-[0.75rem] text-slate-700">{e.error}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <FilterBar search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search accounts by shop or courier" />} />

      <ListCard
        title="Courier accounts"
        loading={isLoading}
        empty={!!error || !accounts.length}
        emptyIcon={<Truck className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load couriers' : 'No courier accounts match'}
        emptyText={error ? 'Try again in a moment.' : 'Shops have not connected a courier, or the search matches nothing.'}
        page={list.page} limit={list.limit} total={data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="52rem">
          <THead><Tr><Th>Shop</Th><Th>Courier</Th><Th>State</Th><Th>Last tested</Th><Th>Last sync</Th><Th align="right">Shipments</Th><Th>Last error</Th></Tr></THead>
          <TBody>
            {accounts.map((x) => (
              <Tr key={x.id}>
                <Td><Link to={`/tenants/${x.tenantId}`} className="font-semibold text-slate-900 hover:text-brand-700">{x.tenantName ?? x.tenantId}</Link></Td>
                <Td>{enumLabel(x.provider)}</Td>
                <Td><div className="flex gap-1"><Pill tone={x.isActive ? 'emerald' : 'slate'}>{x.isActive ? 'Active' : 'Off'}</Pill>{x.isSandbox && <Pill tone="amber">Sandbox</Pill>}</div></Td>
                <Td className="whitespace-nowrap">{when(x.lastTestedAt)}</Td>
                <Td className="whitespace-nowrap">{when(x.lastSyncAt)}</Td>
                <Td align="right">{x.shipments}</Td>
                <Td className="max-w-[20rem] text-[0.75rem] text-rose-700">{x.lastError ?? <span className="text-slate-400">—</span>}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Couriers"
          description="Courier accounts shops connected, and how well bookings are going."
          flowTitle="How a courier booking goes"
          flow={[
            { label: 'Shop connects', hint: 'Adds courier keys', icon: Plug, color: '#4f46e5' },
            { label: 'Order confirmed', hint: 'Booking is tried', icon: CheckCircle2, color: '#0284c7' },
            { label: 'Booked or failed', hint: 'Error is saved', icon: AlertTriangle, color: '#d97706' },
            { label: 'Delivered', hint: 'Tracking updates', icon: Truck, color: '#059669' },
          ]}
          steps={[
            { icon: AlertTriangle, color: '#e11d48', title: 'Read failure rate', text: 'Over 20% failed bookings for one courier usually means a courier outage or bad shop settings.' },
            { icon: Search, color: '#4f46e5', title: 'Find an account', text: 'Search by shop name or courier. API keys are never shown.' },
            { icon: Truck, color: '#059669', title: 'Follow errors', text: 'Recent errors name the shop and order, so you can open the shop and help.' },
          ]}
          tips={['A sandbox account books test shipments only.', 'Errors on accounts come from the last test or sync.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
