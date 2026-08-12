import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Mail, Search, Download, Send, UserX, UserCheck, Trash2, Tag,
} from 'lucide-react';
import { newsletterApi, type Subscriber } from '../../../../api/marketing/marketing-newsletter.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { DataTable } from '../../_shared/components/DataTable';
import { EmptyState } from '../../_shared/components/EmptyState';
import { useCsvDownload } from '../../_shared/hooks/useCsvDownload';
import { formatDistanceToNow } from 'date-fns';

export function SubscribersListPage() {
  const qc = useQueryClient();
  const download = useCsvDownload();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [selected, setSelected] = useState<string[]>([]);

  const { data: stats } = useQuery({
    queryKey: ['newsletter-stats'],
    queryFn: newsletterApi.stats,
    refetchInterval: 5000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['newsletter-list', page, search, status],
    refetchInterval: 5000,
    queryFn: () => newsletterApi.list({ page, limit: 25, search, status: status || undefined }),
  });

  const bulkMut = useMutation({
    mutationFn: newsletterApi.bulk,
    onSuccess: (r) => {
      toast.success(`${r.count ?? selected.length} subscribers updated`);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ['newsletter-list'] });
      qc.invalidateQueries({ queryKey: ['newsletter-stats'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Bulk action fail'),
  });

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };
  const toggleAll = () => {
    if (selected.length === data?.items.length) setSelected([]);
    else setSelected(data?.items.map((s: Subscriber) => s.id) ?? []);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletter Subscribers"
        subtitle={`${stats?.total.toLocaleString() ?? 0} total • ${stats?.growthRate ?? '0%'} growth`}
        actions={
          <>
            <Link
              to="/marketing/newsletter/send"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" />
              Send Newsletter
            </Link>
            <button
              onClick={() =>
                download(
                  newsletterApi.exportCsvUrl({ search, status: status || undefined }),
                  `subscribers-${Date.now()}.csv`,
                )
              }
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:border-emerald-300"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </>
        }
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={stats.total.toLocaleString()} icon={Mail} />
          <StatCard label="Active" value={stats.active.toLocaleString()} delta={stats.growthRate} deltaColor="up" />
          <StatCard label="Unsubscribed" value={stats.unsubscribed.toLocaleString()} hint={stats.unsubscribeRate} />
          <StatCard label="Bounced" value={stats.bounced.toLocaleString()} hint={stats.bounceRate} />
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
            placeholder="Email, first name, last name…"
            className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="UNSUBSCRIBED">Unsubscribed</option>
          <option value="BOUNCED">Bounced</option>
          <option value="PENDING_CONFIRMATION">Pending</option>
          <option value="COMPLAINED">Complained</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm">
          <span className="font-medium text-emerald-800">{selected.length} selected</span>
          <button
            onClick={() => bulkMut.mutate({ subscriberIds: selected, action: 'UNSUBSCRIBE' })}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          >
            <UserX className="h-3 w-3" /> Unsubscribe
          </button>
          <button
            onClick={() => bulkMut.mutate({ subscriberIds: selected, action: 'REACTIVATE' })}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          >
            <UserCheck className="h-3 w-3" /> Reactivate
          </button>
          <button
            onClick={() => {
              const tag = prompt('Tag naam?');
              if (tag) bulkMut.mutate({ subscriberIds: selected, action: 'TAG', tag });
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          >
            <Tag className="h-3 w-3" /> Tag
          </button>
          <button
            onClick={() => {
              if (confirm('Delete these subscribers permanently?'))
                bulkMut.mutate({ subscriberIds: selected, action: 'DELETE' });
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      )}

      <DataTable<Subscriber>
        loading={isLoading}
        data={data?.items ?? []}
        keyExtractor={(s) => s.id}
        empty={<EmptyState icon={Mail} title="No subscribers yet" message="Signup form live hote hi entries yahan aayen ge." />}
        columns={[
          {
            key: 'select',
            header: (
              <input
                type="checkbox"
                checked={selected.length === data?.items?.length && data?.items?.length > 0}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-neutral-300"
              />
            ) as any,
            render: (s) => (
              <input
                type="checkbox"
                checked={selected.includes(s.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggle(s.id);
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-neutral-300"
              />
            ),
          },
          {
            key: 'email',
            header: 'Subscriber',
            render: (s) => (
              <div>
                <p className="font-medium text-neutral-900">{s.email}</p>
                {(s.firstName || s.lastName) && (
                  <p className="text-xs text-neutral-500">{[s.firstName, s.lastName].filter(Boolean).join(' ')}</p>
                )}
              </div>
            ),
          },
          { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
          { key: 'source', header: 'Source', render: (s) => <span className="text-xs text-neutral-500">{s.source ?? '—'}</span> },
          {
            key: 'engagement',
            header: 'Engagement',
            render: (s) => (
              <div className="text-xs">
                <div className="font-medium text-neutral-700">{s.engagementScore.toFixed(0)}</div>
                <div className="text-neutral-500">
                  {s.totalOpened}/{s.totalClicked} opens/clicks
                </div>
              </div>
            ),
          },
          {
            key: 'createdAt',
            header: 'Joined',
            render: (s) => (
              <span className="text-xs text-neutral-500">
                {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
              </span>
            ),
          },
        ]}
      />

      {data && data.meta && (
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <p>
            Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total.toLocaleString()} total
          </p>
          <div className="flex gap-2">
            <button
              disabled={!data.meta.hasPrev}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={!data.meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
