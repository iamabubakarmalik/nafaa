/**
 * Book or change a grooming visit: the owner, the pet and what to watch
 * for, the service and fee, and the day, groomer and an open slot. A visit
 * can be changed only before work starts.
 *
 * Keys: Ctrl+S save · Esc back.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, CalendarDays, PawPrint, Phone, Scissors } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Select, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { groomersApi } from '../api/groomers.api';
import { groomingApi, type GroomingInput, type PetGroomingAppointment, type PetGroomingServiceType } from '../api/grooming.api';
import type { PetSpeciesType } from '../api/products.api';
import { useSaveKey } from '../hooks/usePageKeys';
import { PET_KEYS, SERVICE, SERVICE_OPTIONS, SPECIES, dayKey, errorText, numIn, phoneOk, shiftDay } from '../lib/meta';

interface Draft {
  customerName: string; customerPhone: string; petName: string; petSpecies: PetSpeciesType | ''; petBreed: string; petAgeMonths: string; petWeightKg: string;
  petTemperament: string; petAllergies: string; petSpecialInstructions: string;
  scheduledDate: string; groomerId: string; scheduledSlot: string; serviceType: PetGroomingServiceType; additionalServices: PetGroomingServiceType[];
  serviceFee: string; additionalCharges: string; discount: string;
}

const blank = (): Draft => ({
  customerName: '', customerPhone: '', petName: '', petSpecies: '', petBreed: '', petAgeMonths: '', petWeightKg: '', petTemperament: '', petAllergies: '',
  petSpecialInstructions: '', scheduledDate: dayKey(), groomerId: '', scheduledSlot: '', serviceType: 'BATH', additionalServices: [],
  serviceFee: '', additionalCharges: '', discount: '',
});

const fromVisit = (a: PetGroomingAppointment): Draft => ({
  customerName: a.customerName, customerPhone: a.customerPhone, petName: a.petName, petSpecies: a.petSpecies, petBreed: a.petBreed ?? '',
  petAgeMonths: a.petAgeMonths != null ? String(a.petAgeMonths) : '', petWeightKg: a.petWeightKg != null ? String(a.petWeightKg) : '',
  petTemperament: a.petTemperament ?? '', petAllergies: a.petAllergies ?? '', petSpecialInstructions: a.petSpecialInstructions ?? '',
  scheduledDate: dayKey(new Date(a.scheduledDate)), groomerId: a.groomerId ?? '', scheduledSlot: a.scheduledSlot ?? '', serviceType: a.serviceType,
  additionalServices: a.additionalServices ?? [], serviceFee: String(a.serviceFee), additionalCharges: a.additionalCharges ? String(a.additionalCharges) : '',
  discount: a.discount ? String(a.discount) : '',
});

const TEMPERS = ['Seedha', 'Darta hai', 'Kaat leta hai', 'Bohat chanchal'];
const fmtSlot = (s: string) => { const [h, m] = s.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

export default function GroomingFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [d, setD] = useState<Draft>(blank);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const visitQ = useQuery({ queryKey: [PET_KEYS.grooming, 'one', id], queryFn: () => groomingApi.getOne(id!), enabled: editing });
  useEffect(() => { if (visitQ.data) setD(fromVisit(visitQ.data)); }, [visitQ.data]);
  const locked = !!visitQ.data && !['SCHEDULED', 'CONFIRMED'].includes(visitQ.data.status);
  const groomersQ = useQuery({ queryKey: [PET_KEYS.groomers, 'active'], queryFn: () => groomersApi.list({ active: true }), staleTime: 60_000 });
  const slotsQ = useQuery({
    queryKey: [PET_KEYS.grooming, 'slots', d.groomerId, d.scheduledDate],
    queryFn: () => groomingApi.availableSlots(d.groomerId, d.scheduledDate),
    enabled: !!d.groomerId && !!d.scheduledDate,
  });
  const slots = slotsQ.data?.available ?? [];
  const own = visitQ.data?.groomerId === d.groomerId && dayKey(new Date(visitQ.data?.scheduledDate ?? 0)) === d.scheduledDate ? visitQ.data?.scheduledSlot : undefined;
  const slotList = own && !slots.includes(own) ? [own, ...slots].sort() : slots;
  const groomer = (groomersQ.data ?? []).find((g) => g.id === d.groomerId);

  const fee = numIn(d.serviceFee);
  const extra = numIn(d.additionalCharges) ?? 0;
  const discount = numIn(d.discount) ?? 0;
  const total = Math.max((fee ?? 0) + extra - discount, 0);
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.customerName.trim()) errors.customerName = 'Malik ka naam likhein';
  if (!phoneOk(d.customerPhone)) errors.customerPhone = 'Phone 10 se 15 hindse';
  if (!d.petName.trim()) errors.petName = 'Pet ka naam likhein';
  if (!d.petSpecies) errors.petSpecies = 'Kaun sa janwar — chunein';
  if (!d.scheduledDate) errors.scheduledDate = 'Din chunein';
  else if (!editing && d.scheduledDate < dayKey()) errors.scheduledDate = 'Guzra din nahi chun sakte';
  if (fee === null || fee < 0) errors.serviceFee = 'Fee likhein';
  if (extra < 0) errors.additionalCharges = 'Extra sahi likhein';
  if (discount < 0 || discount > (fee ?? 0) + extra) errors.discount = 'Discount fee se zyada nahi';
  if (visitQ.data && total < visitQ.data.paidAmount - 0.01) errors.serviceFee = `${formatPKR(visitQ.data.paidAmount)} pehle mil chuke — total us se kam nahi`;
  const problems = Object.values(errors);

  const save = useMutation({
    mutationFn: () => {
      const t = (v: string) => v.trim() || undefined;
      const body: GroomingInput = {
        customerName: d.customerName.trim(), customerPhone: d.customerPhone.trim(), petName: d.petName.trim(), petSpecies: d.petSpecies as PetSpeciesType,
        petBreed: t(d.petBreed), petAgeMonths: d.petAgeMonths ? Math.round(numIn(d.petAgeMonths) ?? 0) : undefined,
        petWeightKg: d.petWeightKg ? numIn(d.petWeightKg) ?? undefined : undefined, petTemperament: t(d.petTemperament), petAllergies: t(d.petAllergies),
        petSpecialInstructions: t(d.petSpecialInstructions), scheduledDate: d.scheduledDate,
        // Blank clears the groomer / slot on an edit; the server reads '' as none.
        groomerId: d.groomerId || (editing ? '' : undefined), scheduledSlot: d.scheduledSlot || (editing ? '' : undefined), serviceType: d.serviceType, additionalServices: d.additionalServices,
        serviceFee: fee ?? 0, additionalCharges: extra, discount,
      };
      return editing ? groomingApi.update(id!, body) : groomingApi.create(body);
    },
    onSuccess: (a) => {
      [PET_KEYS.grooming, 'petshop-dashboard-overview'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(editing ? 'Booking save ho gayi' : `Booking ${a.appointmentNumber} ban gayi`);
      navigate('/petshop/grooming');
    },
    onError: (e) => toast.error(errorText(e, 'Booking save nahi hui')),
  });
  const submit = () => { setTouched(true); if (problems.length) { toast.error(problems[0]); return; } if (!save.isPending && !locked) save.mutate(); };
  useSaveKey(submit);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDialogOpen()) navigate(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
  const err = (k: keyof Draft) => (touched ? errors[k] : undefined);

  if (editing && visitQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${visitQ.data?.appointmentNumber ?? ''} — badlein` : 'Nayi grooming booking'}</h1>
          <p className="text-[0.8125rem] text-white/75">Malik, pet, service aur groomer ka khali waqt</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
      </div>

      {locked && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Kaam shuru ho chuka — booking badli nahi ja sakti.</p>}

      <fieldset disabled={locked} className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Phone}>Malik</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Naam" required value={d.customerName} onChange={(e) => set('customerName', e.target.value)} error={err('customerName')} />
              <Input label="Phone" required inputMode="tel" value={d.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} error={err('customerPhone')} placeholder="0300 1234567" hint="Isi phone se khata milta hai (advance / udhaar)" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={PawPrint}>Pet</T>}>
            <div className="space-y-3">
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaun sa janwar <span className="text-rose-600">*</span></span>
                <div className="flex flex-wrap gap-1.5">
                  {(['DOG', 'CAT', 'RABBIT', 'BIRD', 'OTHER'] as const).map((k) => (
                    <button key={k} type="button" onClick={() => set('petSpecies', k)} className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', d.petSpecies === k ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                      {SPECIES[k].emoji} {SPECIES[k].label}
                    </button>
                  ))}
                </div>
                {err('petSpecies') && <p className="mt-1 text-[0.75rem] text-rose-600">{err('petSpecies')}</p>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Pet ka naam" required value={d.petName} onChange={(e) => set('petName', e.target.value)} error={err('petName')} placeholder="Tiger" />
                <Input label="Nasal (marzi)" value={d.petBreed} onChange={(e) => set('petBreed', e.target.value)} placeholder="Persian" />
                <Input label="Umar (mahine)" inputMode="numeric" value={d.petAgeMonths} onChange={(e) => set('petAgeMonths', e.target.value)} />
                <Input label="Wazan (kg)" inputMode="decimal" value={d.petWeightKg} onChange={(e) => set('petWeightKg', e.target.value)} hint="Bare kutte ki fee zyada hoti hai" />
              </div>
              <div>
                <Input label="Mizaj (marzi)" value={d.petTemperament} onChange={(e) => set('petTemperament', e.target.value)} />
                <div className="mt-1.5 flex flex-wrap gap-1">{TEMPERS.map((t) => <button key={t} type="button" onClick={() => set('petTemperament', t)} className="h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1 ring-slate-200 hover:bg-slate-50">{t}</button>)}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Allergy (marzi)" value={d.petAllergies} onChange={(e) => set('petAllergies', e.target.value)} placeholder="Shampoo se allergy" />
                <Input label="Khaas hidayat (marzi)" value={d.petSpecialInstructions} onChange={(e) => set('petSpecialInstructions', e.target.value)} placeholder="Baal chhote mat karein" />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Scissors}>Service aur fee</T>}>
            <div className="space-y-3">
              <Select label="Service" value={d.serviceType} onChange={(e) => set('serviceType', e.target.value as PetGroomingServiceType)} options={SERVICE_OPTIONS} />
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Saath me (marzi)</span>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(SERVICE) as PetGroomingServiceType[]).filter((s) => s !== d.serviceType && s !== 'OTHER' && s !== 'DELUXE_PACKAGE').map((s) => {
                    const on = d.additionalServices.includes(s);
                    return <button key={s} type="button" onClick={() => set('additionalServices', on ? d.additionalServices.filter((x) => x !== s) : [...d.additionalServices, s])}
                      className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-200 hover:bg-slate-50')}>{SERVICE[s]}</button>;
                  })}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input label="Fee" required inputMode="decimal" value={d.serviceFee} onChange={(e) => set('serviceFee', e.target.value)} error={err('serviceFee')} hint={groomer?.perServiceRate ? `Groomer ka rate ${formatPKR(groomer.perServiceRate)}` : undefined} />
                <Input label="Extra" inputMode="decimal" value={d.additionalCharges} onChange={(e) => set('additionalCharges', e.target.value)} error={err('additionalCharges')} />
                <Input label="Discount" inputMode="decimal" value={d.discount} onChange={(e) => set('discount', e.target.value)} error={err('discount')} />
              </div>
              <p className="text-[0.875rem] font-semibold text-slate-900">Total {formatPKR(total)}</p>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={CalendarDays}>Kab aur kis se</T>}>
            <div className="space-y-3">
              <div>
                <Input label="Din" required type="date" min={editing ? undefined : dayKey()} value={d.scheduledDate} onChange={(e) => { set('scheduledDate', e.target.value); set('scheduledSlot', ''); }} error={err('scheduledDate')} />
                <div className="mt-1.5 flex gap-1">{[0, 1, 2].map((n) => <button key={n} type="button" onClick={() => { set('scheduledDate', shiftDay(dayKey(), n)); set('scheduledSlot', ''); }} className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-semibold ring-1', d.scheduledDate === shiftDay(dayKey(), n) ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-200 hover:bg-slate-50')}>{n === 0 ? 'Aaj' : n === 1 ? 'Kal' : 'Parson'}</button>)}</div>
              </div>
              <Select label="Groomer (marzi)" value={d.groomerId} onChange={(e) => { set('groomerId', e.target.value); set('scheduledSlot', ''); }}
                options={[{ value: '', label: 'Baad me chunein' }, ...(groomersQ.data ?? []).map((g) => ({ value: g.id, label: g.name }))]} hint="Groomer chunein to us ka khali waqt aata hai" />
              {d.groomerId && (
                <div>
                  <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Waqt</span>
                  {slotsQ.isLoading ? <Skeleton className="h-16 rounded-xl" /> : slotList.length === 0 ? (
                    <p className="text-[0.8125rem] text-amber-800">{slotsQ.data?.reason ? 'Is din groomer ki chhutti hai' : 'Is din koi waqt khali nahi'}</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                      {slotList.map((s) => <button key={s} type="button" onClick={() => set('scheduledSlot', d.scheduledSlot === s ? '' : s)}
                        className={cn('h-8 rounded-lg text-[0.75rem] font-semibold ring-1', d.scheduledSlot === s ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-200 hover:bg-slate-50')}>{fmtSlot(s)}</button>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </fieldset>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {touched && problems.length > 0
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{d.scheduledSlot ? `${d.scheduledDate} · ${fmtSlot(d.scheduledSlot)}` : 'Paisa pickup par bill me — chahein to pehle advance lein'}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} disabled={locked}>{editing ? 'Save karein' : 'Booking karein'}</Button>
      </div>
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof Phone; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
