import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { contactFormsApi, type ContactForm } from '../../../../api/marketing/marketing-contact-forms.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { DataTable } from '../../_shared/components/DataTable';
import { formatDistanceToNow } from 'date-fns';

export function ContactFormsListPage() {
  const prevNew = useRef<number | null>(null);
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['contact-forms-stats'],
    queryFn: contactFormsApi.stats,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const current = (stats as any)?.new ?? null;
    if (current !== null && prevNew.current !== null && current > prevNew.current) {
      toast.success(`New contact form received (${current} pending)`);
    }
    if (current !== null) prevNew.current = current;
  }, [stats]);

  const { data, isLoading } = useQuery({
    queryKey: ['contact-forms', page, status, priority, search],
    refetchInterval: 5000,
    queryFn: () =>
      contactFormsApi.list({
        page,
        limit: 25,
        status: status || undefined,
        priority: priority || undefined,
        search: search || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Contact Forms" subtitle="Inquiries + support tickets ek jagah" />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="New" value={stats.new} icon={MessageSquare} hint={`${stats.total} total`} />
          <StatCard label="Urgent Open" value={stats.urgentOpen} icon={AlertTriangle} deltaColor={stats.urgentOpen > 0 ? 'down' : 'neutral'} />
          <StatCard label="Avg Response" value={`${stats.avgResponseMinutes}m`} icon={Clock} />
          <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle} hint={stats.resolvedRate} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Name, email, message…"
            className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REPLIED">Replied</option>
          <option value="RESOLVED">Resolved</option>
          <option value="SPAM">Spam</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">All priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <DataTable<ContactForm>
        loading={isLoading}
        data={data?.items ?? []}
        keyExtractor={(f) => f.id}
        onRowClick={(f) => nav(`/marketing/contact-forms/${f.id}`)}
        columns={[
          { key: 'ticketNumber', header: 'Ticket', render: (f) => <code className="text-xs font-mono">{f.ticketNumber}</code> },
          {
            key: 'from',
            header: 'From',
            render: (f) => (
              <div>
                <p className="font-medium text-neutral-900">{f.fullName}</p>
                <p className="text-xs text-neutral-500">{f.email}</p>
              </div>
            ),
          },
          {
            key: 'subject',
            header: 'Subject',
            render: (f) => (
              <div className="max-w-md">
                <p className="font-medium text-neutral-800">{f.subject}</p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">{f.message}</p>
              </div>
            ),
          },
          { key: 'priority', header: 'Priority', render: (f) => <StatusBadge status={f.priority} /> },
          { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
          {
            key: 'createdAt',
            header: 'Age',
            render: (f) => (
              <span className="text-xs text-neutral-500">
                {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
              </span>
            ),
          },
        ]}
      />

      {data?.meta && (
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <p>Page {data.meta.page} of {data.meta.totalPages}</p>
          <div className="flex gap-2">
            <button disabled={!data.meta.hasPrev} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button disabled={!data.meta.hasNext} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
