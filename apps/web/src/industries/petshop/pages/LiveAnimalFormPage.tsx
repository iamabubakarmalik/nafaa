import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Save, X, Heart, Camera, Star, Syringe, FileText,
  AlertCircle, Sparkles, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { liveAnimalsApi } from '../api/live-animals.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';

const SPECIES = [
  { v: 'DOG', l: 'Dog', e: '🐕' },
  { v: 'CAT', l: 'Cat', e: '🐈' },
  { v: 'BIRD', l: 'Bird', e: '🦜' },
  { v: 'FISH', l: 'Fish', e: '🐠' },
  { v: 'RABBIT', l: 'Rabbit', e: '🐰' },
  { v: 'HAMSTER', l: 'Hamster', e: '🐹' },
  { v: 'GUINEA_PIG', l: 'Guinea Pig', e: '🐹' },
  { v: 'PARROT', l: 'Parrot', e: '🦜' },
  { v: 'TURTLE', l: 'Turtle', e: '🐢' },
  { v: 'REPTILE', l: 'Reptile', e: '🦎' },
  { v: 'HORSE', l: 'Horse', e: '🐴' },
  { v: 'FARM_ANIMAL', l: 'Farm', e: '🐄' },
];

const SOURCES = ['Breeder', 'Rescue', 'Owner Surrender', 'Import', 'Born Here', 'Other'];

export default function LiveAnimalFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    species: 'DOG',
    breed: '',
    subBreed: '',
    name: '',
    gender: 'Male',
    ageMonths: '' as number | '',
    color: '',
    weightKg: '' as number | '',
    birthDate: '',
    acquiredDate: new Date().toISOString().slice(0, 10),
    sourceType: '',
    sourceName: '',
    isVaccinated: false,
    vaccinationDetails: '',
    isDewormed: false,
    dewormingDetails: '',
    hasHealthCertificate: false,
    healthNotes: '',
    costPrice: '' as number | '',
    askingPrice: 0,
    currentCage: '',
    feedingSchedule: '',
    specialNeeds: '',
    imageUrls: [] as string[],
    videoUrl: '',
    isFeatured: false,
    notes: '',
  });

  const { data: existing } = useQuery({
    queryKey: ['live-animal', id],
    queryFn: () => liveAnimalsApi.getOne(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        species: existing.species,
        breed: existing.breed ?? '',
        subBreed: existing.subBreed ?? '',
        name: existing.name ?? '',
        gender: existing.gender ?? 'Male',
        ageMonths: existing.ageMonths ?? '',
        color: existing.color ?? '',
        weightKg: existing.weightKg ?? '',
        birthDate: existing.birthDate ? existing.birthDate.slice(0, 10) : '',
        acquiredDate: existing.acquiredDate ? existing.acquiredDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        sourceType: existing.sourceType ?? '',
        sourceName: existing.sourceName ?? '',
        isVaccinated: existing.isVaccinated,
        vaccinationDetails: existing.vaccinationDetails ?? '',
        isDewormed: existing.isDewormed,
        dewormingDetails: existing.dewormingDetails ?? '',
        hasHealthCertificate: existing.hasHealthCertificate,
        healthNotes: existing.healthNotes ?? '',
        costPrice: existing.costPrice ?? '',
        askingPrice: existing.askingPrice,
        currentCage: existing.currentCage ?? '',
        feedingSchedule: existing.feedingSchedule ?? '',
        specialNeeds: existing.specialNeeds ?? '',
        imageUrls: existing.imageUrls ?? [],
        videoUrl: existing.videoUrl ?? '',
        isFeatured: existing.isFeatured,
        notes: existing.notes ?? '',
      });
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: () => {
      const payload: any = {
        ...form,
        ageMonths: form.ageMonths === '' ? undefined : Number(form.ageMonths),
        weightKg: form.weightKg === '' ? undefined : Number(form.weightKg),
        costPrice: form.costPrice === '' ? undefined : Number(form.costPrice),
        askingPrice: Number(form.askingPrice),
      };
      return isEdit
        ? liveAnimalsApi.update(id!, payload)
        : liveAnimalsApi.create(payload);
    },
    onSuccess: (result) => {
      toast.success(isEdit ? 'Animal updated' : 'Animal added');
      qc.invalidateQueries({ queryKey: ['live-animals-list'] });
      qc.invalidateQueries({ queryKey: ['live-animals-summary'] });
      navigate(`/petshop/live-animals/${result.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const canSave = form.species && form.askingPrice > 0;

  return (
    <div className="space-y-5 pb-24">
      <button onClick={() => navigate('/petshop/live-animals')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-rose-600 font-bold">
        <ArrowLeft className="h-4 w-4" /> Back to Animals
      </button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-pink-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
            <Heart className="h-3.5 w-3.5 text-amber-300" /> {isEdit ? 'Edit Animal' : 'New Animal'}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
            {isEdit ? form.name || `Edit ${form.species}` : '❤️ Add Live Animal'}
          </h1>
        </div>
      </section>

      {/* IDENTITY */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead icon={Heart} title="Identity" tone="rose" />

        <div>
          <Lbl>Species *</Lbl>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {SPECIES.map((s) => (
              <button key={s.v} type="button" onClick={() => setForm({ ...form, species: s.v })}
                className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5 ${
                  form.species === s.v ? 'border-rose-600 bg-rose-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-400'}`}>
                <span className="text-xl">{s.e}</span>
                <span className="text-[10px] font-extrabold">{s.l}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Breed" placeholder="German Shepherd, Persian..."
            value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          <Input label="Sub-breed / Type"
            value={form.subBreed} onChange={(e) => setForm({ ...form, subBreed: e.target.value })} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Pet Name (optional)" placeholder="Buddy, Whiskers..."
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div>
            <Lbl>Gender</Lbl>
            <div className="flex gap-2">
              {['Male', 'Female', 'Unknown'].map((g) => (
                <button key={g} type="button" onClick={() => setForm({ ...form, gender: g })}
                  className={`flex-1 h-11 rounded-xl border-2 text-sm font-extrabold ${
                    form.gender === g ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Age (months)" type="number" value={form.ageMonths}
            onChange={(e) => setForm({ ...form, ageMonths: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Color" placeholder="Golden, Black & White..."
            value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          <Input label="Weight (kg)" type="number" step="0.1" value={form.weightKg}
            onChange={(e) => setForm({ ...form, weightKg: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Birth Date (optional)" type="date"
            value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          <Input label="Acquired Date *" type="date"
            value={form.acquiredDate} onChange={(e) => setForm({ ...form, acquiredDate: e.target.value })} />
        </div>
      </section>

      {/* SOURCE */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead icon={FileText} title="Source" tone="blue" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Source Type</Lbl>
            <select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">Select source</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label="Source Name" placeholder="Breeder name, shelter..."
            value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} />
        </div>
      </section>

      {/* HEALTH */}
      <section className="rounded-3xl bg-white border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHead icon={Syringe} title="Health Status" tone="emerald" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Toggle checked={form.isVaccinated} onChange={(v: boolean) => setForm({ ...form, isVaccinated: v })} label="Vaccinated" emoji="💉" />
          <Toggle checked={form.isDewormed} onChange={(v: boolean) => setForm({ ...form, isDewormed: v })} label="Dewormed" emoji="🐛" />
          <Toggle checked={form.hasHealthCertificate} onChange={(v: boolean) => setForm({ ...form, hasHealthCertificate: v })} label="Health Cert" emoji="📄" />
        </div>

        {form.isVaccinated && (
          <div>
            <Lbl>Vaccination Details</Lbl>
            <textarea rows={2} value={form.vaccinationDetails}
              onChange={(e) => setForm({ ...form, vaccinationDetails: e.target.value })}
              placeholder="DHPP, Rabies, dates..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </div>
        )}

        {form.isDewormed && (
          <div>
            <Lbl>Deworming Details</Lbl>
            <textarea rows={2} value={form.dewormingDetails}
              onChange={(e) => setForm({ ...form, dewormingDetails: e.target.value })}
              placeholder="Product used, dates..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
          </div>
        )}

        <div>
          <Lbl>Health Notes</Lbl>
          <textarea rows={2} value={form.healthNotes}
            onChange={(e) => setForm({ ...form, healthNotes: e.target.value })}
            placeholder="Any allergies, conditions, medications..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
      </section>

      {/* PRICING */}
      <section className="rounded-3xl bg-white border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHead icon={Sparkles} title="Pricing" tone="amber" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Cost Price" type="number" step="0.01" value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value === '' ? '' : Number(e.target.value) })} />
          <div>
            <Lbl>Asking Price *</Lbl>
            <input type="number" step="0.01" value={form.askingPrice}
              onChange={(e) => setForm({ ...form, askingPrice: Number(e.target.value) })}
              className="h-14 w-full rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 text-2xl font-extrabold tabular-nums text-amber-900 focus:outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-200" />
          </div>
        </div>
      </section>

      {/* CARE */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead icon={FileText} title="Care & Location" tone="violet" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Current Cage / Location" placeholder="Cage A-1, Aquarium 3"
            value={form.currentCage} onChange={(e) => setForm({ ...form, currentCage: e.target.value })} />
          <Input label="Feeding Schedule" placeholder="2x daily, morning & evening"
            value={form.feedingSchedule} onChange={(e) => setForm({ ...form, feedingSchedule: e.target.value })} />
        </div>
        <div>
          <Lbl>Special Needs</Lbl>
          <textarea rows={2} value={form.specialNeeds}
            onChange={(e) => setForm({ ...form, specialNeeds: e.target.value })}
            placeholder="Special diet, medications, temperature requirements..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
        </div>
      </section>

      {/* MEDIA */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead icon={ImageIcon} title="Photos & Video" tone="pink" />
        <UploadDropzone purpose="animal-photo" maxFiles={10}
          onUploaded={(recs: any[]) => setForm({ ...form, imageUrls: [...form.imageUrls, ...recs.map((r: any) => r.url)] })}
          hint="Up to 10 photos" />
        {form.imageUrls.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {form.imageUrls.map((url, i) => (
              <div key={url + i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-slate-200">
                <img src={url} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-extrabold">MAIN</div>}
                <button onClick={() => setForm({ ...form, imageUrls: form.imageUrls.filter((_, x) => x !== i) })}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
              </div>
            ))}
          </div>
        )}
        <Input label="Video URL (YouTube)" placeholder="https://youtube.com/..."
          value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
      </section>

      {/* FLAGS */}
      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5 space-y-4">
        <SectionHead icon={Star} title="Marketing & Notes" tone="amber" />
        <div>
          <Toggle checked={form.isFeatured} onChange={(v: boolean) => setForm({ ...form, isFeatured: v })} label="Featured Animal" emoji="⭐" />
        </div>
        <div>
          <Lbl>Additional Notes</Lbl>
          <textarea rows={3} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Personality, training, any other important info..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" />
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-200 bg-white/95 backdrop-blur px-4 py-3 lg:pl-[300px]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <Button variant="secondary" onClick={() => navigate('/petshop/live-animals')}>Cancel</Button>
          <Button className="bg-gradient-to-r from-rose-600 to-pink-700"
            onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            <Save className="h-4 w-4" /> {isEdit ? 'Update' : 'Add Animal'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-pink-700', blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-teal-700', amber: 'from-amber-500 to-orange-700',
    violet: 'from-violet-500 to-purple-700', pink: 'from-pink-500 to-rose-700',
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
function Toggle({ checked, onChange, label, emoji }: any) {
  return (
    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
      checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded" />
      <span className="text-2xl">{emoji}</span>
      <span className="font-extrabold text-sm text-slate-900">{label}</span>
    </label>
  );
}
