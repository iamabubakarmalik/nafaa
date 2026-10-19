/**
 * Instalment plans (qist): a garment kept aside and paid off over weeks or
 * months. The record by view (running, overdue, due this week, done…) with
 * search; each plan shows its instalments; money taken fills them in order
 * and the last payment makes the bill (the piece leaves stock then).
 *
 * Keys: N new plan · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, ChevronDown, CreditCard, Filter, GraduationCap, ListChecks, Plus, Receipt, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker, TakePaymentModal } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { layawayApi, type LayawayPlan, type LayawayView } from '../api/layaway.api';
import { EmptyList, LoadFailed, Pager } from '../components/charts';
import { CancelModal, CustomerField, Pill, emptyCustomer, type CustomerValue } from '../components/fields';
import { LAYAWAY_KEY, MONEY_KEYS, TONE, apiError, daysFrom, dayOnly, opt, r2, whenText } from '../components/meta';
import { useGarmentsCan } from '../components/permissions';
import { ProductPick, type PickedProduct } from '../components/ProductPick';

const VIEWS: Array<{ id: LayawayView; label: string; icon: typeof CreditCard }> = [
  { id: 'active', label: 'Chal rahe', icon: ListChecks },
  { id: 'overdue', label: 'Qist late', icon: AlertTriangle },
  { id: 'week', label: 'Is hafte qist', icon: CalendarClock },
  { id: 'completed', label: 'Poore', icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancel', icon: Ban },
  { id: 'all', label: 'Sab', icon: CreditCard },
];
const STATUS: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: 'Chal raha', tone: TONE.blue }, COMPLETED: { label: 'Poora — bill bana', tone: TONE.green },
  CANCELLED: { label: 'Cancel', tone: TONE.rose }, DEFAULTED: { label: 'Chhor diya', tone: TONE.rose }, REFUNDED: { label: 'Paisa wapas', tone: TONE.slate },
};
const FREQ: Record<string, string> = { WEEKLY: 'Har hafte', BIWEEKLY: 'Har 2 hafte', MONTHLY: 'Har mahine' };
const viewLabel = (v: LayawayView) => VIEWS.find((x) => x.id === v)?.label ?? v;

export default function LayawayPage() {
  const qc = useQueryClient();
  const { manage } = useGarmentsCan();
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<LayawayView>('active');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [payOn, setPayOn] = useState<LayawayPlan | null>(null);
  const [cancelOn, setCancelOn] = useState<LayawayPlan | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, query]);
  const q = { view, page, limit: 30, search: query || undefined };
  const listQ = useQuery({ queryKey: [LAYAWAY_KEY, 'page', q], queryFn: () => layawayApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000 });
  const refresh = () => [LAYAWAY_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const pay = useMutation({
    mutationFn: ({ p, amount, method }: { p: LayawayPlan; amount: number; method: PaymentMethod }) => layawayApi.pay(p.id, { amount, paymentMethod: method }),
    onSuccess: (p) => {
      toast.success(p.status === 'COMPLETED' ? `${p.planNumber} poora — bill ${p.bill?.saleNumber ?? 'ban gaya'}, piece de dein` : `${p.planNumber}: qist darj — baqi ${formatPKR(p.remainingAmount)}`);
      setPayOn(null); refresh();
    },
    onError: (e) => toast.error(apiError(e, 'Qist darj nahi hui')),
  });
  const complete = useMutation({
    mutationFn: (p: LayawayPlan) => layawayApi.complete(p.id),
    onSuccess: (p) => { toast.success(`${p.planNumber}: bill ${p.bill?.saleNumber ?? ''} ban gaya`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Bill nahi bana')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && manage) { e.preventDefault(); setAdding(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [manage]);

  const data = listQ.data;
  const rows = data?.items ?? [];
  const counts = data?.counts;
  return (
    <PageShell>
      <PageHero title="Qist plan" chip={<><CreditCard /> Layaway</>} meta="Kapra rakhein, qiston me paisa lein, poora hone par dein"
        busy={listQ.isFetching && !listQ.isLoading} loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {manage && <button type="button" onClick={() => setAdding(true)} title="Naya plan (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya plan</button>}
        </>}
        stats={[
          { label: 'Chal rahe plan', value: counts?.active ?? '—' },
          { label: 'Lena baqi', value: data ? sales(data.totals.remaining) : '—' },
          { label: 'Mil chuka', value: data ? sales(data.totals.paid) : '—' },
        ]}
      />
      <KpiRow cols={4}>
        {!counts ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ListChecks} color="#2563eb" label="Chal rahe" value={counts.active} hint={data ? sales(data.totals.value) : undefined} onClick={() => setView('active')} active={view === 'active'} />
          <KpiCard icon={AlertTriangle} color={counts.overdue ? '#e11d48' : '#64748b'} label="Qist late" value={counts.overdue} hint={counts.overdue ? 'Phone karein' : 'Sab waqt par'} onClick={() => setView('overdue')} active={view === 'overdue'} />
          <KpiCard icon={CalendarClock} color="#d97706" label="Is hafte qist" value={counts.week} hint="Yaad dilayein" onClick={() => setView('week')} active={view === 'week'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Poore" value={counts.completed} hint="Bill ban chuka" onClick={() => setView('completed')} active={view === 'completed'} />
        </>}
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer, phone, plan #…" />}
        chips={query ? <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip> : undefined} onClear={() => setSearch('')}>
        <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView} width="w-64"
          options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts ? String(counts[v.id]) : undefined }))} />
      </FilterBar>
      <ViewTabs value={view} onChange={setView} hint={<>{manage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search</>}
        tabs={VIEWS.slice(0, 4).map((v) => ({ id: v.id, label: v.label, icon: v.icon, count: counts?.[v.id] ?? null }))} />

      {listQ.isLoading ? <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        : listQ.isError && !data ? <LoadFailed what="Plan" retry={() => listQ.refetch()} />
          : !rows.length ? (
            <EmptyList icon={CreditCard} title={query ? 'Kuch nahi mila' : 'Koi plan nahi'} text="Shadi ka jora ya mehnga suit — customer kuch paisa ab de, baqi qiston me. Aakhri qist par bill banta hai aur piece diya jata hai.">
              {manage && <Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>Naya plan</Button>}
            </EmptyList>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              {rows.map((p) => {
                const st = STATUS[p.status] ?? STATUS.ACTIVE;
                const late = p.status === 'ACTIVE' && (daysFrom(p.nextDueDate) ?? 0) < 0;
                const pct = p.totalAmount ? Math.min(100, Math.round((p.paidAmount / p.totalAmount) * 100)) : 0;
                const open = openId === p.id;
                return (
                  <li key={p.id}>
                    <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
                      <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', late ? 'bg-rose-50 text-rose-600' : p.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400')}><CreditCard className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-semibold text-slate-900">{p.customerName || 'Customer'}</span>
                          <Pill tone={st.tone}>{st.label}</Pill>
                          <span className="font-mono text-[0.6875rem] text-slate-400">{p.planNumber}</span>
                        </div>
                        <p className="truncate text-[0.8125rem] text-slate-600">{p.productName ?? p.notes ?? 'Kapra'} · {p.installmentCount} qist, {FREQ[p.frequency] ?? p.frequency}</p>
                        <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-success-500" style={{ width: `${pct}%` }} /></div>
                        {p.status === 'ACTIVE' && p.nextDueDate && <p className={cn('mt-1 text-[0.75rem]', late ? 'font-semibold text-rose-700' : 'text-slate-500')}>Agli qist {whenText(p.nextDueDate)} · {dayOnly(p.nextDueDate)}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold tabular-nums">{formatPKR(p.totalAmount)}</p>
                        <p className="text-[0.6875rem] text-slate-500">{p.status === 'ACTIVE' ? `${formatPKR(p.remainingAmount)} baqi` : `${formatPKR(p.paidAmount)} mila`}</p>
                      </div>
                      <button type="button" onClick={() => setOpenId(open ? null : p.id)} aria-label="Qisten" aria-expanded={open} className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100"><ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} /></button>
                    </div>
                    {manage && p.status === 'ACTIVE' && (
                      <div className="flex flex-wrap gap-1.5 px-3 pb-3 sm:px-4 sm:pl-[4.25rem]">
                        {p.remainingAmount > 0.01
                          ? <Button size="sm" variant="primary" onClick={() => setPayOn(p)} leftIcon={<Wallet className="h-4 w-4" />}>Qist lein</Button>
                          : <Button size="sm" variant="success" loading={complete.isPending} onClick={() => complete.mutate(p)} leftIcon={<Receipt className="h-4 w-4" />}>Bill banayein</Button>}
                        <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => setCancelOn(p)} leftIcon={<Ban className="h-4 w-4" />}>Cancel</Button>
                      </div>
                    )}
                    {open && (
                      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:pl-[4.25rem]">
                        <ol className="grid gap-1.5 sm:grid-cols-2">
                          {p.depositAmount > 0 && <li className="flex justify-between rounded-lg bg-white px-3 py-1.5 text-[0.8125rem] ring-1 ring-slate-200"><span>Deposit</span><span className="font-semibold text-success-700">{formatPKR(p.depositAmount)}</span></li>}
                          {p.installments.map((i) => (
                            <li key={i.id} className="flex justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-[0.8125rem] ring-1 ring-slate-200">
                              <span>Qist {i.installmentNo} · {dayOnly(i.dueDate)}</span>
                              <span className={cn('font-semibold tabular-nums', i.status === 'PAID' ? 'text-success-700' : i.status === 'PARTIALLY_PAID' ? 'text-amber-700' : 'text-slate-700')}>
                                {i.status === 'PAID' ? `${formatPKR(i.amount)} ✓` : i.status === 'PARTIALLY_PAID' ? `${formatPKR(i.paidAmount)} / ${formatPKR(i.amount)}` : formatPKR(i.amount)}
                              </span>
                            </li>
                          ))}
                        </ol>
                        {p.bill && <Link to={`/sales/${p.bill.id}/receipt`} className="mt-2 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Bill {p.bill.saleNumber} →</Link>}
                        {p.cancellationReason && <p className="mt-2 text-[0.8125rem] text-rose-700">Cancel: {p.cancellationReason}</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}

      {adding && <PlanForm onClose={() => setAdding(false)} onDone={refresh} />}
      {payOn && (
        <TakePaymentModal title="Qist lein" description={`${payOn.customerName ?? ''} · ${payOn.planNumber} · ${formatPKR(payOn.remainingAmount)} baqi`}
          amount={Math.min(payOn.installmentAmount, payOn.remainingAmount)} max={payOn.remainingAmount} loading={pay.isPending}
          hint="Khate me jama hota hai. Poora hone par bill khud banega aur piece stock se niklega."
          onConfirm={(amount, method) => pay.mutate({ p: payOn, amount, method })} onClose={() => setPayOn(null)} />
      )}
      {cancelOn && <CancelModal title={`${cancelOn.customerName ?? ''} · ${cancelOn.planNumber}`} paid={cancelOn.paidAmount} onConfirm={(reason) => layawayApi.cancel(cancelOn.id, reason || undefined).then(refresh)} onClose={() => setCancelOn(null)} />}

      {guide.isOpen && (
        <PageGuide title="Qist plan — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Plan banayein', text: 'Customer, kaunsa kapra, kul amount, deposit aur kitni qisten. Qisten khud barabar bant jati hain.' },
            { icon: Wallet, color: '#16a34a', title: 'Qist lein', text: 'Jo paisa aaye "Qist lein" se likhein — pehli baqi qist me lagta hai. Har rupaya customer ke khate me jama hota hai.' },
            { icon: Receipt, color: '#7c3aed', title: 'Aakhri qist', text: 'Paisa poora hote hi bill banta hai, kapra stock se nikalta hai aur customer ko de dein.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Late', text: '"Qist late" wale customers ko phone karein. Cancel se mila paisa khate me jama rehta hai.' },
          ]}
          shortcuts={[['N', 'naya plan'], ['/', 'dhoondein'], ['G', 'guide']]} />
      )}
    </PageShell>
  );
}

function PlanForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [label, setLabel] = useState('');
  const [total, setTotal] = useState('');
  const [deposit, setDeposit] = useState('');
  const [count, setCount] = useState(3);
  const [freq, setFreq] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('MONTHLY');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const amount = r2(total === '' ? product?.price ?? 0 : Number(total) || 0);
  const dep = r2(Number(deposit) || 0);
  const each = count ? Math.floor((amount - dep) / count) : 0;
  const problem = !customer.customerId && !customer.name.trim() ? 'Customer ka naam likhein'
    : !product && !label.trim() ? 'Product chunein ya kapre ka naam likhein'
      : amount < 1 ? 'Kul amount likhein' : dep >= amount ? 'Deposit kul se kam ho — poora paisa ho to seedha POS se bechein' : null;
  const save = useMutation({
    mutationFn: () => layawayApi.create({
      customerId: customer.customerId || undefined, customerName: opt(customer.name), customerPhone: opt(customer.phone),
      productId: product?.productId, variantId: product?.variantId, totalAmount: amount, depositAmount: dep || undefined,
      installmentCount: count, frequency: freq, notes: opt(label), paymentMethod: dep > 0 ? method : undefined,
    }),
    onSuccess: (p) => { toast.success(`Plan ${p.planNumber} ban gaya — agli qist ${dayOnly(p.nextDueDate)}`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Plan nahi bana')),
  });
  return (
    <Modal open onClose={onClose} size="lg" title="Naya qist plan" description="Kapra customer ke liye rakha jayega; aakhri qist par bill banega"
      footer={<>
        {problem ? <p className="mr-auto text-[0.8125rem] text-amber-800">{problem}</p> : <p className="mr-auto text-[0.8125rem] text-slate-500">{count} qist × ~{formatPKR(each)}</p>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={!!problem} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<CreditCard className="h-4 w-4" />}>Plan banayein</Button>
      </>}>
      <div className="space-y-4">
        <CustomerField value={customer} onChange={setCustomer} />
        <ProductPick value={product} onChange={(p) => { setProduct(p); setTotal(''); }} label="Kaunsa kapra (stock se)" hint="Aakhri qist par yeh piece stock se niklega" />
        {!product && <Input label="Ya kapre ka naam" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} placeholder="Shadi ka lehnga (order par)" hint="Stock ka piece na ho to" />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Kul amount (Rs)" inputMode="decimal" value={total === '' && product ? String(product.price) : total} onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ''))} className="text-right tabular-nums" />
          <Input label="Deposit abhi (Rs)" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value.replace(/[^\d.]/g, ''))} className="text-right tabular-nums" hint="Khate me jama hota hai" />
        </div>
        {dep > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kitni qisten</span>
            <div className="grid grid-cols-6 gap-1">{[2, 3, 4, 6, 9, 12].map((c) => <button key={c} type="button" onClick={() => setCount(c)} className={cn('h-10 rounded-lg text-[0.8125rem] font-semibold ring-1', count === c ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{c}</button>)}</div>
          </div>
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kab kab</span>
            <div className="grid grid-cols-3 gap-1">{(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const).map((f) => <button key={f} type="button" onClick={() => setFreq(f)} className={cn('h-10 rounded-lg text-[0.75rem] font-semibold ring-1', freq === f ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{FREQ[f]}</button>)}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
