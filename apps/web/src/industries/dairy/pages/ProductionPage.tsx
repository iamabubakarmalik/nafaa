/**
 * Making dahi, makhan, lassi or khoya from milk, and the day-end count of
 * what spoiled. Production takes the milk out of stock and puts what was
 * made in at the milk's cost (no write-off). Spoiled goods go through the
 * shared stock adjustment as "Kharab", so the profit report shows the loss.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Factory, GraduationCap, Milk, Plus, Trash2, TrendingDown } from 'lucide-react';
import {
  Button, Card, DateRangeMenu, Input, KpiCard, KpiRow, PageHero, PageShell, Select, Skeleton, ViewTabs, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { rangeLabel } from '@core/lib/dateRange';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { stockAdjustmentsApi } from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import { dairyProductsApi, type DairyProduct } from '../api/products.api';
import { dairyProductionApi, type ProductionBatch } from '../api/production.api';
import { Empty, ListCard, ListLoading, Pill, ReasonModal } from '../components/ui';
import { useSaveKey } from '../hooks/usePageKeys';
import { DAIRY_KEYS, dateTime, dayKey, errorText, numIn, qty } from '../lib/meta';
import { isMilkType, typeLabel } from '../lib/productTypes';

type Tab = 'make' | 'waste';
interface Item { id: string; name: string; unit: string; stock: number; price: number; kind: string; featured: boolean }

function useItems() {
  const q = useQuery({ queryKey: [DAIRY_KEYS.profiles], queryFn: () => dairyProductsApi.list({}).catch(() => [] as DairyProduct[]), staleTime: 60_000 });
  return useMemo<Item[]>(() => (q.data ?? []).filter((p) => p.product && p.product.isActive !== false).map((p) => ({
    id: p.productId, name: p.product.name, unit: p.product.unit ?? 'liter', stock: Number(p.product.stock) || 0, price: Number(p.product.price) || 0,
    kind: p.productType, featured: p.isFeatured,
  })), [q.data]);
}

export default function ProductionPage() {
  const guide = usePageGuide();
  const canStock = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const [tab, setTab] = useState<Tab>('make');
  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Dahi, makhan aur din ka bacha" onClose={guide.close}
          steps={[
            { icon: Factory, color: '#7c3aed', title: 'Banaya', text: 'Kitna doodh lagaya aur kitna dahi / makhan bana — doodh stock se nikalta hai, dahi stock me aata hai doodh ki cost par.' },
            { icon: TrendingDown, color: '#0891b2', title: 'Yield', text: 'Har batch ka yield (kitna bana) dikhta hai — kam aaye to doodh ya tareeqa check karein.' },
            { icon: Trash2, color: '#e11d48', title: 'Din ka kharab maal', text: 'Din ke aakhir me jo doodh ya dahi kharab hua likhein — stock se nikalta hai aur profit report me nuqsan dikhta hai.' },
          ]} />
      )}
      <PageHero title="Dahi / makhan aur kharab maal" meta="Doodh se cheezein banana aur din ke aakhir ka hisaab"
        actions={<button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>} />
      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'make', label: 'Banaya', icon: Factory }, { id: 'waste', label: 'Kharab / din ka bacha', icon: Trash2 }]} />
      {!canStock && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Entry ke liye "Stock adjustment" ki permission chahiye — aap sirf dekh sakte hain.</p>}
      {tab === 'make' ? <MakeTab canStock={canStock} /> : <WasteTab canStock={canStock} />}
    </PageShell>
  );
}

function MakeTab({ canStock }: { canStock: boolean }) {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const { cost: money } = useMasked();
  const items = useItems();
  const milk = items.filter((i) => isMilkType(i.kind));
  const made = items.filter((i) => !isMilkType(i.kind));
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'week', custom: { from: '', to: '' } });
  const range = resolveRange(period, startHour);
  const [sourceId, setSourceId] = useState('');
  const [used, setUsed] = useState('');
  const [outs, setOuts] = useState<Array<{ productId: string; quantity: string }>>([{ productId: '', quantity: '' }]);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [cancelling, setCancelling] = useState<ProductionBatch | null>(null);
  const source = milk.find((m) => m.id === sourceId) ?? milk.find((m) => m.featured) ?? milk[0];

  const listQ = useQuery({ queryKey: [DAIRY_KEYS.production, range?.from, range?.to], queryFn: () => dairyProductionApi.list({ from: range?.from, to: range?.to }) });
  const refresh = () => [DAIRY_KEYS.production, DAIRY_KEYS.profiles, 'products', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const save = useMutation({
    mutationFn: () => dairyProductionApi.create({
      sourceProductId: source?.id, sourceQty: numIn(used)!, notes: notes.trim() || undefined,
      outputs: outs.filter((o) => o.productId).map((o) => ({ productId: o.productId, quantity: numIn(o.quantity)! })),
    }),
    onSuccess: (b) => {
      refresh();
      toast.success(`Ban gaya — yield ${b.yieldPct ?? 0}%`, b.warnings[0] ? { description: b.warnings[0] } : undefined);
      setUsed(''); setOuts([{ productId: '', quantity: '' }]); setNotes('');
    },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const cancel = useMutation({
    mutationFn: ({ b, reason }: { b: ProductionBatch; reason: string }) => dairyProductionApi.cancel(b.reference, reason || undefined),
    onSuccess: () => { refresh(); setCancelling(null); toast.success('Batch cancel — doodh wapas stock me'); },
    onError: (e) => toast.error(errorText(e, 'Cancel nahi hua')),
  });
  const submit = () => {
    if (!source) { setErr('Pehle Products me doodh banayein'); return; }
    const u = numIn(used);
    if (!u || u <= 0) { setErr('Kitna doodh laga — liter likhein'); return; }
    const list = outs.filter((o) => o.productId);
    if (!list.length) { setErr('Kya bana — cheez chunein'); return; }
    if (list.some((o) => !((numIn(o.quantity) ?? 0) > 0))) { setErr('Har cheez ki quantity likhein'); return; }
    if (new Set(list.map((o) => o.productId)).size !== list.length) { setErr('Ek cheez do dafa chuni hai'); return; }
    setErr('');
    save.mutate();
  };
  useSaveKey(submit, canStock);
  const t = listQ.data?.totals;

  return (
    <>
      <KpiRow cols={3}>
        {!t ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Factory} color="#7c3aed" label="Batch" value={t.batches} hint={range ? rangeLabel(range.from, range.to) : 'Sab waqt'} />
            <KpiCard icon={Milk} color="#0ea5e9" label="Doodh laga" value={`${qty(t.milkUsed)} L`} hint={money(t.cost)} />
            <KpiCard icon={Plus} color="#16a34a" label="Bana" value={t.made.map((m) => `${qty(m.quantity)} ${m.unit} ${m.name}`).join(' · ') || '—'} />
          </>
        )}
      </KpiRow>

      {canStock && (
        <Card className="rounded-3xl" title="Naya batch" description="Ctrl+S se save">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Select label="Kaunsa doodh" value={source?.id ?? ''} onChange={(e) => setSourceId(e.target.value)}
              options={milk.length ? milk.map((m) => ({ value: m.id, label: `${m.name} — stock ${qty(m.stock)} ${m.unit}` })) : [{ value: '', label: 'Pehle Products me doodh banayein' }]} />
            <Input label={`Kitna laga (${source?.unit ?? 'liter'})`} inputMode="decimal" value={used} onChange={(e) => setUsed(e.target.value)} />
          </div>
          <div className="mt-3 space-y-2">
            {outs.map((o, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-end gap-2">
                <Select label={i === 0 ? 'Kya bana' : undefined} value={o.productId} onChange={(e) => setOuts((x) => x.map((y, j) => (j === i ? { ...y, productId: e.target.value } : y)))}
                  options={[{ value: '', label: made.length ? 'Chunein…' : 'Products me dahi / makhan banayein' }, ...made.map((m) => ({ value: m.id, label: `${m.name} (${typeLabel(m.kind)})` }))]} />
                <Input label={i === 0 ? 'Kitna bana' : undefined} inputMode="decimal" value={o.quantity} onChange={(e) => setOuts((x) => x.map((y, j) => (j === i ? { ...y, quantity: e.target.value } : y)))}
                  hint={o.productId ? made.find((m) => m.id === o.productId)?.unit : undefined} />
                <Button variant="ghost" aria-label="Hatayein" disabled={outs.length === 1} onClick={() => setOuts((x) => x.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {outs.length < 5 && <button type="button" onClick={() => setOuts((x) => [...x, { productId: '', quantity: '' }])} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">+ Aur cheez (jaise makhan ke saath lassi)</button>}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Input label="Note (marzi)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Button loading={save.isPending} onClick={submit}>Save</Button>
          </div>
          {err && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{err}</p>}
        </Card>
      )}

      <div className="flex justify-end"><DateRangeMenu value={period} onChange={setPeriod} startHour={startHour} label="Date" /></div>
      <ListCard>
        {listQ.isLoading ? <ListLoading rows={4} /> : !listQ.data?.items.length ? <Empty icon={Factory} title="Is muddat me koi batch nahi" text="Doodh se dahi ya makhan banaya ho to upar likhein." /> : (
          <ul className="divide-y divide-slate-100">
            {listQ.data.items.map((b) => (
              <li key={b.reference} className={cn('grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1.4fr)_8rem_auto] lg:items-center', b.cancelled && 'opacity-60')}>
                <p className="text-[0.8125rem] text-slate-700">{dateTime(b.date)}<span className="block font-mono text-[0.6875rem] text-slate-400">{b.reference}</span></p>
                <p className="text-[0.8125rem] text-slate-700">{b.source ? `${qty(b.source.quantity)} ${b.source.unit} ${b.source.name}` : '—'}</p>
                <p className="text-[0.8125rem] font-medium text-slate-900">{b.outputs.map((o) => `${qty(o.quantity)} ${o.unit} ${o.name}`).join(' + ')}{b.note ? <span className="block text-[0.75rem] font-normal text-slate-500">{b.note}</span> : null}</p>
                <p className="text-[0.8125rem] tabular-nums text-slate-600">Yield {b.yieldPct ?? '—'}%<span className="block">{money(b.cost)}</span></p>
                <div className="flex justify-end">{b.cancelled ? <Pill tone="bg-slate-100 text-slate-600 ring-slate-200">Cancel</Pill>
                  : canStock && <Button size="xs" variant="ghost" aria-label="Cancel" onClick={() => setCancelling(b)}><Ban className="h-3.5 w-3.5" /></Button>}</div>
              </li>
            ))}
          </ul>
        )}
      </ListCard>
      {cancelling && <ReasonModal title="Batch cancel" danger cta="Cancel karein" busy={cancel.isPending}
        description="Bani hui cheez stock se nikal kar doodh wapas stock me aayega" presets={['Ghalat quantity', 'Do dafa likha']}
        onSubmit={(v) => cancel.mutate({ b: cancelling, reason: v.reason })} onClose={() => setCancelling(null)} />}
    </>
  );
}

const REASONS = ['Doodh phat gaya', 'Dahi khatta ho gaya', 'Din ka bacha', 'Bijli band — garam ho gaya', 'Gir gaya'];

function WasteTab({ canStock }: { canStock: boolean }) {
  const qc = useQueryClient();
  const { cost: money } = useMasked();
  const items = useItems();
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [reason, setReason] = useState(REASONS[2]);
  const today = dayKey();
  const listQ = useQuery({ queryKey: ['stock-adjustments', 'dairy-waste', today], queryFn: () => stockAdjustmentsApi.list({ from: today, to: today, type: 'DAMAGE', limit: 100 }) });
  const lines = Object.entries(qtys).map(([productId, v]) => ({ productId, quantity: numIn(v) ?? 0 })).filter((l) => l.quantity > 0);
  const save = useMutation({
    mutationFn: () => stockAdjustmentsApi.batch({ reason, items: lines.map((l) => ({ ...l, type: 'DAMAGE' as const, reason })) }),
    onSuccess: (r) => {
      ['stock-adjustments', DAIRY_KEYS.profiles, 'products', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`${r.count} cheezein kharab likhi — ${money(r.value)} ka nuqsan`); setQtys({});
    },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => {
    if (!lines.length) { toast.error('Kam se kam ek cheez ki quantity likhein'); return; }
    const over = lines.find((l) => l.quantity > (items.find((i) => i.id === l.productId)?.stock ?? 0));
    if (over) { toast.error(`${items.find((i) => i.id === over.productId)?.name} ka stock itna nahi`); return; }
    save.mutate();
  };
  useSaveKey(submit, canStock);
  const done = listQ.data;

  return (
    <>
      {canStock && (
        <Card className="rounded-3xl" title="Din ke aakhir ka kharab maal" description="Jitna kharab hua ya phenkna pada woh likhein — stock se nikalta hai aur Profit report me 'Kharab' me aata hai">
          <div className="mb-3 flex flex-wrap gap-1.5">{REASONS.map((r) => <button key={r} type="button" onClick={() => setReason(r)} className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1', reason === r ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-200 hover:bg-slate-50')}>{r}</button>)}</div>
          {items.length === 0 ? <p className="text-[0.875rem] text-slate-500">Products me doodh, dahi waghera banayein.</p> : (
            <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {items.map((i) => (
                <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_8rem_9rem] items-center gap-3 px-4 py-2">
                  <span className="min-w-0 truncate text-[0.875rem] font-medium text-slate-900">{i.name}</span>
                  <span className="text-[0.8125rem] tabular-nums text-slate-500">Stock {qty(i.stock)} {i.unit}</span>
                  <Input aria-label={`${i.name} kharab`} inputMode="decimal" placeholder="0" value={qtys[i.id] ?? ''} onChange={(e) => setQtys((x) => ({ ...x, [i.id]: e.target.value }))} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex justify-end"><Button variant="danger" loading={save.isPending} disabled={!lines.length} onClick={submit}>Kharab likhein ({lines.length})</Button></div>
        </Card>
      )}
      <ListCard>
        {listQ.isLoading ? <ListLoading rows={3} /> : !done?.items.length ? <Empty icon={Trash2} title="Aaj kuch kharab nahi likha" /> : (
          <>
            <p className="border-b border-slate-100 px-5 py-3 text-[0.8125rem] text-slate-600">Aaj ka nuqsan: <span className="font-semibold text-rose-700">{money(done.totals.damageValue)}</span></p>
            <ul className="divide-y divide-slate-100">
              {done.items.map((a) => (
                <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_8rem_8rem] items-center gap-3 px-5 py-2.5 text-[0.875rem]">
                  <span className="min-w-0 truncate"><span className="font-medium text-slate-900">{a.product.name}</span><span className="block text-[0.75rem] text-slate-500">{a.reason} · {dateTime(a.createdAt)}</span></span>
                  <span className="tabular-nums text-slate-700">{qty(Math.abs(a.quantity))} {a.product.unit}</span>
                  <span className="text-right font-semibold tabular-nums text-rose-700">{money(Math.abs(a.value))}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </ListCard>
    </>
  );
}
