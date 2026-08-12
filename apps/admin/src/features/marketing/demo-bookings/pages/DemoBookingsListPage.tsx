import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, TrendingUp, CheckCircle, XCircle, Search } from 'lucide-react';
import { demoBookingsApi, type DemoBooking } from '../../../../api/marketing/marketing-demo-bookings.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { DataTable } from '../../_shared/components/DataTable';
import { format } from 'date-fns';

export function DemoBookingsListPage() {
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data: stats } = useQuery({ queryKey: ['demos-stats'], queryFn: demoBookingsApi.stats, refetchInterval: 5000 });
  const { data, isLoading } = useQuery({
    queryKey: ['demos', page, status, search],
    refetchInterval: 5000,
    queryFn: () => demoBookingsApi.list({ page, limit: 25, status: status || undefined, search: search || undefined }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Demo Bookings" subtitle="Prospective customers ke demo requests" />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Upcoming" value={stats.upcoming} icon={Calendar} />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle} hint={`${stats.conversionRate} converted`} />
          <StatCard label="Conversion" value={stats.conversionRate} icon={TrendingUp} deltaColor="up" />
          <StatCard label="No-Shows" value={stats.noShow} icon={XCircle} hint={stats.noShowRate} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Name, email, company…"
            className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="NO_SHOW">No Show</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <DataTable<DemoBooking>
        loading={isLoading}
        data={data?.items ?? []}
        keyExtractor={(d) => d.id}
        onRowClick={(d) => nav(`/marketing/demos/${d.id}`)}
        columns={[
          { key: 'bookingNumber', header: 'Booking', render: (d) => <code className="text-xs font-mono">{d.bookingNumber}</code> },
          {
            key: 'prospect',
            header: 'Prospect',
            render: (d) => (
              <div>
                <p className="font-medium text-neutral-900">{d.fullName}</p>
                <p className="text-xs text-neutral-500">{d.companyName ?? d.email}</p>
              </div>
            ),
          },
          {
            key: 'preferredDate',
            header: 'Scheduled',
            render: (d) => (
              <div className="text-sm">
                <p className="text-neutral-800">{format(new Date(d.preferredDate), 'PP')}</p>
                <p className="text-xs text-neutral-500">{d.preferredTime}</p>
              </div>
            ),
          },
          { key: 'industry', header: 'Industry', render: (d) => <span className="text-xs text-neutral-600">{d.industry ?? '—'}</span> },
          { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.status} /> },
          { key: 'interest', header: 'Interest', render: (d) => d.interestLevel ? <StatusBadge status={d.interestLevel} /> : <span className="text-xs text-neutral-400">—</span> },
        ]}
      />
    </div>
  );
}
