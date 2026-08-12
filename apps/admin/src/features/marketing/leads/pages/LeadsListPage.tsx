import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Flame, Search, Download, TrendingUp, Users } from 'lucide-react';
import { leadsApi, type Lead } from '../../../../api/marketing/marketing-leads.api';
import { PageHeader } from '../../_shared/components/PageHeader';
import { StatCard } from '../../_shared/components/StatCard';
import { StatusBadge } from '../../_shared/components/StatusBadge';
import { TemperatureBadge } from '../../_shared/components/TemperatureBadge';
import { DataTable } from '../../_shared/components/DataTable';
import { useCsvDownload } from '../../_shared/hooks/useCsvDownload';

export function LeadsListPage() {
  const nav = useNavigate();
  const download = useCsvDownload();
  const [page, setPage] = useState(1);
  const [temperature, setTemperature] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const { data: stats } = useQuery({ queryKey: ['leads-stats'], queryFn: leadsApi.stats });
  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, temperature, status, search],
    queryFn: () => leadsApi.list({ page, limit: 25, temperature: temperature || undefined, status: status || undefined, search: search || undefined }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        subtitle="Aap ki growth ka dil — sab prospects ek jagah"
        actions={
          <button
            onClick={() => download(leadsApi.exportCsvUrl({ temperature, status }), `leads-${Date.now()}.csv`)}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:border-emerald-300"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Leads" value={stats.total.toLocaleString()} icon={Users} />
          <StatCard label="🔥 Fire+Hot" value={stats.temperature.fire + stats.temperature.hot} icon={Flame} deltaColor="up" />
          <StatCard label="Avg Score" value={stats.averageScore} icon={TrendingUp} />
          <StatCard label="Conversion" value={stats.conversionRate} deltaColor="up" hint={`${stats.converted} converted`} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, company…" className="w-full rounded-lg border border-neutral-300 pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={temperature} onChange={(e) => setTemperature(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="">All temperatures</option>
          <option value="FIRE">🔥 Fire</option>
          <option value="HOT">🌶 Hot</option>
          <option value="WARM">☀️ Warm</option>
          <option value="COLD">🥶 Cold</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="DEMO_SCHEDULED">Demo Scheduled</option>
          <option value="DEMO_COMPLETED">Demo Done</option>
          <option value="PROPOSAL_SENT">Proposal Sent</option>
          <option value="NEGOTIATING">Negotiating</option>
          <option value="CONVERTED">Converted</option>
          <option value="LOST">Lost</option>
        </select>
      </div>

      <DataTable<Lead>
        loading={isLoading}
        data={data?.items ?? []}
        keyExtractor={(l) => l.id}
        onRowClick={(l) => nav(`/marketing/leads/${l.id}`)}
        columns={[
          {
            key: 'name',
            header: 'Lead',
            render: (l) => (
              <div>
                <p className="font-medium text-neutral-900">{l.fullName}</p>
                <p className="text-xs text-neutral-500">{l.companyName ?? l.email ?? l.phone}</p>
              </div>
            ),
          },
          { key: 'source', header: 'Source', render: (l) => <span className="text-xs text-neutral-600">{l.source}</span> },
          { key: 'temperature', header: 'Temp', render: (l) => <TemperatureBadge temp={l.temperature} /> },
          {
            key: 'score',
            header: 'Score',
            render: (l) => (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 rounded-full bg-neutral-200">
                  <div
                    className={`h-1.5 rounded-full ${l.score >= 80 ? 'bg-rose-500' : l.score >= 60 ? 'bg-orange-500' : l.score >= 40 ? 'bg-amber-500' : 'bg-sky-500'}`}
                    style={{ width: `${l.score}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-neutral-700">{l.score}</span>
              </div>
            ),
          },
          { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
          { key: 'engagement', header: 'Activity', render: (l) => <span className="text-xs text-neutral-500">{l._count?.activities ?? 0} logs</span> },
        ]}
      />
    </div>
  );
}
