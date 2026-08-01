import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Eye, Plus, Search, X, Calendar, Clock, User, Phone,
  RefreshCw, Play, CheckCircle2, XCircle, AlertTriangle,
  UserCog, Edit3, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { eyeTestsApi } from '../api/eye-tests.api';
import { optometristsApi } from '../api/optometrists.api';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  SCHEDULED: { label: 'Scheduled', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-100', icon: CheckCircle2 },
  IN_PROGRESS: { label: 'In Progress', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: Play },
  COMPLETED: { label: 'Completed', color: 'text-slate-700', bg: 'bg-slate-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
  NO_SHOW: { label: 'No Show', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  RESCHEDULED: { label: 'Rescheduled', color: 'text-violet-700', bg: 'bg-violet-100', icon: Calendar },
};

export default function EyeTestsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [todayOnly, setTodayOnly] = useState(false);
  const [showBooking, setShowBooking] = useState(false);

  const { data: tests = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['eye-tests-list', statusFilter, todayOnly],
    queryFn: () => eyeTestsApi.list({
      status: statusFilter === 'all' ? undefined : statusFilter,
      today: todayOnly,
    }),
  });

  const { data: summary } = useQuery({
    queryKey: ['eye-tests-summary-page'],
    queryFn: () => eyeTestsApi.summary(),
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tests;
    return tests.filter((t) =>
      t.testNumber.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      (t.customerPhone || '').includes(q) ||
      (t.optometristName || '').toLowerCase().includes(q)
    );
  }, [tests, search]);

  const remove = useMutation({
    mutationFn: (id: string) => eyeTestsApi.remove(id),
    onSuccess: () => {
      toast.success('Eye test deleted');
      qc.invalidateQueries({ queryKey: ['eye-tests-list'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete failed'),
  });

  return (
    <div className="space-y-5">
      {showBooking && (
        <BookAppointmentModal onClose={() => setShowBooking(false)}
          onBooked={() => {
            setShowBooking(false);
            qc.invalidateQueries({ queryKey: ['eye-tests-list'] });
            qc.invalidateQueries({ queryKey: ['eye-tests-summary-page'] });
          }} />
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Eye className="h-3.5 w-3.5 text-amber-300" /> Eye Tests & Appointments
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👁️ Eye Tests</h1>
            <p className="mt-2 text-sm text-white/80">
              {summary?.scheduled ?? 0} scheduled • {summary?.inProgress ?? 0} in progress • {summary?.completedToday ?? 0} done today
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowBooking(true)}>
              <Plus className="h-4 w-4" /> Book Appointment
            </Button>
          </div>
        </div>
      </section>

      {summary && (
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Scheduled" value={summary.scheduled} icon={Clock} tone="amber" />
          <StatCard label="In Progress" value={summary.inProgress} icon={Play} tone="emerald" />
          <StatCard label="Done Today" value={summary.completedToday} icon={CheckCircle2} tone="blue" />
          <StatCard label="Follow-ups" value={summary.pendingFollowUps} icon={AlertTriangle} tone="violet" />
          <StatCard label="Month Revenue" value={formatPKR(summary.monthlyRevenue)} icon={Eye} tone="rose" />
        </section>
      )}

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Test #, customer, phone, doctor..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setTodayOnly(!todayOnly)}
            className={`h-10 px-3 rounded-xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              todayOnly ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}>
            <Calendar className="h-3.5 w-3.5" /> Today Only
          </button>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
            {['all', 'SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map((v) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                  statusFilter === v ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}>
                {v === 'all' ? 'All' : v.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-300 p-16 text-center">
          <Eye className="h-16 w-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">No eye tests found</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">Book your first appointment</p>
          <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => setShowBooking(true)}>
            <Plus className="h-4 w-4" /> Book Appointment
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => <TestCard key={t.id} test={t}
            onDelete={() => { if (confirm(`Delete "${t.testNumber}"?`)) remove.mutate(t.id); }} />)}
        </div>
      )}
    </div>
  );
}

function TestCard({ test, onDelete }: any) {
  const meta = STATUS_META[test.status] || STATUS_META.SCHEDULED;
  const StatusIcon = meta.icon;
  const dateObj = new Date(test.appointmentDate);
  const isToday = dateObj.toDateString() === new Date().toDateString();

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition ${isToday ? 'border-emerald-300' : 'border-slate-200'}`}>
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className={`h-14 w-14 rounded-2xl ${meta.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`h-6 w-6 ${meta.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/optical/eye-tests/${test.id}`} className="font-mono font-extrabold text-slate-900 text-sm hover:text-emerald-700">
              {test.testNumber}
            </Link>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}>
              <StatusIcon className="h-2.5 w-2.5" /> {meta.label}
            </span>
            {isToday && <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold uppercase">Today</span>}
            {test.prescriptionIssued && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-extrabold">Rx Issued</span>}
          </div>

          <div className="mt-1 flex items-center gap-3 text-sm text-slate-700 font-bold flex-wrap">
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {test.customerName}</span>
            {test.customerPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {test.customerPhone}</span>}
          </div>

          {test.optometristName && (
            <div className="mt-1 text-xs text-slate-500 font-bold flex items-center gap-1">
              <UserCog className="h-3 w-3" /> Dr. {test.optometristName}
            </div>
          )}

          {test.chiefComplaint && (
            <div className="mt-1 text-xs text-slate-600 font-semibold italic line-clamp-1">
              "{test.chiefComplaint}"
            </div>
          )}

          <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500 font-bold">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {dateObj.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {test.scheduledSlot && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" /> {test.scheduledSlot}
              </span>
            )}
            {test.testDurationMinutes && (
              <span>{test.testDurationMinutes}m duration</span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">Fee</div>
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(test.paidAmount || test.testFee)}</div>
          {test.paidAmount < test.testFee && !test.isWaivedOff && (
            <div className="text-[10px] font-bold text-rose-700">Due {formatPKR(test.testFee - test.paidAmount)}</div>
          )}
          <div className="mt-2 flex gap-1 justify-end">
            <Link to={`/optical/eye-tests/${test.id}`}
              className="h-9 w-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Eye className="h-4 w-4" />
            </Link>
            {test.status !== 'COMPLETED' && (
              <button onClick={onDelete}
                className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookAppointmentModal({ onClose, onBooked }: any) {
  const [form, setForm] = useState<any>({
    customerId: '', customerName: '', customerPhone: '', customerAge: '',
    appointmentDate: '', scheduledSlot: '', optometristId: '',
    chiefComplaint: '', testFee: 500,
  });

  const { data: customersData } = useQuery({ queryKey: ['customers-for-pos'], queryFn: () => customersApi.list({ page: 1, limit: 500 }) });
  const customers = customersData?.items ?? [];

  const { data: optometrists = [] } = useQuery({
    queryKey: ['optometrists-active'],
    queryFn: () => optometristsApi.list({ active: true }),
  });

  const { data: slots } = useQuery({
    queryKey: ['available-slots', form.optometristId, form.appointmentDate],
    queryFn: () => eyeTestsApi.availableSlots(form.optometristId, form.appointmentDate),
    enabled: !!(form.optometristId && form.appointmentDate),
  });

  const create = useMutation({
    mutationFn: () => eyeTestsApi.create({
      customerId: form.customerId || undefined,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerAge: form.customerAge ? Number(form.customerAge) : undefined,
      appointmentDate: form.appointmentDate,
      scheduledSlot: form.scheduledSlot,
      optometristId: form.optometristId || undefined,
      chiefComplaint: form.chiefComplaint,
      testFee: Number(form.testFee) || 0,
    }),
    onSuccess: () => {
      toast.success('Appointment booked');
      onBooked();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Booking failed'),
  });

  const canBook = form.customerName?.trim() && form.customerPhone?.trim() && form.appointmentDate;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <h3 className="font-extrabold text-xl">👁️ Book Eye Test</h3>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Existing Customer</label>
            <select value={form.customerId} onChange={(e) => {
              const c = customers.find((x: any) => x.id === e.target.value);
              setForm({ ...form, customerId: e.target.value, customerName: c?.name || form.customerName, customerPhone: c?.phone || form.customerPhone });
            }}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              <option value="">-- Or enter details below --</option>
              {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name} ({c.phone})</option>))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Customer Name *" value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            <Input label="Phone *" value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
            <Input label="Age" type="number" value={form.customerAge}
              onChange={(e) => setForm({ ...form, customerAge: e.target.value })} />
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Optometrist</label>
              <select value={form.optometristId}
                onChange={(e) => {
                  const o: any = optometrists.find((x: any) => x.id === e.target.value);
                  setForm({ ...form, optometristId: e.target.value, testFee: o?.consultationFee || form.testFee });
                }}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
                <option value="">Any available</option>
                {optometrists.map((o: any) => (<option key={o.id} value={o.id}>{o.name} — {formatPKR(o.consultationFee)}</option>))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Appointment Date *</label>
            <input type="date" value={form.appointmentDate}
              onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
              min={new Date().toISOString().slice(0, 10)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>

          {slots && (
            <div>
              <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">
                Time Slot ({slots.available?.length || 0} available)
              </label>
              {slots.reason ? (
                <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-sm font-extrabold text-amber-900">
                  ⚠️ {slots.reason}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                  {slots.available?.map((s: string) => (
                    <button key={s} type="button" onClick={() => setForm({ ...form, scheduledSlot: s })}
                      className={`h-10 rounded-lg border-2 text-xs font-extrabold transition ${
                        form.scheduledSlot === s ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Chief Complaint</label>
            <textarea rows={2} value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
              placeholder="Blurred vision, headaches, eye strain..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </div>

          <Input label="Test Fee" type="number" value={form.testFee}
            onChange={(e) => setForm({ ...form, testFee: e.target.value })} />
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700"
            onClick={() => create.mutate()} loading={create.isPending} disabled={!canBook}>
            📅 Book Appointment
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600', emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700', violet: 'from-violet-500 to-fuchsia-700',
    rose: 'from-rose-500 to-red-700',
  };
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-xl font-extrabold text-slate-900 tabular-nums mt-1 truncate">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
