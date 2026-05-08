import { useQuery } from '@tanstack/react-query';
import {
  Activity, Database, Server, Cpu, HardDrive, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import { adminHealthApi } from '@/api/admin-health.api';
import { Button } from '@/components/ui/Button';

export default function HealthPage() {
  const { data: health, refetch: refetchHealth, isFetching } = useQuery({
    queryKey: ['admin-health'],
    queryFn: adminHealthApi.check,
    refetchInterval: 30000,
  });

  const { data: dbStats } = useQuery({
    queryKey: ['admin-db-stats'],
    queryFn: adminHealthApi.dbStats,
  });

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(2)} GB`;
  };

  return (
    <div className="space-y-6">
      <section className={`rounded-3xl p-6 shadow-soft text-white ${
        health?.status === 'HEALTHY'
          ? 'bg-gradient-to-br from-emerald-900 to-emerald-700'
          : 'bg-gradient-to-br from-rose-900 to-rose-700'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Activity className="h-3.5 w-3.5" /> Live System Status
            </div>
            <h2 className="mt-3 text-3xl font-bold flex items-center gap-3">
              {health?.status === 'HEALTHY' ? (
                <><CheckCircle2 className="h-8 w-8" /> All Systems Operational</>
              ) : (
                <><XCircle className="h-8 w-8" /> System Issue Detected</>
              )}
            </h2>
            <p className="mt-2 text-sm text-white/80">
              Auto-refresh every 30s • Response: {health?.responseTimeMs ?? 0}ms
            </p>
          </div>
          <Button variant="secondary" onClick={() => refetchHealth()} loading={isFetching}>
            <RefreshCw className="h-4 w-4" /> Refresh Now
          </Button>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Database</h3>
              <p className="text-xs text-slate-500">PostgreSQL</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Status:</span>
              <span className={`font-bold ${health?.database.status === 'OK' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {health?.database.status ?? 'Loading...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Response Time:</span>
              <span className="font-bold">{health?.database.responseMs ?? 0}ms</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Server</h3>
              <p className="text-xs text-slate-500">Node.js {health?.server.nodeVersion}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Uptime:</span>
              <span className="font-bold">{health?.server.uptimeHuman ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Platform:</span>
              <span className="font-bold capitalize">{health?.server.platform ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <HardDrive className="h-5 w-5" />
            </div>
            <h3 className="font-bold">Memory</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Usage</span>
                <span className="font-bold">{health?.server.memory.usedPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${
                  Number(health?.server.memory.usedPercent ?? 0) > 80 ? 'bg-rose-500' :
                  Number(health?.server.memory.usedPercent ?? 0) > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`} style={{ width: `${health?.server.memory.usedPercent ?? 0}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500">Used</div>
                <div className="font-bold">{formatBytes(health?.server.memory.used ?? 0)}</div>
              </div>
              <div>
                <div className="text-slate-500">Total</div>
                <div className="font-bold">{formatBytes(health?.server.memory.total ?? 0)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="font-bold">CPU</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Cores:</span>
              <span className="font-bold">{health?.server.cpu.cores ?? 0}</span>
            </div>
            <div className="text-xs text-slate-500 truncate">{health?.server.cpu.model}</div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-lg bg-slate-50 p-2 text-center">
                <div className="text-[10px] text-slate-500">1 min</div>
                <div className="font-bold text-sm">{health?.server.cpu.loadAvg['1min']}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 text-center">
                <div className="text-[10px] text-slate-500">5 min</div>
                <div className="font-bold text-sm">{health?.server.cpu.loadAvg['5min']}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 text-center">
                <div className="text-[10px] text-slate-500">15 min</div>
                <div className="font-bold text-sm">{health?.server.cpu.loadAvg['15min']}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-xl mb-4">Database Records</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {dbStats && Object.entries(dbStats).map(([key, value]) => (
            <div key={key} className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
