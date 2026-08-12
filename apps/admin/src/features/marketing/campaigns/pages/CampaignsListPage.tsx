import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Megaphone, Send, PauseCircle, XCircle, Plus, TrendingUp } from 'lucide-react';
import { campaignsApi } from '../../../../api/marketing/marketing-campaigns.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { DataTable } from '../../_shared/components/DataTable';

export function CampaignsListPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');

  const { data: stats } = useQuery({ queryKey: ['campaigns-stats'], queryFn: campaignsApi.stats });
  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', status],
    queryFn: () => campaignsApi.list({ status: status || undefined }),
  });

  const launchMut = useMutation({
    mutationFn: (id: string) => campaignsApi.launch(id),
    onSuccess: (r: any) => { toast.success(`Queued for ${r.queuedFor} recipients`); qc.invalidateQueries({ queryKey: ['campaigns'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Launch fail'),
  });

  const pauseMut = useMutation({
    mutationFn: (id: string) => campaignsApi.pause(id),
    onSuccess: () => { toast.success('Paused'); qc.invalidateQueries({ queryKey: ['campaigns'] }); },
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => campaignsApi.cancel(id),
    onSuccess: () => { toast.success('Cancelled'); qc.invalidateQueries({ queryKey: ['campaigns'] }); },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        subtitle="Broadcast emails + SMS to your audience"
        actions={
          <Link to="/marketing/campaigns/new" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" /> New Campaign
          </Link>
        }
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Sent" value={stats.sent} icon={Send} />
          <StatCard label="Scheduled" value={stats.scheduled} icon={Megaphone} />
          <StatCard label="Open Rate" value={stats.openRate} icon={TrendingUp} deltaColor="up" />
          <StatCard label="Click Rate" value={stats.clickRate} deltaColor="up" hint={stats.ctr + ' CTR'} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="RUNNING">Running</option>
          <option value="COMPLETED">Completed</option>
          <option value="PAUSED">Paused</option>
        </select>
      </div>

      <DataTable
        loading={isLoading}
        data={data?.items ?? []}
        keyExtractor={(c: any) => c.id}
        columns={[
          { key: 'name', header: 'Campaign', render: (c: any) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-neutral-500">{c.subject}</p></div> },
          { key: 'type', header: 'Channel', render: (c: any) => <span className="text-xs">{c.type}</span> },
          { key: 'status', header: 'Status', render: (c: any) => <StatusBadge status={c.status} /> },
          { key: 'recipients', header: 'Recipients', render: (c: any) => c.totalRecipients.toLocaleString() },
          { key: 'sent', header: 'Sent/Opened', render: (c: any) => `${c.totalSent}/${c.totalOpened}` },
          {
            key: 'actions',
            header: '',
            render: (c: any) => (
              <div className="flex gap-1">
                {c.status === 'DRAFT' && (
                  <button onClick={() => { if (confirm('Launch campaign?')) launchMut.mutate(c.id); }} className="rounded px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50">Launch</button>
                )}
                {c.status === 'RUNNING' && (
                  <button onClick={() => pauseMut.mutate(c.id)} className="rounded px-2 py-1 text-xs text-amber-700 hover:bg-amber-50">Pause</button>
                )}
                {(c.status === 'DRAFT' || c.status === 'SCHEDULED' || c.status === 'PAUSED') && (
                  <button onClick={() => { if (confirm('Cancel?')) cancelMut.mutate(c.id); }} className="rounded px-2 py-1 text-xs text-rose-700 hover:bg-rose-50">Cancel</button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
