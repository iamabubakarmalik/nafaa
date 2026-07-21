import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Plus, Search, X, Save, RefreshCw, Sparkles, User, Phone,
  Calendar, Droplet, AlertCircle, Heart, Eye, FileText, ArrowRight,
} from 'lucide-react';
import { patientsApi, type Patient, type Gender, type BloodGroup } from '../api/patients.api';
import { customersApi } from '@/api/customers.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { format, differenceInYears } from 'date-fns';

const BLOOD_GROUPS: { value: BloodGroup; label: string }[] = [
  { value: 'A_POS', label: 'A+' }, { value: 'A_NEG', label: 'A−' },
  { value: 'B_POS', label: 'B+' }, { value: 'B_NEG', label: 'B−' },
  { value: 'AB_POS', label: 'AB+' }, { value: 'AB_NEG', label: 'AB−' },
  { value: 'O_POS', label: 'O+' }, { value: 'O_NEG', label: 'O−' },
];

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [bloodFilter, setBloodFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const { data: patients = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-patients', genderFilter, bloodFilter, search],
    queryFn: () => patientsApi.list({
      gender: genderFilter === 'all' ? undefined : genderFilter,
      bloodGroup: bloodFilter === 'all' ? undefined : bloodFilter,
      search: search.trim() || undefined,
    }),
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-fuchsia-900 to-pink-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Users className="h-3.5 w-3.5 text-amber-300" />
              Patient Records
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🧑‍🤝‍🧑 Patients</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">MRN, medical history, allergies, insurance</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              New Patient
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search MRN, name, phone, CNIC..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-fuchsia-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'MALE', 'FEMALE', 'OTHER'].map((g) => (
            <button key={g} onClick={() => setGenderFilter(g)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (genderFilter === g ? 'bg-fuchsia-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>{g === 'all' ? 'All Gender' : g === 'MALE' ? '👨 Male' : g === 'FEMALE' ? '👩 Female' : '🧑 Other'}</button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          <button onClick={() => setBloodFilter('all')} className={
            'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
            (bloodFilter === 'all' ? 'bg-red-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
          }>All Blood</button>
          {BLOOD_GROUPS.map((b) => (
            <button key={b.value} onClick={() => setBloodFilter(b.value)} className={
              'px-3 py-1.5 rounded-lg text-xs font-extrabold ' +
              (bloodFilter === b.value ? 'bg-red-600 text-white shadow' : 'bg-slate-100 dark:bg-neutral-800 text-slate-700')
            }>🩸 {b.label}</button>
          ))}
        </div>
      </section>

      {showForm && (
        <PatientForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['clinic-patients'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Users className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No patients yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => <PatientCard key={p.id} patient={p} />)}
        </section>
      )}
    </div>
  );
}

function PatientCard({ patient }: { patient: Patient }) {
  const age = patient.dateOfBirth ? differenceInYears(new Date(), new Date(patient.dateOfBirth)) : null;
  const hasAlerts = patient.allergies?.length > 0 || patient.chronicConditions?.length > 0;
  const bloodDisplay = patient.bloodGroup?.replace('_POS', '+').replace('_NEG', '−');

  return (
    <Link to={'/clinic/patients/' + patient.id} className={
      'group block rounded-2xl bg-white dark:bg-neutral-900 border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all p-4 space-y-3 ' +
      (hasAlerts ? 'border-rose-200 dark:border-rose-800' : 'border-slate-200 dark:border-neutral-800')
    }>
      <div className="flex items-start gap-3">
        {patient.photoUrl ? (
          <img src={patient.photoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0" />
        ) : (
          <div className={
            'h-14 w-14 rounded-2xl text-white flex items-center justify-center text-xl font-extrabold shadow shrink-0 ' +
            (patient.gender === 'MALE' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
             patient.gender === 'FEMALE' ? 'bg-gradient-to-br from-fuchsia-500 to-pink-600' :
             'bg-gradient-to-br from-slate-500 to-slate-700')
          }>
            {patient.fullName?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-extrabold text-slate-900 dark:text-white truncate">{patient.fullName}</span>
            {hasAlerts && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                <AlertCircle className="h-2 w-2" /> ALERT
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono font-bold text-blue-600">{patient.mrn}</div>
          {patient.phonePrimary && (
            <div className="text-xs text-slate-600 font-bold inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {patient.phonePrimary}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {age !== null && (
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[10px] font-extrabold text-slate-700">
            {age}y
          </span>
        )}
        {patient.gender && (
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-[10px] font-extrabold text-slate-700">
            {patient.gender === 'MALE' ? '♂️' : patient.gender === 'FEMALE' ? '♀️' : '⚧'}
          </span>
        )}
        {bloodDisplay && (
          <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/40 text-red-700 text-[10px] font-extrabold inline-flex items-center gap-0.5">
            <Droplet className="h-2 w-2 fill-current" /> {bloodDisplay}
          </span>
        )}
        {patient.isPregnant && (
          <span className="px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-950/40 text-pink-700 text-[10px] font-extrabold uppercase">
            🤰 Pregnant
          </span>
        )}
        {patient.hasInsurance && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 text-[10px] font-extrabold uppercase">
            💳 Insured
          </span>
        )}
      </div>

      {patient.allergies?.length > 0 && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 p-2">
          <div className="text-[9px] uppercase font-extrabold text-rose-700 mb-1">⚠️ Allergies</div>
          <div className="flex flex-wrap gap-1">
            {patient.allergies.slice(0, 3).map((a, i) => (
              <span key={i} className="text-[10px] font-extrabold text-rose-800">{a}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-slate-500">Visits</div>
          <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">{patient.totalVisits}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-emerald-700">Spent</div>
          <div className="font-extrabold text-emerald-700 tabular-nums text-[10px]">{formatPKR(patient.totalSpent).replace('Rs', '').trim()}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] uppercase font-extrabold text-amber-700">Due</div>
          <div className="font-extrabold text-amber-700 tabular-nums text-[10px]">{formatPKR(patient.outstandingBalance).replace('Rs', '').trim()}</div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
        <div className="text-[10px] font-bold text-slate-500">
          {patient.lastVisitAt ? 'Last: ' + format(new Date(patient.lastVisitAt), 'dd MMM yyyy') : 'Never visited'}
        </div>
        <div className="text-xs font-extrabold text-fuchsia-600 inline-flex items-center gap-1">
          View <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

function PatientForm({ onClose, onSaved }: any) {
  const [form, setForm] = useState<any>({
    customerId: '', fullName: '', fatherOrHusbandName: '', cnic: '',
    dateOfBirth: '', gender: '', bloodGroup: '', maritalStatus: '',
    phonePrimary: '', phoneAlternate: '', email: '', address: '', city: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
    heightCm: '', weightKg: '',
    allergies: '', chronicConditions: '', currentMedications: '',
    hasInsurance: false, insuranceProvider: '', insuranceNumber: '',
    notes: '',
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showPicker, setShowPicker] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-clinic', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showPicker,
  });

  const saveMutation = useMutation({
    mutationFn: () => patientsApi.create({
      ...form,
      allergies: form.allergies ? form.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      chronicConditions: form.chronicConditions ? form.chronicConditions.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      currentMedications: form.currentMedications ? form.currentMedications.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      heightCm: form.heightCm ? Number(form.heightCm) : undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
    }),
    onSuccess: () => { toast.success('Patient registered'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-fuchsia-300 dark:border-fuchsia-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-fuchsia-50 dark:bg-fuchsia-950/30 flex items-center justify-between">
        <h3 className="font-extrabold">🧑‍🤝‍🧑 Register New Patient</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        {selectedCustomer ? (
          <div className="rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950/30 border-2 border-fuchsia-200 p-3 flex items-center gap-3">
            <User className="h-5 w-5 text-fuchsia-600" />
            <div className="flex-1">
              <div className="font-extrabold">{selectedCustomer.name}</div>
              <div className="text-xs text-slate-600 font-bold">{selectedCustomer.phone}</div>
            </div>
            <button onClick={() => { setSelectedCustomer(null); setForm({ ...form, customerId: '', fullName: '', phonePrimary: '' }); setShowPicker(true); }} className="text-xs font-extrabold text-fuchsia-600 hover:underline">Change</button>
          </div>
        ) : (
          <div>
            <label className="text-[10px] uppercase font-extrabold mb-1 block">Select Customer *</label>
            <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search name/phone..." className="h-11 w-full rounded-xl border-2 border-fuchsia-200 bg-fuchsia-50 dark:bg-fuchsia-950/30 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
            <div className="mt-2 max-h-52 overflow-y-auto space-y-1 rounded-xl border border-slate-200 p-1">
              {(customersData?.items ?? []).map((c) => (
                <button key={c.id} onClick={() => { setSelectedCustomer(c); setForm({ ...form, customerId: c.id, fullName: c.name, phonePrimary: c.phone || '' }); setShowPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-fuchsia-50 text-left">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {form.customerId && (
          <>
            {/* Identity */}
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
              <input value={form.fatherOrHusbandName} onChange={(e) => setForm({ ...form, fatherOrHusbandName: e.target.value })} placeholder="Father/Husband Name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
              <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-fuchsia-500" />
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
                <option value="">-- Gender --</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500">
                <option value="">-- Blood Group --</option>
                {BLOOD_GROUPS.map((b) => <option key={b.value} value={b.value}>🩸 {b.label}</option>)}
              </select>
            </div>

            {/* Contact */}
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.phonePrimary} onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })} placeholder="Primary Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
            </div>
            <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none" />

            {/* Emergency */}
            <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
              <div className="text-sm font-extrabold text-red-900">🚨 Emergency Contact</div>
              <div className="grid sm:grid-cols-3 gap-2">
                <input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} placeholder="Name" className="h-10 rounded-lg border-2 border-red-300 bg-white dark:bg-red-950/40 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
                <input value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} placeholder="Phone" className="h-10 rounded-lg border-2 border-red-300 bg-white dark:bg-red-950/40 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
                <input value={form.emergencyContactRelation} onChange={(e) => setForm({ ...form, emergencyContactRelation: e.target.value })} placeholder="Relation" className="h-10 rounded-lg border-2 border-red-300 bg-white dark:bg-red-950/40 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
              </div>
            </div>

            {/* Physical */}
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.1" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} placeholder="Height (cm)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-fuchsia-500" />
              <input type="number" step="0.1" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} placeholder="Weight (kg)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-fuchsia-500" />
            </div>

            {/* Medical */}
            <div className="rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 space-y-2">
              <div className="text-sm font-extrabold text-rose-900">⚠️ Medical History</div>
              <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Allergies (comma separated)" className="h-10 w-full rounded-lg border-2 border-rose-300 bg-white dark:bg-rose-950/40 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              <input value={form.chronicConditions} onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })} placeholder="Chronic conditions (Diabetes, HTN...)" className="h-10 w-full rounded-lg border-2 border-rose-300 bg-white dark:bg-rose-950/40 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
              <input value={form.currentMedications} onChange={(e) => setForm({ ...form, currentMedications: e.target.value })} placeholder="Current medications" className="h-10 w-full rounded-lg border-2 border-rose-300 bg-white dark:bg-rose-950/40 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            </div>

            {/* Insurance */}
            <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.hasInsurance} onChange={(e) => setForm({ ...form, hasInsurance: e.target.checked })} className="h-4 w-4 rounded" />
                <span className="text-sm font-extrabold text-emerald-900">💳 Has Insurance</span>
              </label>
              {form.hasInsurance && (
                <div className="grid sm:grid-cols-2 gap-2">
                  <input value={form.insuranceProvider} onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })} placeholder="Provider" className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
                  <input value={form.insuranceNumber} onChange={(e) => setForm({ ...form, insuranceNumber: e.target.value })} placeholder="Policy #" className="h-10 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/40 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
                </div>
              )}
            </div>

            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none" />

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 bg-gradient-to-r from-fuchsia-600 to-pink-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.fullName}>
                <Save className="h-4 w-4" />
                Register Patient
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
