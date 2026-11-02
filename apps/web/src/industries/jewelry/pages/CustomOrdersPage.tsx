/**
 * Made-to-order jewelry: what is due today, late, with the karigar, ready,
 * and money still to come; the orders by view with search, karigar, date
 * and sort; and each order's steps from the row — next step, advance (cash
 * or old gold), gold to the karigar and the piece back, delivery (the bill),
 * cancel, and the customer and karigar slips.
 *
 * Keys: N new order · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, ArrowRight, CheckCircle2, Clock, Coins, Filter, GraduationCap, Hammer, ListChecks, Palette, Pencil, Plus,
  Receipt, Repeat, Scale, UserRound, Wallet, XCircle,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select,
  Skeleton, Textarea, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { UploadDropzone } from '@core/components/uploads';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { withManagerPin } from '@core/security/ManagerPin';
import { PaymentMethodPicker, TakePaymentModal } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { customOrdersApi, type CustomOrderQuery, type CustomOrderRow, type OrderView } from '../api/custom-orders.api';
import { karigarsApi } from '../api/karigars.api';
import type { Purity } from '../api/metal-rates.api';
import type { JewelryCategory } from '../api/products.api';
import { ChipPicker, EmptyList, KaratPill, LoadFailed, Pager, StatusPill } from '../components/ui';
import { useMetalRates } from '../hooks/useJewelryFacts';
import {
  CATEGORY_LABEL, COMMON_PURITIES, KEYS, MAIN_CATEGORIES, NEXT_STATUS, apiError, categoryLabel, day, grams, metalOf, oldGoldValue, orderStatus,
  purityLabel, r2, rateFor,
} from '../lib/meta';
import { t as tr } from '@core/i18n';

type Sort = NonNullable<CustomOrderQuery['sort']>;
const VIEWS: Array<{ id: OrderView; label: string; icon: typeof Palette }> = [
  { id: 'active', label: tr('Chal rahe'), icon: ListChecks },
  { id: 'today', label: tr('Aaj dena hai'), icon: Clock },
  { id: 'late', label: tr('Late'), icon: AlertTriangle },
  { id: 'work', label: tr('Karigar ke paas'), icon: Hammer },
  { id: 'ready', label: tr('Tayyar'), icon: CheckCircle2 },
  { id: 'unpaid', label: tr('Paisa baqi'), icon: Wallet },
  { id: 'done', label: tr('De diye / cancel'), icon: Receipt },
  { id: 'all', label: tr('Sab'), icon: Palette },
];
const viewLabel = (v: OrderView) => VIEWS.find((x) => x.id === v)?.label ?? v;
const isOpen = (o: CustomOrderRow) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED';
const isLate = (o: CustomOrderRow) => isOpen(o) && !!o.promisedDate && new Date(o.promisedDate) < new Date(new Date().toDateString());
const priceOf = (o: CustomOrderRow) => o.finalPrice ?? o.estimatedPrice;

function customerSlip(o: CustomOrderRow): PrintDoc {
  return {
    title: 'Zewar order — customer parchi', // i18n-ignore
    subtitle: `${o.orderNumber} · ${day(o.orderDate)}`,
    meta: [['Customer', o.customerName], ['Phone', o.customerPhone], ['Dena', day(o.promisedDate)]], // i18n-ignore
    sections: [{
      kind: 'rows',
      rows: [
        { label: 'Zewar', value: `${categoryLabel(o.category)} · ${purityLabel(o.purity)}` }, // i18n-ignore
        { label: 'Andaza wazan', value: grams(o.expectedGrossWeight) }, // i18n-ignore
        { label: 'Design', value: o.designDescription }, // i18n-ignore
        ...(o.engravingText ? [{ label: 'Naam / likhai', value: o.engravingText }] : []), // i18n-ignore
        { label: 'Qeemat', value: formatPKR(priceOf(o)), strong: true }, // i18n-ignore
        { label: 'Advance', value: formatPKR(o.paidAmount) }, // i18n-ignore
        ...(o.goldAdvance.grams ? [{ label: `Customer ka sona ${grams(o.goldAdvance.grams)}`, value: formatPKR(o.goldAdvance.value) }] : []), // i18n-ignore
        { label: 'Baqi', value: formatPKR(o.due), strong: true }, // i18n-ignore
      ],
    }],
    footer: 'Sone ka rate badalne par qeemat badal sakti hai. Parchi ke saath zewar milega.', // i18n-ignore
  };
}

function karigarSlip(o: CustomOrderRow): PrintDoc {
  return {
    title: 'Karigar parchi', // i18n-ignore
    subtitle: `${o.orderNumber} · dena ${day(o.promisedDate)}`, // i18n-ignore
    meta: [['Karigar', o.assignedKarigarName ?? '—']], // i18n-ignore
    sections: [{
      kind: 'rows',
      rows: [
        { label: 'Zewar', value: `${categoryLabel(o.category)} · ${purityLabel(o.purity)}` }, // i18n-ignore
        { label: 'Wazan', value: grams(o.expectedGrossWeight) }, // i18n-ignore
        { label: 'Sona diya', value: grams(o.metalIssuedGrams ?? 0) }, // i18n-ignore
        { label: 'Design', value: o.designDescription }, // i18n-ignore
        ...(o.engravingText ? [{ label: 'Likhai', value: o.engravingText }] : []), // i18n-ignore
      ],
    }],
  };
}

export default function CustomOrdersPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const canManage = usePermission(PERMISSIONS.POS_USE);
  const canMetal = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<OrderView>('active');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [karigarId, setKarigarId] = useState('');
  const [sort, setSort] = useState<Sort>('due');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<CustomOrderRow | 'new' | null>(null);
  const [act, setAct] = useState<{ o: CustomOrderRow; kind: 'pay' | 'gold' | 'issue' | 'receive' | 'deliver' | 'cancel' } | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, range, karigarId, sort, query]);

  const period = resolveRange(range, startHour);
  const q: CustomOrderQuery = { view, page, limit: 30, sort, search: query || undefined, karigarId: karigarId || undefined, ...(period ?? {}) };
  const listQ = useQuery({ queryKey: [KEYS.orders, 'page', q], queryFn: () => customOrdersApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000 });
  const sumQ = useQuery({ queryKey: [KEYS.orders, 'summary'], queryFn: customOrdersApi.summary, refetchInterval: 60_000 });
  const karigarsQ = useQuery({ queryKey: [KEYS.karigars, 'list', { isActive: 'true' }], queryFn: () => karigarsApi.list({ isActive: 'true' }), staleTime: 60_000 });
  const karigars = karigarsQ.data ?? [];
  const data = listQ.data;
  const sum = sumQ.data;
  const filtered = !!karigarId || !!query || range.preset !== 'all';
  const clear = () => { setKarigarId(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const refresh = () => [KEYS.orders, KEYS.karigars, KEYS.metal, KEYS.exchanges, 'jewelry-dashboard', 'sales-history', 'customers-for-pos'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const step = useMutation({
    mutationFn: ({ o, status, reason, pin }: { o: CustomOrderRow; status: string; reason?: string; pin?: string }) => customOrdersApi.updateStatus(o.id, status, reason, pin),
    onSuccess: (_r, v) => { toast.success(v.status === 'DELIVERED' ? tr('Order de diya — bill ban gaya') : tr('Order: {{label}}', { label: orderStatus(v.status).label })); setAct(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Order update nahi hua'))),
  });
  const pay = useMutation({
    mutationFn: ({ o, amount, method }: { o: CustomOrderRow; amount: number; method: string }) => customOrdersApi.addPayment(o.id, amount, method),
    onSuccess: () => { toast.success(tr('Advance jama — customer ke khate me')); setAct(null); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Payment nahi hui'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setForm('new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await customOrdersApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: tr('Zewar orders — {{view}}', { view: viewLabel(view) }),
      subtitle: period ? rangeLabel(period.from, period.to) : tr('Sab tareekhen'),
      meta: [[tr('Orders'), String(all.total)], [tr('Kul'), formatPKR(all.totals.value)], [tr('Advance'), formatPKR(all.totals.paid)]],
      sections: [{
        kind: 'table',
        columns: [{ label: tr('Dena') }, { label: tr('Order'), wideOnly: true }, { label: tr('Customer') }, { label: tr('Zewar'), wideOnly: true }, { label: tr('Karigar'), wideOnly: true }, { label: tr('Halat'), wideOnly: true }, { label: tr('Kul'), align: 'right' }, { label: tr('Baqi'), align: 'right' }],
        rows: all.items.map((o) => [day(o.promisedDate), o.orderNumber, `${o.customerName} ${o.customerPhone}`, `${categoryLabel(o.category)} ${purityLabel(o.purity)} ${grams(o.expectedGrossWeight)}`,
          o.assignedKarigarName ?? '—', orderStatus(o.status).label, formatPKR(priceOf(o)), formatPKR(o.due)]),
      }],
    };
  };

  const deliver = (o: CustomOrderRow) => withManagerPin(tr('Udhaar ke liye malik ka PIN'), (pin) => step.mutateAsync({ o, status: 'DELIVERED', pin }), 'credit').catch(() => undefined);

  return (
    <PageShell>
      <PageHero
        title={tr('Custom orders')}
        chip={<><Palette /> {' '}{tr('Order par zewar')}</>}
        meta={tr('Design, advance, karigar, tayyari aur delivery — sab ek jagah')}
        busy={(listQ.isFetching && !listQ.isLoading) || sumQ.isFetching}
        loading={sumQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setForm('new')} title={tr('Naya order (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya order')}</button>}
        </>}
        stats={sum ? [
          { label: tr('Chal rahe orders'), value: sum.active, hint: formatPKR(sum.value) },
          { label: tr('Andaza sona'), value: grams(sum.grams) },
          { label: tr('Advance jama'), value: formatPKR(sum.advance) },
        ] : [{ label: tr('Chal rahe orders'), value: '—' }]}
      />

      <KpiRow cols={5}>
        {!sum ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color="#d97706" label={tr('Aaj dena hai')} value={sum.today} onClick={() => setView('today')} active={view === 'today'} />
          <KpiCard icon={AlertTriangle} color={sum.late ? '#e11d48' : '#64748b'} label={tr('Late')} value={sum.late} hint={sum.late ? tr('Customer ko batayein') : tr('Koi late nahi')} onClick={() => setView('late')} active={view === 'late'} />
          <KpiCard icon={Hammer} color="#7c3aed" label={tr('Karigar ke paas')} value={sum.work} onClick={() => setView('work')} active={view === 'work'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Tayyar')} value={sum.ready} hint={tr('Customer ko bulayein')} onClick={() => setView('ready')} active={view === 'ready'} />
          <KpiCard icon={Wallet} color="#0891b2" label={tr('Paisa baqi')} value={data?.counts.unpaid ?? '—'} hint={tr('Orders')} onClick={() => setView('unpaid')} active={view === 'unpaid'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Customer, phone, order #, design…')} label={tr('Search')} />}
        chips={filtered ? <>
          {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{tr('Order: {{from}}', { from: rangeLabel(period.from, period.to) })}</FilterChip>}
          {karigarId && <FilterChip onRemove={() => setKarigarId('')}>{tr('Karigar: {{value}}', { value: karigars.find((k) => k.id === karigarId)?.fullName ?? '—' })}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView} width="w-72"
          options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: data ? tr('{{value}} orders', { value: data.counts[v.id] }) : undefined }))} />
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={tr('Order ki date')} />
        {karigars.length > 0 && (
          <FilterMenu icon={UserRound} label={tr('Karigar')} value={karigarId} active={!!karigarId} onChange={setKarigarId}
            options={[{ value: '', label: tr('Sab karigar') }, ...karigars.map((k) => ({ value: k.id, label: k.fullName }))]} />
        )}
        <FilterMenu icon={ArrowDownWideNarrow} label={sort === 'amount' ? tr('Bari amount pehle') : sort === 'recent' ? tr('Naye pehle') : tr('Jo pehle dena')} value={sort} onChange={setSort} align="right"
          options={[{ value: 'due', label: tr('Jo pehle dena hai') }, { value: 'recent', label: tr('Naye order pehle') }, { value: 'amount', label: tr('Bari amount pehle') }]} />
      </FilterBar>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {data && data.total > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{tr('{{total}} orders · {{formatPKR}}', { total: data.total, formatPKR: formatPKR(data.totals.value) })}</span>
            <span className="text-emerald-700">{tr('Advance {{paid}}', { paid: formatPKR(data.totals.paid) })}</span>
          </div>
        ) : <span />}
        <p className="hidden text-[0.75rem] text-slate-500 sm:block">{canManage && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>G</Kbd> {' '}{tr('guide')}</p>
      </div>

      {listQ.isLoading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : listQ.isError && !data ? <LoadFailed what={tr('Orders')} retry={() => listQ.refetch()} />
        : !data?.items.length ? (
          <EmptyList icon={Palette} title={filtered ? tr('Is filter me koi order nahi') : view === 'late' ? tr('Koi order late nahi — shabash') : tr('Koi order nahi')}
            text={tr('Customer ka design, karat aur andaza wazan likhein, advance (cash ya purana sona) lein aur parchi dein.')}>
            {canManage && <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya order')}</Button>}
            {filtered && <Button variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>}
          </EmptyList>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {data.items.map((o) => {
              const next = NEXT_STATUS[o.status];
              return (
                <li key={o.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.9375rem] font-bold text-slate-900">{o.customerName}</span>
                      <span className="text-[0.75rem] text-slate-500">{o.customerPhone} · {o.orderNumber}</span>
                      <StatusPill status={o.status} />
                      {isLate(o) && <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[0.6875rem] font-bold text-white">{tr('Late')}</span>}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-slate-600">
                      <KaratPill purity={o.purity} />{categoryLabel(o.category)} · {grams(o.expectedGrossWeight)} · {o.designDescription.slice(0, 80)}
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-slate-500">
                      {tr('Dena {{promisedDate}}{{value}}{{value2}}{{value3}}', { promisedDate: day(o.promisedDate), value: o.assignedKarigarName ? tr(' · karigar {{assignedKarigarName}}', { assignedKarigarName: o.assignedKarigarName }) : '', value2: o.metalIssuedGrams ? tr(' · sona diya {{metalIssuedGrams}}', { metalIssuedGrams: grams(o.metalIssuedGrams) }) : '', value3: o.metalReceivedGrams ? tr(' · bana {{metalReceivedGrams}}', { metalReceivedGrams: grams(o.metalReceivedGrams) }) : '' })}
                    </p>
                  </div>
                  <div className="text-end text-[0.8125rem] tabular-nums lg:w-48">
                    <span className="block font-bold text-slate-900">{formatPKR(priceOf(o))}</span>
                    <span className="block text-emerald-700">{tr('Advance {{paidAmount}}{{value}}', { paidAmount: formatPKR(o.paidAmount), value: o.goldAdvance.grams ? tr(' + sona {{grams}}', { grams: grams(o.goldAdvance.grams) }) : '' })}</span>
                    {isOpen(o) && <span className={cn('block font-semibold', o.due > 0 ? 'text-amber-700' : 'text-emerald-700')}>{o.due > 0 ? tr('Baqi {{due}}', { due: formatPKR(o.due) }) : tr('Poora mila')}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 lg:w-[22rem] lg:justify-end">
                    {isOpen(o) && canManage && o.status === 'READY' && <Button size="sm" onClick={() => setAct({ o, kind: 'deliver' })} leftIcon={<Receipt className="h-4 w-4" />}>{tr('De dein')}</Button>}
                    {isOpen(o) && canManage && next && <Button size="sm" variant="secondary" loading={step.isPending && step.variables?.o.id === o.id} onClick={() => step.mutate({ o, status: next })} rightIcon={<ArrowRight className="h-4 w-4 rtl-flip" />}>{orderStatus(next).label}</Button>}
                    {isOpen(o) && canManage && <Button size="sm" variant="ghost" onClick={() => setAct({ o, kind: 'pay' })} leftIcon={<Wallet className="h-4 w-4" />}>{tr('Advance')}</Button>}
                    {isOpen(o) && canManage && <Button size="sm" variant="ghost" onClick={() => setAct({ o, kind: 'gold' })} leftIcon={<Repeat className="h-4 w-4" />}>{tr('Sona')}</Button>}
                    {isOpen(o) && canMetal && <Button size="sm" variant="ghost" onClick={() => setAct({ o, kind: 'issue' })} leftIcon={<Hammer className="h-4 w-4" />}>{tr('Karigar')}</Button>}
                    {isOpen(o) && canMetal && (o.metalIssuedGrams ?? 0) > 0 && <Button size="sm" variant="ghost" onClick={() => setAct({ o, kind: 'receive' })} leftIcon={<Scale className="h-4 w-4" />}>{tr('Zewar aaya')}</Button>}
                    <PrintButton doc={() => customerSlip(o)} size="sm" label={tr('Parchi')} />
                    {o.assignedKarigarName && <PrintButton doc={() => karigarSlip(o)} size="sm" label={tr('Karigar parchi')} />}
                    {isOpen(o) && canManage && <Button size="sm" variant="ghost" onClick={() => setForm(o)} aria-label={tr('Badlein')}><Pencil className="h-4 w-4" /></Button>}
                    {isOpen(o) && canManage && <Button size="sm" variant="ghost" onClick={() => setAct({ o, kind: 'cancel' })} aria-label={tr('Cancel')}><XCircle className="h-4 w-4 text-rose-600" /></Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}

      {form && <OrderForm order={form === 'new' ? null : form} karigars={karigars} onClose={() => setForm(null)} onSaved={() => { setForm(null); refresh(); }} />}
      {act?.kind === 'pay' && (
        <TakePaymentModal title={tr('{{customerName}} se advance', { customerName: act.o.customerName })} description={tr('{{orderNumber}} · baqi {{due}}', { orderNumber: act.o.orderNumber, due: formatPKR(act.o.due) })} amount={act.o.due} max={act.o.due || undefined}
          confirmLabel={tr('Advance jama karein')} loading={pay.isPending} onConfirm={(amount, method) => pay.mutate({ o: act.o, amount, method })} onClose={() => setAct(null)} />
      )}
      {act?.kind === 'gold' && <GoldAdvanceModal o={act.o} onClose={() => setAct(null)} onSaved={() => { setAct(null); refresh(); }} />}
      {(act?.kind === 'issue' || act?.kind === 'receive') && <KarigarMetalModal o={act.o} mode={act.kind} karigars={karigars} onClose={() => setAct(null)} onSaved={() => { setAct(null); refresh(); }} />}
      {act?.kind === 'deliver' && <DeliverModal o={act.o} loading={step.isPending} onClose={() => setAct(null)}
        onConfirm={async (finalPrice) => {
          if (Math.abs(finalPrice - priceOf(act.o)) >= 0.01) await customOrdersApi.update(act.o.id, { finalPrice }).catch((e) => { toast.error(apiError(e, tr('Qeemat save nahi hui'))); throw e; });
          await deliver({ ...act.o, finalPrice });
        }} />}
      {act?.kind === 'cancel' && <CancelModal o={act.o} loading={step.isPending} onClose={() => setAct(null)} onConfirm={(reason) => step.mutate({ o: act.o, status: 'CANCELLED', reason })} />}

      {guide.isOpen && (
        <PageGuide title={tr('Custom orders — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#db2777', title: tr('Order likhein'), text: tr('Customer, zewar ki type, karat, andaza wazan, design aur dene ki date. Advance lein — khate me jama hota hai.') },
            { icon: Repeat, color: '#a16207', title: tr('Purana sona advance'), text: tr('"Sona" se customer ka sona tol kar karat aur kaat likhein — qeemat baqi se kat jati hai, sona metal stock me.') },
            { icon: Hammer, color: '#7c3aed', title: tr('Karigar'), text: tr('"Karigar" se sona dein (tijori se nikalta hai). Zewar aaye to "Zewar aaya" — wazan, wastage aur bacha sona.') },
            { icon: Receipt, color: '#16a34a', title: tr('De dein = bill'), text: tr('Tayyar hone par "De dein": final qeemat likhein. Bill banta hai, advance aur purana sona katta hai, baqi udhaar khate me.') },
          ]}
          tips={[tr('Late card roz subah dekhein.'), tr('Cancel karne se advance khud wapas nahi hota — customer ke khate me jama rehta hai.')]}
          shortcuts={[['N', tr('naya order')], ['/', tr('dhoondein')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

function OrderForm({ order, karigars, onClose, onSaved }: { order: CustomOrderRow | null; karigars: Array<{ id: string; fullName: string }>; onClose: () => void; onSaved: () => void }) {
  const { rates } = useMetalRates();
  const [f, setF] = useState({
    customerName: order?.customerName ?? '', customerPhone: order?.customerPhone ?? '', category: (order?.category ?? 'RING') as JewelryCategory,
    purity: (order?.purity ?? 'KARAT_22') as Purity, expectedGrossWeight: order?.expectedGrossWeight ? String(order.expectedGrossWeight) : '',
    expectedMakingCharges: order?.expectedMakingCharges ? String(order.expectedMakingCharges) : '', estimatedPrice: order?.estimatedPrice ? String(order.estimatedPrice) : '',
    promisedDate: order?.promisedDate ? order.promisedDate.slice(0, 10) : '', assignedKarigarId: order?.assignedKarigarId ?? '',
    designDescription: order?.designDescription ?? '', engravingText: order?.engravingText ?? '', referenceImageUrls: order?.referenceImageUrls ?? [],
    advancePayment: '', paymentMethod: 'CASH' as PaymentMethod, internalNotes: order?.internalNotes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const rate = rateFor(rates, metalOf(f.purity), f.purity)?.ratePerGram ?? 0;
  const estimate = r2((Number(f.expectedGrossWeight) || 0) * rate + (Number(f.expectedMakingCharges) || 0));
  const save = useMutation({
    mutationFn: () => {
      const body = {
        customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), category: f.category, purity: f.purity, metalType: metalOf(f.purity),
        expectedGrossWeight: Number(f.expectedGrossWeight) || 0, expectedMakingCharges: f.expectedMakingCharges ? Number(f.expectedMakingCharges) : undefined,
        estimatedPrice: Number(f.estimatedPrice) || 0, promisedDate: f.promisedDate || undefined, assignedKarigarId: f.assignedKarigarId || null,
        designDescription: f.designDescription.trim(), engravingText: f.engravingText.trim() || undefined, hasEngraving: !!f.engravingText.trim(),
        referenceImageUrls: f.referenceImageUrls, internalNotes: f.internalNotes.trim() || undefined,
      };
      return order ? customOrdersApi.update(order.id, body)
        : customOrdersApi.create({ ...body, advancePayment: Number(f.advancePayment) || 0, paymentMethod: f.paymentMethod });
    },
    onSuccess: () => { toast.success(order ? tr('Order update ho gaya') : tr('Order ban gaya — parchi print karein')); onSaved(); },
    onError: (e) => setErrors({ form: apiError(e, tr('Order save nahi hua')) }),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.customerName.trim()) e.customerName = tr('Customer ka naam likhein');
    if (!/^[\d+\-\s]{7,20}$/.test(f.customerPhone.trim())) e.customerPhone = tr('Sahi phone number likhein');
    if (!f.designDescription.trim()) e.designDescription = tr('Design ki details likhein');
    if (!(Number(f.estimatedPrice) > 0)) e.estimatedPrice = tr('Andaza qeemat likhein');
    if (Number(f.advancePayment) > Number(f.estimatedPrice)) e.advancePayment = tr('Advance qeemat se zyada hai');
    setErrors(e);
    if (!Object.keys(e).length) save.mutate();
  };
  return (
    <Modal open onClose={onClose} size="xl" title={order ? tr('{{orderNumber}} — badlein', { orderNumber: order.orderNumber }) : tr('Naya zewar order')}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={submit} loading={save.isPending}>{tr('Save karein')}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Customer')} required autoFocus value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} error={errors.customerName} maxLength={80} />
          <Input label={tr('Phone')} required inputMode="tel" value={f.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} error={errors.customerPhone} placeholder={tr('03xx xxxxxxx')} hint={tr('Tayyar hone par isi par batayein')} />
          <Input label={tr('Dene ki date')} type="date" value={f.promisedDate} onChange={(e) => set({ promisedDate: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={tr('Zewar')} value={f.category} onChange={(e) => set({ category: e.target.value as JewelryCategory })} options={MAIN_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
          <ChipPicker label={tr('Karat')} value={f.purity} onChange={(p) => set({ purity: p })} options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Andaza wazan (g)')} inputMode="decimal" value={f.expectedGrossWeight} onChange={(e) => set({ expectedGrossWeight: e.target.value.replace(/[^\d.]/g, '') })} />
          <Input label={tr('Banwai (Rs)')} inputMode="decimal" value={f.expectedMakingCharges} onChange={(e) => set({ expectedMakingCharges: e.target.value.replace(/[^\d.]/g, '') })} />
          <Input label={tr('Andaza qeemat (Rs)')} required inputMode="decimal" value={f.estimatedPrice} onChange={(e) => set({ estimatedPrice: e.target.value.replace(/[^\d.]/g, '') })} error={errors.estimatedPrice}
            hint={estimate > 0 ? <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => set({ estimatedPrice: String(Math.round(estimate)) })}>{tr('Aaj ke rate se {{estimate}} lagayein', { estimate: formatPKR(estimate) })}</button> : tr('Wazan × rate + banwai')} />
        </div>
        <Textarea label={tr('Design')} required rows={3} value={f.designDescription} onChange={(e) => set({ designDescription: e.target.value })} error={errors.designDescription}
          placeholder={tr('Kaisa chahiye — nag, naqsh, size, pehle wale jaisa…')} maxLength={1000} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Naam / likhai (engraving)')} value={f.engravingText} onChange={(e) => set({ engravingText: e.target.value })} maxLength={60} />
          <Select label={tr('Karigar')} value={f.assignedKarigarId} onChange={(e) => set({ assignedKarigarId: e.target.value })}
            options={[{ value: '', label: tr('— Abhi nahi —') }, ...karigars.map((k) => ({ value: k.id, label: k.fullName }))]} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Design ki tasveer')}</span>
          {f.referenceImageUrls.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {f.referenceImageUrls.map((u) => (
                <span key={u} className="relative">
                  <img src={u} alt={tr('Design')} className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" />
                  <button type="button" aria-label={tr('Tasveer hatayein')} onClick={() => set({ referenceImageUrls: f.referenceImageUrls.filter((x) => x !== u) })}
                    className="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[0.75rem] text-white">×</button>
                </span>
              ))}
            </div>
          )}
          <UploadDropzone maxFiles={5} hint={tr('Customer ki di hui tasveer ya design')} onUploaded={(records) => {
            const list = (Array.isArray(records) ? records : [records]) as Array<{ url?: string } | string>;
            const urls = list.map((r) => (typeof r === 'string' ? r : r.url)).filter((u): u is string => !!u);
            set({ referenceImageUrls: [...f.referenceImageUrls, ...urls].slice(0, 10) });
          }} />
        </div>
        {!order && (
          <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[12rem_1fr]">
            <Input label={tr('Cash advance (Rs)')} inputMode="decimal" value={f.advancePayment} onChange={(e) => set({ advancePayment: e.target.value.replace(/[^\d.]/g, '') })} error={errors.advancePayment} hint={tr('Purana sona baad me \'Sona\' se')} />
            {Number(f.advancePayment) > 0 && <PaymentMethodPicker value={f.paymentMethod} onChange={(m) => set({ paymentMethod: m })} label={tr('Advance kaise mila')} />}
          </div>
        )}
        <Textarea label={tr('Andar ka note')} rows={2} value={f.internalNotes} onChange={(e) => set({ internalNotes: e.target.value })} maxLength={500} />
        {errors.form && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{errors.form}</p>}
        <p className="text-[0.75rem] text-slate-500">{tr('Save:')}{' '} <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd></p>
      </form>
    </Modal>
  );
}

function GoldAdvanceModal({ o, onClose, onSaved }: { o: CustomOrderRow; onClose: () => void; onSaved: () => void }) {
  const { rates } = useMetalRates();
  const [purity, setPurity] = useState<Purity>(o.purity as Purity);
  const [g, setG] = useState('');
  const [kaat, setKaat] = useState('0');
  const [own, setOwn] = useState('');
  const [error, setError] = useState('');
  const calc = oldGoldValue(Number(g) || 0, purity, rates, Number(kaat) || 0);
  const value = own ? Number(own) : calc.value;
  const save = useMutation({
    mutationFn: () => customOrdersApi.goldAdvance(o.id, { grams: Number(g), purity, deductionPct: Number(kaat) || 0, ...(own && { value: Number(own) }) }),
    onSuccess: () => { toast.success(tr('Customer ka sona jama — metal stock me gaya')); onSaved(); },
    onError: (e) => setError(apiError(e, tr('Save nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} title={tr('{{customerName}} ka purana sona', { customerName: o.customerName })} description={tr('{{orderNumber}} ke advance me', { orderNumber: o.orderNumber })}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} onClick={() => {
        if (!(Number(g) > 0)) return setError(tr('Wazan likhein'));
        if (!(value > 0)) return setError(tr('Qeemat likhein — is karat ka rate set nahi'));
        setError(''); save.mutate();
      }}>{tr('Jama karein · {{formatPKR}}', { formatPKR: formatPKR(value) })}</Button></>}>
      <div className="space-y-3">
        <ChipPicker label={tr('Karat (test ke baad)')} value={purity} onChange={setPurity} options={COMMON_PURITIES.map((p) => ({ value: p, label: purityLabel(p) }))} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Wazan (g)')} autoFocus inputMode="decimal" value={g} onChange={(e) => setG(e.target.value.replace(/[^\d.]/g, ''))} />
          <Input label={tr('Kaat %')} inputMode="decimal" value={kaat} onChange={(e) => setKaat(e.target.value.replace(/[^\d.]/g, ''))} />
          <Input label={tr('Qeemat (Rs)')} inputMode="decimal" value={own || (calc.value ? String(calc.value) : '')} onChange={(e) => setOwn(e.target.value.replace(/[^\d.]/g, ''))} />
        </div>
        <p className="text-[0.75rem] text-slate-500">{tr('{{value}}. Deliver par bill me trade-in ban kar katega.', { value: calc.perGram ? tr('Khareed rate {{perGram}}/g · poora {{full}}', { perGram: formatPKR(calc.perGram), full: formatPKR(calc.full) }) : tr('Is karat ka rate set nahi — qeemat khud likhein') })}</p>
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{error}</p>}
      </div>
    </Modal>
  );
}

function KarigarMetalModal({ o, mode, karigars, onClose, onSaved }: {
  o: CustomOrderRow; mode: 'issue' | 'receive'; karigars: Array<{ id: string; fullName: string }>; onClose: () => void; onSaved: () => void;
}) {
  const issue = mode === 'issue';
  const [karigarId, setKarigarId] = useState(o.assignedKarigarId ?? '');
  const [g, setG] = useState({ grams: issue ? String(o.expectedGrossWeight || '') : '', piece: '', wastage: '', back: '' });
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () => issue
      ? customOrdersApi.issueMetal(o.id, { grams: Number(g.grams), karigarId: karigarId || undefined })
      : customOrdersApi.receiveMetal(o.id, { receivedGrams: Number(g.piece), wastageGrams: Number(g.wastage) || 0, returnedGrams: Number(g.back) || 0 }),
    onSuccess: () => { toast.success(issue ? tr('Karigar ko sona diya') : tr('Zewar wapas aa gaya')); onSaved(); },
    onError: (e) => setError(apiError(e, tr('Save nahi hua'))),
  });
  const submit = () => {
    if (issue && !karigarId) return setError(tr('Karigar chunein'));
    if (issue && !(Number(g.grams) > 0)) return setError(tr('Grams likhein'));
    if (!issue && !(Number(g.piece) > 0)) return setError(tr('Bane zewar ka wazan likhein'));
    setError(''); save.mutate();
  };
  return (
    <Modal open onClose={onClose} title={issue ? tr('Karigar ko sona dein') : tr('Karigar se zewar aaya')} description={tr('{{orderNumber}} · {{purity}} · andaza {{expectedGrossWeight}}', { orderNumber: o.orderNumber, purity: purityLabel(o.purity), expectedGrossWeight: grams(o.expectedGrossWeight) })}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={submit} loading={save.isPending}>{issue ? tr('Sona dein') : tr('Save karein')}</Button></>}>
      <div className="space-y-3">
        {issue ? (<>
          <Select label={tr('Karigar')} value={karigarId} onChange={(e) => setKarigarId(e.target.value)} options={[{ value: '', label: tr('Chunein…') }, ...karigars.map((k) => ({ value: k.id, label: k.fullName }))]} />
          <Input label={tr('{{purity}} sona (g)', { purity: purityLabel(o.purity) })} autoFocus inputMode="decimal" value={g.grams} onChange={(e) => setG({ ...g, grams: e.target.value.replace(/[^\d.]/g, '') })} hint={tr('Tijori (metal stock) se nikalega')} />
        </>) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label={tr('Bana zewar (g)')} autoFocus inputMode="decimal" value={g.piece} onChange={(e) => setG({ ...g, piece: e.target.value.replace(/[^\d.]/g, '') })} hint={tr('Diya tha {{grams}}', { grams: grams(o.metalIssuedGrams ?? 0) })} />
            <Input label={tr('Wastage (g)')} inputMode="decimal" value={g.wastage} onChange={(e) => setG({ ...g, wastage: e.target.value.replace(/[^\d.]/g, '') })} />
            <Input label={tr('Bacha sona (g)')} inputMode="decimal" value={g.back} onChange={(e) => setG({ ...g, back: e.target.value.replace(/[^\d.]/g, '') })} hint={tr('Tijori me wapas')} />
          </div>
        )}
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] font-medium text-rose-700">{error}</p>}
      </div>
    </Modal>
  );
}

function DeliverModal({ o, loading, onConfirm, onClose }: { o: CustomOrderRow; loading: boolean; onConfirm: (finalPrice: number) => Promise<void>; onClose: () => void }) {
  const [price, setPrice] = useState(String(Math.round(priceOf(o))));
  const p = Number(price) || 0;
  const due = r2(Math.max(p - o.paidAmount - o.goldAdvance.value, 0));
  return (
    <Modal open onClose={onClose} title={tr('{{customerName}} ko order dein', { customerName: o.customerName })} description={`${o.orderNumber} · ${categoryLabel(o.category)} ${purityLabel(o.purity)}${o.metalReceivedGrams ? ` · ${grams(o.metalReceivedGrams)}` : ''}`}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={loading} disabled={!(p > 0)} onClick={() => onConfirm(p).catch(() => undefined)} leftIcon={<Receipt className="h-4 w-4" />}>{tr('De dein aur bill banayein')}</Button></>}>
      <div className="space-y-3">
        <Input label={tr('Final qeemat (Rs)')} autoFocus inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} hint={tr('Asal wazan aur aaj ke rate ke hisaab se')} />
        <dl className="space-y-1 rounded-2xl bg-slate-50 p-3 text-[0.875rem] ring-1 ring-slate-200">
          <div className="flex justify-between"><dt className="text-slate-500">{tr('Cash advance (khate me)')}</dt><dd className="tabular-nums">{formatPKR(o.paidAmount)}</dd></div>
          {o.goldAdvance.value > 0 && <div className="flex justify-between"><dt className="text-slate-500">{tr('Customer ka sona {{grams}}', { grams: grams(o.goldAdvance.grams) })}</dt><dd className="tabular-nums">{formatPKR(o.goldAdvance.value)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold"><dt>{tr('Baqi')}</dt><dd className="tabular-nums">{formatPKR(due)}</dd></div>
        </dl>
        <p className="flex items-start gap-1.5 text-[0.75rem] text-slate-500"><Coins className="mt-0.5 h-3.5 w-3.5 shrink-0" />{tr('Baqi customer ke khate me udhaar ban jata hai — Khata se wasool karein. Bill Sales history me milega.')}</p>
      </div>
    </Modal>
  );
}

function CancelModal({ o, loading, onConfirm, onClose }: { o: CustomOrderRow; loading: boolean; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open onClose={onClose} title={tr('{{orderNumber}} cancel karein?', { orderNumber: o.orderNumber })} description={tr('Advance khud wapas nahi hota — customer ke khate me jama rehta hai')}
      footer={<><Button variant="ghost" onClick={onClose}>{tr('Rehne dein')}</Button><Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>{tr('Cancel karein')}</Button></>}>
      <Textarea label={tr('Wajah')} required autoFocus rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={tr('Customer ne mana kar diya, design badla…')} />
    </Modal>
  );
}
