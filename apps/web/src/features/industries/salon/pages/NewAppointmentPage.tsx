import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, User, Phone, Search, Sparkles,
  Calendar, X, Clock, Scissors, UserCheck, CheckCircle2, Mail,
} from 'lucide-react';
import { appointmentsApi } from '../api/appointments.api';
import { salonServicesApi } from '../api/services.api';
import { staffProfilesApi } from '../api/staff-profiles.api';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { format, addMinutes } from 'date-fns';

interface SelectedService {
  serviceId: string;
  serviceName: string;
  category: string;
  price: number;
  durationMinutes: number;
  staffProfileId?: string;
  staffName?: string;
  discount: number;
  notes?: string;
}

export default function NewAppointmentPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerNotes: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '',
    serviceCharge: 0,
    taxAmount: 0,
    discount: 0,
  });

  const [services, setServices] = useState<SelectedService[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-appointment', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showCustomerPicker,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ['salon-services-for-appointment'],
    queryFn: () => salonServicesApi.list({ active: true }),
    enabled: showServicePicker,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['salon-staff-for-appointment'],
    queryFn: () => staffProfilesApi.list({ bookable: true }),
  });

  const subtotal = services.reduce((s, sv) => s + (sv.price - sv.discount), 0);
  const totalDuration = services.reduce((s, sv) => s + sv.durationMinutes, 0);
  const total = Math.max(subtotal + Number(form.serviceCharge) + Number(form.taxAmount) - Number(form.discount), 0);

  const scheduledStart = form.scheduledDate && form.scheduledTime ? new Date(form.scheduledDate + 'T' + form.scheduledTime) : null;
  const scheduledEnd = scheduledStart ? addMinutes(scheduledStart, totalDuration) : null;

  const createMutation = useMutation({
    mutationFn: () => appointmentsApi.create({
      customerId: form.customerId || undefined,
      customerName: form.customerName || undefined,
      customerPhone: form.customerPhone || undefined,
      customerEmail: form.customerEmail || undefined,
      customerNotes: form.customerNotes || undefined,
      scheduledStart: scheduledStart?.toISOString(),
      scheduledEnd: scheduledEnd?.toISOString(),
      serviceCharge: Number(form.serviceCharge) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      discount: Number(form.discount) || 0,
      services: services.map((s) => ({
        serviceId: s.serviceId,
        staffProfileId: s.staffProfileId,
        price: s.price,
        discount: s.discount,
        durationMinutes: s.durationMinutes,
        notes: s.notes,
      })),
    }),
    onSuccess: (apt) => {
      toast.success('Appointment ' + apt.appointmentNumber + ' booked!');
      navigate('/salon/appointments/' + apt.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const addService = (svc: any) => {
    setServices([
      ...services,
      {
        serviceId: svc.id,
        serviceName: svc.name,
        category: svc.category,
        price: svc.discountPrice ?? svc.price,
        durationMinutes: svc.durationMinutes,
        discount: 0,
      },
    ]);
    setShowServicePicker(false);
    toast.success(svc.name + ' added');
  };

  const removeService = (i: number) => setServices(services.filter((_, idx) => idx !== i));

  const updateService = (i: number, patch: Partial<SelectedService>) => {
    setServices(services.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const canSubmit = services.length > 0 && form.scheduledDate && form.scheduledTime && (form.customerName || form.customerId);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/salon/appointments')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Booking
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">📅 Book Appointment</h1>
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} className="bg-white text-slate-900 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Customer */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-pink-600" />
              Customer
            </h3>

            {form.customerId ? (
              <div className="rounded-xl bg-pink-50 dark:bg-pink-950/30 border-2 border-pink-200 dark:border-pink-800 p-3 flex items-center gap-3">
                <User className="h-5 w-5 text-pink-600" />
                <div className="flex-1">
                  <div className="font-extrabold text-slate-900 dark:text-white">{form.customerName}</div>
                  {form.customerPhone && <div className="text-xs text-slate-600 font-bold">{form.customerPhone}</div>}
                </div>
                <button onClick={() => setForm({ ...form, customerId: '', customerName: '', customerPhone: '', customerEmail: '' })} className="text-xs font-extrabold text-pink-600 hover:underline">
                  Change
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowCustomerPicker(!showCustomerPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 dark:border-neutral-600 bg-slate-50 dark:bg-neutral-800 text-sm font-extrabold text-slate-600 hover:border-pink-400">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search Existing Customer
                </button>

                {showCustomerPicker && (
                  <div className="rounded-xl border-2 border-pink-300 bg-pink-50/50 p-3 space-y-2">
                    <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search by name/phone..." className="h-10 w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {(customersData?.items ?? []).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setForm({ ...form, customerId: c.id, customerName: c.name, customerPhone: c.phone || '', customerEmail: (c as any).email || '' });
                            setShowCustomerPicker(false);
                            setCustomerSearch('');
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white dark:hover:bg-neutral-800 text-left"
                        >
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name (walk-in ok)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                  <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                </div>
              </>
            )}

            <input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="Email (optional)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            <textarea rows={2} value={form.customerNotes} onChange={(e) => setForm({ ...form, customerNotes: e.target.value })} placeholder="Notes / preferences..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500 resize-none" />
          </section>

          {/* Date/Time */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Date & Time
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Date *</label>
                <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} min={new Date().toISOString().split('T')[0]} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Time *</label>
                <input type="time" value={form.scheduledTime} onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })} className="h-11 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-sm font-extrabold focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            {scheduledStart && scheduledEnd && (
              <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/50 p-3 text-center">
                <div className="text-xs font-bold text-slate-500">Appointment will be from</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                  {format(scheduledStart, 'HH:mm')} → {format(scheduledEnd, 'HH:mm')}
                </div>
                <div className="text-xs font-extrabold text-blue-600">{totalDuration} minutes</div>
              </div>
            )}
          </section>

          {/* Services */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Scissors className="h-4 w-4 text-fuchsia-600" />
                Services ({services.length})
              </h3>
              <Button size="sm" onClick={() => setShowServicePicker(true)} className="bg-gradient-to-r from-fuchsia-600 to-pink-700">
                <Plus className="h-3.5 w-3.5" />
                Add Service
              </Button>
            </div>

            {services.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
                <Scissors className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-extrabold text-slate-700">No services added</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Click "Add Service" to select</p>
              </div>
            ) : (
              <div className="space-y-2">
                {services.map((svc, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white">{svc.serviceName}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{svc.category?.replace('_', ' ')} • {svc.durationMinutes} min</div>
                      </div>
                      <button onClick={() => removeService(i)} className="h-7 w-7 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={svc.staffProfileId || ''}
                        onChange={(e) => {
                          const sp = allStaff.find((s) => s.id === e.target.value);
                          const nm = sp?.staff ? ((sp.staff.firstName || '') + ' ' + (sp.staff.lastName || '')).trim() : '';
                          updateService(i, { staffProfileId: e.target.value || undefined, staffName: nm || undefined });
                        }}
                        className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-fuchsia-500"
                      >
                        <option value="">-- Any staff --</option>
                        {allStaff.map((s) => {
                          const nm = s.staff ? ((s.staff.firstName || '') + ' ' + (s.staff.lastName || '')).trim() : '';
                          return <option key={s.id} value={s.id}>{nm} ({s.role})</option>;
                        })}
                      </select>
                      <input
                        type="number" step="0.01"
                        value={svc.price}
                        onChange={(e) => updateService(i, { price: Number(e.target.value) })}
                        className="h-9 rounded-lg border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="number" step="0.01"
                        placeholder="Discount"
                        value={svc.discount}
                        onChange={(e) => updateService(i, { discount: Number(e.target.value) })}
                        className="h-9 rounded-lg border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <input
                      value={svc.notes || ''}
                      onChange={(e) => updateService(i, { notes: e.target.value })}
                      placeholder="Notes (color code, style pref...)"
                      className="h-8 w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-fuchsia-500"
                    />

                    <div className="text-right text-sm font-extrabold text-emerald-700 tabular-nums">
                      = {formatPKR(svc.price - svc.discount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sticky sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-pink-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Summary</div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Services</span><span className="font-bold tabular-nums">{services.length}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Duration</span><span className="font-bold tabular-nums">{totalDuration} min</span></div>
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
              </div>

              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Service Charge</label>
                  <input type="number" value={form.serviceCharge} onChange={(e) => setForm({ ...form, serviceCharge: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Tax</label>
                  <input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Overall Discount</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!canSubmit}
              size="lg"
              className="w-full bg-gradient-to-r from-pink-600 to-rose-700"
            >
              <Save className="h-5 w-5" />
              Book Appointment
            </Button>
          </div>
        </aside>
      </div>

      {/* Service picker modal */}
      {showServicePicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-fuchsia-50 dark:bg-fuchsia-950/30 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Select Service</h3>
              <button onClick={() => setShowServicePicker(false)} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid sm:grid-cols-2 gap-2">
              {allServices.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => addService(svc)}
                  className="p-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-500 hover:shadow-lg transition text-left"
                >
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{svc.name}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{svc.category?.replace('_', ' ')} • {svc.durationMinutes} min</div>
                  <div className="mt-1 text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(svc.discountPrice ?? svc.price)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
