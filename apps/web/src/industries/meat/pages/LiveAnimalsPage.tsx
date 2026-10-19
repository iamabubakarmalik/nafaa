/**
 * Live stock and mandi purchases. A mandi purchase (birds by weight, or
 * tagged animals) is a supplier purchase of the shop's live-stock item: the
 * money reaches the supplier khata, day book and drawer, the live kg come
 * into stock at cost, and slaughter later turns them into meat. Tagged
 * animals keep health, feed (paid as an expense) and slaughter details.
 *
 * Keys: N mandi purchase · / search · 1 animals · 2 analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, Bird, Ban, FileSpreadsheet, GraduationCap, Heart, HeartPulse, Plus, Scale, ShieldCheck, Trash2, Truck, Wheat,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Segmented, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { liveAnimalsApi, type LiveAnimal, type MandiInput } from '../api/live-animals.api';
import { ItemPick, PickedChip, SupplierPick, type PickedSupplier } from '../components/pickers';
import { MethodPicker } from '../components/money';
import { FormRow, ListFrame, Pill, inputBox, useConfirm, usePageKeys } from '../components/ui';
import { ANIMALS, KEYS, MONEY_KEYS, animalOf, apiError, dateOnly, decimal, kg, todayKey, type PayMethod } from '../lib/meta';

type View = 'animals' | 'analytics';
type Show = 'alive' | 'slaughtered' | 'all';

interface AnimalRow { tagNumber: string; animalType: string; breed: string; weightKg: string; price: string }
const blankAnimal = (type = 'MUTTON'): AnimalRow => ({ tagNumber: '', animalType: type, breed: '', weightKg: '', price: '' });

function MandiModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [supplier, setSupplier] = useState<PickedSupplier | null>(null);
  const [item, setItem] = useState<{ id: string; name: string } | null>(null);
  const [mode, setMode] = useState<'kg' | 'animals'>('kg');
  const [kgs, setKgs] = useState('');
  const [rate, setRate] = useState('');
  const [birds, setBirds] = useState('');
  const [animals, setAnimals] = useState<AnimalRow[]>([blankAnimal()]);
  const [other, setOther] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [date, setDate] = useState(todayKey());
  const [tried, setTried] = useState(false);

  const goods = mode === 'kg' ? (Number(kgs) || 0) * (Number(rate) || 0) : animals.reduce((s, a) => s + (Number(a.price) || 0), 0);
  const total = goods + (Number(other) || 0);
  const errors: Record<string, string> = {};
  if (!supplier) errors.supplier = 'Supplier (beopari / mandi) chunein';
  if (!item) errors.item = 'Zinda maal ka item chunein (jaise "Zinda murgi")';
  if (mode === 'kg') {
    if (!(Number(kgs) > 0)) errors.kg = 'Kitne kg aaya';
    if (!(Number(rate) > 0)) errors.rate = 'Zinda rate / kg';
  } else if (animals.some((a) => !(Number(a.weightKg) > 0) || !(Number(a.price) > 0))) errors.animals = 'Har janwar ka wazan aur qeemat likhein';
  if ((Number(paid) || 0) > total + 0.005) errors.paid = 'Diya hua paisa purchase se zyada nahi';
  const err = (k: string) => (tried ? errors[k] : undefined);

  const save = useMutation({
    mutationFn: () => liveAnimalsApi.mandi({
      supplierId: supplier!.id, productId: item!.id, paymentMethod: method, paidAmount: paid === '' ? 0 : Number(paid), otherCharges: Number(other) || undefined, purchasedAt: date,
      ...(mode === 'kg'
        ? { kg: Number(kgs), ratePerKg: Number(rate), birds: Number(birds) || undefined }
        : { animals: animals.map((a) => ({ tagNumber: a.tagNumber.trim() || undefined, animalType: a.animalType, breed: a.breed.trim() || undefined, weightKg: Number(a.weightKg), price: Number(a.price) })) }),
    } as MandiInput),
    onSuccess: (r) => { toast.success(`Purchase ${r.purchaseNumber} ban gayi — ${formatPKR(r.total)}`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Purchase save nahi hui')),
  });
  const submit = () => { setTried(true); const first = Object.values(errors)[0]; if (first) { toast.error(first); return; } save.mutate(); };
  const setA = (i: number, patch: Partial<AnimalRow>) => setAnimals((as) => as.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  return (
    <Modal open onClose={onClose} size="lg" title="Mandi se maal aaya" description="Supplier purchase banti hai: supplier khata, galla aur stock sab ek saath"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} onClick={submit} leftIcon={<Truck className="h-4 w-4" />}>Purchase save · {formatPKR(total)}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormRow label="Supplier"><SupplierPick value={supplier} onChange={setSupplier} error={err('supplier')} /></FormRow>
          <FormRow label="Zinda maal ka item" hint="Kg wala item jo zibah me istemal hota hai">
            {item ? <PickedChip title={item.name} onClear={() => setItem(null)} /> : <ItemPick onPick={(i) => setItem({ id: i.id, name: i.name })} placeholder="Zinda murgi, bakra zinda…" error={err('item')} />}
          </FormRow>
        </div>
        <Segmented<'kg' | 'animals'> label="Kaise aaya" value={mode} onChange={setMode}
          items={[{ value: 'kg', label: <span className="inline-flex items-center gap-1.5"><Bird className="h-3.5 w-3.5" />Wazan se (murgi)</span> }, { value: 'animals', label: <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" />Janwar (tag ke saath)</span> }]} />
        {mode === 'kg' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <FormRow label="Kul zinda wazan (kg)" error={err('kg')}><input data-autofocus inputMode="decimal" value={kgs} onChange={(e) => setKgs(decimal(e.target.value))} className={cn(inputBox, 'text-right font-semibold')} aria-invalid={!!err('kg')} /></FormRow>
            <FormRow label="Zinda rate / kg" error={err('rate')}><input inputMode="decimal" value={rate} onChange={(e) => setRate(decimal(e.target.value))} className={cn(inputBox, 'text-right')} aria-invalid={!!err('rate')} /></FormRow>
            <FormRow label="Kitne parinde (marzi)"><input inputMode="numeric" value={birds} onChange={(e) => setBirds(e.target.value.replace(/\D/g, ''))} className={cn(inputBox, 'text-right')} /></FormRow>
          </div>
        ) : (
          <div className="space-y-2">
            {animals.map((a, i) => (
              <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200 sm:grid-cols-[7rem_8rem_1fr_6rem_7rem_auto]">
                <input value={a.tagNumber} onChange={(e) => setA(i, { tagNumber: e.target.value })} placeholder="Tag (khud)" aria-label="Tag" className="h-10 rounded-lg bg-white px-2.5 text-[0.875rem] ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500" />
                <select value={a.animalType} onChange={(e) => setA(i, { animalType: e.target.value })} aria-label="Janwar" className="h-10 rounded-lg bg-white px-2 text-[0.875rem] ring-1 ring-slate-200">
                  {ANIMALS.filter((x) => !['FISH', 'PRAWN', 'QUAIL'].includes(x.value)).map((x) => <option key={x.value} value={x.value}>{x.emoji} {x.label}</option>)}
                </select>
                <input value={a.breed} onChange={(e) => setA(i, { breed: e.target.value })} placeholder="Nasal (Teddy, Sahiwal…)" aria-label="Nasal" className="h-10 rounded-lg bg-white px-2.5 text-[0.875rem] ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500" />
                <input inputMode="decimal" value={a.weightKg} onChange={(e) => setA(i, { weightKg: decimal(e.target.value) })} placeholder="Kg" aria-label="Wazan" className="h-10 rounded-lg bg-white px-2.5 text-right text-[0.875rem] ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500" />
                <input inputMode="decimal" value={a.price} onChange={(e) => setA(i, { price: decimal(e.target.value) })} placeholder="Qeemat" aria-label="Qeemat" className="h-10 rounded-lg bg-white px-2.5 text-right text-[0.875rem] ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500" />
                <button type="button" aria-label="Hatayein" disabled={animals.length === 1} onClick={() => setAnimals((as) => as.filter((_, j) => j !== i))} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {err('animals') && <p className="text-[0.75rem] font-medium text-rose-600">{err('animals')}</p>}
            <Button size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAnimals((as) => [...as, blankAnimal(as[as.length - 1]?.animalType)])}>Aur janwar</Button>
            <p className="text-[0.75rem] text-slate-500">Wazan andaze se bhi chalega — zibah par asal zinda wazan dobara likha jata hai.</p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <FormRow label="Kiraya / mazdoori" hint="Purchase ki cost me judta hai"><input inputMode="decimal" value={other} onChange={(e) => setOther(decimal(e.target.value))} className={cn(inputBox, 'text-right')} placeholder="0" /></FormRow>
          <FormRow label="Abhi diya" error={err('paid')} hint="Baqi supplier ke khate me"><input inputMode="decimal" value={paid} onChange={(e) => setPaid(decimal(e.target.value))} className={cn(inputBox, 'text-right')} placeholder="0" aria-invalid={!!err('paid')} /></FormRow>
          <FormRow label="Tareekh"><input type="date" max={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} className={inputBox} /></FormRow>
        </div>
        {(Number(paid) || 0) > 0 && <MethodPicker value={method} onChange={setMethod} />}
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700">Kul purchase <strong className="tabular-nums">{formatPKR(total)}</strong>{mode === 'kg' && Number(kgs) > 0 ? ` · ${kg(Number(kgs))}` : ''} — baqi supplier ka {formatPKR(Math.max(total - (Number(paid) || 0), 0))}</p>
      </form>
    </Modal>
  );
}

function FeedModal({ a, onClose, onDone }: { a: LiveAnimal; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState('1');
  const [perDay, setPerDay] = useState(a.dailyFeedCost ? String(a.dailyFeedCost) : '');
  const [method, setMethod] = useState<PayMethod>('CASH');
  const amount = (Number(days) || 0) * (Number(perDay) || 0);
  const save = useMutation({
    mutationFn: () => liveAnimalsApi.addFeedCost(a.id, Number(days), Number(perDay), method),
    onSuccess: () => { toast.success(`Chara ${formatPKR(amount)} expense me likh diya`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Chara save nahi hua')),
  });
  const bad = !(Number(days) >= 1 && Number(days) <= 365 && Number.isInteger(Number(days))) || !(Number(perDay) > 0);
  return (
    <Modal open onClose={onClose} size="sm" title={`Chara — ${a.tagNumber}`} description="Diya hua kharcha: Expense banta hai aur galle se nikalta hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={bad} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Wheat className="h-4 w-4" />}>Save · {formatPKR(amount)}</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input data-autofocus label="Kitne din" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} />
          <Input label="Rozana kharcha" inputMode="decimal" value={perDay} onChange={(e) => setPerDay(decimal(e.target.value))} />
        </div>
        <MethodPicker value={method} onChange={setMethod} />
      </div>
    </Modal>
  );
}

function HealthModal({ a, onClose, onDone }: { a: LiveAnimal; onClose: () => void; onDone: () => void }) {
  const [healthy, setHealthy] = useState(a.isHealthy);
  const [vacc, setVacc] = useState(a.vaccinationStatus ?? '');
  const [notes, setNotes] = useState(a.healthNotes ?? '');
  const [weight, setWeight] = useState(String(a.weightKg));
  const save = useMutation({
    mutationFn: () => liveAnimalsApi.update(a.id, { isHealthy: healthy, vaccinationStatus: vacc, healthNotes: notes, ...(Number(weight) !== a.weightKg && { weightKg: Number(weight) }) }),
    onSuccess: () => { toast.success('Save ho gaya'); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Sehat — ${a.tagNumber}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!(Number(weight) > 0)} loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <Segmented<'yes' | 'no'> label="Sehat" value={healthy ? 'yes' : 'no'} onChange={(v) => setHealthy(v === 'yes')} items={[{ value: 'yes', label: 'Theek' }, { value: 'no', label: 'Bimar' }]} />
        <Input label="Wazan (kg)" inputMode="decimal" value={weight} onChange={(e) => setWeight(decimal(e.target.value))} />
        <Input label="Teeke" value={vacc} onChange={(e) => setVacc(e.target.value)} placeholder="FMD lag gaya, deworming…" maxLength={200} />
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </div>
    </Modal>
  );
}

export default function LiveAnimalsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { cost } = useMasked();
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canExpense = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('animals');
  const [show, setShow] = useState<Show>('alive');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [mandi, setMandi] = useState(false);
  const [feed, setFeed] = useState<LiveAnimal | null>(null);
  const [health, setHealth] = useState<LiveAnimal | null>(null);
  const [ask, confirmDialog] = useConfirm();

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  const params = { animalType: type || undefined, search: query || undefined, isSlaughtered: show === 'all' ? undefined : String(show === 'slaughtered') };
  const listQ = useQuery({ queryKey: [KEYS.animals, params], queryFn: () => liveAnimalsApi.list(params), placeholderData: (p) => p });
  const sumQ = useQuery({ queryKey: ['live-animals-summary'], queryFn: () => liveAnimalsApi.summary() });
  const rows = listQ.data ?? [];
  const s = sumQ.data;
  const refresh = () => [KEYS.animals, 'live-animals-summary', 'purchases', 'suppliers', 'expenses', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const remove = useMutation({
    mutationFn: (a: LiveAnimal) => liveAnimalsApi.remove(a.id),
    onSuccess: () => { toast.success('List se hata diya'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hata')),
  });

  usePageKeys({ n: canBuy ? () => setMandi(true) : undefined, '1': () => setView('animals'), '2': () => setView('analytics'), g: guide.open }, searchRef);

  const totals = useMemo(() => ({
    cost: (s?.totalCost._sum.purchasePrice ?? 0) + (s?.totalCost._sum.totalFeedCost ?? 0),
    kg: (s?.byType ?? []).reduce((t, b) => t + (b._sum.weightKg ?? 0), 0),
    sick: rows.filter((a) => !a.isHealthy && !a.isSlaughtered).length,
  }), [s, rows]);

  const printDoc = (): PrintDoc => ({
    title: 'Zinda janwar', subtitle: show === 'alive' ? 'Baara me' : show === 'slaughtered' ? 'Zibah ho chuke' : 'Sab',
    sections: [{ kind: 'table', columns: [{ label: 'Tag' }, { label: 'Janwar' }, { label: 'Kg', align: 'right' }, { label: 'Qeemat', align: 'right' }, { label: 'Chara', align: 'right' }, { label: 'Supplier', wideOnly: true }],
      rows: rows.map((a) => [a.tagNumber, `${animalOf(a.animalType).label} ${a.breed ?? ''}`, String(a.weightKg), formatPKR(a.purchasePrice), formatPKR(a.totalFeedCost), a.vendorName ?? '']) }],
  });

  return (
    <PageShell>
      <PageHero
        title="Zinda maal aur mandi"
        chip={<><Heart /> Murgi, bakra, gaye</>}
        meta="Mandi ka maal purchase banta hai; zibah se gosht stock me aata hai"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={sumQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" title="CSV" className={heroIconButton} disabled={!rows.length}
            onClick={() => downloadCsv('zinda-janwar.csv', [['Tag', 'Janwar', 'Nasal', 'Kg', 'Qeemat', 'Chara', 'Supplier', 'Purchase', 'Zibah'], ...rows.map((a) => [a.tagNumber, animalOf(a.animalType).label, a.breed, a.weightKg, a.purchasePrice, a.totalFeedCost, a.vendorName, a.sourceName, a.isSlaughtered ? 'Haan' : ''])])}>
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <Link to="/meat/slaughter" className={heroButton}><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">Zibah</span></Link>
          <Link to="/purchases" className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Purchases</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canBuy && <button type="button" onClick={() => setMandi(true)} title="Mandi purchase (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Mandi se aaya</button>}
        </>}
        stats={s ? [{ label: 'Baara me', value: s.aliveCount }, { label: 'Kul wazan', value: kg(totals.kg) }, { label: 'Cost + chara', value: cost(totals.cost) }] : [{ label: 'Baara me', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Heart} color="#dc2626" label="Baara me" value={s.aliveCount} hint={kg(totals.kg)} onClick={() => setShow('alive')} active={show === 'alive'} />
          <KpiCard icon={Scale} color="#0891b2" label="Purchase cost" value={cost(s.totalCost._sum.purchasePrice)} hint="Zinda janwar" />
          <KpiCard icon={Wheat} color="#a16207" label="Chara" value={cost(s.totalCost._sum.totalFeedCost)} hint="Expense me" />
          <KpiCard icon={HeartPulse} color={totals.sick ? '#e11d48' : '#64748b'} label="Bimar" value={totals.sick} hint={totals.sick ? 'Vet ko dikhayein' : 'Sab theek'} />
        </>}
      </KpiRow>

      {view === 'animals' && (
        <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Tag, nasal, supplier, purchase #…" label="Search" />}>
          <FilterMenu icon={Heart} label={show === 'alive' ? 'Baara me' : show === 'slaughtered' ? 'Zibah ho gaye' : 'Sab'} value={show} active={show !== 'alive'} onChange={setShow}
            options={[{ value: 'alive', label: 'Baara me' }, { value: 'slaughtered', label: 'Zibah ho gaye' }, { value: 'all', label: 'Sab' }]} />
          <FilterMenu icon={Bird} label={type ? animalOf(type).label : 'Sab janwar'} value={type} active={!!type} onChange={setType}
            options={[{ value: '', label: 'Sab janwar' }, ...ANIMALS.map((a) => ({ value: a.value, label: `${a.emoji} ${a.label}` }))]} />
        </FilterBar>
      )}

      <ViewTabs value={view} onChange={setView} hint={<>{canBuy ? 'N mandi · ' : ''}/ search · 1-2 tabs</>}
        tabs={[{ id: 'animals', label: 'Tag wale janwar', icon: Heart, count: rows.length }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {view === 'analytics' ? (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
          <h3 className="font-semibold text-slate-900">Baara me janwar — type ke hisaab se</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {(s?.byType ?? []).map((b) => (
              <li key={b.animalType} className="flex items-center justify-between py-2 text-[0.875rem]"><span>{animalOf(b.animalType).emoji} {animalOf(b.animalType).label}</span><span className="font-semibold tabular-nums">{b._count._all} · {kg(b._sum.weightKg)}</span></li>
            ))}
            {!s?.byType.length && <li className="py-6 text-center text-sm text-slate-500">Baara khali hai</li>}
          </ul>
          <p className="mt-3 text-[0.75rem] text-slate-500">Murgi jaise wazan se aaye maal ka hisaab "Aaj ka rate → Din ka hisaab" me hai (zinda maal ka stock).</p>
        </div>
      ) : (
        <ListFrame loading={listQ.isLoading} error={listQ.isError && !listQ.data} onRetry={() => listQ.refetch()}
          empty={!rows.length ? {
            icon: Heart, title: query || type ? 'Is filter me koi janwar nahi' : 'Koi tag wala janwar nahi',
            text: 'Bakra, gaye ya dumba tag ke saath "Mandi se aaya" me likhein. Murgi wazan se aati hai — wo yahan list nahi hoti, stock me jaati hai.',
            actions: canBuy ? <Button onClick={() => setMandi(true)} leftIcon={<Plus className="h-4 w-4" />}>Mandi se aaya</Button> : undefined,
          } : null}>
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
              <span className="text-2xl" aria-hidden>{animalOf(a.animalType).emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-900">{a.tagNumber}</span>
                  <span className="text-[0.8125rem] text-slate-600">{animalOf(a.animalType).label}{a.breed ? ` · ${a.breed}` : ''}</span>
                  {a.isSlaughtered ? <Pill tone="violet">Zibah {dateOnly(a.slaughteredAt)}</Pill> : a.isHealthy ? <Pill tone="emerald">Theek</Pill> : <Pill tone="rose">Bimar</Pill>}
                </div>
                <p className="mt-0.5 text-[0.75rem] text-slate-500">{kg(a.weightKg)} · {a.vendorName ?? 'Supplier nahi'} · {a.sourceName ?? ''} · {dateOnly(a.purchaseDate)}{a.isSlaughtered && a.yieldPct ? ` · yield ${a.yieldPct}%` : ''}</p>
              </div>
              <div className="text-right text-[0.8125rem]">
                <p className="font-semibold tabular-nums">{cost(a.purchasePrice)}</p>
                {a.totalFeedCost > 0 && <p className="text-slate-500">Chara {cost(a.totalFeedCost)} · {a.daysHeld} din</p>}
              </div>
              {!a.isSlaughtered && (
                <div className="flex w-full flex-wrap gap-1.5 sm:w-auto">
                  <Link to={`/meat/slaughter?animal=${a.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><ShieldCheck className="h-3.5 w-3.5" />Zibah</Link>
                  {canExpense && <Button size="sm" variant="secondary" leftIcon={<Wheat className="h-3.5 w-3.5" />} onClick={() => setFeed(a)}>Chara</Button>}
                  {canEdit && <Button size="sm" variant="ghost" leftIcon={<HeartPulse className="h-3.5 w-3.5" />} onClick={() => setHealth(a)}>Sehat</Button>}
                  {canEdit && <Button size="sm" variant="ghost" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={async () => {
                    if (await ask({ title: `${a.tagNumber} list se hatayein?`, text: 'Bik gaya ya mar gaya ho to. Purchase aur hisaab waisa hi rehta hai; stock ke liye Stock adjustment karein.', yes: 'Hatayein', danger: true })) remove.mutate(a);
                  }}>Hatayein</Button>}
                </div>
              )}
            </li>
          ))}
        </ListFrame>
      )}

      {mandi && <MandiModal onClose={() => setMandi(false)} onDone={refresh} />}
      {feed && <FeedModal a={feed} onClose={() => setFeed(null)} onDone={refresh} />}
      {health && <HealthModal a={health} onClose={() => setHealth(null)} onDone={refresh} />}
      {confirmDialog}

      {guide.isOpen && (
        <PageGuide title="Zinda maal aur mandi" onClose={guide.close}
          steps={[
            { icon: Truck, color: '#0891b2', title: 'Mandi se aaya', text: 'Supplier, zinda maal ka item, kitne kg aur rate (murgi), ya har janwar ka tag, wazan aur qeemat. Diya hua paisa galle se, baqi supplier ke khate me.' },
            { icon: ShieldCheck, color: '#16a34a', title: 'Zibah', text: 'Zibah ke page par zinda wazan aur gosht ka wazan likhein — zinda maal stock se nikalta hai aur gosht usi cost par stock me aata hai.' },
            { icon: Wheat, color: '#a16207', title: 'Chara', text: 'Baara me rakhe janwar ka chara "Chara" se likhein — Expense banta hai aur profit me ghatta hai.' },
          ]}
          tips={['Zinda maal ke liye ek kg wala item banayein: "Zinda murgi" ya "Bakra zinda" (cut: Poora, halat: Zinda).', 'Purchase ke liye Purchases ki ijazat chahiye; chare ke liye Expenses ki.']}
          shortcuts={[['N', 'mandi purchase'], ['/', 'dhoondein'], ['1', 'janwar'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
