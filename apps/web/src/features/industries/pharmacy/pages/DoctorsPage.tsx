import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stethoscope, Plus, Search, X, Save, Edit3, Trash2, RefreshCw,
  Sparkles, Phone, Award, Building, DollarSign, TrendingUp,
  ShieldCheck, User, FileText,
} from 'lucide-react';
import { doctorsApi, type Doctor } from '../api/doctors.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function DoctorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Doctor | null>(null);

  const { data: doctors = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['doctors', search],
    queryFn: () => doctorsApi.list({ search: search || undefined, isActive: true }),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => doctorsApi.verify(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['doctors'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => doctorsApi.remove(id),
    onSuccess: () => {
      toast.success('Doctor deactivated');
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Registered Doctors
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">👨‍⚕️ Doctors Directory</h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">PMDC registered doctors + commission tracking</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20">
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" />
              Add Doctor
            </Button>
          </div>
        </div>
      </section>

      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, reg #, phone..."
          className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-emerald-500"
        />
      </div>

      {showForm && (
        <DoctorForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['doctors'] }); }}
        />
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-48 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <Stethoscope className="h-16 w-16 text-slate-400 mx-auto mb-3" />
          <p className="font-extrabold text-slate-700">No doctors yet</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {doctors.map((doc) => (
            <div key={doc.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-lg font-extrabold shadow shrink-0">
                  {doc.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900 dark:text-white truncate">{doc.name}</span>
                    {doc.isVerified && <Award className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-slate-500">{doc.registrationNumber}</div>
                  {doc.specialization && <div className="text-xs text-slate-600 font-bold">{doc.specialization}</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs">
                {doc.phone && (
                  <a href={'tel:' + doc.phone} className="inline-flex items-center gap-1 text-blue-700 font-bold hover:underline">
                    <Phone className="h-3 w-3" />
                    {doc.phone}
                  </a>
                )}
                {doc.clinicName && (
                  <span className="inline-flex items-center gap-1 text-slate-600 font-semibold truncate">
                    <Building className="h-3 w-3" />
                    {doc.clinicName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs">
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-slate-500">Rx</div>
                  <div className="font-extrabold tabular-nums">{doc.totalPrescriptions}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-emerald-700">Business</div>
                  <div className="font-extrabold text-emerald-700 tabular-nums text-[10px]">{formatPKR(doc.totalBusiness)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] uppercase font-extrabold text-amber-700">Commission</div>
                  <div className="font-extrabold text-amber-700 tabular-nums text-[10px]">{formatPKR(doc.totalCommission)}</div>
                </div>
              </div>

              <div className="flex gap-1 pt-2 border-t border-slate-100 dark:border-neutral-800">
                <button onClick={() => verifyMutation.mutate(doc.id)} className={
                  'flex-1 h-8 rounded-lg text-[10px] font-extrabold inline-flex items-center justify-center gap-1 ' +
                  (doc.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700')
                }>
                  <ShieldCheck className="h-3 w-3" />
                  {doc.isVerified ? 'Verified' : 'Verify'}
                </button>
                <button onClick={() => { setEditing(doc); setShowForm(true); }} className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { if (confirm('Deactivate ' + doc.name + '?')) removeMutation.mutate(doc.id); }} className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function DoctorForm({ editing, onClose, onSaved }: { editing: Doctor | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    registrationNumber: editing?.registrationNumber ?? '',
    phone: editing?.phone ?? '',
    email: editing?.email ?? '',
    cnic: editing?.cnic ?? '',
    qualification: editing?.qualification ?? '',
    specialization: editing?.specialization ?? '',
    yearsOfExperience: editing?.yearsOfExperience ?? '',
    clinicName: editing?.clinicName ?? '',
    clinicAddress: editing?.clinicAddress ?? '',
    hospitalAffiliation: editing?.hospitalAffiliation ?? '',
    consultationFee: editing?.consultationFee ?? '',
    commissionType: editing?.commissionType ?? 'NONE',
    commissionValue: editing?.commissionValue ?? 0,
    notes: editing?.notes ?? '',
    isVerified: editing?.isVerified ?? false,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
        consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
      };
      return editing ? doctorsApi.update(editing.id, payload) : doctorsApi.create(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Doctor updated' : 'Doctor added'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-emerald-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">{editing ? 'Edit Doctor' : 'New Doctor'}</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-5 grid sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
        <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Doctor Name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
          <input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="PMDC Reg # *" className="h-11 rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
        </div>
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        <input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="CNIC" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500" />
        <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="Qualification (MBBS, FCPS)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Specialization" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        <input type="number" value={form.yearsOfExperience} onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })} placeholder="Years Experience" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-500" />
        <input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} placeholder="Clinic Name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        <input value={form.hospitalAffiliation} onChange={(e) => setForm({ ...form, hospitalAffiliation: e.target.value })} placeholder="Hospital Affiliation" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
        <input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} placeholder="Consultation Fee" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-500" />

        <div className="sm:col-span-2 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 space-y-2">
          <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300">Commission Setup</div>
          <div className="grid sm:grid-cols-2 gap-2">
            <select value={form.commissionType} onChange={(e) => setForm({ ...form, commissionType: e.target.value })} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-xs font-bold">
              <option value="NONE">No Commission</option>
              <option value="PER_PRESCRIPTION">Per Prescription (Rs)</option>
              <option value="PERCENTAGE">Percentage %</option>
            </select>
            {form.commissionType !== 'NONE' && (
              <input type="number" step="0.01" value={form.commissionValue} onChange={(e) => setForm({ ...form, commissionValue: Number(e.target.value) })} placeholder="Value" className="h-10 rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
            )}
          </div>
        </div>

        <textarea rows={2} value={form.clinicAddress} onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })} placeholder="Clinic address" className="sm:col-span-2 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
        <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="sm:col-span-2 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />

        <label className="sm:col-span-2 flex items-center gap-2 p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer">
          <input type="checkbox" checked={form.isVerified} onChange={(e) => setForm({ ...form, isVerified: e.target.checked })} className="h-4 w-4 rounded" />
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300">Verified (PMDC checked)</span>
        </label>

        <div className="sm:col-span-2 flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!form.name.trim() || !form.registrationNumber.trim()}>
            <Save className="h-4 w-4" />
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </section>
  );
}
