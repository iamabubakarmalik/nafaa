/**
 * Add or change a live animal: what it is (species, breed, age, colour),
 * its health on arrival, where it came from, cage and feeding, photos, and
 * its cost and asking price. A sold or closed record cannot be changed.
 *
 * Keys: Ctrl+S save · Esc back.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, HeartPulse, Home, Image as ImageIcon, PawPrint, Wallet, X } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { UploadDropzone } from '@core/components/uploads';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { liveAnimalsApi, type PetLiveAnimal } from '../api/live-animals.api';
import type { PetSpeciesType } from '../api/products.api';
import { useSaveKey } from '../hooks/usePageKeys';
import { PET_KEYS, SPECIES, dayKey, errorText, numIn } from '../lib/meta';

interface Draft {
  species: PetSpeciesType | ''; breed: string; name: string; gender: string; ageMonths: string; color: string; weightKg: string;
  acquiredDate: string; sourceType: string; sourceName: string;
  isVaccinated: boolean; vaccinationDetails: string; isDewormed: boolean; dewormingDetails: string; hasHealthCertificate: boolean; healthNotes: string;
  costPrice: string; askingPrice: string; currentCage: string; feedingSchedule: string; specialNeeds: string; isFeatured: boolean; notes: string;
  imageUrls: string[];
}

const blank: Draft = {
  species: '', breed: '', name: '', gender: '', ageMonths: '', color: '', weightKg: '', acquiredDate: dayKey(), sourceType: 'BREEDER', sourceName: '',
  isVaccinated: false, vaccinationDetails: '', isDewormed: false, dewormingDetails: '', hasHealthCertificate: false, healthNotes: '',
  costPrice: '', askingPrice: '', currentCage: '', feedingSchedule: '', specialNeeds: '', isFeatured: false, notes: '', imageUrls: [],
};

const fromAnimal = (a: PetLiveAnimal): Draft => ({
  species: a.species, breed: a.breed ?? '', name: a.name ?? '', gender: a.gender ?? '', ageMonths: a.ageMonths != null ? String(a.ageMonths) : '',
  color: a.color ?? '', weightKg: a.weightKg != null ? String(a.weightKg) : '', acquiredDate: a.acquiredDate ? dayKey(new Date(a.acquiredDate)) : '',
  sourceType: a.sourceType ?? '', sourceName: a.sourceName ?? '', isVaccinated: a.isVaccinated, vaccinationDetails: a.vaccinationDetails ?? '',
  isDewormed: a.isDewormed, dewormingDetails: a.dewormingDetails ?? '', hasHealthCertificate: a.hasHealthCertificate, healthNotes: a.healthNotes ?? '',
  costPrice: a.costPrice != null ? String(a.costPrice) : '', askingPrice: String(a.askingPrice), currentCage: a.currentCage ?? '',
  feedingSchedule: a.feedingSchedule ?? '', specialNeeds: a.specialNeeds ?? '', isFeatured: a.isFeatured, notes: a.notes ?? '', imageUrls: a.imageUrls ?? [],
});

const SOURCES = [{ value: '', label: '—' }, { value: 'BREEDER', label: 'Breeder' }, { value: 'MANDI', label: 'Mandi' }, { value: 'IMPORT', label: 'Import' }, { value: 'CUSTOMER', label: 'Customer se liya' }, { value: 'OWN', label: 'Apni nasal' }];
const GENDERS = [{ value: '', label: '—' }, { value: 'Male', label: 'Nar (male)' }, { value: 'Female', label: 'Mada (female)' }, { value: 'Pair', label: 'Jora' }];

export default function LiveAnimalFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { cost: costMoney, costHidden } = useMasked();
  const [d, setD] = useState<Draft>(blank);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const animalQ = useQuery({ queryKey: [PET_KEYS.animal, id], queryFn: () => liveAnimalsApi.getOne(id!), enabled: editing });
  useEffect(() => { if (animalQ.data) setD(fromAnimal(animalQ.data)); }, [animalQ.data]);
  const locked = !!animalQ.data && ['SOLD', 'DECEASED', 'RETURNED', 'ADOPTED'].includes(animalQ.data.status);

  const cost = numIn(d.costPrice);
  const price = numIn(d.askingPrice);
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.species) errors.species = 'Kaun sa janwar — chunein';
  if (price === null || price <= 0) errors.askingPrice = 'Bechne ka rate likhein';
  if (cost !== null && cost < 0) errors.costPrice = 'Cost sahi likhein';
  if (d.ageMonths && (numIn(d.ageMonths) ?? -1) < 0) errors.ageMonths = 'Umar mahinon me';
  if (d.weightKg && !((numIn(d.weightKg) ?? 0) > 0)) errors.weightKg = 'Wazan sahi likhein';
  if (d.acquiredDate && d.acquiredDate > dayKey()) errors.acquiredDate = 'Aane ki date aage ki nahi ho sakti';
  const problems = Object.values(errors);

  const save = useMutation({
    mutationFn: () => {
      const t = (v: string) => v.trim() || undefined;
      const body: Partial<PetLiveAnimal> = {
        species: d.species as PetSpeciesType, breed: t(d.breed), name: t(d.name), gender: t(d.gender),
        ageMonths: d.ageMonths ? Math.round(numIn(d.ageMonths) ?? 0) : undefined, color: t(d.color), weightKg: d.weightKg ? numIn(d.weightKg) ?? undefined : undefined,
        acquiredDate: d.acquiredDate || undefined, sourceType: t(d.sourceType), sourceName: t(d.sourceName),
        isVaccinated: d.isVaccinated, vaccinationDetails: t(d.vaccinationDetails), isDewormed: d.isDewormed, dewormingDetails: t(d.dewormingDetails),
        hasHealthCertificate: d.hasHealthCertificate, healthNotes: t(d.healthNotes), costPrice: cost ?? undefined, askingPrice: price ?? 0,
        currentCage: t(d.currentCage), feedingSchedule: t(d.feedingSchedule), specialNeeds: t(d.specialNeeds), isFeatured: d.isFeatured, notes: t(d.notes),
        imageUrls: d.imageUrls,
      };
      return editing ? liveAnimalsApi.update(id!, body) : liveAnimalsApi.create(body);
    },
    onSuccess: (a) => {
      [PET_KEYS.animals, PET_KEYS.animal, 'petshop-pos-animals', 'petshop-dashboard-overview'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(editing ? 'Save ho gaya' : `${a.animalNumber} darj ho gaya — counter par card aa gaya`);
      navigate(`/petshop/live-animals/${a.id}`);
    },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => { setTouched(true); if (problems.length) { toast.error(problems[0]); return; } if (!save.isPending && !locked) save.mutate(); };
  useSaveKey(submit);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDialogOpen()) navigate(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
  const err = (k: keyof Draft) => (touched ? errors[k] : undefined);

  if (editing && animalQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  if (editing && !animalQ.data) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye janwar nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/petshop/live-animals')}>Wapas</Button></div></PageShell>;

  const margin = cost !== null && price ? price - cost : null;

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${animalQ.data?.animalNumber} — badlein` : 'Naya janwar'}</h1>
          <p className="text-[0.8125rem] text-white/75">{editing ? 'Jo badalna hai badlein — baqi waisa hi rahega' : 'Darj hote hi counter par iska card aa jata hai'}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
      </div>

      {locked && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Ye janwar {animalQ.data?.status === 'SOLD' ? 'bik chuka' : 'record se band'} hai — badla nahi ja sakta.</p>}

      <fieldset disabled={locked} className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={PawPrint}>Janwar</T>}>
            <div className="space-y-3">
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaun sa janwar <span className="text-rose-600">*</span></span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(SPECIES) as Array<keyof typeof SPECIES>).map((k) => (
                    <button key={k} type="button" onClick={() => set('species', k)}
                      className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', d.species === k ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                      {SPECIES[k].emoji} {SPECIES[k].label}
                    </button>
                  ))}
                </div>
                {err('species') && <p className="mt-1 text-[0.75rem] text-rose-600">{err('species')}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Nasal (breed)" value={d.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Persian, German Shepherd, Budgie" hint="Counter par isi se dhoondte hain" />
                <Input label="Naam (marzi)" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Tiger" />
                <Select label="Jins" value={d.gender} onChange={(e) => set('gender', e.target.value)} options={GENDERS} />
                <Input label="Umar (mahine)" inputMode="numeric" value={d.ageMonths} onChange={(e) => set('ageMonths', e.target.value)} error={err('ageMonths')} placeholder="3" />
                <Input label="Rang" value={d.color} onChange={(e) => set('color', e.target.value)} placeholder="Safed, bhoora" />
                <Input label="Wazan (kg)" inputMode="decimal" value={d.weightKg} onChange={(e) => set('weightKg', e.target.value)} error={err('weightKg')} />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={HeartPulse}>Sehat</T>}>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Switch label="Vaccine lagi hai" checked={d.isVaccinated} onChange={(e) => set('isVaccinated', e.target.checked)} />
                  {d.isVaccinated && <Input aria-label="Kaun si vaccine" value={d.vaccinationDetails} onChange={(e) => set('vaccinationDetails', e.target.value)} placeholder="DHPP, Rabies — date" />}</div>
                <div className="space-y-2"><Switch label="Deworming hui hai" checked={d.isDewormed} onChange={(e) => set('isDewormed', e.target.checked)} />
                  {d.isDewormed && <Input aria-label="Deworming tafseel" value={d.dewormingDetails} onChange={(e) => set('dewormingDetails', e.target.value)} placeholder="Dawa aur date" />}</div>
              </div>
              <Switch label="Sehat ka certificate hai" checked={d.hasHealthCertificate} onChange={(e) => set('hasHealthCertificate', e.target.checked)} />
              <Textarea label="Sehat ke note (marzi)" rows={2} value={d.healthNotes} onChange={(e) => set('healthNotes', e.target.value)} placeholder="Khaansi thi, ab theek…" />
              <p className="text-[0.75rem] text-slate-500">Baad ki vaccine / doctor visit janwar ke page par "Sehat record" se likhein.</p>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Home}>Kahan se, kahan rakha</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Kahan se aaya" value={d.sourceType} onChange={(e) => set('sourceType', e.target.value)} options={SOURCES} />
              <Input label="Kis se (marzi)" value={d.sourceName} onChange={(e) => set('sourceName', e.target.value)} placeholder="Breeder ka naam" />
              <Input label="Aane ki date" type="date" max={dayKey()} value={d.acquiredDate} onChange={(e) => set('acquiredDate', e.target.value)} error={err('acquiredDate')} hint="Kitne din se dukaan me — isi se ginti" />
              <Input label="Cage" value={d.currentCage} onChange={(e) => set('currentCage', e.target.value)} placeholder="A-3" />
              <Input label="Khana kab" value={d.feedingSchedule} onChange={(e) => set('feedingSchedule', e.target.value)} placeholder="Subah 9, shaam 6" />
              <Input label="Khaas dekh bhaal" value={d.specialNeeds} onChange={(e) => set('specialNeeds', e.target.value)} placeholder="Garam jagah" />
              <div className="sm:col-span-2"><Textarea label="Note (marzi)" rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} /></div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Wallet}>Paisa</T>}>
            <div className="space-y-3">
              <Input label="Bechne ka rate (Rs)" required inputMode="decimal" value={d.askingPrice} onChange={(e) => set('askingPrice', e.target.value)} error={err('askingPrice')} hint="Counter par yahi rate aata hai; bill par kam kar sakte hain" />
              {!costHidden && <Input label="Cost (Rs)" inputMode="decimal" value={d.costPrice} onChange={(e) => set('costPrice', e.target.value)} error={err('costPrice')} hint="Kitne ka liya — profit aur mar jane par loss isi se" />}
              {!costHidden && margin !== null && <p className={cn('text-[0.8125rem] font-semibold', margin >= 0 ? 'text-emerald-700' : 'text-rose-700')}>Profit: {costMoney(margin)}</p>}
              <Switch label="Counter par upar dikhayein" checked={d.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={ImageIcon}>Tasveerein</T>}>
            <UploadDropzone purpose="animal-photo" maxFiles={10} hint="Counter card par pehli tasveer aati hai"
              onUploaded={(recs) => set('imageUrls', [...d.imageUrls, ...recs.map((r) => r.url)])} />
            {d.imageUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {d.imageUrls.map((url, i) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="aspect-square w-full rounded-xl object-cover ring-1 ring-slate-200" />
                    <button type="button" onClick={() => set('imageUrls', d.imageUrls.filter((_, x) => x !== i))} aria-label="Tasveer hatayein"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 ring-1 ring-slate-200"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </fieldset>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {touched && problems.length > 0
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{price ? `Rate ${formatPKR(price)}` : 'Janwar aur rate zaroori hain'}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} disabled={locked}>{editing ? 'Save karein' : 'Janwar darj karein'}</Button>
      </div>
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof PawPrint; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
