/**
 * Milk bought from gawalas, morning and evening. The entry form stays open
 * for the next gawala (Enter saves). Each slip puts the litres into the
 * milk stock at the price paid (fat bonus included) and adds the amount to
 * the gawala's account; a wrong slip is cancelled, never deleted.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Beaker, ChevronLeft, ChevronRight, Download, Droplets, GraduationCap, Milk, Plus, Sunrise, Sunset, Wallet, Warehouse } from 'lucide-react';
import {
  Button, Card, FilterBar, FilterChip, Input, KpiCard, KpiRow, PageHero, PageShell, SearchField, Segmented, Select, Skeleton,
  heroButton, heroIconButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { farmersApi } from '../api/farmers.api';
import { farmerSuppliesApi, isCancelledSupply, type FarmerSupply } from '../api/farmer-supplies.api';
import { Empty, ListCard, ListLoading, Pill, ReasonModal } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { DAIRY_KEYS, MONEY_KEYS, QUALITY, dayKey, errorText, liters, numIn, qty, shiftDay, slotLabel, slotNow, type Slot } from '../lib/meta';

/** Fat % the base rate is for (same as the server). */
const BASE_FAT = 6;
const longDate = (key: string) => new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00`));

export default function FarmerSuppliesPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { cost: money } = useMasked();
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const canPay = usePermission(PERMISSIONS.SUPPLIERS_EDIT);
  const [params] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(dayKey());
  const [slot, setSlot] = useState<Slot>(slotNow());
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [cancelling, setCancelling] = useState<FarmerSupply | null>(null);
  const today = dayKey();

  const farmersQ = useQuery({ queryKey: [DAIRY_KEYS.farmers, 'active'], queryFn: () => farmersApi.all({ active: true }), staleTime: 60_000 });
  const listQ = useQuery({ queryKey: [DAIRY_KEYS.supplies, date, slot, q], queryFn: () => farmerSuppliesApi.entries({ from: date, to: date, slot, search: q || undefined }) });
  const sumQ = useQuery({ queryKey: [DAIRY_KEYS.supplies, 'summary', date], queryFn: () => farmerSuppliesApi.summary(date) });
  const rows = listQ.data ?? [];
  const s = sumQ.data;
  const refresh = () => MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  /* ── entry form ── */
  const [farmerId, setFarmerId] = useState(params.get('farmer') ?? '');
  const [form, setForm] = useState({ quantity: '', fat: '', snf: '', rate: '', adjust: '', quality: '', notes: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const farmer = farmersQ.data?.find((f) => f.id === farmerId);
  useEffect(() => { if (farmer) setForm((x) => ({ ...x, rate: String(farmer.ratePerLiter || '') })); }, [farmer]);
  const n = numIn(form.quantity) ?? 0;
  const rate = numIn(form.rate) ?? 0;
  const fat = numIn(form.fat);
  const bonus = fat && fat > BASE_FAT && farmer ? Math.round((fat - BASE_FAT) * farmer.fatBonusRate * n * 100) / 100 : 0;
  const total = form.quality === 'REJECTED' ? 0 : Math.round((rate * n + bonus + (numIn(form.adjust) ?? 0)) * 100) / 100;

  const add = useMutation({
    mutationFn: () => farmerSuppliesApi.add({
      farmerId, supplyDate: date, slot, quantity: n, ratePerLiter: rate || undefined, fatContent: fat ?? undefined, snfContent: numIn(form.snf) ?? undefined,
      otherAdjustment: numIn(form.adjust) ?? undefined, quality: form.quality || undefined, notes: form.notes.trim() || undefined,
    }),
    onSuccess: (r) => {
      refresh();
      toast.success(`${farmer?.name ?? 'Gawala'} — ${liters(r.quantity)} likha${r.stockProduct ? `, ${r.stockProduct.name} stock me` : ''}`,
        r.stockProduct || form.quality === 'REJECTED' ? undefined : { description: 'Doodh ka product nahi mila — stock nahi barha. Products me doodh par "Asal doodh" lagayein.' });
      setForm((x) => ({ ...x, quantity: '', fat: '', snf: '', adjust: '', quality: '', notes: '' }));
      setFarmerId('');
    },
    onError: (e) => toast.error(errorText(e, 'Entry save nahi hui')),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!farmerId) e.farmer = 'Gawala chunein';
    if (!(n > 0) || n > 20000) e.quantity = 'Liter likhein';
    if (!(rate > 0) && form.quality !== 'REJECTED') e.rate = 'Rate likhein';
    if (fat != null && (fat < 0 || fat > 15)) e.fat = 'Fat 0 se 15';
    if (total < 0) e.adjust = 'Katauti amount se zyada hai';
    setErr(e);
    if (Object.keys(e).length) return;
    add.mutate();
  };

  const pay = useMutation({ mutationFn: (x: FarmerSupply) => farmerSuppliesApi.pay(x.id, 'CASH'), onSuccess: () => { refresh(); toast.success('Parchi ada — cash drawer se'); }, onError: (e) => toast.error(errorText(e, 'Nahi hua')) });
  const cancel = useMutation({
    mutationFn: ({ x, reason }: { x: FarmerSupply; reason: string }) => farmerSuppliesApi.cancel(x.id, reason || undefined),
    onSuccess: () => { refresh(); setCancelling(null); toast.success('Entry cancel'); },
    onError: (e) => toast.error(errorText(e, 'Cancel nahi hui')),
  });
  usePageKeys(searchRef, { n: () => qtyRef.current?.focus(), arrowleft: () => setDate((d) => shiftDay(d, -1)), arrowright: () => setDate((d) => (d < today ? shiftDay(d, 1) : d)) });

  const live = useMemo(() => rows.filter((r) => !isCancelledSupply(r)), [rows]);
  const exportCsv = () => {
    if (!rows.length) { toast.error('Is din koi entry nahi'); return; }
    downloadCsv(`doodh-aaya-${date}-${slot.toLowerCase()}.csv`, [
      ['Gawala', 'Number', 'Waqt', 'Liter', 'Fat', 'SNF', 'Rate', 'Bonus', 'Katauti/izafa', 'Amount', 'Quality', 'Ada'],
      ...rows.map((r) => [r.farmer?.name, r.farmer?.farmerNumber, slotLabel(r.slot), r.quantity, r.fatContent, r.snfContent, r.ratePerLiter, r.fatBonus, r.otherAdjustment, r.totalAmount, r.quality ? QUALITY[r.quality]?.label : '', isCancelledSupply(r) ? 'Cancel' : r.isPaid ? 'Haan' : 'Nahi']),
    ]);
  };
  const printDoc = (): PrintDoc => ({
    title: `Doodh aaya — ${slotLabel(slot)}`, subtitle: longDate(date),
    meta: [['Liter', qty(live.reduce((t, r) => t + r.quantity, 0))], ['Amount', money(live.reduce((t, r) => t + r.totalAmount, 0))]],
    sections: [{
      kind: 'table', title: 'Parchiyan',
      columns: [{ label: 'Gawala' }, { label: 'Liter' }, { label: 'Fat', wideOnly: true }, { label: 'Rate', wideOnly: true }, { label: 'Amount', align: 'right' }],
      rows: live.map((r) => [r.farmer?.name ?? '', qty(r.quantity), r.fatContent ? `${r.fatContent}%` : '', String(r.ratePerLiter), money(r.totalAmount)]),
    }],
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Doodh ki entry — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Milk, color: '#0ea5e9', title: 'Har gawala', text: 'Gawala chunein, liter aur fat likhein, Enter dabayein. Rate gawale ka khud lagta hai; aaj alag ho to badal dein.' },
            { icon: Warehouse, color: '#16a34a', title: 'Stock aur cost', text: 'Doodh "asal doodh" ke stock me jata hai aur us ki cost ausat ho kar profit report me sahi aati hai.' },
            { icon: Ban, color: '#e11d48', title: 'Wapas kiya', text: 'Doodh kharab tha to Quality "Wapas kiya" chunein — na paisa banta hai na stock.' },
            { icon: Wallet, color: '#d97706', title: 'Payment', text: 'Hafte ya mahine ki payment Gawale page se — ek parchi abhi ada karni ho to "Cash ada".' },
          ]}
          shortcuts={[['N', 'nayi entry'], ['/', 'search'], ['←/→', 'pichla / agla din'], ['G', 'guide']]} />
      )}

      <PageHero title="Doodh ki entry" chip={<>{date === today ? 'Aaj' : longDate(date)}</>} busy={listQ.isFetching && !listQ.isLoading} loading={!s}
        meta="Gawalon se aya doodh — subah aur shaam"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/dairy/quality-tests" className={heroButton}><Beaker className="h-4 w-4" />Quality</Link>
          <Link to="/dairy/farmers" className={heroButton}><Wallet className="h-4 w-4" />Gawale</Link>
        </>}
        stats={[
          { label: 'Aaj doodh aaya', value: liters(s?.totalLiters ?? 0) },
          { label: 'Amount', value: money(s?.totalAmount ?? 0) },
          { label: 'Ausat rate', value: s?.averageRate ? `${money(s.averageRate)}/L` : '—' },
        ]} />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Sunrise} color="#d97706" label="Subah" value={liters(s.morningLiters)} onClick={() => setSlot('MORNING')} active={slot === 'MORNING'} />
            <KpiCard icon={Sunset} color="#ea580c" label="Shaam" value={liters(s.eveningLiters)} onClick={() => setSlot('EVENING')} active={slot === 'EVENING'} />
            <KpiCard icon={Droplets} color="#7c3aed" label="Ausat fat" value={s.averageFat ? `${s.averageFat}%` : '—'} />
            <KpiCard icon={Milk} color="#0ea5e9" label="Gawale" value={s.farmersCount} hint={`${s.totalSupplies} parchi`} />
          </>
        )}
      </KpiRow>

      {canBuy && date <= today && (
        <Card className="rounded-3xl" title={<span className="inline-flex items-center gap-2"><Plus className="h-4 w-4 text-brand-600" />Nayi entry — {slotLabel(slot)}</span>} description={total ? `Amount: ${money(total)}${bonus ? ` (fat bonus ${money(bonus)})` : ''}` : 'Enter se save — form agle gawale ke liye khula rehta hai'}>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_auto] lg:items-start" onSubmit={(e) => { e.preventDefault(); submit(); }}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
            <Select label="Gawala" value={farmerId} onChange={(e) => { setFarmerId(e.target.value); setTimeout(() => qtyRef.current?.focus(), 0); }} error={err.farmer}
              options={[{ value: '', label: farmersQ.data?.length ? 'Chunein…' : 'Pehle Gawale me jorein' }, ...(farmersQ.data ?? []).map((f) => ({ value: f.id, label: `${f.name}${f.village ? ` — ${f.village}` : ''}` }))]} />
            <Input ref={qtyRef} label="Liter" inputMode="decimal" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} error={err.quantity} />
            <Input label="Fat %" inputMode="decimal" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} error={err.fat} hint={farmer?.fatBonusRate ? `${BASE_FAT}% se upar bonus` : undefined} />
            <Input label="Rate" inputMode="decimal" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} error={err.rate} />
            <Select label="Quality" value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })}
              options={[{ value: '', label: 'Theek' }, ...Object.entries(QUALITY).map(([value, x]) => ({ value, label: x.label }))]} />
            <Button type="submit" className="lg:mt-6" loading={add.isPending}>Save</Button>
            <details className="sm:col-span-2 lg:col-span-6">
              <summary className="cursor-pointer text-[0.8125rem] font-medium text-slate-600">SNF, katauti ya note</summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <Input label="SNF %" inputMode="decimal" value={form.snf} onChange={(e) => setForm({ ...form, snf: e.target.value })} />
                <Input label="Katauti (-) ya izafa (+)" inputMode="decimal" value={form.adjust} onChange={(e) => setForm({ ...form, adjust: e.target.value })} error={err.adjust} hint="Jaise -50 paani ki wajah se" />
                <Input label="Note" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </details>
          </form>
        </Card>
      )}

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Gawale ka naam, number ya gaon…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')}>
        <div className="flex items-center gap-1 rounded-xl ring-1 ring-slate-200">
          <button type="button" onClick={() => setDate((d) => shiftDay(d, -1))} aria-label="Pichla din" className="flex h-10 w-9 items-center justify-center text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-10 bg-transparent text-[0.8125rem] font-semibold text-slate-800 outline-none" />
          <button type="button" onClick={() => setDate((d) => shiftDay(d, 1))} disabled={date >= today} aria-label="Agla din" className="flex h-10 w-9 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <Segmented value={slot} onChange={(v) => setSlot(v as Slot)} items={[{ value: 'MORNING', label: 'Subah' }, { value: 'EVENING', label: 'Shaam' }]} />
      </FilterBar>

      <ListCard>
        {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
          <Empty icon={Milk} title={`${slotLabel(slot)} ki koi entry nahi`} text="Upar wale form se har gawale ka doodh likhein." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const off = isCancelledSupply(r);
              return (
                <li key={r.id} className={cn('grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_8rem_auto] lg:items-center', off && 'opacity-60')}>
                  <Link to={r.farmer ? `/dairy/farmers/${r.farmer.id}` : '/dairy/farmers'} className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 hover:underline">{r.farmer?.name ?? 'Gawala'} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{r.farmer?.farmerNumber}</span></p>
                    <p className="truncate text-[0.75rem] text-slate-500">{r.farmer?.village ?? '—'}</p>
                  </Link>
                  <p className="text-[0.8125rem] text-slate-700">{off ? <span className="line-through">{r.notes?.replace('CANCELLED:', '').trim()}</span>
                    : <>{liters(r.quantity)} @ {money(r.ratePerLiter)}{r.fatContent ? ` · fat ${r.fatContent}%` : ''}{r.fatBonus ? ` · bonus ${money(r.fatBonus)}` : ''}{r.otherAdjustment ? ` · ${money(r.otherAdjustment)}` : ''}</>}</p>
                  <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{off ? 'Cancel' : money(r.totalAmount)}</p>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {r.quality && <Pill tone={QUALITY[r.quality]?.tone ?? ''}>{QUALITY[r.quality]?.label}</Pill>}
                    {!off && (r.isPaid ? <Pill tone="bg-success-50 text-success-700 ring-success-200">Ada</Pill> : r.totalAmount > 0 && (
                      <>
                        {canPay && <Button size="xs" variant="secondary" loading={pay.isPending && pay.variables?.id === r.id} onClick={() => pay.mutate(r)}>Cash ada</Button>}
                        {canBuy && <Button size="xs" variant="ghost" aria-label="Cancel" onClick={() => setCancelling(r)}><Ban className="h-3.5 w-3.5" /></Button>}
                      </>
                    ))}
                    {!off && r.quality === 'REJECTED' && canBuy && <Button size="xs" variant="ghost" aria-label="Cancel" onClick={() => setCancelling(r)}><Ban className="h-3.5 w-3.5" /></Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ListCard>

      {cancelling && <ReasonModal title="Entry cancel" danger cta="Cancel karein" busy={cancel.isPending}
        description={`${cancelling.farmer?.name ?? ''} — ${liters(cancelling.quantity)}, ${money(cancelling.totalAmount)}. Doodh stock se nikal jayega.`}
        presets={['Ghalat quantity', 'Ghalat gawala', 'Do dafa likha']} onSubmit={(v) => cancel.mutate({ x: cancelling, reason: v.reason })} onClose={() => setCancelling(null)} />}
    </PageShell>
  );
}
