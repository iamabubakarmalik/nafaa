import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scissors, Plus, Search, X, RefreshCw, Clock, CheckCircle2, XCircle,
  Play, Calendar, Phone, User, DollarSign, Camera, Star, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { groomingApi, type PetGroomingStatus } from '../api/grooming.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

const STATUS_META: Record<PetGroomingStatus, { label: string; color: string; bg: string; icon: any }> = {
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-700', bg: 'bg-blue-100', icon: Calendar },
  CONFIRMED: { label: 'Confirmed', color: 'text-violet-700', bg: 'bg-violet-100', icon: CheckCircle2 },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-100', icon: Play },
  READY_FOR_PICKUP: { label: 'Ready', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', color: 'text-slate-700', bg: 'bg-slate-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
  NO_SHOW: { label: 'No Show', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

export default function GroomingPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [todayOnly, setTodayOnly] = useState(false);

  const { data: appointments = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['grooming-list', statusFilter, todayOnly],
    queryFn: () => groomingApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      today: todayOnly,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['grooming-summary'],
    queryFn: () => groomingApi.summary(),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return appointments;
    return appointments.filter((a) =>
      a.appointmentNumber.toLowerCase().includes(q) ||
      a.customerName.toLowerCase().includes(q) ||
      a.petName.toLowerCase().includes(q) ||
      a.customerPhone.includes(q)
    );
  }, [appointments, search]);

  const start = useMutation({
    mutationFn: (id: string) => groomingApi.start(id),
    onSuccess: () => {
      toast.success('Grooming started');
      qc.invalidateQueries({ queryKey: ['grooming-list'] });
      qc.invalidateQueries({ queryKey: ['grooming-summary'] });
    },
  });

  const complete = useMutation({
    mutationFn: (id: string) => groomingApi.complete(id, {}),
    onSuccess: () => {
      toast.success('Marked ready for pickup');
      qc.invalidateQueries({ queryKey: ['grooming-list'] });
      qc.invalidateQueries({ queryKey: ['grooming-summary'] });
    },
  });

  const pickup = useMutation({
    mutationFn: (id: string) => groomingApi.pickup(id),
    onSuccess: () => {
      toast.success('Pet picked up');
      qc.invalidateQueries({ queryKey: ['grooming-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Scissors className="h-3.5 w-3.5 text-amber-300" /> Grooming Appointments
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">✂️ Grooming</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.todayCount ?? 0} today • {summary?.inProgress ?? 0} in progress • {summary?.readyForPickup ?? 0} ready
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link to="/petshop/grooming/new">
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="h-4 w-4" /> Book Appointment
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today" value={summary.todayCount} icon={Calendar} tone="blue" onClick={() => setTodayOnly(true)} />
          <StatCard label="In Progress" value={summary.inProgress} icon={Play} tone="amber" onClick={() => setStatusFilter('IN_PROGRESS')} />
          <StatCard label="Ready for Pickup" value={summary.readyForPickup} icon={CheckCircle2} tone="emerald" onClick={() => setStatusFilter('READY_FOR_PICKUP')} />
          <StatCard label="Month Revenue" value={formatPKR(summary.monthly?.collected || 0)} icon={DollarSign} tone="violet" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Appointment #, customer, pet, phone..."
              className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button onClick={() => setTodayOnly(!todayOnly)}
            className={`h-12 px-4 rounded-2xl border-2 text-sm font-extrabold inline-flex items-center gap-1.5 ${
              todayOnly ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            <Calendar className="h-4 w-4" /> Today Only
          </button>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          {['all', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'].map((v) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                statusFilter === v ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {v === 'all' ? 'All' : STATUS_META[v as PetGroomingStatus]?.label || v}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Scissors className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No appointments</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Book the first grooming appointment</p>
          <Link to="/petshop/grooming/new">
            <Button className="mt-4 bg-gradient-to-r from-violet-600 to-purple-700"><Plus className="h-4 w-4" /> Book Now</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <AppointmentCard key={a.id} appointment={a}
              onStart={() => start.mutate(a.id)}
              onComplete={() => complete.mutate(a.id)}
              onPickup={() => pickup.mutate(a.id)}
              onEdit={() => navigate(`/petshop/grooming/${a.id}/edit`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appointment: a, onStart, onComplete, onPickup, onEdit }: any) {
  const meta = STATUS_META[a.status as PetGroomingStatus];
  const StatusIcon = meta.icon;
  const balance = a.totalFee - a.paidAmount;

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition ${
      a.status === 'READY_FOR_PICKUP' ? 'border-emerald-300' :
      a.status === 'IN_PROGRESS' ? 'border-amber-300' : 'border-slate-200'}`}>
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-slate-900 text-sm">{a.appointmentNumber}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
            {balance > 0 && a.status === 'READY_FOR_PICKUP' && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold">
                Balance {formatPKR(balance)}
              </span>
            )}
          </div>

          <div className="mt-1 font-extrabold text-slate-900 text-sm">
            🐾 {a.petName} <span className="text-slate-500 font-bold">({a.petSpecies}{a.petBreed && ` — ${a.petBreed}`})</span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {a.customerName}</span>
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {a.customerPhone}</span>
            {a.groomerName && (<span className="inline-flex items-center gap-1">✂️ {a.groomerName}</span>)}
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-bold flex-wrap">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(a.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              {a.scheduledSlot && ` @ ${a.scheduledSlot}`}
            </span>
            <span>•</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-extrabold">{a.serviceType.replace(/_/g, ' ')}</span>
            {a.photosBeforeUrls?.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Camera className="h-2.5 w-2.5" /> {a.photosBeforeUrls.length} before
              </span>
            )}
            {a.photosAfterUrls?.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Camera className="h-2.5 w-2.5" /> {a.photosAfterUrls.length} after
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Total</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(a.totalFee)}</div>
          {a.customerRating && (
            <div className="mt-1 inline-flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < a.customerRating ? 'fill-current' : ''}`} />
              ))}
            </div>
          )}
          <div className="mt-2 flex flex-col gap-1">
            {a.status === 'CONFIRMED' && (
              <button onClick={onStart}
                className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                <Play className="h-3 w-3" /> Start
              </button>
            )}
            {a.status === 'IN_PROGRESS' && (
              <button onClick={onComplete}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </button>
            )}
            {a.status === 'READY_FOR_PICKUP' && balance === 0 && (
              <button onClick={onPickup}
                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Pickup
              </button>
            )}
            {['SCHEDULED', 'CONFIRMED'].includes(a.status) && (
              <button onClick={onEdit}
                className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold">
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-700',
    amber: 'from-amber-500 to-orange-700',
    emerald: 'from-emerald-500 to-teal-700',
    violet: 'from-violet-500 to-purple-700',
  };
  const C: any = onClick ? 'button' : 'div';
  return (
    <C onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm text-left w-full ${onClick ? 'hover:border-violet-300 hover:shadow-md transition' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1 truncate">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </C>
  );
}
