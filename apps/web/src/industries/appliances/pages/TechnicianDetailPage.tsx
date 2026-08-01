import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Zap, Phone, MapPin, Star, Award, TrendingUp,
  Calendar, HardHat, Wrench, CheckCircle2, Clock, DollarSign,
  User, FileText, BarChart3, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { techniciansApi } from '../api/technicians.api';
import { installationsApi } from '../api/installations.api';
import { serviceRequestsApi } from '../api/service-requests.api';
import { formatPKR } from '@core/lib/format';

type Tab = 'overview' | 'installations' | 'service' | 'schedule';

export default function TechnicianDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  const { data: tech, isLoading } = useQuery({
    queryKey: ['technician', id],
    queryFn: () => techniciansApi.getOne(id!),
    enabled: !!id,
  });

  const { data: installs = [] } = useQuery({
    queryKey: ['installations-by-tech', id],
    queryFn: () => installationsApi.list({ technicianId: id }),
    enabled: !!id,
  });

  const { data: serviceReqs = [] } = useQuery({
    queryKey: ['service-by-tech', id],
    queryFn: () => serviceRequestsApi.list({ technicianId: id }),
    enabled: !!id,
  });

  const stats = useMemo(() => {
    const completed = installs.filter((i: any) => i.status === 'COMPLETED').length +
      serviceReqs.filter((s: any) => s.status === 'COMPLETED').length;
    const pending = installs.filter((i: any) => ['PENDING', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS'].includes(i.status)).length +
      serviceReqs.filter((s: any) => ['REQUESTED', 'SCHEDULED', 'TECHNICIAN_ASSIGNED', 'ON_SITE', 'IN_PROGRESS'].includes(s.status)).length;

    const now = Date.now();
    const monthAgo = now - 30 * 86400000;
    const monthlyRevenue = [
      ...installs.filter((i: any) => new Date(i.completedAt || 0).getTime() >= monthAgo),
      ...serviceReqs.filter((s: any) => new Date(s.completedAt || 0).getTime() >= monthAgo),
    ].reduce((sum: number, item: any) => sum + Number(item.totalCharge || 0), 0);

    return { completed, pending, monthlyRevenue };
  }, [installs, serviceReqs]);

  const chartData = useMemo(() => {
    const buckets: Record<string, { day: string; jobs: number; revenue: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { day: `${d.getDate()}/${d.getMonth() + 1}`, jobs: 0, revenue: 0 };
    }
    [...installs, ...serviceReqs].forEach((item: any) => {
      if (item.completedAt) {
        const key = new Date(item.completedAt).toISOString().slice(0, 10);
        if (buckets[key]) {
          buckets[key].jobs += 1;
          buckets[key].revenue += Number(item.totalCharge || 0);
        }
      }
    });
    return Object.values(buckets);
  }, [installs, serviceReqs]);

  if (isLoading || !tech) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/appliances/technicians')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> All Technicians
      </button>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative grid lg:grid-cols-[240px_1fr] gap-6 p-6">
          <div className="mx-auto lg:mx-0">
            {tech.photoUrl ? (
              <img src={tech.photoUrl} alt={tech.name} className="h-48 w-48 rounded-3xl object-cover border-4 border-white/20 shadow-xl" />
            ) : (
              <div className="h-48 w-48 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center font-extrabold text-6xl shadow-xl border-4 border-white/20">
                {tech.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Zap className="h-3.5 w-3.5 text-amber-300" /> Technician
              {tech.isActive ? (
                <span className="text-emerald-300">• ACTIVE</span>
              ) : (
                <span className="text-rose-300">• INACTIVE</span>
              )}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">{tech.name}</h1>
            <div className="mt-2 text-sm font-mono font-bold text-white/70">{tech.employeeCode}</div>

            <div className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">
              <a href={`tel:${tech.phone}`} className="inline-flex items-center gap-2 font-bold text-emerald-300 hover:underline">
                <Phone className="h-4 w-4" /> {tech.phone}
              </a>
              {tech.currentZone && (
                <div className="inline-flex items-center gap-2 font-bold text-white/80">
                  <MapPin className="h-4 w-4" /> {tech.currentZone}
                </div>
              )}
              {tech.experienceYears && (
                <div className="inline-flex items-center gap-2 font-bold text-white/80">
                  <Award className="h-4 w-4" /> {tech.experienceYears} years exp
                </div>
              )}
              {tech.avgRating && (
                <div className="inline-flex items-center gap-2 font-bold text-amber-300">
                  <Star className="h-4 w-4 fill-current" /> {tech.avgRating.toFixed(1)} ({tech.totalReviews} reviews)
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <HeroStat icon={CheckCircle2} label="Completed" value={String(stats.completed)} tone="emerald" />
              <HeroStat icon={Clock} label="Pending" value={String(stats.pending)} tone="amber" />
              <HeroStat icon={TrendingUp} label="Total Jobs" value={String(tech.totalJobs)} tone="blue" />
              <HeroStat icon={DollarSign} label="Total Revenue" value={formatPKR(tech.totalRevenue)} tone="violet" />
            </div>
          </div>
        </div>
      </section>

      {/* SPECIALIZATIONS */}
      {tech.specializations?.length > 0 && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-violet-700" />
            <h3 className="font-extrabold text-slate-900">Specializations</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {tech.specializations.map((s: string) => (
              <span key={s} className="px-3 py-1.5 rounded-lg bg-violet-100 text-violet-800 text-sm font-extrabold">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* RATES */}
      <section className="grid grid-cols-3 gap-3">
        <RateCard label="Visit Charge" value={formatPKR(tech.visitChargeRate)} icon={HardHat} tone="amber" />
        <RateCard label="Hourly Rate" value={tech.hourlyRate > 0 ? formatPKR(tech.hourlyRate) : '—'} icon={Clock} tone="blue" />
        <RateCard label="Commission" value={`${tech.commissionPct}%`} icon={TrendingUp} tone="emerald" />
      </section>

      {/* TABS */}
      <section className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-2 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {[
            { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
            { id: 'installations' as Tab, label: 'Installations', count: installs.length, icon: HardHat },
            { id: 'service' as Tab, label: 'Service Requests', count: serviceReqs.length, icon: Wrench },
            { id: 'schedule' as Tab, label: 'Schedule', icon: Calendar },
          ].map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={['px-4 py-2.5 rounded-xl text-sm font-extrabold inline-flex items-center gap-2 transition',
                  active ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'].join(' ')}>
                <Icon className="h-4 w-4" />
                {t.label}
                {t.count !== undefined && (
                  <span className={['px-1.5 rounded-full text-[10px] font-extrabold', active ? 'bg-white/25' : 'bg-slate-200 text-slate-700'].join(' ')}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shadow-md">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">30-Day Performance</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Monthly revenue: <strong className="text-emerald-700">{formatPKR(stats.monthlyRevenue)}</strong>
                </p>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} interval={4} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={((v: any, name: any) => name === 'Revenue' ? formatPKR(Number(v)) : v) as any} contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-slate-700" />
              <h3 className="font-extrabold text-slate-900">Additional Info</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {tech.cnic && <InfoBox label="CNIC" value={tech.cnic} mono />}
              {tech.address && <InfoBox label="Address" value={tech.address} />}
              <InfoBox label="Work Hours" value={`${tech.workStartTime} - ${tech.workEndTime}`} />
              {tech.certifications?.length > 0 && (
                <InfoBox label="Certifications" value={tech.certifications.join(', ')} />
              )}
            </div>
            {tech.notes && (
              <div className="mt-3">
                <div className="text-xs font-extrabold uppercase text-slate-500 mb-1">Notes</div>
                <div className="text-sm text-slate-700 font-semibold p-3 bg-slate-50 rounded-xl">{tech.notes}</div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* INSTALLATIONS TAB */}
      {tab === 'installations' && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
            <h3 className="font-extrabold text-slate-900">Installations ({installs.length})</h3>
          </div>
          {installs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500 font-semibold">No installations assigned</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {installs.map((inst: any) => (
                <div key={inst.id} className="px-5 py-3 flex items-center gap-3 hover:bg-amber-50/40">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <HardHat className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm text-slate-900">{inst.installationNumber}</span>
                      <StatusBadge status={inst.status} />
                    </div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                      {inst.productName} • {inst.customerName}
                    </div>
                    {inst.scheduledDate && (
                      <div className="text-[10px] text-slate-500 font-bold">
                        📅 {new Date(inst.scheduledDate).toLocaleDateString('en-PK')}
                        {inst.scheduledTimeSlot && ` • ${inst.scheduledTimeSlot}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {inst.totalCharge > 0 && (
                      <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(inst.totalCharge)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SERVICE TAB */}
      {tab === 'service' && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b-2 border-slate-100 bg-gradient-to-r from-rose-50 to-red-50">
            <h3 className="font-extrabold text-slate-900">Service Requests ({serviceReqs.length})</h3>
          </div>
          {serviceReqs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500 font-semibold">No service requests assigned</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {serviceReqs.map((req: any) => (
                <div key={req.id} className="px-5 py-3 flex items-center gap-3 hover:bg-rose-50/40">
                  <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm text-slate-900">{req.requestNumber}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                      {req.productName} • {req.customerName}
                    </div>
                    <div className="text-[10px] text-slate-500 italic line-clamp-1">"{req.reportedIssue}"</div>
                  </div>
                  <div className="text-right shrink-0">
                    {req.totalCharge > 0 && (
                      <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(req.totalCharge)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SCHEDULE TAB */}
      {tab === 'schedule' && (
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-cyan-700" />
            <h3 className="font-extrabold text-slate-900">Upcoming Schedule</h3>
          </div>
          <div className="space-y-2">
            {[...installs.filter((i: any) => ['SCHEDULED', 'ASSIGNED'].includes(i.status)),
              ...serviceReqs.filter((s: any) => ['SCHEDULED', 'TECHNICIAN_ASSIGNED'].includes(s.status))]
              .sort((a: any, b: any) => new Date(a.scheduledDate || 0).getTime() - new Date(b.scheduledDate || 0).getTime())
              .slice(0, 15)
              .map((item: any, i: number) => (
                <div key={i} className="rounded-xl border-2 border-slate-200 p-3 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 truncate">{item.productName}</div>
                    <div className="text-xs font-bold text-slate-600 truncate">
                      {item.customerName} • {item.customerPhone}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-cyan-700">
                      {item.scheduledDate && new Date(item.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">{item.scheduledTimeSlot}</div>
                  </div>
                </div>
              ))}
            {installs.filter((i: any) => ['SCHEDULED', 'ASSIGNED'].includes(i.status)).length === 0 &&
             serviceReqs.filter((s: any) => ['SCHEDULED', 'TECHNICIAN_ASSIGNED'].includes(s.status)).length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500 font-semibold">No upcoming schedule</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-400/30 to-emerald-600/20 border-emerald-300/40',
    amber: 'from-amber-400/30 to-amber-600/20 border-amber-300/40',
    blue: 'from-blue-400/30 to-blue-600/20 border-blue-300/40',
    violet: 'from-violet-400/30 to-violet-600/20 border-violet-300/40',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} backdrop-blur border p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3 opacity-80" />
        <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">{label}</div>
      </div>
      <div className="text-xl font-extrabold text-white tabular-nums leading-none">{value}</div>
    </div>
  );
}

function RateCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-blue-700',
    emerald: 'from-emerald-500 to-emerald-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-slate-100 text-slate-700',
    SCHEDULED: 'bg-amber-100 text-amber-700',
    ASSIGNED: 'bg-blue-100 text-blue-700',
    TECHNICIAN_ASSIGNED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
    REQUESTED: 'bg-slate-100 text-slate-700',
    EN_ROUTE: 'bg-violet-100 text-violet-700',
    ON_SITE: 'bg-cyan-100 text-cyan-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${colors[status] || 'bg-slate-100'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function InfoBox({ label, value, mono }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
      <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className={['text-sm font-extrabold text-slate-900 mt-0.5', mono ? 'font-mono' : ''].join(' ')}>{value}</div>
    </div>
  );
}
