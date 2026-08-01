import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, X, Scissors, User, Phone, Calendar, Clock,
  Heart, AlertCircle, Camera, DollarSign, Sparkles, Users,
  Image as ImageIcon, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { groomingApi } from '../api/grooming.api';
import { groomersApi } from '../api/groomers.api';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import { formatPKR, formatPKRFull } from '@core/lib/format';

const SPECIES = [
  { v: 'DOG', l: 'Dog', e: '🐕' },
  { v: 'CAT', l: 'Cat', e: '🐈' },
  { v: 'BIRD', l: 'Bird', e: '🦜' },
  { v: 'RABBIT', l: 'Rabbit', e: '🐰' },
  { v: 'HAMSTER', l: 'Hamster', e: '🐹' },
  { v: 'OTHER', l: 'Other', e: '🐾' },
];

const SERVICE_TYPES = [
  { v: 'BATH_BASIC', l: 'Basic Bath', e: '🛁', price: 500 },
  { v: 'BATH_DELUXE', l: 'Deluxe Bath', e: '✨', price: 1000 },
  { v: 'FULL_GROOMING', l: 'Full Grooming', e: '💇', price: 2000 },
  { v: 'HAIRCUT', l: 'Haircut', e: '✂️', price: 1200 },
  { v: 'NAIL_TRIMMING', l: 'Nail Trim', e: '💅', price: 300 },
  { v: 'EAR_CLEANING', l: 'Ear Cleaning', e: '👂', price: 400 },
  { v: 'TEETH_CLEANING', l: 'Teeth Cleaning', e: '🦷', price: 600 },
  { v: 'FLEA_TREATMENT', l: 'Flea Treatment', e: '🐛', price: 800 },
  { v: 'DE_SHEDDING', l: 'De-shedding', e: '🧹', price: 1500 },
  { v: 'ANAL_GLAND', l: 'Anal Gland', e: '⚕️', price: 500 },
  { v: 'STYLING', l: 'Styling', e: '💫', price: 1800 },
  { v: 'PACKAGE', l: 'Package Deal', e: '🎁', price: 3000 },
];

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
];

const TEMPERAMENTS = ['Calm', 'Friendly', 'Nervous', 'Aggressive', 'Playful', 'Shy', 'Excitable'];

export default function GroomingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    petName: '',
    petSpecies: 'DOG',
    petBreed: '',
    petAgeMonths: '' as number | '',
    petWeightKg: '' as number | '',
    petTemperament: '',
    petAllergies: '',
    petSpecialInstructions: '',
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledSlot: '',
    serviceType: 'FULL_GROOMING',
    additionalServices: [] as string[],
    serviceDescription: '',
    groomerId: '',
    serviceFee: 2000,
    additionalCharges: 0,
    discount: 0,
    photosBeforeUrls: [] as string[],
  });

  const { data: existing } = useQuery({
    queryKey: ['grooming', id],
    queryFn: () => groomingApi.getOne(id!),
    enabled: isEdit,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-grooming'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const { data: groomers = [] } = useQuery({
    queryKey: ['groomers-for-booking'],
    queryFn: () => groomersApi.list({ active: true }),
  });

  const { data: slotsData } = useQuery({
    queryKey: ['available-slots', form.groomerId, form.scheduledDate],
    queryFn: () => groomingApi.availableSlots(form.groomerId, form.scheduledDate),
    enabled: !!form.groomerId && !!form.scheduledDate,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        customerId: existing.customerId ?? '',
        customerName: existing.customerName,
        customerPhone: existing.customerPhone,
        petName: existing.petName,
        petSpecies: existing.petSpecies,
        petBreed: existing.petBreed ?? '',
        petAgeMonths: existing.petAgeMonths ?? '',
        petWeightKg: existing.petWeightKg ?? '',
        petTemperament: existing.petTemperament ?? '',
        petAllergies: existing.petAllergies ?? '',
        petSpecialInstructions: existing.petSpecialInstructions ?? '',
        scheduledDate: existing.scheduledDate.slice(0, 10),
        scheduledSlot: existing.scheduledSlot ?? '',
        serviceType: existing.serviceType,
        additionalServices: existing.additionalServices,
        serviceDescription: existing.serviceDescription ?? '',
        groomerId: existing.groomerId ?? '',
        serviceFee: existing.serviceFee,
        additionalCharges: existing.additionalCharges,
        discount: existing.discount,
        photosBeforeUrls: existing.photosBeforeUrls,
      });
    }
  }, [existing]);

  const totalFee = useMemo(
    () => Math.max(Number(form.serviceFee) + Number(form.additionalCharges) - Number(form.discount), 0),
    [form.serviceFee, form.additionalCharges, form.discount]
  );

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        petAgeMonths: form.petAgeMonths === '' ? undefined : Number(form.petAgeMonths),
        petWeightKg: form.petWeightKg === '' ? undefined : Number(form.petWeightKg),
        additionalServices: form.additionalServices as any,
      };
      return isEdit ? groomingApi.updateStatus(id!, { status: 'SCHEDULED' } as any) : groomingApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Appointment updated' : 'Appointment booked');
      qc.invalidateQueries({ queryKey: ['grooming-list'] });
      qc.invalidateQueries({ queryKey: ['grooming-summary'] });
      navigate('/petshop/grooming');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const canSave = form.customerName.trim() && form.customerPhone.trim() && form.petName.trim() && form.serviceFee > 0;

  const togAdditional = (v: string) => {
    setForm({
      ...form,
      additionalServices: form.additionalServices.includes(v)
        ? form.additionalServices.filter((x) => x !== v)
        : [...form.additionalServices, v],
    });
  };

  const selectService = (svc: typeof SERVICE_TYPES[number]) => {
    setForm({ ...form, serviceType: svc.v, serviceFee: svc.price });
  };

  return (
    <div className="space-y-5 pb-24">
      <button onClick={() => navigate('/petshop/grooming')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Back to Grooming
      </button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Scissors className="h-3.5 w-3.5 text-amber-300" />
            {isEdit ? 'Edit Appointment' : 'New Grooming Appointment'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            ✂️ {isEdit ? 'Edit Booking' : 'Book Grooming'}
          </h1>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* CUSTOMER */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
            <SectionHead icon={User} title="Customer" tone="violet" />

            <div>
              <Lbl>Existing Customer (optional)</Lbl>
              <select value={form.customerId}
                onChange={(e) => {
                  const c = customers.find((x: any) => x.id === e.target.value);
                  setForm({
                    ...form,
                    customerId: e.target.value,
                    customerName: c?.name || form.customerName,
                    customerPhone: c?.phone || form.customerPhone,
                  });
                }}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                <option value="">Walk-in / New customer</option>
                {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name} — {c.phone}</option>))}
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Customer Name *" placeholder="Full name"
                value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              <Input label="Phone *" placeholder="03XX XXXXXXX"
                value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                leftIcon={<Phone className="h-4 w-4 text-slate-400" />} />
            </div>
          </section>

          {/* PET */}
          <section className="rounded-3xl bg-white border-2 border-rose-300 bg-gradient-to-br from-rose-50 to-white p-5 space-y-4">
            <SectionHead icon={Heart} title="Pet Information" tone="rose" />

            <div>
              <Lbl>Pet Name *</Lbl>
              <input value={form.petName} onChange={(e) => setForm({ ...form, petName: e.target.value })}
                placeholder="Buddy, Whiskers..."
                className="h-14 w-full rounded-2xl border-2 border-rose-300 bg-white px-4 text-lg font-extrabold focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-200" />
            </div>

            <div>
              <Lbl>Species *</Lbl>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {SPECIES.map((s) => (
                  <button key={s.v} type="button" onClick={() => setForm({ ...form, petSpecies: s.v })}
                    className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5 ${
                      form.petSpecies === s.v ? 'border-rose-500 bg-rose-500 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-400'}`}>
                    <span className="text-xl">{s.e}</span>
                    <span className="text-[10px] font-extrabold">{s.l}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Breed" placeholder="Labrador, Persian..."
                value={form.petBreed} onChange={(e) => setForm({ ...form, petBreed: e.target.value })} />
              <Input label="Age (months)" type="number" value={form.petAgeMonths}
                onChange={(e) => setForm({ ...form, petAgeMonths: e.target.value === '' ? '' : Number(e.target.value) })} />
              <Input label="Weight (kg)" type="number" step="0.1" value={form.petWeightKg}
                onChange={(e) => setForm({ ...form, petWeightKg: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>

            <div>
              <Lbl>Temperament</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {TEMPERAMENTS.map((t) => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, petTemperament: t })}
                    className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold ${
                      form.petTemperament === t ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Allergies</Lbl>
                <textarea rows={2} value={form.petAllergies}
                  onChange={(e) => setForm({ ...form, petAllergies: e.target.value })}
                  placeholder="Any known allergies..."
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500" />
              </div>
              <div>
                <Lbl>Special Instructions</Lbl>
                <textarea rows={2} value={form.petSpecialInstructions}
                  onChange={(e) => setForm({ ...form, petSpecialInstructions: e.target.value })}
                  placeholder="Handle with care, medications..."
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500" />
              </div>
            </div>
          </section>

          {/* SERVICE */}
          <section className="rounded-3xl bg-white border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
            <SectionHead icon={Scissors} title="Service Selection" tone="violet" />

            <div>
              <Lbl>Primary Service *</Lbl>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SERVICE_TYPES.map((s) => {
                  const active = form.serviceType === s.v;
                  return (
                    <button key={s.v} type="button" onClick={() => selectService(s)}
                      className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                        active ? 'border-violet-600 bg-violet-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-400'}`}>
                      <span className="text-2xl">{s.e}</span>
                      <span className="text-[10px] font-extrabold text-center leading-tight">{s.l}</span>
                      <span className={`text-[10px] font-bold ${active ? 'text-white/80' : 'text-emerald-700'}`}>
                        {formatPKR(s.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Lbl>Additional Services (optional)</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_TYPES.filter((s) => s.v !== form.serviceType).map((s) => {
                  const active = form.additionalServices.includes(s.v);
                  return (
                    <button key={s.v} type="button" onClick={() => togAdditional(s.v)}
                      className={`px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition ${
                        active ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'}`}>
                      {active ? '✓ ' : '+ '}{s.e} {s.l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Lbl>Service Description (optional)</Lbl>
              <textarea rows={2} value={form.serviceDescription}
                onChange={(e) => setForm({ ...form, serviceDescription: e.target.value })}
                placeholder="Any specific requests..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
            </div>
          </section>

          {/* SCHEDULE */}
          <section className="rounded-3xl bg-white border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
            <SectionHead icon={Calendar} title="Schedule & Groomer" tone="blue" />

            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Date *" type="date" min={new Date().toISOString().slice(0, 10)}
                value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />

              <div>
                <Lbl>Groomer</Lbl>
                <select value={form.groomerId} onChange={(e) => setForm({ ...form, groomerId: e.target.value, scheduledSlot: '' })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
                  <option value="">Assign later</option>
                  {(groomers as any[]).map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name} — {g.employeeCode}</option>
                  ))}
                </select>
              </div>
            </div>

            {form.groomerId && slotsData && (
              <div>
                <Lbl>Time Slot</Lbl>
                {slotsData.available?.length === 0 ? (
                  <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-sm font-extrabold text-amber-800 inline-flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> No slots available on this day
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {slotsData.available?.map((slot: string) => (
                      <button key={slot} type="button" onClick={() => setForm({ ...form, scheduledSlot: slot })}
                        className={`h-11 rounded-xl border-2 text-sm font-extrabold ${
                          form.scheduledSlot === slot ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
                {slotsData.booked?.length > 0 && (
                  <div className="mt-2 text-[10px] font-bold text-slate-500">
                    Booked: {slotsData.booked.map((b: any) => b.scheduledSlot).filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* PRICING */}
          <section className="rounded-3xl bg-white border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
            <SectionHead icon={DollarSign} title="Pricing" tone="emerald" />
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Service Fee *" type="number" value={form.serviceFee}
                onChange={(e) => setForm({ ...form, serviceFee: Number(e.target.value) })} />
              <Input label="Additional Charges" type="number" value={form.additionalCharges}
                onChange={(e) => setForm({ ...form, additionalCharges: Number(e.target.value) })} />
              <Input label="Discount" type="number" value={form.discount}
                onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
            </div>

            <div className="rounded-2xl bg-emerald-100 border-2 border-emerald-300 p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-emerald-700">Total Fee</div>
                <div className="text-xs font-bold text-emerald-800 mt-0.5">
                  {formatPKR(form.serviceFee)} + {formatPKR(form.additionalCharges)} − {formatPKR(form.discount)}
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-900 tabular-nums">{formatPKRFull(totalFee)}</div>
            </div>
          </section>

          {/* PHOTOS */}
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
            <SectionHead icon={Camera} title="Before Photos (optional)" tone="pink" />
            <UploadDropzone purpose="grooming-photo" maxFiles={5}
              onUploaded={(recs: any[]) => setForm({ ...form, photosBeforeUrls: [...form.photosBeforeUrls, ...recs.map((r: any) => r.url)] })}
              hint="Up to 5 before photos" />
            {form.photosBeforeUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {form.photosBeforeUrls.map((url, i) => (
                  <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm({ ...form, photosBeforeUrls: form.photosBeforeUrls.filter((_, x) => x !== i) })}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* SUMMARY SIDEBAR */}
        <aside className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-5 shadow-xl">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70">Booking Preview</div>
            <h3 className="mt-2 font-extrabold text-2xl leading-tight">
              {form.petName || 'Pet name...'}
            </h3>
            <p className="text-sm text-white/85 mt-1">
              {form.customerName || 'Customer name...'}
              {form.customerPhone && ` • ${form.customerPhone}`}
            </p>

            <div className="mt-4 space-y-1.5">
              <PreviewRow label="Service" value={SERVICE_TYPES.find((s) => s.v === form.serviceType)?.l || '—'} />
              {form.additionalServices.length > 0 && (
                <PreviewRow label="Add-ons" value={`+${form.additionalServices.length} services`} />
              )}
              <PreviewRow label="Date" value={form.scheduledDate ? new Date(form.scheduledDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—'} />
              {form.scheduledSlot && <PreviewRow label="Time" value={form.scheduledSlot} />}
              {form.groomerId && (
                <PreviewRow label="Groomer" value={(groomers as any[]).find((g: any) => g.id === form.groomerId)?.name || '—'} />
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="text-[10px] uppercase font-extrabold text-white/70">Total Fee</div>
              <div className="text-3xl font-extrabold tabular-nums text-emerald-300 mt-1">{formatPKRFull(totalFee)}</div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">Checklist</div>
            <Chk done={!!form.customerName.trim()} label="Customer name" />
            <Chk done={!!form.customerPhone.trim()} label="Customer phone" />
            <Chk done={!!form.petName.trim()} label="Pet name" />
            <Chk done={!!form.serviceType} label="Service selected" />
            <Chk done={!!form.scheduledDate} label="Date set" />
            <Chk done={form.serviceFee > 0} label="Fee entered" />
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/petshop/grooming')}>Cancel</Button>
          <Button className="bg-gradient-to-r from-violet-600 to-purple-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            <Save className="h-4 w-4" /> {isEdit ? 'Update Appointment' : `Book — ${formatPKRFull(totalFee)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700', rose: 'from-rose-500 to-pink-700',
    blue: 'from-blue-500 to-cyan-700', emerald: 'from-emerald-500 to-teal-700',
    pink: 'from-pink-500 to-rose-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-extrabold text-slate-900">{title}</h3>
    </div>
  );
}
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
function PreviewRow({ label, value }: any) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/70 font-semibold">{label}</span>
      <span className="font-extrabold text-white">{value}</span>
    </div>
  );
}
function Chk({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`h-4 w-4 rounded-md flex items-center justify-center shrink-0 ${done ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300'}`}>
        {done && <CheckCircle2 className="h-3 w-3" />}
      </div>
      <span className={`font-bold ${done ? 'text-emerald-800 line-through' : 'text-slate-600'}`}>{label}</span>
    </div>
  );
}
