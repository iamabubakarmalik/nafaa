/**
 * Take a prescription in: patient (from the customer list or typed), the
 * doctor (from the directory or typed), the medicines with dose and
 * quantity, and optional scan, diagnosis and refill. Medicines picked from
 * stock carry their rate and formula; two salts that clash show a warning.
 *
 * Keys: Ctrl+S save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Camera, ClipboardList, FilePlus, GraduationCap, Loader2, Pill, Plus, Repeat, Search, Stethoscope, Trash2, UserRound, X } from 'lucide-react';
import { Button, Card, Checkbox, Input, Kbd, PageHero, PageShell, Select, Textarea, controlClass, heroButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useShopParam } from '@core/stores/auth.store';
import { UploadDropzone } from '@core/components/uploads';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';
import { useProductCatalog, type PosItem } from '@modules/pos/engine';
import { doctorsApi, type Doctor } from '../api/doctors.api';
import { interactionsApi } from '../api/interactions.api';
import { prescriptionsApi, type PrescriptionType, type RefillFrequency } from '../api/prescriptions.api';
import { useMedicineFacts } from '../hooks/useMedicineFacts';
import { useDebounced } from '../hooks/usePageKeys';
import { formatCnic } from '../lib/meta';

interface Line { key: number; productId: string; medicineName: string; strength: string; dose: string; frequency: string; duration: string; qty: string; unit: string; instructions: string; price: number }
interface Form {
  type: PrescriptionType; customerId: string; patientName: string; patientAge: string; patientGender: string; patientPhone: string; patientCnic: string;
  doctorId: string; doctorName: string; doctorRegNumber: string; doctorSpeciality: string; hospitalName: string; prescriptionDate: string;
  diagnosis: string; notes: string; imageUrls: string[]; isRefillable: boolean; refillsAllowed: string; refillFrequency: RefillFrequency | '';
}

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: Form = {
  type: 'WALK_IN', customerId: '', patientName: '', patientAge: '', patientGender: '', patientPhone: '', patientCnic: '',
  doctorId: '', doctorName: '', doctorRegNumber: '', doctorSpeciality: '', hospitalName: '', prescriptionDate: today(),
  diagnosis: '', notes: '', imageUrls: [], isRefillable: false, refillsAllowed: '2', refillFrequency: 'MONTHLY',
};
let seq = 1;
const newLine = (): Line => ({ key: seq++, productId: '', medicineName: '', strength: '', dose: '', frequency: '', duration: '', qty: '', unit: 'tablet', instructions: '', price: 0 });

const TYPES: Array<{ value: PrescriptionType; label: string }> = [
  { value: 'WALK_IN', label: 'Counter par' }, { value: 'HOSPITAL', label: 'Hospital' }, { value: 'ONLINE', label: 'Online / WhatsApp' },
  { value: 'EMERGENCY', label: 'Emergency' }, { value: 'INSURANCE', label: 'Insurance / panel' },
];
const FREQS = ['1-0-1', '1-1-1', '1-0-0', '0-0-1', '1-1-1-1', 'SOS'];
const DURATIONS = ['3 din', '5 din', '7 din', '10 din', '15 din', '1 mahina'];
const INSTRUCTIONS = ['Khane ke baad', 'Khane se pehle', 'Khali pait', 'Sone se pehle'];
const REFILLS: Array<{ value: RefillFrequency; label: string }> = [
  { value: 'WEEKLY', label: 'Har hafte' }, { value: 'BIWEEKLY', label: 'Har 2 hafte' }, { value: 'MONTHLY', label: 'Har mahine' }, { value: 'QUARTERLY', label: 'Har 3 mahine' },
];

/** Doses a day from "1-0-1" (2) or "1-1-1" (3); 0 when unknown (SOS). */
const perDay = (f: string) => (/^\d(-\d)+$/.test(f) ? f.split('-').reduce((s, x) => s + Number(x), 0) : 0);
const days = (d: string) => { const n = parseInt(d, 10); return Number.isFinite(n) ? (/mahina/.test(d) ? n * 30 : n) : 0; };
const apiError = (e: unknown) => (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;

function MedicinePicker({ items, facts, onPick, onClose }: { items: PosItem[]; facts: ReturnType<typeof useMedicineFacts>; onPick: (p: PosItem) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => (needle.length < 2 ? [] : items.filter((p) => [p.name, p.product.barcode, p.product.sku, facts.get(p.id)?.generic]
    .some((v) => (v ?? '').toLowerCase().includes(needle))).slice(0, 12)), [needle, items, facts]);
  return (
    <div className="absolute inset-x-0 top-full z-30 mt-1 rounded-xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && list[0]) onPick(list[0]); }}
          placeholder="Dawai ya formula likhein…" className={cn(controlClass(), 'h-10 pl-9 pr-9 text-[0.875rem]')} />
        <button type="button" onClick={onClose} aria-label="Band" className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
      </div>
      <ul className="mt-1 max-h-72 overflow-y-auto">
        {needle.length < 2 ? <li className="px-3 py-3 text-[0.8125rem] text-slate-500">Kam az kam 2 harf likhein</li>
          : list.length === 0 ? <li className="px-3 py-3 text-[0.8125rem] text-slate-500">Stock me nahi mili — naam haath se likh dein</li>
            : list.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-brand-50">
                  <Pill className="h-4 w-4 shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-medium text-slate-900">{p.name}</span>
                    <span className="block truncate text-[0.75rem] text-slate-500">{facts.get(p.id)?.generic || p.categoryName || ''}</span>
                  </span>
                  <span className="text-right text-[0.75rem] tabular-nums"><span className="block font-semibold text-slate-900">{formatPKR(p.price)}</span><span className={p.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}>{p.stock > 0 ? `${Number(p.stock.toFixed(2))} ${p.unit}` : 'khatam'}</span></span>
                </button>
              </li>
            ))}
      </ul>
    </div>
  );
}

export default function NewPrescriptionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const guide = usePageGuide();
  const lock = useRef(false);
  const [f, setF] = useState<Form>(EMPTY);
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [picker, setPicker] = useState<number | null>(null);
  const [custQ, setCustQ] = useState('');
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const { items } = useProductCatalog();
  const facts = useMedicineFacts();
  const { data: doctors = [] } = useQuery({ queryKey: ['pharmacy-doctors', 'active'], queryFn: () => doctorsApi.list({ isActive: true }).catch(() => [] as Doctor[]), staleTime: 5 * 60_000 });
  const cq = useDebounced(custQ.trim());
  const { data: custs } = useQuery({
    queryKey: ['customers', 'rx-pick', cq],
    queryFn: () => customersApi.list({ search: cq, limit: 8 }),
    enabled: cq.length >= 2,
  });

  // Salts of the picked medicines, checked against each other.
  const saltIds = useMemo(() => [...new Set(lines.flatMap((l) => facts.get(l.productId)?.saltIds ?? []))].sort(), [lines, facts]);
  const { data: clash } = useQuery({
    queryKey: ['pharmacy-interactions', saltIds],
    queryFn: () => interactionsApi.check(saltIds),
    enabled: saltIds.length >= 2,
    staleTime: 5 * 60_000,
  });

  const pickCustomer = (c: Customer) => {
    setF((x) => ({ ...x, customerId: c.id, patientName: x.patientName || c.name, patientPhone: x.patientPhone || (c.phone ?? ''), patientCnic: x.patientCnic || (c.cnic ?? '') }));
    setCustQ('');
  };
  const pickDoctor = (id: string) => {
    const d = doctors.find((x) => x.id === id);
    setF((x) => ({ ...x, doctorId: id, ...(d && { doctorName: d.name, doctorRegNumber: d.registrationNumber, doctorSpeciality: d.specialization ?? '', hospitalName: d.clinicName ?? d.hospitalAffiliation ?? '' }) }));
  };
  const pickMedicine = (key: number, p: PosItem) => {
    const m = facts.get(p.id);
    setLine(key, { productId: p.id, medicineName: p.name, strength: m?.generic ?? '', unit: p.unit, price: p.price });
    setPicker(null);
  };
  /** Quantity from dose × days when both are known and nothing is typed yet. */
  const suggest = (l: Line) => { const n = perDay(l.frequency) * days(l.duration); return n > 0 ? String(n) : ''; };

  const used = lines.filter((l) => l.medicineName.trim() || l.qty);
  const problems = useMemo(() => {
    const out: string[] = [];
    if (!f.patientName.trim() && !f.customerId) out.push('Mareez ka naam likhein');
    if (f.patientCnic && f.patientCnic.replace(/\D/g, '').length !== 13) out.push('CNIC 13 hindsay ka hota hai');
    if (f.patientAge && !(Number(f.patientAge) >= 0 && Number(f.patientAge) <= 130)) out.push('Umar theek nahi');
    if (!used.length) out.push('Kam az kam ek dawai likhein');
    used.forEach((l, i) => {
      if (!l.medicineName.trim()) out.push(`Line ${i + 1}: dawai ka naam likhein`);
      else if (!(Number(l.qty || suggest(l)) > 0)) out.push(`${l.medicineName}: kitni deni hai likhein`);
    });
    if (f.isRefillable && !(Number(f.refillsAllowed) > 0)) out.push('Kitni dafa refill likhein');
    return out;
  }, [f, used]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => {
      if (problems.length) throw new Error(problems[0]);
      const opt = (v: string) => v.trim() || undefined;
      return prescriptionsApi.create({
        type: f.type, shopId: shopId || undefined, customerId: f.customerId || undefined, doctorId: f.doctorId || undefined,
        patientName: opt(f.patientName), patientAge: f.patientAge ? Number(f.patientAge) : undefined, patientGender: opt(f.patientGender),
        patientPhone: opt(f.patientPhone), patientCnic: opt(f.patientCnic),
        doctorName: opt(f.doctorName), doctorRegNumber: opt(f.doctorRegNumber), doctorSpeciality: opt(f.doctorSpeciality), hospitalName: opt(f.hospitalName),
        prescriptionDate: f.prescriptionDate || undefined, diagnosis: opt(f.diagnosis), notes: opt(f.notes), imageUrls: f.imageUrls,
        isRefillable: f.isRefillable, refillsAllowed: f.isRefillable ? Number(f.refillsAllowed) : 0, refillFrequency: f.isRefillable && f.refillFrequency ? f.refillFrequency : undefined,
        items: used.map((l) => ({
          productId: l.productId || undefined, medicineName: l.medicineName.trim(), strength: opt(l.strength), dose: opt(l.dose),
          frequency: opt(l.frequency), duration: opt(l.duration), instructions: opt(l.instructions), prescribedQty: Number(l.qty || suggest(l)), unit: l.unit,
        })),
      } as Parameters<typeof prescriptionsApi.create>[0]);
    },
    onSuccess: (rx) => {
      toast.success(`Nuskha ${rx.prescriptionNumber} ban gaya`);
      qc.invalidateQueries({ queryKey: ['prescriptions-page'] });
      qc.invalidateQueries({ queryKey: ['pharmacy-dashboard'] });
      navigate(`/pharmacy/prescriptions/${rx.id}`);
    },
    onError: (e) => { const m = apiError(e); toast.error(Array.isArray(m) ? m[0] : m ?? (e as Error).message); },
    onSettled: () => { lock.current = false; },
  });
  const submit = () => {
    setTried(true);
    if (problems.length) { toast.error(problems[0]); return; }
    if (lock.current) return;
    lock.current = true;
    save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen() && picker === null) navigate('/pharmacy/prescriptions');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const total = used.reduce((s, l) => s + l.price * (Number(l.qty || suggest(l)) || 0), 0);

  return (
    <PageShell className="max-w-5xl">
      {guide.isOpen && (
        <PageGuide title="Naya nuskha" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#2563eb', title: 'Mareez', text: 'Purana customer ho to dhoond kar chunein — naam, phone aur CNIC khud aa jate hain aur udhaar usi ke khate me jata hai.' },
            { icon: Stethoscope, color: '#0891b2', title: 'Doctor', text: 'Directory se chunein ya naam aur PMDC likh dein. Narcotic dawai ke liye PMDC zaroor likhein.' },
            { icon: Pill, color: '#16a34a', title: 'Dawaiyan', text: 'Stock se dawai chunein to rate aur formula aa jata hai. Dose (1-0-1) aur din likhein to miqdaar khud ban jati hai.' },
            { icon: Repeat, color: '#7c3aed', title: 'Refill', text: 'Har mahine wali dawai (sugar, BP) ke liye refill chalu karein — mareez ko yaad dihani bhi milti hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]} />
      )}

      <PageHero
        back="/pharmacy/prescriptions"
        backLabel="Wapas (Esc)"
        title="Naya nuskha"
        subtitle="Check ke baad dawai di jati hai aur bill banta hai"
        actions={<>
          <button type="button" onClick={guide.open} className={heroButton}><GraduationCap className="h-4 w-4" />Guide</button>
          <button type="button" onClick={submit} disabled={save.isPending} className={heroPrimaryButton}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus className="h-4 w-4" />}Save <Kbd className="ml-1 hidden sm:inline-flex">Ctrl S</Kbd>
          </button>
        </>}
      />

      {tried && problems.length > 0 && (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">
          <p className="font-semibold">Ye theek karein:</p>
          <ul className="mt-1 list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-brand-600" />Mareez</span>}>
          <div className="space-y-3">
            {f.customerId ? (
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-[0.875rem]">
                <span>Customer: <strong>{f.patientName}</strong> — udhaar isi ke khate me</span>
                <button type="button" onClick={() => set('customerId', '')} className="text-[0.75rem] font-semibold text-rose-700">Hatayein</button>
              </div>
            ) : (
              <div className="relative">
                <Input label="Purana customer dhoondein" value={custQ} onChange={(e) => setCustQ(e.target.value)} placeholder="Naam ya phone…" leftIcon={<Search className="h-4 w-4" />}
                  hint="Marzi hai — chunne se udhaar aur refill yaad dihani usi customer par" />
                {cq.length >= 2 && (custs?.items.length ?? 0) > 0 && (
                  <ul className="absolute inset-x-0 top-[4.5rem] z-30 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
                    {custs!.items.map((c) => (
                      <li key={c.id}><button type="button" onClick={() => pickCustomer(c)} className="flex w-full justify-between px-3 py-2 text-left text-[0.875rem] hover:bg-brand-50"><span className="font-medium">{c.name}</span><span className="text-slate-500">{c.phone}</span></button></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Mareez ka naam" required value={f.patientName} onChange={(e) => set('patientName', e.target.value)} error={tried && !f.patientName.trim() && !f.customerId ? 'Naam likhein' : undefined} />
              <Input label="Phone" inputMode="tel" value={f.patientPhone} onChange={(e) => set('patientPhone', e.target.value)} placeholder="03xx…" hint="Refill ki yaad dihani isi par" />
              <Input label="Umar" inputMode="numeric" value={f.patientAge} onChange={(e) => set('patientAge', e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="saal" />
              <Select label="Jins" value={f.patientGender} onChange={(e) => set('patientGender', e.target.value)} options={[{ value: '', label: '—' }, { value: 'MALE', label: 'Mard' }, { value: 'FEMALE', label: 'Aurat' }, { value: 'CHILD', label: 'Bacha' }]} />
              <Input label="CNIC" inputMode="numeric" value={f.patientCnic} onChange={(e) => set('patientCnic', formatCnic(e.target.value))} placeholder="35202-1234567-1" hint="Narcotic dawai ke liye zaroori" wrapperClassName="sm:col-span-2" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Stethoscope className="h-4 w-4 text-brand-600" />Doctor</span>}>
          <div className="space-y-3">
            <Select label="Directory se" value={f.doctorId} onChange={(e) => pickDoctor(e.target.value)}
              options={[{ value: '', label: 'Haath se likhein' }, ...doctors.map((d) => ({ value: d.id, label: `${d.name} · ${d.registrationNumber}` }))]}
              hint={<Link to="/pharmacy/doctors" className="font-semibold text-brand-700 hover:underline">Doctor directory →</Link>} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Doctor ka naam" value={f.doctorName} onChange={(e) => setF((x) => ({ ...x, doctorName: e.target.value, doctorId: '' }))} />
              <Input label="PMDC number" value={f.doctorRegNumber} onChange={(e) => setF((x) => ({ ...x, doctorRegNumber: e.target.value, doctorId: '' }))} />
              <Input label="Specialist" value={f.doctorSpeciality} onChange={(e) => set('doctorSpeciality', e.target.value)} placeholder="Child, Sugar…" />
              <Input label="Hospital / clinic" value={f.hospitalName} onChange={(e) => set('hospitalName', e.target.value)} />
              <Input label="Nuskhe ki tareekh" type="date" max={today()} value={f.prescriptionDate} onChange={(e) => set('prescriptionDate', e.target.value)} />
              <Select label="Kahan se aaya" value={f.type} onChange={(e) => set('type', e.target.value as PrescriptionType)} options={TYPES} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Pill className="h-4 w-4 text-brand-600" />Dawaiyan</span>}
        description="Stock se chunein to rate aur formula khud aa jata hai; nahi hai to naam likh dein"
        actions={<Button size="sm" variant="secondary" onClick={() => setLines((ls) => [...ls, newLine()])} leftIcon={<Plus className="h-4 w-4" />}>Dawai</Button>}>
        {clash?.hasWarnings && (
          <div className={cn('mb-3 rounded-xl px-3 py-2.5 text-[0.8125rem] ring-1', clash.hasMajor ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
            <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" />In dawaiyon ka aapas me asar hai — pharmacist / doctor se poochein</p>
            <ul className="mt-1 list-disc pl-5">{clash.interactions.map((i) => <li key={i.id}>{i.saltA?.name} + {i.saltB?.name} ({i.severity}): {i.description}</li>)}</ul>
          </div>
        )}
        <ul className="space-y-3">
          {lines.map((l, idx) => (
            <li key={l.key} className="rounded-2xl p-3 ring-1 ring-slate-200">
              <div className="flex items-start gap-2">
                <span className="mt-2.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.75rem] font-bold text-slate-600">{idx + 1}</span>
                <div className="relative min-w-0 flex-1">
                  <div className="flex gap-2">
                    <input value={l.medicineName} onChange={(e) => setLine(l.key, { medicineName: e.target.value, productId: '', price: 0 })} placeholder="Dawai ka naam"
                      className={cn(controlClass(Boolean(tried && !l.medicineName.trim() && l.qty)), 'h-11 min-w-0 flex-1 px-3.5 text-[0.9375rem]')} />
                    <button type="button" onClick={() => setPicker(picker === l.key ? null : l.key)} className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[0.8125rem] font-semibold text-white hover:bg-slate-800"><Search className="h-4 w-4" /><span className="hidden sm:inline">Stock se</span></button>
                  </div>
                  {picker === l.key && <MedicinePicker items={items} facts={facts} onPick={(p) => pickMedicine(l.key, p)} onClose={() => setPicker(null)} />}
                  <p className="mt-1 text-[0.75rem] text-slate-500">{l.productId ? <>Stock wali · {formatPKR(l.price)} / {l.unit}{l.strength && ` · ${l.strength}`}</> : 'Stock se nahi jori — dawai dete waqt jor sakte hain'}</p>
                </div>
                <button type="button" aria-label="Hatayein" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [newLine()]))} className="mt-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 grid gap-3 pl-8 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Kitni dafa</span>
                  <div className="flex flex-wrap gap-1">{FREQS.map((x) => <button key={x} type="button" onClick={() => setLine(l.key, { frequency: l.frequency === x ? '' : x })} className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold', l.frequency === x ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{x}</button>)}</div>
                </div>
                <div className="sm:col-span-2">
                  <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Kitne din</span>
                  <div className="flex flex-wrap gap-1">{DURATIONS.map((x) => <button key={x} type="button" onClick={() => setLine(l.key, { duration: l.duration === x ? '' : x })} className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold', l.duration === x ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{x}</button>)}</div>
                </div>
                <Input label={`Kitni (${l.unit})`} inputMode="decimal" value={l.qty} placeholder={suggest(l) || '0'} onChange={(e) => setLine(l.key, { qty: e.target.value.replace(/[^\d.]/g, '') })}
                  hint={!l.qty && suggest(l) ? `Dose × din = ${suggest(l)}` : undefined} error={tried && l.medicineName.trim() && !(Number(l.qty || suggest(l)) > 0) ? 'Miqdaar likhein' : undefined} />
                <Input label="Dose" value={l.dose} onChange={(e) => setLine(l.key, { dose: e.target.value })} placeholder="1 goli, 5 ml" />
                <div className="sm:col-span-2">
                  <Input label="Hidayat" value={l.instructions} onChange={(e) => setLine(l.key, { instructions: e.target.value })} placeholder="Khane ke baad" list={`ins-${l.key}`} />
                  <datalist id={`ins-${l.key}`}>{INSTRUCTIONS.map((x) => <option key={x} value={x} />)}</datalist>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {total > 0 && <p className="mt-3 text-right text-[0.875rem] text-slate-600">Andaza: <strong className="tabular-nums text-slate-900">{formatPKR(total)}</strong> (shelf rate)</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4 text-brand-600" />Aur</span>}>
          <div className="space-y-3">
            <Textarea label="Bimari / diagnosis" rows={2} value={f.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="Marzi hai" />
            <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Team ke liye" />
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><Camera className="h-4 w-4" />Nuskhe ki tasveer</span>
              <UploadDropzone purpose="document" maxFiles={4} hint="Parchi ki photo — record ke liye"
                onUploaded={(records) => set('imageUrls', [...f.imageUrls, ...records.map((r) => r.url).filter(Boolean)])} />
              {f.imageUrls.length > 0 && <p className="mt-1 text-[0.75rem] text-emerald-700">{f.imageUrls.length} tasveer lagi</p>}
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Repeat className="h-4 w-4 text-brand-600" />Refill</span>} description="Har mahine wali dawai — agli dafa ek click me naya nuskha">
          <Checkbox className="rounded-xl p-3 ring-1 ring-slate-200" checked={f.isRefillable} onChange={(e) => set('isRefillable', e.target.checked)} label="Ye nuskha dobara bhara ja sakta hai" />
          {f.isRefillable && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input label="Kitni dafa" inputMode="numeric" value={f.refillsAllowed} onChange={(e) => set('refillsAllowed', e.target.value.replace(/\D/g, '').slice(0, 2))} />
              <Select label="Kab kab" value={f.refillFrequency} onChange={(e) => set('refillFrequency', e.target.value as RefillFrequency)} options={REFILLS} />
            </div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
