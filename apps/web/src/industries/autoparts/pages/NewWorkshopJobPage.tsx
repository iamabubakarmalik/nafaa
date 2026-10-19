/**
 * New job card: the vehicle (picked from the shop's list by its number, or
 * new), its meter reading, the customer, what is wrong, who will work on it
 * and when it will be ready, what was in the vehicle, an early labour
 * estimate and any advance taken now. Parts are added on the job once work
 * starts, so they leave stock when they are fitted.
 *
 * Keys: Ctrl+Enter save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Car, ClipboardList, Fuel, GraduationCap, Plus, Search, Trash2, UserRound, Wallet, Wrench } from 'lucide-react';
import {
  Button, Card, Input, Kbd, PageHero, PageShell, Select, Switch, Textarea, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { customerVehiclesApi, type CustomerVehicle } from '../api/customer-vehicles.api';
import { mechanicsApi } from '../api/mechanics.api';
import { vehicleMakesApi } from '../api/vehicle-makes.api';
import { vehicleModelsApi } from '../api/vehicle-models.api';
import { workshopJobsApi, type JobCreateInput, type JobPriority, type JobType } from '../api/workshop-jobs.api';
import { printJobCard } from '../components/slips';
import {
  JOB_KEY, JOB_TYPES, MAKES_KEY, MECHANIC_KEY, MODELS_KEY, MONEY_KEYS, PRIORITIES, VEHICLE_KEY, apiError, digits, jobTypeOf, km,
  localInput, money, plate, priorityOf, vehicleName,
} from '../components/meta';

const COMPLAINTS = ['Oil change', 'Tuning', 'Brake se awaz', 'AC thanda nahi', 'Start nahi hoti', 'Garam ho jati hai', 'Suspension se awaz', 'Clutch slip',
  'Battery down', 'Lights / bijli', 'Pick nahi', 'Dhuan', 'Alignment', 'Denting painting'];
const FUEL = ['Khali', '1/4', '1/2', '3/4', 'Full'];

interface Labour { description: string; amount: string }
interface Draft {
  vehicleId: string; reg: string; makeId: string; makeName: string; modelName: string; year: string; odometer: string;
  name: string; phone: string; jobType: JobType; complaint: string; priority: JobPriority; mechanicId: string; promisedAt: string; bay: string;
  fuel: string; spare: boolean; toolkit: boolean; damages: string; labour: Labour[]; advance: string; method: PaymentMethod; notes: string;
}
const EMPTY: Draft = {
  vehicleId: '', reg: '', makeId: '', makeName: '', modelName: '', year: '', odometer: '', name: '', phone: '', jobType: 'GENERAL_SERVICE', complaint: '',
  priority: 'NORMAL', mechanicId: '', promisedAt: '', bay: '', fuel: '', spare: false, toolkit: false, damages: '', labour: [], advance: '', method: 'CASH', notes: '',
};

const n = (v: string) => Number(v) || 0;
const atHour = (days: number, hour: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d; };

export default function NewWorkshopJobPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const guide = usePageGuide();
  useReceiptSetup();
  const [params] = useSearchParams();
  const [f, setF] = useState<Draft>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [regQuery, setRegQuery] = useState('');
  const [print, setPrint] = useState(true);
  const [lastKm, setLastKm] = useState<number | null>(null);
  const lock = useRef(false);
  const set = (patch: Partial<Draft>) => setF((x) => ({ ...x, ...patch }));

  // The vehicles page opens this form for one vehicle.
  const presetQ = useQuery({ queryKey: [VEHICLE_KEY, 'one', params.get('vehicle')], queryFn: () => customerVehiclesApi.getOne(params.get('vehicle')!), enabled: !!params.get('vehicle') });
  useEffect(() => {
    if (presetQ.data && !f.vehicleId) pickVehicle(presetQ.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetQ.data]);

  useEffect(() => { const t = setTimeout(() => setRegQuery(f.vehicleId ? '' : f.reg.trim()), 250); return () => clearTimeout(t); }, [f.reg, f.vehicleId]);
  const lookQ = useQuery({ queryKey: [VEHICLE_KEY, 'lookup', regQuery], queryFn: () => customerVehiclesApi.page({ search: regQuery, limit: 6 }), enabled: regQuery.length >= 2, staleTime: 30_000 });
  const matches = (lookQ.data?.items ?? []).filter((v) => !f.vehicleId);
  const exact = matches.find((v) => plate(v.registrationNumber) === plate(f.reg));

  const makesQ = useQuery({ queryKey: [MAKES_KEY, 'active'], queryFn: () => vehicleMakesApi.list({ active: true }), staleTime: 5 * 60_000 });
  const modelsQ = useQuery({ queryKey: [MODELS_KEY, f.makeId], queryFn: () => vehicleModelsApi.list({ makeId: f.makeId, active: true }), enabled: !!f.makeId, staleTime: 5 * 60_000 });
  const mechQ = useQuery({ queryKey: [MECHANIC_KEY], queryFn: () => mechanicsApi.list(), staleTime: 5 * 60_000 });

  function pickVehicle(v: CustomerVehicle) {
    setLastKm(v.odometerKm ?? v.lastOdometerKm ?? null);
    set({
      vehicleId: v.id, reg: v.registrationNumber, makeId: v.makeId ?? '', makeName: v.makeName ?? '', modelName: v.modelName ?? '', year: v.year ? String(v.year) : '',
      name: v.ownerName ?? '', phone: v.ownerPhone ?? '', odometer: '',
    });
  }

  const labourTotal = f.labour.reduce((s, l) => s + n(l.amount), 0);
  const problems = useMemo(() => {
    const out: Record<string, string> = {};
    if (!f.reg.trim()) out.reg = 'Gaari ka number likhein';
    else if (plate(f.reg).length < 3) out.reg = 'Number poora likhein';
    if (f.year && (n(f.year) < 1950 || n(f.year) > new Date().getFullYear() + 1)) out.year = 'Saal sahi likhein';
    if (f.odometer && f.vehicleId && lastKm && n(f.odometer) < lastKm) out.odometer = `Pichli dafa ${km(lastKm)} tha — kam nahi ho sakta`;
    if (f.phone && digits(f.phone).length < 10) out.phone = 'Phone number poora likhein';
    if (!f.complaint.trim()) out.complaint = 'Kya kaam hai ya kya kharabi hai — likhein';
    if (f.promisedAt && new Date(f.promisedAt).getTime() < Date.now() - 60_000) out.promisedAt = 'Ye waqt guzar chuka hai';
    if (f.labour.some((l) => !l.description.trim() && n(l.amount) > 0)) out.labour = 'Mazdoori ki har line ka kaam likhein';
    if (n(f.advance) > 0 && !f.name.trim() && !f.phone.trim()) out.advance = 'Advance ke liye customer ka naam ya phone likhein';
    if (n(f.advance) > 0 && labourTotal > 0 && n(f.advance) > labourTotal * 5) out.advance = 'Advance bohat zyada lag raha hai — check karein';
    return out;
  }, [f, labourTotal, lastKm]);
  const err = (k: string) => (touched ? problems[k] : undefined);

  const save = useMutation({
    mutationFn: () => {
      const opt = (v: string) => v.trim() || undefined;
      const make = makesQ.data?.find((m) => m.id === f.makeId);
      const body: JobCreateInput = {
        vehicleId: f.vehicleId || undefined, registrationNumber: plate(f.reg), makeName: make?.name ?? opt(f.makeName), modelName: opt(f.modelName),
        year: f.year ? n(f.year) : undefined, odometerKm: f.odometer ? n(f.odometer) : undefined, customerName: opt(f.name), customerPhone: opt(f.phone),
        jobType: f.jobType, customerComplaint: f.complaint.trim(), priority: f.priority, primaryMechanicId: f.mechanicId || undefined,
        promisedAt: f.promisedAt ? new Date(f.promisedAt).toISOString() : undefined, bayNumber: opt(f.bay), fuelLevel: f.fuel || undefined,
        hasSpareTire: f.spare, hasToolkit: f.toolkit, externalDamages: opt(f.damages), internalNotes: opt(f.notes), shopId: shopId || undefined,
        laborItems: f.labour.filter((l) => l.description.trim()).map((l) => ({ description: l.description.trim(), hours: 1, ratePerHour: n(l.amount) })),
        advance: n(f.advance) || undefined, advanceMethod: n(f.advance) ? f.method : undefined,
      };
      return workshopJobsApi.create(body);
    },
    onSuccess: (job) => {
      [JOB_KEY, VEHICLE_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`${job.jobNumber} ban gaya — ${job.registrationNumber}`);
      if (print) printJobCard(job, shopName);
      navigate(`/autoparts/jobs/${job.id}`, { replace: true });
    },
    onError: (e) => toast.error(apiError(e, 'Job nahi bana')),
    onSettled: () => { lock.current = false; },
  });

  const submit = () => {
    setTouched(true);
    const first = Object.values(problems)[0];
    if (first) { toast.error(first); return; }
    if (lock.current) return;
    lock.current = true;
    save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <PageShell>
      <PageHero
        title="Naya job card"
        chip={<><Car /> Gaari receive</>}
        meta="Gaari ka number, meter, shikayat — parts kaam shuru hone par job me jorein"
        actions={<>
          <button type="button" onClick={() => navigate(-1)} title="Wapas (Esc)" className={heroIconButton}><ArrowLeft className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={submit} disabled={save.isPending} className={heroPrimaryButton}><ClipboardList className="h-4 w-4" />{save.isPending ? 'Ban raha…' : 'Job banayein'}</button>
        </>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Car}>Gaari</T>} description="Number likhte hi purani gaari mil jati hai — us ki history saath rehti hai">
            <div className="space-y-3">
              <div className="relative">
                <Input label="Gaari ka number" required value={f.reg} autoFocus leftIcon={<Search className="h-4 w-4" />} placeholder="LEA-1234 / ABC 123"
                  onChange={(e) => { setLastKm(null); set({ reg: e.target.value.toUpperCase(), vehicleId: '' }); }} error={err('reg')}
                  hint={f.vehicleId ? 'Purani gaari — history is job ke saath judegi' : exact ? 'Ye gaari pehle se darj hai — neeche se chunein' : 'Nayi gaari khud darj ho jayegi'} />
                {matches.length > 0 && (
                  <ul className="absolute inset-x-0 top-[4.75rem] z-20 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
                    {matches.map((v) => (
                      <li key={v.id}>
                        <button type="button" onClick={() => pickVehicle(v)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-50">
                          <Car className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-slate-900">{v.registrationNumber} <span className="font-normal text-slate-600">{vehicleName(v)}</span></span>
                            <span className="block truncate text-[0.75rem] text-slate-500">{[v.ownerName, v.ownerPhone, v.lastServiceAt ? `${v.totalServices} dafa aayi` : null].filter(Boolean).join(' · ')}</span>
                          </span>
                          {v.openJobs > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800">Job khuli hai</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Company" value={f.makeId} disabled={!!f.vehicleId && !!f.makeName && !f.makeId}
                  onChange={(e) => set({ makeId: e.target.value, makeName: makesQ.data?.find((m) => m.id === e.target.value)?.name ?? '', modelName: '' })}
                  placeholder={f.vehicleId && f.makeName && !f.makeId ? f.makeName : 'Chunein'} options={(makesQ.data ?? []).map((m) => ({ value: m.id, label: m.name }))} />
                <div>
                  <Input label="Model" value={f.modelName} onChange={(e) => set({ modelName: e.target.value })} placeholder="Corolla, CD 70…" list="ap-models" />
                  <datalist id="ap-models">{(modelsQ.data ?? []).map((m) => <option key={m.id} value={m.name} />)}</datalist>
                </div>
                <Input label="Saal" inputMode="numeric" value={f.year} onChange={(e) => set({ year: digits(e.target.value).slice(0, 4) })} placeholder="2016" error={err('year')} />
              </div>
              <Input label="Meter (km)" inputMode="numeric" value={f.odometer} onChange={(e) => set({ odometer: digits(e.target.value) })} placeholder="84500"
                error={err('odometer')} hint="Abhi meter par kitna hai — agli service ka hisaab isi se" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wrench}>Kaam</T>}>
            <div className="space-y-3">
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kya kaam hai</span>
                <div className="flex flex-wrap gap-1.5">
                  {JOB_TYPES.slice(0, 10).map((t) => (
                    <button key={t} type="button" onClick={() => set({ jobType: t })} aria-pressed={f.jobType === t}
                      className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', f.jobType === t ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{jobTypeOf(t)}</button>
                  ))}
                  <select aria-label="Aur kaam" value={JOB_TYPES.slice(0, 10).includes(f.jobType) ? '' : f.jobType} onChange={(e) => e.target.value && set({ jobType: e.target.value as JobType })}
                    className="h-8 rounded-full bg-white px-3 text-[0.8125rem] ring-1 ring-slate-200">
                    <option value="">Aur…</option>
                    {JOB_TYPES.slice(10).map((t) => <option key={t} value={t}>{jobTypeOf(t)}</option>)}
                  </select>
                </div>
              </div>
              <Textarea label="Shikayat / kya karna hai" required rows={3} value={f.complaint} onChange={(e) => set({ complaint: e.target.value })}
                placeholder="Customer ne kya bataya" error={err('complaint')} />
              <div className="flex flex-wrap gap-1">
                {COMPLAINTS.map((c) => (
                  <button key={c} type="button" onClick={() => set({ complaint: f.complaint.includes(c) ? f.complaint : [f.complaint.trim(), c].filter(Boolean).join(', ') })}
                    className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{c}</button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Mechanic" value={f.mechanicId} onChange={(e) => set({ mechanicId: e.target.value })} placeholder="Baad me"
                  options={(mechQ.data ?? []).map((m) => ({ value: m.id, label: `${m.staff?.fullName ?? 'Mechanic'}${m.openJobs ? ` (${m.openJobs} chal rahe)` : ''}${m.isAvailable ? '' : ' — chutti'}` }))}
                  hint={mechQ.data && !mechQ.data.length ? 'Mechanic page par staff ko mechanic banayein' : 'Kis ke zimme hai'} />
                <Select label="Jaldi" value={f.priority} onChange={(e) => set({ priority: e.target.value as JobPriority })} options={PRIORITIES.map((p) => ({ value: p, label: priorityOf(p).label }))} />
              </div>
              <div>
                <Input label="Gaari kab deni hai" type="datetime-local" value={f.promisedAt} onChange={(e) => set({ promisedAt: e.target.value })} error={err('promisedAt')}
                  hint="Is waqt ke baad job “Late” me aati hai" />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[['Aaj shaam', atHour(0, 18)], ['Kal dopahar', atHour(1, 13)], ['Kal shaam', atHour(1, 18)], ['Parson', atHour(2, 18)]].map(([label, d]) => (
                    <button key={label as string} type="button" onClick={() => set({ promisedAt: localInput(d as Date) })}
                      className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{label as string}</button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Fuel}>Gaari ki halat</T>} description="Baad ke jhagre se bachne ke liye — parchi par chhapta hai">
            <div className="space-y-3">
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Petrol</span>
                <div className="flex flex-wrap gap-1.5">
                  {FUEL.map((x) => (
                    <button key={x} type="button" onClick={() => set({ fuel: f.fuel === x ? '' : x })} aria-pressed={f.fuel === x}
                      className={cn('h-8 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', f.fuel === x ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{x}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <Switch checked={f.spare} onChange={(e) => set({ spare: e.target.checked })} label="Stepney saath hai" />
                <Switch checked={f.toolkit} onChange={(e) => set({ toolkit: e.target.checked })} label="Auzaar saath hain" />
              </div>
              <Input label="Pehle se nuqsan" value={f.damages} onChange={(e) => set({ damages: e.target.value })} placeholder="Peeche bumper par scratch…" hint="Marzi hai" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Customer</T>} description="Phone se purana customer khud mil jata hai; udhaar aur advance usi ke khata me">
            <div className="grid gap-3">
              <Input label="Naam" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Bilal Ahmad" hint="Marzi hai — udhaar ke liye zaroori" />
              <Input label="Phone" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="03001234567" error={err('phone')}
                hint="WhatsApp par gaari tayyar hone ki khabar" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wrench}>Mazdoori ka andaza</T>} description="Marzi hai — baad me job par bhi jor sakte hain">
            <div className="space-y-2">
              {f.labour.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input aria-label="Kaam" value={l.description} placeholder="Oil change" wrapperClassName="flex-1"
                    onChange={(e) => set({ labour: f.labour.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
                  <Input aria-label="Amount" inputMode="decimal" value={l.amount} placeholder="Rs" wrapperClassName="w-28" className="text-right tabular-nums"
                    onChange={(e) => set({ labour: f.labour.map((x, j) => (j === i ? { ...x, amount: money(e.target.value) } : x)) })} />
                  <button type="button" aria-label="Hatayein" onClick={() => set({ labour: f.labour.filter((_, j) => j !== i) })}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {err('labour') && <p className="text-[0.8125rem] font-medium text-rose-600">{err('labour')}</p>}
              <Button variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => set({ labour: [...f.labour, { description: f.labour.length ? '' : jobTypeOf(f.jobType), amount: '' }] })}>Mazdoori jorein</Button>
              {labourTotal > 0 && <p className="text-right text-[0.875rem] font-semibold tabular-nums text-slate-900">Kul {formatPKR(labourTotal)}</p>}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wallet}>Advance</T>} description="Abhi mila paisa customer ke khata me jama hota hai aur bill me katta hai">
            <div className="space-y-3">
              <Input label="Advance (Rs)" inputMode="decimal" value={f.advance} onChange={(e) => set({ advance: money(e.target.value) })} placeholder="0"
                error={err('advance')} className="text-right font-semibold tabular-nums" hint={n(f.advance) ? formatPKR(n(f.advance)) : 'Khali chhorein agar kuch nahi mila'} />
              {n(f.advance) > 0 && <PaymentMethodPicker value={f.method} onChange={(method) => set({ method })} />}
            </div>
          </Card>

          <Card className="rounded-2xl">
            <div className="space-y-3">
              <Input label="Bay / jagah" value={f.bay} onChange={(e) => set({ bay: e.target.value })} placeholder="Bay 2" hint="Marzi hai" />
              <Textarea label="Andar ka note" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Sirf staff ke liye" hint="Parchi par nahi chhapta" />
              <Switch checked={print} onChange={(e) => setPrint(e.target.checked)} label="Save ke baad parchi print karein" />
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <span className="hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save · <Kbd>Esc</Kbd> wapas</span>
            <Button onClick={submit} loading={save.isPending} leftIcon={<ClipboardList className="h-4 w-4" />}>Job banayein</Button>
          </div>
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide title="Naya job — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Car, color: '#2563eb', title: 'Gaari ka number', text: 'Number likhte hi purani gaari aa jati hai — company, model aur malik khud bhar jate hain. Nayi gaari khud darj ho jati hai.' },
            { icon: Wrench, color: '#7c3aed', title: 'Shikayat aur mechanic', text: 'Customer ki baat likhein, mechanic chunein aur gaari dene ka waqt. Late gaariyan jobs list me laal dikhti hain.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance customer ke khata me jama hota hai aur gaari dete waqt bill me khud kat jata hai.' },
            { icon: ClipboardList, color: '#ea580c', title: 'Parts baad me', text: 'Save ke baad job khulti hai — wahan parts jorein. Stock wala part jorte hi stock se nikalta hai.' },
          ]}
          shortcuts={[['Ctrl+Enter', 'save'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function T({ icon: Icon, children }: { icon: typeof Car; children: string }) {
  return <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
}
