import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Syringe, RefreshCw, Sparkles, Calendar, CheckCircle2, AlertCircle, User, X, Save, Baby } from 'lucide-react';
import { vaccinationsApi } from '../api/vaccinations.api';
import { patientsApi } from '../api/patients.api';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DUE: 'bg-amber-500', ADMINISTERED: 'bg-emerald-600',
  DELAYED: 'bg-red-500', SKIPPED: 'bg-slate-500', CONTRAINDICATED: 'bg-rose-600',
};

export default function VaccinationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('DUE');
  const [showBulkEpi, setShowBulkEpi] = useState(false);
  const [administering, setAdministering] = useState<any>(null);

  const { data: vaccinations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vaccinations', statusFilter],
    queryFn: () => vaccinationsApi.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-pink-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Syringe className="h-3.5 w-3.5 text-amber-300" />
              EPI Schedule
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">💉 Vaccinations</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">Pakistan EPI schedule + due reminders</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowBulkEpi(true)}>
              <Baby className="h-4 w-4" />
              Bulk EPI Schedule
            </Button>
          </div>
        </div>
      </section>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['DUE', 'all', 'ADMINISTERED', 'DELAYED', 'SKIPPED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (statusFilter === s ? 'bg-rose-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>{s === 'all' ? 'All' : s === 'DUE' ? '🔥 Due Now' : s}</button>
        ))}
      </div>

      {showBulkEpi && <BulkEpiModal onClose={() => setShowBulkEpi(false)} onSaved={() => { setShowBulkEpi(false); queryClient.invalidateQueries({ queryKey: ['vaccinations'] }); }} />}
      {administering && <AdministerModal vaccine={administering} onClose={() => setAdministering(null)} onSaved={() => { setAdministering(null); queryClient.invalidateQueries({ queryKey: ['vaccinations'] }); }} />}

      {isLoading ? (
        <div className="grid gap-2">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}</div>
      ) : vaccinations.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Syringe className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No vaccinations scheduled</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 gap-3">
          {vaccinations.map((v) => {
            const daysUntilDue = differenceInDays(new Date(v.dueDate), new Date());
            const isOverdue = daysUntilDue < 0 && v.status === 'DUE';
            return (
              <div key={v.id} className={
                'rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm p-4 space-y-2 ' +
                (isOverdue ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 dark:border-neutral-800')
              }>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow">
                      <Syringe className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">{v.vaccineName}</span>
                        <span className={'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white ' + STATUS_COLORS[v.status]}>{v.status}</span>
                        {isOverdue && <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-extrabold uppercase animate-pulse">OVERDUE</span>}
                      </div>
                      {v.doseNumber !== null && v.doseNumber !== undefined && (
                        <div className="text-xs font-bold text-slate-600">Dose #{v.doseNumber}</div>
                      )}
                      {v.scheduleName && (
                        <div className="text-[10px] font-extrabold text-rose-700">{v.scheduleName}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-600 inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {format(new Date(v.dueDate), 'dd MMM yyyy')}
                  {v.status === 'DUE' && !isOverdue && ' (in ' + daysUntilDue + 'd)'}
                </div>

                {v.administeredAt && (
                  <div className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Given: {format(new Date(v.administeredAt), 'dd MMM yyyy')}
                    {v.administeredBy && ' by ' + v.administeredBy}
                  </div>
                )}

                {v.batchNumber && (
                  <div className="text-[10px] font-mono font-bold text-slate-500">Batch: {v.batchNumber}</div>
                )}

                {v.status === 'DUE' && (
                  <Button size="sm" onClick={() => setAdministering(v)} className="w-full bg-gradient-to-r from-emerald-600 to-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Administer
                  </Button>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function BulkEpiModal({ onClose, onSaved }: any) {
  const [patientId, setPatientId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [showPicker, setShowPicker] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-for-epi', patientSearch],
    queryFn: () => patientsApi.list({ search: patientSearch || undefined }),
    enabled: showPicker,
  });

  const bulkMutation = useMutation({
    mutationFn: () => vaccinationsApi.bulkEpi(patientId, birthDate),
    onSuccess: () => { toast.success('16 EPI vaccines scheduled'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">🍼 Bulk EPI Schedule</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-3 text-xs font-bold text-blue-800">
            📋 Yeh 16 EPI doses schedule karega: BCG, OPV-0/1/2/3, Pentavalent-1/2/3, Rotavirus-1/2, PCV-1/2/3, IPV, Measles-1/2
          </div>

          {selectedPatient ? (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 flex items-center gap-3">
              <User className="h-5 w-5 text-rose-600" />
              <div className="flex-1">
                <div className="font-extrabold">{selectedPatient.fullName}</div>
                <div className="text-xs text-slate-600 font-bold">{selectedPatient.mrn}</div>
              </div>
              <button onClick={() => { setSelectedPatient(null); setPatientId(''); setShowPicker(true); }} className="text-xs font-extrabold text-rose-600 hover:underline">Change</button>
            </div>
          ) : (
            <div>
              <label className="text-[10px] uppercase font-extrabold mb-1 block">Select Baby/Patient</label>
              <input autoFocus value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search..." className="h-11 w-full rounded-xl border-2 border-rose-200 bg-rose-50 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                {patients.map((p) => (
                  <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientId(p.id); setShowPicker(false); if (p.dateOfBirth) setBirthDate(p.dateOfBirth.slice(0, 10)); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-rose-50 text-left">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-extrabold flex-1 truncate">{p.fullName}</span>
                    <span className="text-[10px] font-mono text-blue-600">{p.mrn}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] uppercase font-extrabold mb-1 block">Birth Date *</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="h-11 w-full rounded-xl border-2 border-rose-300 bg-rose-50 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-rose-600 to-pink-700" onClick={() => bulkMutation.mutate()} loading={bulkMutation.isPending} disabled={!patientId || !birthDate}>
              <Save className="h-4 w-4" />
              Schedule 16 Doses
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdministerModal({ vaccine, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    batchNumber: '', manufacturer: '', siteAdministered: '',
    routeAdministered: 'Intramuscular', administeredBy: '',
    expiryDate: '', adverseReactions: '',
  });

  const adminMutation = useMutation({
    mutationFn: () => vaccinationsApi.administer(vaccine.id, form),
    onSuccess: () => { toast.success('Vaccine administered'); onSaved(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold">💉 Administer {vaccine.vaccineName}</h3>
            {vaccine.doseNumber !== null && <p className="text-xs text-slate-500 font-semibold">Dose #{vaccine.doseNumber}</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="Batch #" className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Manufacturer" className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input value={form.siteAdministered} onChange={(e) => setForm({ ...form, siteAdministered: e.target.value })} placeholder="Site (left thigh)" className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <select value={form.routeAdministered} onChange={(e) => setForm({ ...form, routeAdministered: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
              <option>Intramuscular</option><option>Subcutaneous</option><option>Oral</option><option>Intradermal</option>
            </select>
            <input value={form.administeredBy} onChange={(e) => setForm({ ...form, administeredBy: e.target.value })} placeholder="Given by" className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          </div>
          <textarea rows={2} value={form.adverseReactions} onChange={(e) => setForm({ ...form, adverseReactions: e.target.value })} placeholder="Adverse reactions (if any)..." className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700" onClick={() => adminMutation.mutate()} loading={adminMutation.isPending}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
