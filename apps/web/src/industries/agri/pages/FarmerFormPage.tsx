/**
 * Add or edit a farmer: who they are, where the land is, what they grow,
 * and how much udhaar the shop gives them for a season. A new farmer gets
 * a customer khata (or joins the customer with the same phone, or the one
 * given in `?customer=`), and the credit limit is the khata's limit at the
 * counter.
 *
 * Keys: Ctrl+S save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, GraduationCap, IdCard, MapPin, Phone, Sprout, Tractor, UserRound, Wallet } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Select, Skeleton, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { farmersApi, type Farmer } from '../api/farmers.api';
import { useSaveKey } from '../hooks/usePageKeys';
import { CROPS, SEASON_LABEL, amountInput, cnicOk, errorText, formatCnic, phoneOk } from '../lib/meta';

const PROVINCES = ['Punjab', 'Sindh', 'KPK', 'Balochistan', 'Gilgit-Baltistan', 'AJK', 'ICT'];
const FARMING = ['Fasal', 'Mawayshi', 'Murghi', 'Dairy', 'Baghbani', 'Machhli'];
const SOILS = ['Maira', 'Chikni', 'Reti', 'Kallar', 'Rohi'];
const WATER = ['Nehar', 'Tube well', 'Barish', 'Nehar + tube well', 'Drip / sprinkler'];
const OWNERSHIP = ['Apni', 'Theke par', 'Batai par', 'Mushtarka'];

interface Form {
  fullName: string; fatherName: string; phone: string; altPhone: string; cnic: string;
  village: string; tehsil: string; district: string; province: string; address: string;
  landAreaAcres: string; landOwnership: string; soilType: string; waterSource: string;
  farmingType: string[]; primaryCrops: string[]; currentCrop: string; currentSeason: string;
  creditLimit: string; creditDays: string; notes: string;
}
const EMPTY: Form = {
  fullName: '', fatherName: '', phone: '', altPhone: '', cnic: '', village: '', tehsil: '', district: '', province: 'Punjab', address: '',
  landAreaAcres: '', landOwnership: '', soilType: '', waterSource: '', farmingType: ['Fasal'], primaryCrops: [], currentCrop: '', currentSeason: '',
  creditLimit: '', creditDays: '', notes: '',
};

const fromFarmer = (f: Farmer): Form => ({
  fullName: f.fullName, fatherName: f.fatherName ?? '', phone: f.phone, altPhone: f.altPhone ?? '', cnic: f.cnic ?? '',
  village: f.village ?? '', tehsil: f.tehsil ?? '', district: f.district ?? '', province: f.province ?? '', address: f.address ?? '',
  landAreaAcres: f.landAreaAcres ? String(f.landAreaAcres) : '', landOwnership: f.landOwnership ?? '', soilType: f.soilType ?? '', waterSource: f.waterSource ?? '',
  farmingType: f.farmingType ?? [], primaryCrops: f.primaryCrops ?? [], currentCrop: f.currentCrop ?? '', currentSeason: f.currentSeason ?? '',
  creditLimit: f.creditLimit ? String(f.creditLimit) : '', creditDays: f.creditDays ? String(f.creditDays) : '', notes: f.notes ?? '',
});

function T({ icon: Icon, children }: { icon: typeof UserRound; children: string }) {
  return <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
}

function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return <button key={o} type="button" onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])} className={cn('h-8 rounded-lg px-2.5 text-[0.75rem] font-medium ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{o}</button>;
      })}
    </div>
  );
}

export default function FarmerFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const customerId = params.get('customer');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const editing = !!id;
  const lock = useRef(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const farmerQ = useQuery({ queryKey: ['agri-farmer', id], queryFn: () => farmersApi.getOne(id!), enabled: editing });
  const customerQ = useQuery({ queryKey: ['customer', customerId], queryFn: () => customersApi.getOne(customerId!), enabled: !editing && !!customerId });
  useEffect(() => { if (farmerQ.data) setForm(fromFarmer(farmerQ.data)); }, [farmerQ.data]);
  useEffect(() => {
    const c = customerQ.data;
    if (c) setForm((f) => ({ ...f, fullName: f.fullName || c.name, phone: f.phone || (c.phone ?? ''), cnic: f.cnic || (c.cnic ?? ''), address: f.address || (c.address ?? ''), creditLimit: f.creditLimit || (c.creditLimit ? String(c.creditLimit) : '') }));
  }, [customerQ.data]);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.fullName.trim()) e.fullName = 'Farmer ka naam likhein';
    if (!form.phone.trim()) e.phone = 'Phone number likhein';
    else if (!phoneOk(form.phone)) e.phone = 'Phone poora likhein (03XX-XXXXXXX)';
    if (!cnicOk(form.cnic)) e.cnic = 'CNIC 13 hindsay ka hota hai';
    if (form.landAreaAcres && !(Number(form.landAreaAcres) >= 0)) e.landAreaAcres = 'Acre sahi likhein';
    if (form.creditDays && (Number(form.creditDays) > 400)) e.creditDays = '400 din se zyada nahi';
    return e;
  }, [form]);
  const show = (k: keyof Form) => (tried ? errors[k] : undefined);

  const save = useMutation({
    mutationFn: () => {
      const body: Partial<Farmer> & { customerId?: string } = {
        fullName: form.fullName.trim(), fatherName: form.fatherName, phone: form.phone.trim(), altPhone: form.altPhone, cnic: form.cnic,
        village: form.village, tehsil: form.tehsil, district: form.district, province: form.province, address: form.address,
        landAreaAcres: form.landAreaAcres ? Number(form.landAreaAcres) : undefined, landOwnership: form.landOwnership, soilType: form.soilType, waterSource: form.waterSource,
        farmingType: form.farmingType, primaryCrops: form.primaryCrops, currentCrop: form.currentCrop, currentSeason: form.currentSeason || undefined,
        creditLimit: Number(form.creditLimit) || 0, creditDays: form.creditDays ? Number(form.creditDays) : undefined, notes: form.notes,
      };
      if (editing) return farmersApi.update(id!, body);
      return farmersApi.create({ ...body, ...(customerId && { customerId }) });
    },
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ['agri-farmers'] });
      qc.invalidateQueries({ queryKey: ['agri-farmers-all'] });
      qc.invalidateQueries({ queryKey: ['agri-farmer'] });
      qc.invalidateQueries({ queryKey: ['agri-farmer-by-customer'] });
      toast.success(editing ? 'Save ho gaya' : `${f.fullName} jur gaya (${f.farmerNumber}) — khata bhi ban gaya`);
      navigate(`/agri/farmers/${f.id}`);
    },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    if (lock.current || save.isPending) return;
    lock.current = true;
    save.mutate();
  };
  useSaveKey(submit);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDialogOpen()) navigate(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && farmerQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  if (editing && !farmerQ.data) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye farmer nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/agri/farmers')}>Farmers par wapas</Button></div></PageShell>;

  const limit = Number(form.creditLimit) || 0;
  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Farmer form" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#2563eb', title: 'Naam aur phone', text: 'Isi phone ka customer pehle se ho to farmer usi khate se jurta hai — ek shakhs ka ek khata.' },
            { icon: Sprout, color: '#65a30d', title: 'Zameen aur fasal', text: 'Fasal POS par farmer ke saath dikhti hai aur mashwara dene me kaam aati hai.' },
            { icon: Wallet, color: '#d97706', title: 'Udhaar ki had', text: 'Had se upar udhaar par POS manager PIN maangta hai. 0 ka matlab koi had nahi.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]} />
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${farmerQ.data?.fullName} — badlein` : 'Naya farmer'}</h1>
          <p className="text-[0.8125rem] text-white/75">{editing ? 'Jo badalna hai badlein — khata waisa hi rahega' : customerQ.data ? `${customerQ.data.name} ke khate se jura farmer` : 'Naam, gaon, zameen aur season ka udhaar'}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
        <button type="button" onClick={guide.open} title="Guide (G)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Farmer</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Poora naam" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Ghulam Rasool" maxLength={100} error={show('fullName')} hint="Bill aur khate par yahi naam" data-autofocus />
              <Input label="Walid ka naam" value={form.fatherName} onChange={(e) => set('fatherName', e.target.value)} placeholder="Muhammad Din" hint="Marzi hai — gaon me pehchaan ke liye" />
              <Input label="Phone" required inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="03001234567" leftIcon={<Phone className="h-4 w-4" />} error={show('phone')} hint="WhatsApp yaad dihani isi par" />
              <Input label="Doosra phone" inputMode="tel" value={form.altPhone} onChange={(e) => set('altPhone', e.target.value)} placeholder="Beta / ghar" hint="Marzi hai" />
              <Input label="CNIC" inputMode="numeric" value={form.cnic} onChange={(e) => set('cnic', formatCnic(e.target.value))} placeholder="35202-1234567-1" leftIcon={<IdCard className="h-4 w-4" />} error={show('cnic')} hint="Subsidy claim ke liye zaroori. Ek CNIC do farmers par nahi." />
            </div>
          </Card>
          <Card className="rounded-2xl" title={<T icon={MapPin}>Gaon</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Gaon / chak" value={form.village} onChange={(e) => set('village', e.target.value)} placeholder="Chak 45/2L" />
              <Input label="Tehsil" value={form.tehsil} onChange={(e) => set('tehsil', e.target.value)} placeholder="Renala" />
              <Input label="Zila" value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="Okara" />
              <Select label="Soobah" value={form.province} onChange={(e) => set('province', e.target.value)} options={[{ value: '', label: '—' }, ...PROVINCES.map((p) => ({ value: p, label: p }))]} />
              <Input wrapperClassName="sm:col-span-2" label="Pata" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Delivery ke liye raasta" hint="Marzi hai — bulk order delivery me kaam aata hai" />
            </div>
          </Card>
          <Card className="rounded-2xl" title={<T icon={Sprout}>Zameen aur fasal</T>}>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Zameen (acre)" inputMode="decimal" value={form.landAreaAcres} onChange={(e) => set('landAreaAcres', amountInput(e.target.value))} placeholder="12" error={show('landAreaAcres')} hint="1 acre = 8 kanal" />
                <Select label="Zameen kis ki" value={form.landOwnership} onChange={(e) => set('landOwnership', e.target.value)} options={[{ value: '', label: '—' }, ...OWNERSHIP.map((o) => ({ value: o, label: o }))]} />
                <Select label="Paani" value={form.waterSource} onChange={(e) => set('waterSource', e.target.value)} options={[{ value: '', label: '—' }, ...WATER.map((o) => ({ value: o, label: o }))]} />
                <Select label="Mitti" value={form.soilType} onChange={(e) => set('soilType', e.target.value)} options={[{ value: '', label: '—' }, ...SOILS.map((o) => ({ value: o, label: o }))]} />
                <Input label="Abhi kya laga hai" value={form.currentCrop} onChange={(e) => set('currentCrop', e.target.value)} placeholder="Gandum" />
                <Select label="Season" value={form.currentSeason} onChange={(e) => set('currentSeason', e.target.value)} options={[{ value: '', label: '—' }, ...['RABI', 'KHARIF', 'ZAID'].map((v) => ({ value: v, label: SEASON_LABEL[v] }))]} />
              </div>
              <div><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaun si fasal ugata hai</span><Chips options={CROPS} value={form.primaryCrops} onChange={(v) => set('primaryCrops', v)} /></div>
              <div><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaam</span><Chips options={FARMING} value={form.farmingType} onChange={(v) => set('farmingType', v)} /></div>
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Wallet}>Season ka udhaar</T>} description="Rabi ka udhaar 31 May tak, Kharif ka 15 Dec tak — katai ke baad">
            <div className="space-y-3">
              <Input label="Udhaar ki had (Rs)" inputMode="decimal" value={form.creditLimit} onChange={(e) => set('creditLimit', amountInput(e.target.value))} placeholder="0" className="text-right font-semibold tabular-nums"
                hint={limit > 0 ? `${formatPKR(limit)} se upar udhaar par POS manager PIN maangega` : '0 = koi had nahi'} />
              <div className="flex flex-wrap gap-1.5">{[25000, 50000, 100000, 200000].map((v) => <button key={v} type="button" onClick={() => set('creditLimit', String(v))} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-200">{formatPKR(v)}</button>)}</div>
              <Input label="Udhaar ke din" inputMode="numeric" value={form.creditDays} onChange={(e) => set('creditDays', e.target.value.replace(/\D/g, ''))} placeholder="Season tak" error={show('creditDays')} hint="Marzi hai — season ke ilawa koi khaas waada ho to" />
            </div>
          </Card>
          <Card className="rounded-2xl" title={<T icon={Tractor}>Note</T>}>
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={4} placeholder="Jo baat yaad rakhni ho — zamin, guarantor, waada…" maxLength={2000} />
          </Card>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Wapas</Button>
            <Button className="flex-1" loading={save.isPending} onClick={submit}>{editing ? 'Save karein' : 'Farmer banayein'}</Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
