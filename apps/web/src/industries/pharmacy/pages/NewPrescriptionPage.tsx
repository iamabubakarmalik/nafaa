import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, User, Phone, Stethoscope, Search,
  Sparkles, FileText, Camera, Repeat, ShieldCheck, X, Upload,
  Calendar, Award, ChevronDown, Pill,
} from 'lucide-react';
import { prescriptionsApi, type PrescriptionType, type PrescriptionItem, type RefillFrequency } from '../api/prescriptions.api';
import { doctorsApi } from '../api/doctors.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { toast } from 'sonner';

const TYPES: { value: PrescriptionType; label: string; emoji: string }[] = [
  { value: 'WALK_IN', label: 'Walk-in', emoji: '🚶' },
  { value: 'ONLINE', label: 'Online', emoji: '📱' },
  { value: 'HOSPITAL', label: 'Hospital', emoji: '🏥' },
  { value: 'INSURANCE', label: 'Insurance', emoji: '💳' },
  { value: 'EMERGENCY', label: 'Emergency', emoji: '🚨' },
];

const REFILL_FREQ: { value: RefillFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Biweekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'AS_NEEDED', label: 'As Needed' },
];

export default function NewPrescriptionPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    type: 'WALK_IN' as PrescriptionType,
    customerId: '',
    doctorId: '',
    doctorName: '',
    doctorRegNumber: '',
    doctorSpeciality: '',
    hospitalName: '',
    patientName: '',
    patientAge: '',
    patientGender: '',
    patientPhone: '',
    patientCnic: '',
    patientWeight: '',
    prescriptionDate: new Date().toISOString().split('T')[0],
    diagnosis: '',
    chiefComplaint: '',
    imageUrls: [] as string[],
    isRefillable: false,
    refillsAllowed: 0,
    refillFrequency: '' as RefillFrequency | '',
    isInsuranceClaim: false,
    insuranceProvider: '',
    insuranceApprovalCode: '',
    notes: '',
  });

  const [items, setItems] = useState<PrescriptionItem[]>([{
    medicineName: '', prescribedQty: 1, unit: 'tablet',
  }]);

  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);

  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-for-rx', doctorSearch],
    queryFn: () => doctorsApi.list({ search: doctorSearch, isActive: true }),
    enabled: showDoctorPicker,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-rx'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-rx', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined }),
    enabled: showProductPicker !== null,
  });

  const createMutation = useMutation({
    mutationFn: () => prescriptionsApi.create({
      ...form,
      patientAge: form.patientAge ? Number(form.patientAge) : undefined,
      patientWeight: form.patientWeight ? Number(form.patientWeight) : undefined,
      refillsAllowed: Number(form.refillsAllowed) || 0,
      refillFrequency: form.refillFrequency || undefined,
      items: items.filter((it) => it.medicineName.trim()),
    }),
    onSuccess: (rx) => {
      toast.success('Prescription ' + rx.prescriptionNumber + ' created');
      navigate('/pharmacy/prescriptions/' + rx.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const addItem = () => setItems([...items, { medicineName: '', prescribedQty: 1, unit: 'tablet' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<PrescriptionItem>) => {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };

  const pickProductForItem = (i: number, product: any) => {
    updateItem(i, {
      productId: product.id,
      medicineName: product.name,
      unit: product.unit || 'tablet',
    });
    setShowProductPicker(null);
    setProductSearch('');
  };

  const pickDoctor = (doc: any) => {
    setForm({
      ...form,
      doctorId: doc.id,
      doctorName: doc.name,
      doctorRegNumber: doc.registrationNumber,
      doctorSpeciality: doc.specialization || '',
      hospitalName: doc.hospitalAffiliation || form.hospitalName,
    });
    setShowDoctorPicker(false);
    setDoctorSearch('');
  };

  const canSave = items.some((it) => it.medicineName.trim() && it.prescribedQty > 0);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/pharmacy/prescriptions')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Prescription
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">📋 Create Prescription</h1>
            </div>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!canSave}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            <Save className="h-4 w-4" />
            Create Prescription
          </Button>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* TYPE */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Prescription Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={
                    'p-3 rounded-xl border-2 text-center transition ' +
                    (form.type === t.value
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300')
                  }
                >
                  <div className="text-xl mb-1">{t.emoji}</div>
                  <div className="text-[10px] font-extrabold">{t.label}</div>
                </button>
              ))}
            </div>
          </section>

          {/* DOCTOR */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-600" />
              Doctor Information
            </h3>

            {form.doctorId ? (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-3">
                <Award className="h-5 w-5 text-emerald-600" />
                <div className="flex-1">
                  <div className="font-extrabold text-slate-900 dark:text-white">{form.doctorName}</div>
                  <div className="text-xs text-slate-600 font-semibold">
                    Reg: {form.doctorRegNumber}
                    {form.doctorSpeciality && ' • ' + form.doctorSpeciality}
                  </div>
                </div>
                <button
                  onClick={() => setForm({ ...form, doctorId: '', doctorName: '', doctorRegNumber: '', doctorSpeciality: '' })}
                  className="text-xs font-extrabold text-emerald-700 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <button
                    onClick={() => setShowDoctorPicker(true)}
                    className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 dark:border-neutral-600 bg-slate-50 dark:bg-neutral-800 text-sm font-extrabold text-slate-600 hover:border-emerald-400"
                  >
                    <Search className="h-4 w-4 inline mr-1" />
                    Search Registered Doctor
                  </button>
                </div>
                <input
                  value={form.doctorName}
                  onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                  placeholder="Doctor Name (manual entry)"
                  className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
                <input
                  value={form.doctorRegNumber}
                  onChange={(e) => setForm({ ...form, doctorRegNumber: e.target.value })}
                  placeholder="PMDC Reg #"
                  className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <input
                  value={form.doctorSpeciality}
                  onChange={(e) => setForm({ ...form, doctorSpeciality: e.target.value })}
                  placeholder="Speciality"
                  className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
                <input
                  value={form.hospitalName}
                  onChange={(e) => setForm({ ...form, hospitalName: e.target.value })}
                  placeholder="Hospital / Clinic"
                  className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {showDoctorPicker && (
              <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                <div className="flex gap-2 mb-2">
                  <input
                    autoFocus
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Search by name, reg #..."
                    className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <button onClick={() => setShowDoctorPicker(false)} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {doctors.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => pickDoctor(doc)}
                      className="w-full px-3 py-2 flex items-center gap-3 rounded-lg hover:bg-white dark:hover:bg-neutral-800 text-left"
                    >
                      <Stethoscope className="h-4 w-4 text-emerald-600" />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate">{doc.name}</div>
                        <div className="text-xs text-slate-500 font-semibold">
                          {doc.registrationNumber} {doc.specialization && '• ' + doc.specialization}
                        </div>
                      </div>
                      {doc.isVerified && <Award className="h-3 w-3 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* PATIENT */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-violet-600" />
              Patient Information
            </h3>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Existing Customer (optional)</label>
              <select
                value={form.customerId}
                onChange={(e) => {
                  const c = customersData?.items.find((x) => x.id === e.target.value);
                  setForm({
                    ...form,
                    customerId: e.target.value,
                    patientName: c?.name || form.patientName,
                    patientPhone: c?.phone || form.patientPhone,
                  });
                }}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
              >
                <option value="">Walk-in / New patient</option>
                {(customersData?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.phone ? '• ' + c.phone : ''}</option>
                ))}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                placeholder="Patient name"
                className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
              />
              <input
                value={form.patientPhone}
                onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                placeholder="Phone"
                className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
              />
              <input
                value={form.patientCnic}
                onChange={(e) => setForm({ ...form, patientCnic: e.target.value })}
                placeholder="CNIC (required for narcotics)"
                className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={form.patientAge}
                  onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
                  placeholder="Age"
                  className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500"
                />
                <select
                  value={form.patientGender}
                  onChange={(e) => setForm({ ...form, patientGender: e.target.value })}
                  className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-violet-500"
                >
                  <option value="">Sex</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="O">O</option>
                </select>
                <input
                  type="number" step="0.1"
                  value={form.patientWeight}
                  onChange={(e) => setForm({ ...form, patientWeight: e.target.value })}
                  placeholder="Wt (kg)"
                  className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </section>

          {/* MEDICINES */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="h-4 w-4 text-violet-600" />
                Prescribed Medicines
              </h3>
              <Button size="sm" onClick={addItem} className="bg-gradient-to-r from-violet-600 to-purple-700">
                <Plus className="h-3.5 w-3.5" />
                Add Medicine
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-slate-600">Medicine #{i + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-6 gap-2">
                    <div className="sm:col-span-3 relative">
                      <input
                        value={item.medicineName}
                        onChange={(e) => updateItem(i, { medicineName: e.target.value })}
                        placeholder="Medicine name *"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 pr-9 text-sm font-bold focus:outline-none focus:border-violet-500"
                      />
                      <button
                        onClick={() => setShowProductPicker(i)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center"
                        title="Pick from stock"
                      >
                        <Search className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      value={item.strength || ''}
                      onChange={(e) => updateItem(i, { strength: e.target.value })}
                      placeholder="500mg"
                      className="h-10 sm:col-span-1 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-violet-500"
                    />
                    <input
                      type="number" step="0.5"
                      value={item.prescribedQty}
                      onChange={(e) => updateItem(i, { prescribedQty: Number(e.target.value) })}
                      className="h-10 sm:col-span-1 rounded-lg border-2 border-violet-200 bg-violet-50 dark:bg-violet-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-violet-500"
                    />
                    <input
                      value={item.unit || 'tablet'}
                      onChange={(e) => updateItem(i, { unit: e.target.value })}
                      placeholder="unit"
                      className="h-10 sm:col-span-1 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  {showProductPicker === i && (
                    <div className="rounded-lg border-2 border-violet-300 bg-violet-50/50 dark:bg-violet-950/20 p-2">
                      <div className="flex gap-2 mb-2">
                        <input
                          autoFocus
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search medicine..."
                          className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
                        />
                        <button onClick={() => setShowProductPicker(null)} className="h-9 w-9 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {(productsData?.items ?? []).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => pickProductForItem(i, p)}
                            className="w-full px-2 py-1.5 flex items-center gap-2 rounded hover:bg-white dark:hover:bg-neutral-800 text-left"
                          >
                            <Pill className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs font-extrabold truncate flex-1">{p.name}</span>
                            <span className="text-[10px] font-bold text-slate-500">Stock: {p.stock}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-3 gap-2">
                    <input
                      value={item.dose || ''}
                      onChange={(e) => updateItem(i, { dose: e.target.value })}
                      placeholder="Dose (500mg)"
                      className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-violet-500"
                    />
                    <input
                      value={item.frequency || ''}
                      onChange={(e) => updateItem(i, { frequency: e.target.value })}
                      placeholder="Frequency (1-0-1 / TID)"
                      className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-violet-500"
                    />
                    <input
                      value={item.duration || ''}
                      onChange={(e) => updateItem(i, { duration: e.target.value })}
                      placeholder="Duration (7 days)"
                      className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <input
                    value={item.instructions || ''}
                    onChange={(e) => updateItem(i, { instructions: e.target.value })}
                    placeholder="Instructions (after meals, empty stomach...)"
                    className="h-9 w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-violet-500"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* DIAGNOSIS */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white">Diagnosis & Notes</h3>

            <input
              value={form.chiefComplaint}
              onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
              placeholder="Chief complaint"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
            />

            <textarea
              rows={2}
              value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
              placeholder="Diagnosis / clinical notes"
              className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none"
            />

            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Internal notes"
              className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none"
            />
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            {/* IMAGES */}
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Camera className="h-4 w-4 text-violet-600" />
                Prescription Images
              </h4>
              {form.imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-1 mb-2">
                  {form.imageUrls.map((url: string, i: number) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setForm({ ...form, imageUrls: form.imageUrls.filter((_: any, idx: number) => idx !== i) })}
                        className="absolute top-1 right-1 h-5 w-5 rounded bg-rose-600 text-white flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <UploadDropzone
                onUploaded={(records) => {
                  const urls = Array.isArray(records)
                    ? records.map((r: any) => r.url || r).filter(Boolean)
                    : [(records as any)?.url || records];
                  setForm({ ...form, imageUrls: [...form.imageUrls, ...urls] });
                }}
              />
            </section>

            {/* REFILL */}
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-2">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Repeat className="h-4 w-4 text-emerald-600" />
                Refill Settings
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRefillable}
                  onChange={(e) => setForm({ ...form, isRefillable: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-extrabold">Refillable</span>
              </label>
              {form.isRefillable && (
                <>
                  <input
                    type="number" min="0"
                    value={form.refillsAllowed}
                    onChange={(e) => setForm({ ...form, refillsAllowed: e.target.value })}
                    placeholder="Refills allowed"
                    className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={form.refillFrequency}
                    onChange={(e) => setForm({ ...form, refillFrequency: e.target.value })}
                    className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Frequency...</option>
                    {REFILL_FREQ.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </>
              )}
            </section>

            {/* INSURANCE */}
            <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-4 space-y-2">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                Insurance
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isInsuranceClaim}
                  onChange={(e) => setForm({ ...form, isInsuranceClaim: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-extrabold">Insurance claim</span>
              </label>
              {form.isInsuranceClaim && (
                <>
                  <input
                    value={form.insuranceProvider}
                    onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })}
                    placeholder="Provider"
                    className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500"
                  />
                  <input
                    value={form.insuranceApprovalCode}
                    onChange={(e) => setForm({ ...form, insuranceApprovalCode: e.target.value })}
                    placeholder="Approval code"
                    className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </>
              )}
            </section>

            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!canSave}
              size="lg"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-700"
            >
              <Save className="h-4 w-4" />
              Create Prescription
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
