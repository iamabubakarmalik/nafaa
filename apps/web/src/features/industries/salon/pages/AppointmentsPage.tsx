import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Scissors, Plus, Clock, User, Phone, Calendar, CheckCircle2, X,
  Sparkles, Trash2, TrendingUp,
} from 'lucide-react';
import { appointmentsApi, type SalonAppointment, type AppointmentStatus, type CreateAppointmentPayload } from '../api/appointments.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; bg: string; text: string }> = {
  SCHEDULED: { label: 'Scheduled', bg: 'bg-blue-100', text: 'text-blue-700' },
  CONFIRMED: { label: 'Confirmed', bg: 'bg-violet-100', text: 'text-violet-700' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-100', text: 'text-amber-700' },
  COMPLETED: { label: 'Completed', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-600' },
  NO_SHOW: { label: 'No Show', bg: 'bg-rose-100', text: 'text-rose-700' },
};

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<CreateAppointmentPayload>({
    customerName: '', customerPhone: '', serviceName: '', duration: 30, price: 0,
    startTime: new Date().toISOString().slice(0, 16),
  });

  const { data: stats } = useQuery({
    queryKey: ['appointments-stats'],
    queryFn: appointmentsApi.stats,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: appointmentsApi.today,
  });

  const createMutation = useMutation({
    mutationFn: () => appointmentsApi.create(form),
    onSuccess: () => {
      toast.success('Appointment scheduled');
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-stats'] });
      setShowAdd(false);
      setForm({ customerName: '', customerPhone: '', serviceName: '', duration: 30, price: 0, startTime: new Date().toISOString().slice(0, 16) });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-stats'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.remove(id),
    onSuccess: () => {
      toast.success('Removed');
      queryClient.invalidateQueries({ queryKey: ['appointments-today'] });
    },
  });

  return (
    <div className="space-y-6">
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-pink-600" />
                <h3 className="font-bold text-slate-900">New Appointment</h3>
              </div>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg hover:bg-white/50 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Input label="Customer Name *" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              <Input label="Phone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="03XXXXXXXXX" />
              <Input label="Service *" value={form.serviceName} onChange={(e) => setForm({ ...form, serviceName: e.target.value })} placeholder="Haircut, Facial..." />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Duration (min)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) || 30 })} />
                <Input label="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Time *</label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} className="bg-gradient-to-r from-pink-600 to-purple-600">
                Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-gradient-to-br from-pink-700 via-purple-700 to-violet-700 text-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Scissors className="h-7 w-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Sparkles className="h-3 w-3 text-amber-300" />
                Salon Module
              </div>
              <h1 className="mt-2 text-3xl font-extrabold">Appointments</h1>
              <p className="text-sm text-white/80 mt-1">Manage your bookings</p>
            </div>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> New Appointment
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <div className="rounded-xl bg-white/10 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Today</div>
            <div className="text-2xl font-extrabold">{stats?.today ?? 0}</div>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Upcoming</div>
            <div className="text-2xl font-extrabold">{stats?.upcoming ?? 0}</div>
          </div>
          <div className="rounded-xl bg-emerald-500/20 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">Completed</div>
            <div className="text-2xl font-extrabold text-emerald-100">{stats?.completed ?? 0}</div>
          </div>
          <div className="rounded-xl bg-blue-500/20 backdrop-blur p-3">
            <div className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">Scheduled</div>
            <div className="text-2xl font-extrabold text-blue-100">{stats?.scheduled ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-600" />
          <h3 className="font-extrabold text-slate-900">Today's Schedule</h3>
        </div>
        {appointments.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="font-bold text-slate-700">No appointments today</p>
            <p className="text-xs text-slate-500 mt-1">Schedule your first appointment</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((apt) => {
              const cfg = STATUS_CONFIG[apt.status];
              return (
                <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition">
                  <div className="text-center shrink-0">
                    <div className="text-xs font-bold text-slate-500">
                      {new Date(apt.startTime).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[10px] text-slate-400">{apt.duration}m</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900">{apt.customerName}</div>
                    {apt.customerPhone && (
                      <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" /> {apt.customerPhone}
                      </div>
                    )}
                    <div className="text-sm text-violet-700 font-semibold mt-1">{apt.serviceName}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-emerald-700">{formatPKR(apt.price)}</div>
                    <select
                      value={apt.status}
                      onChange={(e) => statusMutation.mutate({ id: apt.id, status: e.target.value as AppointmentStatus })}
                      className={`mt-1 text-[10px] font-bold ${cfg.bg} ${cfg.text} border-0 rounded-lg px-2 py-1 focus:outline-none`}
                    >
                      {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete appointment for ${apt.customerName}?`)) removeMutation.mutate(apt.id);
                    }}
                    className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
