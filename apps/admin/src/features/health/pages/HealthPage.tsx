/**
 * System health: database and server status, memory and CPU load, and the
 * size of the main tables. Refreshes every 30 seconds.
 */

import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, Cpu, Database, HardDrive, Lightbulb, RefreshCw, Server, XCircle } from 'lucide-react';
import { Alert, Card, PageHero, PageShell, Skeleton, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminHealthApi } from '@/api/admin-health.api';
import { DetailList } from '@/ui';
import { num, Pill } from '@/features/shared/kit';
import { cn } from '@/lib/cn';

const gb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(2)} GB`;
const label = (key: string) => key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, (c) => c.toUpperCase());

export default function HealthPage() {
  const guide = usePageGuide();
  const health = useQuery({ queryKey: ['admin-health'], queryFn: adminHealthApi.check, refetchInterval: 30_000 });
  const dbStats = useQuery({ queryKey: ['admin-db-stats'], queryFn: adminHealthApi.dbStats, staleTime: 60_000 });
  const h = health.data;
  const memPct = Number(h?.server.memory.usedPercent ?? 0);
  const ok = h?.status === 'HEALTHY';

  return (
    <PageShell>
      <PageHero
        title="System health"
        chip={h ? (ok ? 'All systems working' : 'Problem found') : undefined}
        busy={health.isFetching}
        loading={health.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={() => { health.refetch(); dbStats.refetch(); }} disabled={health.isFetching}><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={h ? [
          { label: 'Status', value: ok ? 'Healthy' : 'Unhealthy' },
          { label: 'Response time', value: `${h.responseTimeMs} ms` },
          { label: 'Database', value: h.database.status, hint: `${h.database.responseMs} ms` },
          { label: 'Server uptime', value: h.server.uptimeHuman },
        ] : undefined}
      />

      {health.error && <Alert tone="danger">Could not reach the server health check.</Alert>}
      {h && !ok && <Alert tone="danger" title="A problem was found">Check the database and server cards below.</Alert>}

      {!h ? <Skeleton className="h-64 rounded-3xl" /> : (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="Database" description="PostgreSQL" actions={<Database className="h-4 w-4 text-slate-400" />}>
            <DetailList cols={2} items={[
              { label: 'Status', value: <Pill tone={h.database.status === 'OK' ? 'emerald' : 'rose'}>{h.database.status}</Pill> },
              { label: 'Response time', value: `${h.database.responseMs} ms` },
            ]} />
          </Card>
          <Card title="Server" description={`Node.js ${h.server.nodeVersion}`} actions={<Server className="h-4 w-4 text-slate-400" />}>
            <DetailList cols={2} items={[
              { label: 'Uptime', value: h.server.uptimeHuman },
              { label: 'Platform', value: <span className="capitalize">{h.server.platform}</span> },
              { label: 'Last checked', value: new Date(h.checkedAt).toLocaleTimeString('en-PK') },
              { label: 'Check took', value: `${h.responseTimeMs} ms` },
            ]} />
          </Card>
          <Card title="Memory" actions={<HardDrive className="h-4 w-4 text-slate-400" />}>
            <div className="mb-1 flex justify-between text-[0.75rem]"><span className="text-slate-500">In use</span><b className="tabular-nums">{h.server.memory.usedPercent}%</b></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={cn('h-full rounded-full', memPct > 80 ? 'bg-rose-500' : memPct > 60 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${memPct}%` }} />
            </div>
            <DetailList className="mt-4" cols={2} items={[{ label: 'Used', value: gb(h.server.memory.used) }, { label: 'Total', value: gb(h.server.memory.total) }]} />
          </Card>
          <Card title="CPU" description={h.server.cpu.model} actions={<Cpu className="h-4 w-4 text-slate-400" />}>
            <DetailList cols={2} items={[{ label: 'Cores', value: h.server.cpu.cores }]} />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(['1min', '5min', '15min'] as const).map((k) => (
                <div key={k} className="rounded-xl bg-slate-50 p-2 text-center">
                  <div className="text-[0.6875rem] text-slate-500">Load, {k.replace('min', ' min')}</div>
                  <div className="text-[0.9375rem] font-bold tabular-nums">{h.server.cpu.loadAvg[k]}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <Card title="Database records" description="How many rows the main tables hold">
        {!dbStats.data ? <Skeleton className="h-24 rounded-xl" /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(dbStats.data).map(([key, value]) => (
              <div key={key} className="rounded-xl bg-slate-50 p-3">
                <div className="text-[0.75rem] text-slate-500">{label(key)}</div>
                <div className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{num(value)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {guide.isOpen && (
        <PageGuide
          title="System health"
          description="Is the platform working, and how loaded is it?"
          flowTitle="What is checked"
          flow={[
            { label: 'API server', hint: 'Answers this page', icon: Server, color: '#0284c7' },
            { label: 'Database', hint: 'A test query', icon: Database, color: '#4f46e5' },
            { label: 'Memory and CPU', hint: 'Load on the machine', icon: Cpu, color: '#d97706' },
            { label: 'Result', hint: 'Healthy or not', icon: CheckCircle2, color: '#059669' },
          ]}
          steps={[
            { icon: Activity, color: '#4f46e5', title: 'Read the top', text: 'Status, response time and database speed tell you at a glance if something is slow.' },
            { icon: HardDrive, color: '#d97706', title: 'Watch memory', text: 'Memory above 80% turns red. Restart or scale the server if it stays there.' },
            { icon: XCircle, color: '#e11d48', title: 'If unhealthy', text: 'Check the database card first. A failed database check means shops cannot sign in.' },
          ]}
          tips={['The page refreshes by itself every 30 seconds.', 'Record counts are cached for a minute.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
