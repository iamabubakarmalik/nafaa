import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MapPin, RefreshCw, Sparkles, Activity, User, Briefcase, Clock,
  Zap, Truck, CheckCircle2,
} from 'lucide-react';
import { dispatchApi } from '../api/dispatch.api';
import { Button } from '@core/ui/Button';
import { format } from 'date-fns';

export default function DispatchPage() {
  const [selectedTech, setSelectedTech] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dispatch-live-map'],
    queryFn: () => dispatchApi.liveMap(),
    refetchInterval: 15_000,
  });

  const technicians = data?.technicians ?? [];
  const activeJobs = data?.activeJobs ?? [];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-red-900 to-rose-800 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Real-time Tracking
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">📍 Live Map / Dispatch</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">All technicians & active jobs in real-time</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur px-4 py-2.5 text-sm font-bold border border-white/20">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </div>
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Technicians Tracked" value={technicians.length} icon={User} color="violet" />
        <StatCard label="Active Jobs" value={activeJobs.length} icon={Briefcase} color="blue" />
        <StatCard label="Available Now" value={technicians.filter((t: any) => t.status === 'AVAILABLE').length} icon={CheckCircle2} color="emerald" />
        <StatCard label="On Job" value={technicians.filter((t: any) => t.status === 'ON_JOB').length} icon={Activity} color="amber" />
      </section>

      {isLoading ? (
        <div className="h-96 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />
      ) : (
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Map placeholder (would integrate real map here) */}
          <div className="rounded-3xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-950/40 dark:to-cyan-950/40 border-2 border-blue-200 dark:border-blue-800 min-h-[500px] p-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.4) 0%, transparent 40%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.4) 0%, transparent 40%)',
            }} />

            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-blue-700" />
                <h3 className="font-extrabold text-blue-900 dark:text-blue-300">Interactive Map</h3>
              </div>

              {/* Simulated map with dots */}
              <div className="relative h-96 rounded-2xl bg-white/50 dark:bg-neutral-900/50 backdrop-blur border-2 border-white/60 shadow-inner overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-20">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} className="border border-slate-300" />
                  ))}
                </div>

                {/* Technician markers */}
                {technicians.map((t: any, i: number) => {
                  const x = 10 + (i * 13) % 80;
                  const y = 15 + (i * 17) % 70;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTech(t.id)}
                      className={
                        'absolute h-8 w-8 rounded-full text-white flex items-center justify-center font-extrabold text-xs shadow-lg transition-transform hover:scale-125 ' +
                        (t.status === 'AVAILABLE' ? 'bg-emerald-500' :
                         t.status === 'ON_JOB' ? 'bg-amber-500 animate-pulse' :
                         'bg-slate-500')
                      }
                      style={{ left: x + '%', top: y + '%' }}
                      title={t.name?.firstName}
                    >
                      {t.name?.firstName?.charAt(0)?.toUpperCase() || '?'}
                    </button>
                  );
                })}

                {/* Job markers */}
                {activeJobs.slice(0, 20).map((j: any, i: number) => {
                  const x = 20 + (i * 11) % 70;
                  const y = 25 + (i * 19) % 60;
                  return (
                    <Link
                      key={j.id}
                      to={'/services-biz/jobs/' + j.id}
                      className={
                        'absolute h-6 w-6 rounded-lg flex items-center justify-center shadow-lg transition-transform hover:scale-125 ' +
                        (j.priority === 'EMERGENCY' ? 'bg-red-600 animate-pulse' :
                         j.priority === 'URGENT' ? 'bg-red-500' :
                         'bg-blue-500')
                      }
                      style={{ left: x + '%', top: y + '%' }}
                      title={j.jobNumber}
                    >
                      <Briefcase className="h-3 w-3 text-white" />
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <div className="inline-flex items-center gap-1 font-bold">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Available
                </div>
                <div className="inline-flex items-center gap-1 font-bold">
                  <span className="h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                  On Job
                </div>
                <div className="inline-flex items-center gap-1 font-bold">
                  <span className="h-3 w-3 rounded-full bg-slate-500" />
                  Off Duty
                </div>
                <div className="inline-flex items-center gap-1 font-bold">
                  <span className="h-3 w-3 rounded bg-blue-500" />
                  Job
                </div>
                <div className="inline-flex items-center gap-1 font-bold">
                  <span className="h-3 w-3 rounded bg-red-600 animate-pulse" />
                  Emergency
                </div>
              </div>
            </div>
          </div>

          {/* Technicians list */}
          <div className="space-y-4">
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-violet-50 dark:bg-violet-950/30">
                <h3 className="font-extrabold flex items-center gap-2">
                  <User className="h-4 w-4 text-violet-600" />
                  Technicians ({technicians.length})
                </h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {technicians.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500 font-semibold">
                    <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    No GPS locations
                  </div>
                ) : (
                  technicians.map((t: any) => (
                    <div key={t.id} className="p-3 flex items-center gap-3">
                      <div className={
                        'h-10 w-10 rounded-xl text-white flex items-center justify-center font-extrabold shrink-0 ' +
                        (t.status === 'AVAILABLE' ? 'bg-emerald-500' :
                         t.status === 'ON_JOB' ? 'bg-amber-500' :
                         'bg-slate-500')
                      }>
                        {t.name?.firstName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate">
                          {((t.name?.firstName || '') + ' ' + (t.name?.lastName || '')).trim() || 'Technician'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{t.status.replace('_', ' ')}</div>
                        {t.lastLocationAt && (
                          <div className="text-[10px] font-bold text-slate-500">
                            Updated: {format(new Date(t.lastLocationAt), 'HH:mm')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b bg-blue-50 dark:bg-blue-950/30">
                <h3 className="font-extrabold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  Active Jobs ({activeJobs.length})
                </h3>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {activeJobs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500 font-semibold">No active jobs</div>
                ) : (
                  activeJobs.map((j: any) => (
                    <Link key={j.id} to={'/services-biz/jobs/' + j.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition">
                      <div className={
                        'h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 ' +
                        (j.priority === 'EMERGENCY' ? 'bg-red-600 animate-pulse' :
                         j.priority === 'URGENT' ? 'bg-red-500' :
                         'bg-blue-500')
                      }>
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate">{j.jobNumber}</div>
                        <div className="text-[10px] font-bold text-slate-500 truncate">{j.customerName} • {j.serviceName}</div>
                        {j.address && (
                          <div className="text-[10px] text-slate-500 font-semibold truncate">📍 {j.address}</div>
                        )}
                      </div>
                      <span className="text-[9px] font-extrabold uppercase text-white px-2 py-0.5 rounded shrink-0 bg-slate-500">
                        {j.status.replace('_', ' ')}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    violet: 'from-violet-500 to-purple-600',
    blue: 'from-blue-500 to-cyan-600',
    emerald: 'from-emerald-500 to-green-600',
    amber: 'from-amber-500 to-orange-600',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</div>
        </div>
        <div className={'h-12 w-12 rounded-2xl bg-gradient-to-br ' + colors[color] + ' text-white flex items-center justify-center shadow-lg'}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
