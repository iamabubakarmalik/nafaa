/**
 * Take a used phone in: bought for cash (paid from the drawer), taken as an
 * exchange toward a new phone (used later as a Trade-in payment at the POS)
 * or kept to sell for its owner. Records the seller with CNIC, the device and
 * its IMEI, PTA, condition and accessories, and the buying and selling price.
 *
 * Keys: Ctrl+Enter save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Camera, GraduationCap, IdCard, Lock, Recycle, ScanLine, ShieldCheck, Smartphone, Sparkles, UserRound, Wallet,
} from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Skeleton, Switch, Textarea } from '@/design-system/components';
import { AvatarUpload } from '@core/components/uploads';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useShopParam } from '@core/stores/auth.store';
import { usedPhonesApi, type CreateUsedPhonePayload, type TradeInSource, type UsedPhoneCondition } from '../api/used-phones.api';
import { imeiApi, type PtaStatus } from '../api/imei.api';
import { EMPTY_PERSON, PersonFields, personErrors, type Person } from '../components/PersonFields';
import {
  CONDITIONS, MONEY_KEYS, PTA_LIST, SOURCES, USED_KEY, apiError, conditionOf, dayOnly, digits, imeiStatusOf, isLuhnValid, money, ptaOf, sourceOf, usedStatusOf,
} from '../components/meta';

const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Infinix', 'Tecno', 'Realme', 'OnePlus', 'Google', 'Huawei', 'Nokia'];
const STORAGE = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'];
const RAM = ['3GB', '4GB', '6GB', '8GB', '12GB'];
const EXTRAS: Array<[keyof Draft, string]> = [
  ['hasOriginalBox', 'Dabba'], ['hasOriginalCharger', 'Charger'], ['hasOriginalCable', 'Cable'],
  ['hasOriginalEarphones', 'Handsfree'], ['hasOriginalReceipt', 'Pakki raseed'], ['hasWarrantyLeft', 'Company warranty baqi'],
];

interface Draft {
  source: TradeInSource; brand: string; model: string; storage: string; ram: string; color: string; modelYear: string;
  imei1: string; imei2: string; serialNumber: string; ptaStatus: PtaStatus; ptaTaxPaid: string;
  condition: UsedPhoneCondition; conditionNotes: string;
  hasOriginalBox: boolean; hasOriginalCharger: boolean; hasOriginalCable: boolean; hasOriginalEarphones: boolean; hasOriginalReceipt: boolean; hasWarrantyLeft: boolean;
  warrantyExpiryDate: string; referencePrice: string; buybackPrice: string; refurbishCost: string; resalePrice: string;
  ready: boolean; cnicPhotoUrl: string; imeiPhotoUrl: string; notes: string;
}
const EMPTY: Draft = {
  source: 'CASH_BUYBACK', brand: '', model: '', storage: '', ram: '', color: '', modelYear: '', imei1: '', imei2: '', serialNumber: '',
  ptaStatus: 'APPROVED', ptaTaxPaid: '', condition: 'GOOD', conditionNotes: '',
  hasOriginalBox: false, hasOriginalCharger: false, hasOriginalCable: false, hasOriginalEarphones: false, hasOriginalReceipt: false, hasWarrantyLeft: false,
  warrantyExpiryDate: '', referencePrice: '', buybackPrice: '', refurbishCost: '', resalePrice: '', ready: false, cnicPhotoUrl: '', imeiPhotoUrl: '', notes: '',
};
const n = (v: string) => Number(v) || 0;

export default function UsedPhoneFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const guide = usePageGuide();
  const lock = useRef(false);
  const [f, setF] = useState<Draft>(EMPTY);
  const [seller, setSeller] = useState<Person>(EMPTY_PERSON);
  const [loaded, setLoaded] = useState(false);
  const [touched, setTouched] = useState(false);
  const [scan, setScan] = useState<'imei1' | 'imei2' | null>(null);
  const set = (patch: Partial<Draft>) => setF((x) => ({ ...x, ...patch }));

  const detailQ = useQuery({ queryKey: [USED_KEY, 'detail', id], queryFn: () => usedPhonesApi.detail(id!), enabled: editing });
  const d = detailQ.data;
  useEffect(() => {
    if (!d || loaded) return;
    setF({
      ...EMPTY, source: d.source, brand: d.brand, model: d.model, storage: d.storage ?? '', ram: d.ram ?? '', color: d.color ?? '', modelYear: d.modelYear ? String(d.modelYear) : '',
      imei1: d.imei1, imei2: d.imei2 ?? '', serialNumber: d.serialNumber ?? '', ptaStatus: d.ptaStatus, ptaTaxPaid: d.ptaTaxPaid ? String(d.ptaTaxPaid) : '',
      condition: d.condition, conditionNotes: d.conditionNotes ?? '', hasOriginalBox: d.hasOriginalBox, hasOriginalCharger: d.hasOriginalCharger,
      hasOriginalCable: d.hasOriginalCable, hasOriginalEarphones: d.hasOriginalEarphones, hasOriginalReceipt: d.hasOriginalReceipt, hasWarrantyLeft: d.hasWarrantyLeft,
      warrantyExpiryDate: d.warrantyExpiryDate?.slice(0, 10) ?? '', buybackPrice: String(d.buybackPrice ?? ''), refurbishCost: d.refurbishCost ? String(d.refurbishCost) : '',
      resalePrice: d.resalePrice ? String(d.resalePrice) : '', cnicPhotoUrl: d.cnicPhotoUrl ?? '', imeiPhotoUrl: d.imeiPhotoUrl ?? '', notes: d.notes ?? '',
    });
    setSeller({ customerId: d.fromCustomerId ?? '', name: d.fromCustomerName ?? '', phone: d.fromCustomerPhone ?? '', cnic: d.fromCustomerCnic ?? '', address: '' });
    setLoaded(true);
  }, [d, loaded]);

  const moneyLocked = editing && !!d && (d.paidFromDrawer || !!d.tradeInBill);
  const closed = editing && !!d && (d.status === 'SOLD' || d.status === 'DISCARDED');
  const needCnic = f.source !== 'CONSIGNMENT';
  const cost = n(f.buybackPrice) + n(f.refurbishCost);
  const margin = n(f.resalePrice) - cost;

  const estimate = useMutation({
    mutationFn: () => usedPhonesApi.estimate({
      referencePrice: n(f.referencePrice), condition: f.condition, modelYear: n(f.modelYear) || undefined,
      hasOriginalBox: f.hasOriginalBox, hasOriginalCharger: f.hasOriginalCharger, hasOriginalReceipt: f.hasOriginalReceipt, hasWarrantyLeft: f.hasWarrantyLeft,
    }),
    onError: (e) => toast.error(apiError(e, 'Andaza nahi bana')),
  });

  // What the shop already knows about this IMEI: a phone still with us blocks
  // the intake; one sold earlier is a buy-back and its history is shown.
  const imeiChanged = !editing || (!!d && f.imei1 !== d.imei1);
  const imeiQ = useQuery({ queryKey: ['mobile-imei-lookup', f.imei1], queryFn: () => imeiApi.lookup(f.imei1), enabled: imeiChanged && f.imei1.length === 15, retry: false });
  const known = imeiChanged && f.imei1.length === 15 ? imeiQ.data : undefined;
  const heldUsed = known?.usedPhones.find((u) => u.id !== id && u.status !== 'SOLD' && u.status !== 'DISCARDED');
  const onShelf = known?.newPhones.find((p) => p.status !== 'SOLD');
  const pastUsed = known?.usedPhones.filter((u) => u.id !== id && u.status === 'SOLD') ?? [];
  const soldNew = known?.newPhones.filter((p) => p.status === 'SOLD') ?? [];
  useEffect(() => {
    const prev = known?.usedPhones[0];
    const prevNew = soldNew[0];
    if (editing || f.brand || f.model) return;
    if (prev) set({ brand: prev.brand, model: prev.model, storage: prev.storage ?? '' });
    else if (prevNew) set({ brand: prevNew.product.brand?.name ?? '', model: prevNew.product.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [known?.code]);

  const sellerErr = personErrors(seller, needCnic);
  const problems = useMemo(() => {
    const out: string[] = [];
    if (!f.brand.trim()) out.push('Brand likhein');
    if (!f.model.trim()) out.push('Model likhein');
    if (!/^\d{15}$/.test(f.imei1)) out.push('IMEI 1 me 15 number hon');
    if (f.imei2 && !/^\d{15}$/.test(f.imei2)) out.push('IMEI 2 me 15 number hon');
    if (f.imei2 && f.imei2 === f.imei1) out.push('IMEI 1 aur 2 ek jaise nahi ho sakte');
    if (heldUsed) out.push(`Ye phone abhi dukaan me hai (${heldUsed.usedPhoneCode}) — usi record ko kholein`);
    if (onShelf) out.push('Ye IMEI naye phone ke stock me hai — wapas khareeda nahi ja sakta');
    const se = Object.values(sellerErr)[0];
    if (se) out.push(`Bechne wala: ${se}`);
    if (f.source !== 'CONSIGNMENT' && !(n(f.buybackPrice) > 0)) out.push(f.source === 'EXCHANGE' ? 'Exchange me phone kitne ka liya — likhein' : 'Kitne me khareeda — likhein');
    if (n(f.modelYear) && (n(f.modelYear) < 2000 || n(f.modelYear) > new Date().getFullYear())) out.push('Saal sahi likhein');
    if (f.resalePrice && n(f.resalePrice) > 0 && n(f.resalePrice) < cost) out.push(`Bechne ki qeemat cost (${formatPKR(cost)}) se kam hai`);
    return out;
  }, [f, sellerErr, closed, cost, heldUsed, onShelf]);
  const warnLuhn = /^\d{15}$/.test(f.imei1) && !isLuhnValid(f.imei1);

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const opt = (v: string) => (v.trim() ? v.trim() : undefined);
      const body: CreateUsedPhonePayload = {
        shopId: editing ? undefined : shopId, source: f.source, brand: f.brand.trim(), model: f.model.trim(), storage: opt(f.storage), ram: opt(f.ram), color: opt(f.color),
        modelYear: n(f.modelYear) || undefined, imei1: f.imei1, imei2: opt(f.imei2), serialNumber: opt(f.serialNumber), ptaStatus: f.ptaStatus, ptaTaxPaid: n(f.ptaTaxPaid),
        condition: f.condition, conditionNotes: opt(f.conditionNotes), hasOriginalBox: f.hasOriginalBox, hasOriginalCharger: f.hasOriginalCharger,
        hasOriginalCable: f.hasOriginalCable, hasOriginalEarphones: f.hasOriginalEarphones, hasOriginalReceipt: f.hasOriginalReceipt, hasWarrantyLeft: f.hasWarrantyLeft,
        warrantyExpiryDate: f.hasWarrantyLeft && f.warrantyExpiryDate ? f.warrantyExpiryDate : undefined,
        buybackPrice: n(f.buybackPrice), estimatedValue: estimate.data?.suggestedBuyback, refurbishCost: n(f.refurbishCost), resalePrice: n(f.resalePrice),
        fromCustomerId: seller.customerId || undefined, fromCustomerName: seller.name.trim(), fromCustomerPhone: seller.phone.trim(), fromCustomerCnic: opt(seller.cnic),
        cnicPhotoUrl: opt(f.cnicPhotoUrl), imeiPhotoUrl: opt(f.imeiPhotoUrl), notes: opt(f.notes),
        ...(editing ? {} : { status: f.ready ? 'IN_STOCK' : 'PENDING_INSPECTION' }),
      };
      if (editing && closed) {
        return usedPhonesApi.update(id!, { notes: opt(f.notes), conditionNotes: opt(f.conditionNotes), cnicPhotoUrl: opt(f.cnicPhotoUrl), imeiPhotoUrl: opt(f.imeiPhotoUrl) });
      }
      // Drawer money and trade-in bills keep their amount; shopId is undefined on edit.
      if (editing) return usedPhonesApi.update(id!, moneyLocked ? { ...body, buybackPrice: undefined, source: undefined } : body);
      return usedPhonesApi.create(body);
    },
    onSuccess: (p) => {
      const paid = (p as { paidFromDrawer?: boolean }).paidFromDrawer;
      if (!editing && f.source === 'CASH_BUYBACK') {
        if (paid) toast.success(`${p.usedPhoneCode} darj — ${formatPKR(n(f.buybackPrice))} galle se nikle`);
        else toast.warning(`${p.usedPhoneCode} darj — galla khula nahi tha, ye paise kisi register me nahi likhe gaye`, { duration: 8000 });
      } else if (!editing && f.source === 'EXCHANGE') {
        toast.success(`${p.usedPhoneCode} darj — POS par naye phone ke bill me "Trade-in" se qeemat katein`, { duration: 7000 });
      } else toast.success(editing ? 'Save ho gaya' : `${p.usedPhoneCode} darj ho gaya`);
      [USED_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate(`/used-phones/${p.id}`, { replace: true });
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => { setTouched(true); if (lock.current || save.isPending) return; if (problems.length) { toast.error(problems[0]); return; } lock.current = true; save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && detailQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-[32rem] rounded-2xl" /></PageShell>;
  if (editing && !d) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Ye phone nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/used-phones')}>Used phones par wapas</Button></div></PageShell>;

  const chip = (on: boolean) => cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', on ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50');

  return (
    <PageShell>
      {scan && <BarcodeScanner onDetected={(c: string) => { const x = digits(c); if (x.length === 15) { set({ [scan]: x } as Partial<Draft>); setScan(null); } }} onClose={() => setScan(null)} />}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${d?.usedPhoneCode} — badlein` : 'Used phone lein'}</h1>
          <p className="text-[0.8125rem] text-white/75">{closed ? 'Bika ya hataya hua phone — sirf note aur tasveerein badalti hain' : editing ? 'Diye hue paise aur trade-in bill ke baad qeemat nahi badalti' : 'Khareedein, exchange me lein, ya customer ki taraf se bechein'}</p>
        </div>
        <button type="button" onClick={guide.open} title="Guide (G)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Recycle}>Phone kaise aaya</T>}>
            <div className="grid gap-2 sm:grid-cols-3">
              {SOURCES.map((s) => (
                <button key={s} type="button" disabled={moneyLocked} onClick={() => set({ source: s })}
                  className={cn('rounded-xl p-3 text-left ring-1 transition disabled:opacity-60', f.source === s ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                  <p className="text-[0.875rem] font-semibold text-slate-900">{sourceOf(s).label}</p>
                  <p className="mt-0.5 text-[0.75rem] text-slate-500">{sourceOf(s).hint}</p>
                </button>
              ))}
            </div>
            {moneyLocked && <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" />{d?.tradeInBill ? `Bill ${d.tradeInBill.saleNumber} me trade-in laga hai` : 'Paise galle se diye ja chuke'} — tareeqa aur qeemat ab nahi badalti</p>}
          </Card>

          <Card className="rounded-2xl" title={<T icon={UserRound}>{f.source === 'CONSIGNMENT' ? 'Phone ka malik' : 'Kis se liya'}</T>}>
            <PersonFields value={seller} onChange={setSeller} cnicRequired={needCnic} errors={touched ? sellerErr : {}} />
            <div className="mt-3 flex flex-wrap gap-6">
              <div><p className="mb-1.5 text-[0.75rem] text-slate-500">CNIC ki tasveer</p><AvatarUpload value={f.cnicPhotoUrl || null} onChange={(u) => set({ cnicPhotoUrl: u ?? '' })} purpose="document" size="lg" shape="square" fallbackText="ID" /></div>
              <div><p className="mb-1.5 text-[0.75rem] text-slate-500">IMEI / dabbe ki tasveer</p><AvatarUpload value={f.imeiPhotoUrl || null} onChange={(u) => set({ imeiPhotoUrl: u ?? '' })} purpose="document" size="lg" shape="square" fallbackText="IMEI" /></div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Smartphone}>Phone</T>}>
            <div className="space-y-3">
              <div>
                <Input label="Brand" required value={f.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="Samsung" />
                <div className="mt-1.5 flex flex-wrap gap-1">{BRANDS.map((b) => <button key={b} type="button" onClick={() => set({ brand: b })} className={chip(f.brand === b)}>{b}</button>)}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Model" required value={f.model} onChange={(e) => set({ model: e.target.value })} placeholder="Galaxy S21" />
                <Input label="Rang" value={f.color} onChange={(e) => set({ color: e.target.value })} hint="Marzi hai" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><span className="text-[0.8125rem] font-medium text-slate-700">Storage</span><div className="mt-1.5 flex flex-wrap gap-1">{STORAGE.map((s) => <button key={s} type="button" onClick={() => set({ storage: f.storage === s ? '' : s })} className={chip(f.storage === s)}>{s}</button>)}</div></div>
                <div><span className="text-[0.8125rem] font-medium text-slate-700">RAM</span><div className="mt-1.5 flex flex-wrap gap-1">{RAM.map((s) => <button key={s} type="button" onClick={() => set({ ram: f.ram === s ? '' : s })} className={chip(f.ram === s)}>{s}</button>)}</div></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="IMEI 1" required inputMode="numeric" maxLength={15} value={f.imei1} onChange={(e) => set({ imei1: digits(e.target.value) })} className="font-mono"
                  rightIcon={<button type="button" onClick={() => setScan('imei1')} aria-label="Scan"><ScanLine className="h-4 w-4" /></button>}
                  hint={warnLuhn ? <span className="text-amber-700">Check digit nahi milta — dobara dekhein</span> : '*#06# dabayein'} />
                <Input label="IMEI 2" inputMode="numeric" maxLength={15} value={f.imei2} onChange={(e) => set({ imei2: digits(e.target.value) })} className="font-mono"
                  rightIcon={<button type="button" onClick={() => setScan('imei2')} aria-label="Scan"><ScanLine className="h-4 w-4" /></button>} hint="Dual SIM ho to" />
                <Input label="Kis saal ka" inputMode="numeric" maxLength={4} value={f.modelYear} onChange={(e) => set({ modelYear: digits(e.target.value) })} placeholder="2022" hint="Andaze me kaam aata hai" />
              </div>
              {(heldUsed || onShelf) && (
                <p className="flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {heldUsed
                    ? <span>Ye phone abhi dukaan me hai: <button type="button" className="font-mono font-semibold underline" onClick={() => navigate(`/used-phones/${heldUsed.id}`)}>{heldUsed.usedPhoneCode}</button> ({usedStatusOf(heldUsed.status).label}). Naya record nahi banega.</span>
                    : <span>Ye IMEI naye phone ke stock me hai ({imeiStatusOf(onShelf!.status).label}) — wapas nahi khareeda ja sakta.</span>}
                </p>
              )}
              {!heldUsed && !onShelf && (pastUsed.length > 0 || soldNew.length > 0) && (
                <div className="space-y-1 rounded-xl bg-sky-50 px-3 py-2 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200">
                  <p className="font-semibold">Ye phone pehle bhi is dukaan me tha — wapas khareed (buy-back)</p>
                  {soldNew.map((p) => <p key={p.id}>Naya phone bika: {p.sale?.saleNumber ?? '—'} · {dayOnly(p.soldAt)}{p.sale?.customer ? ` · ${p.sale.customer.name}` : ''}</p>)}
                  {pastUsed.map((u) => (
                    <p key={u.id}>Used <button type="button" className="font-mono font-semibold underline" onClick={() => navigate(`/used-phones/${u.id}`)}>{u.usedPhoneCode}</button>: liya {dayOnly(u.receivedAt)}, bika {dayOnly(u.soldAt)}{u.sale?.customer ? ` · ${u.sale.customer.name}` : ''}</p>
                  ))}
                </div>
              )}
              <div>
                <span className="text-[0.8125rem] font-medium text-slate-700">PTA</span>
                <div className="mt-1.5 flex flex-wrap gap-1">{PTA_LIST.map((p) => <button key={p} type="button" onClick={() => set({ ptaStatus: p })} className={chip(f.ptaStatus === p)}>{ptaOf(p).label}</button>)}</div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={BadgeCheck}>Halat aur saath kya hai</T>}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {CONDITIONS.map((c) => (
                  <button key={c} type="button" onClick={() => set({ condition: c })}
                    className={cn('rounded-xl p-2.5 text-left ring-1', f.condition === c ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                    <p className="text-[0.8125rem] font-semibold text-slate-900">{conditionOf(c).label}</p>
                    <p className="text-[0.6875rem] text-slate-500">{conditionOf(c).score}</p>
                  </button>
                ))}
              </div>
              <Textarea label="Kharabi / nishan" rows={2} value={f.conditionNotes} onChange={(e) => set({ conditionNotes: e.target.value })} placeholder="Screen par line, back crack…" maxLength={500} />
              <div className="flex flex-wrap gap-1.5">
                {EXTRAS.map(([k, label]) => <button key={k} type="button" onClick={() => set({ [k]: !f[k] } as Partial<Draft>)} className={chip(!!f[k])}>{label}</button>)}
              </div>
              {f.hasWarrantyLeft && <Input label="Company warranty kab tak" type="date" value={f.warrantyExpiryDate} onChange={(e) => set({ warrantyExpiryDate: e.target.value })} />}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Sparkles}>Qeemat ka andaza</T>} description="Market me ye phone (acha) kitne ka bik raha hai — us se halat ke hisaab se andaza">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input wrapperClassName="flex-1" inputMode="decimal" value={f.referencePrice} onChange={(e) => set({ referencePrice: money(e.target.value) })} placeholder="Market qeemat" />
                <Button variant="secondary" disabled={!(n(f.referencePrice) > 0)} loading={estimate.isPending} onClick={() => estimate.mutate()}>Andaza</Button>
              </div>
              {estimate.data && (
                <div className="rounded-xl bg-emerald-50 p-3 text-[0.8125rem] ring-1 ring-emerald-200">
                  <p className="font-semibold text-emerald-900">Khareed ka andaza: {formatPKR(estimate.data.suggestedBuyback)}</p>
                  <p className="mt-0.5 text-emerald-800">{estimate.data.reasoning.join(' · ')}</p>
                  {!moneyLocked && <button type="button" onClick={() => set({ buybackPrice: String(estimate.data!.suggestedBuyback) })} className="mt-1 font-semibold text-emerald-900 hover:underline">Yahi rakhein</button>}
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wallet}>Paise</T>}>
            <div className="space-y-3">
              <Input label={f.source === 'EXCHANGE' ? 'Exchange me kitne ka liya' : f.source === 'CONSIGNMENT' ? 'Malik ko kitne dene hain' : 'Kitne me khareeda'} required={f.source !== 'CONSIGNMENT'}
                inputMode="decimal" value={f.buybackPrice} disabled={moneyLocked} onChange={(e) => set({ buybackPrice: money(e.target.value) })}
                hint={f.source === 'CASH_BUYBACK' ? 'Ye paise abhi galle se niklenge' : f.source === 'EXCHANGE' ? 'Bill me itna trade-in se katega' : 'Bikne par malik ko denge'} />
              <Input label="Theek karwane ka kharcha" inputMode="decimal" value={f.refurbishCost} onChange={(e) => set({ refurbishCost: money(e.target.value) })} hint="Screen, battery waghera — cost me judta hai" />
              <Input label="Kitne ka bechna hai" inputMode="decimal" value={f.resalePrice} onChange={(e) => set({ resalePrice: money(e.target.value) })} hint="POS par yahi qeemat aayegi" />
              <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.8125rem]">
                <div className="flex justify-between"><dt className="text-slate-500">Kul cost</dt><dd className="font-semibold tabular-nums">{formatPKR(cost)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Bechne par profit</dt><dd className={cn('font-bold tabular-nums', margin < 0 ? 'text-rose-600' : 'text-emerald-700')}>{n(f.resalePrice) ? formatPKR(margin) : '—'}</dd></div>
              </dl>
              {!editing && (
                <Switch checked={f.ready} onChange={(e) => set({ ready: e.target.checked })} label="Check ho chuka — seedha bikne ko tayyar"
                  description={f.ready ? 'POS par foran dikhega' : 'Pehle "Check" hoga, phir POS par aayega'} />
              )}
              <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={1000} />
            </div>
          </Card>

          {f.source === 'CASH_BUYBACK' && !editing && (
            <p className="flex items-start gap-1.5 rounded-2xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
              <IdCard className="mt-0.5 h-4 w-4 shrink-0" />CNIC aur IMEI check karein (IMEI check se purana record dekhein). Chori ka phone khareedna jurm hai.
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (touched || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{f.brand || 'Phone'} {f.model} · cost <b className="tabular-nums text-slate-900">{formatPKR(cost)}</b>{n(f.resalePrice) ? <> · bechna <b className="tabular-nums text-slate-900">{formatPKR(n(f.resalePrice))}</b></> : null}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? 'Save karein' : f.source === 'CASH_BUYBACK' ? 'Khareed lein' : 'Darj karein'}</Button>
      </div>

      {guide.isOpen && (
        <PageGuide title="Used phone lena" onClose={guide.close}
          steps={[
            { icon: Recycle, color: '#6366f1', title: 'Teen tareeqe', text: 'Cash me khareedna (paise galle se), Exchange (naye phone ke bill me qeemat katti hai), ya malik ki taraf se bechna.' },
            { icon: IdCard, color: '#e11d48', title: 'CNIC zaroor', text: 'Bechne wale ka CNIC aur tasveer rakhein. IMEI check se dekhein ke ye phone pehle kahin record me to nahi.' },
            { icon: ShieldCheck, color: '#16a34a', title: 'PTA aur halat', text: 'PTA, halat aur saath ka saman likhein — bechte waqt customer ko yahi batana hai.' },
            { icon: Camera, color: '#0891b2', title: 'Check', text: 'Phone pehle "Check baqi" me jata hai. Check ke baad "Bikne ko tayyar" ho kar POS par aata hai.' },
          ]}
          tips={['Exchange wala phone POS ke Split / Trade-in me dikhta hai — wahan us ki qeemat bill se katein.', 'Galla band ho to cash khareed ke paise register me nahi likhe jate.']}
          shortcuts={[['Ctrl+Enter', 'save'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof Smartphone; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
