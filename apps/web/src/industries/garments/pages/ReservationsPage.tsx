/**
 * Holds: a piece kept aside for a customer for a few days, usually with a
 * deposit. The record by view (active, ending today, expired, sold…) with
 * search; a new hold checks the branch has the piece free; "Bech dein"
 * makes the bill with the deposit counted, and expired holds can be given
 * more days or cancelled (the deposit stays on the customer's khata).
 *
 * Keys: N new hold · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Bookmark, CalendarPlus, CheckCircle2, Clock, Filter, GraduationCap, Hourglass, ListChecks, Plus, Receipt, ShoppingBag, Wallet } from 'lucide-react';
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
import { reservationsApi, type Reservation, type ReservationView } from '../api/reservations.api';
import { EmptyList, LoadFailed, Pager } from '../components/charts';
import { CancelModal, CustomerField, Pill, emptyCustomer, type CustomerValue } from '../components/fields';
import { HOLD_KEY, MONEY_KEYS, TONE, apiError, dayOnly, opt, r2, whenText } from '../components/meta';
import { useGarmentsCan } from '../components/permissions';
import { ProductPick, type PickedProduct } from '../components/ProductPick';

const VIEWS: Array<{ id: ReservationView; label: string; icon: typeof Bookmark }> = [
  { id: 'active', label: 'Hold par', icon: ListChecks },
  { id: 'today', label: 'Aaj khatam', icon: Clock },
  { id: 'expired', label: 'Waqt guzar gaya', icon: Hourglass },
  { id: 'sold', label: 'Bik gaye', icon: Receipt },
  { id: 'cancelled', label: 'Cancel', icon: Ban },
  { id: 'all', label: 'Sab', icon: Bookmark },
];
const STATUS: Record<Reservation['status'], { label: string; tone: string }> = {
  ACTIVE: { label: 'Hold par', tone: TONE.blue }, CONVERTED_TO_SALE: { label: 'Bik gaya', tone: TONE.green },
  EXPIRED: { label: 'Waqt guzra', tone: TONE.amber }, CANCELLED: { label: 'Cancel', tone: TONE.rose },
};
const viewLabel = (v: ReservationView) => VIEWS.find((x) => x.id === v)?.label ?? v;

export default function ReservationsPage() {
  const qc = useQueryClient();
  const { manage } = useGarmentsCan();
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<ReservationView>('active');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [sellOn, setSellOn] = useState<Reservation | null>(null);
  const [cancelOn, setCancelOn] = useState<Reservation | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, query]);
  const q = { view, page, limit: 30, search: query || undefined };
  const listQ = useQuery({ queryKey: [HOLD_KEY, 'page', q], queryFn: () => reservationsApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000 });
  const refresh = () => [HOLD_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const sell = useMutation({
    mutationFn: ({ r, paidNow, method }: { r: Reservation; paidNow: number; method: PaymentMethod }) => reservationsApi.sell(r.id, { paidNow, paymentMethod: method }),
    onSuccess: (r) => { toast.success(`${r.reservationNumber} bik gaya — bill ${r.bill?.saleNumber ?? ''}`); setSellOn(null); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Bill nahi bana')),
  });
  const extend = useMutation({
    mutationFn: ({ r, days }: { r: Reservation; days: number }) => reservationsApi.extend(r.id, days),
    onSuccess: (r) => { toast.success(`${r.reservationNumber}: ${dayOnly(r.expiresAt)} tak hold`); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Hold nahi badha')),
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
  const t = data?.totals;
  return (
    <PageShell>
      <PageHero title="Hold" chip={<><Bookmark /> Reservation</>} meta="Customer ke liye kapra rakhein — deposit ke saath"
        busy={listQ.isFetching && !listQ.isLoading} loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {manage && <button type="button" onClick={() => setAdding(true)} title="Naya hold (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya hold</button>}
        </>}
        stats={[
          { label: 'Hold par', value: counts?.active ?? '—', hint: t ? `${t.pieces} piece` : undefined },
          { label: 'Hold ka maal', value: t ? sales(t.value) : '—' },
          { label: 'Deposit jama', value: t ? sales(t.deposits) : '—' },
        ]}
      />
      <KpiRow cols={4}>
        {!counts ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ListChecks} color="#2563eb" label="Hold par" value={counts.active} hint="Kisi aur ko na bechein" onClick={() => setView('active')} active={view === 'active'} />
          <KpiCard icon={Clock} color="#d97706" label="Aaj khatam" value={counts.today} hint="Customer ko yaad dilayein" onClick={() => setView('today')} active={view === 'today'} />
          <KpiCard icon={Hourglass} color={counts.expired ? '#e11d48' : '#64748b'} label="Waqt guzar gaya" value={counts.expired} hint="Din barhayein ya cancel" onClick={() => setView('expired')} active={view === 'expired'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Bik gaye" value={counts.sold} hint="Hold se bill bana" onClick={() => setView('sold')} active={view === 'sold'} />
        </>}
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer, phone, hold #…" />}
        chips={query ? <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip> : undefined} onClear={() => setSearch('')}>
        <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView} width="w-64"
          options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts ? String(counts[v.id]) : undefined }))} />
      </FilterBar>
      <ViewTabs value={view} onChange={setView} hint={<>{manage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search</>}
        tabs={VIEWS.slice(0, 4).map((v) => ({ id: v.id, label: v.label, icon: v.icon, count: counts?.[v.id] ?? null }))} />

      {listQ.isLoading ? <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        : listQ.isError && !data ? <LoadFailed what="Hold" retry={() => listQ.refetch()} />
          : !rows.length ? (
            <EmptyList icon={Bookmark} title={query ? 'Kuch nahi mila' : 'Koi hold nahi'} text="Customer kehta hai 'yeh suit rakh lein, kal aa kar le jaunga' — deposit lein aur hold banayein. Hold wala piece doosre customer ko nahi bikta.">
              {manage && <Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>Naya hold</Button>}
            </EmptyList>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              {rows.map((r) => {
                const st = STATUS[r.status];
                const live = r.status === 'ACTIVE' || r.status === 'EXPIRED';
                return (
                  <li key={r.id} className="flex flex-wrap items-start gap-3 px-3 py-3 sm:px-4">
                    <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', r.status === 'EXPIRED' ? 'bg-amber-50 text-amber-600' : r.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400')}><Bookmark className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-semibold text-slate-900">{r.customerName || 'Customer'}</span>
                        <Pill tone={st.tone}>{st.label}</Pill>
                        <span className="font-mono text-[0.6875rem] text-slate-400">{r.reservationNumber}</span>
                      </div>
                      <p className="truncate text-[0.8125rem] text-slate-600">{r.quantity > 1 ? `${r.quantity}x ` : ''}{r.productName ?? 'Product'} · {formatPKR(r.unitPrice)}</p>
                      <p className={cn('text-[0.75rem]', r.status === 'EXPIRED' ? 'font-semibold text-amber-700' : 'text-slate-500')}>
                        {r.status === 'ACTIVE' ? `${whenText(r.expiresAt)} tak · ${dayOnly(r.expiresAt)}` : r.status === 'EXPIRED' ? `Waqt guzra ${dayOnly(r.expiresAt)}` : dayOnly(r.reservedAt)}
                        {r.customerPhone ? ` · ${r.customerPhone}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold tabular-nums">{formatPKR(r.total)}</p>
                      <p className="text-[0.6875rem] text-slate-500">Deposit {formatPKR(r.depositAmount)}</p>
                    </div>
                    {manage && live && (
                      <div className="flex w-full flex-wrap gap-1.5 sm:pl-[3.25rem]">
                        <Button size="sm" variant="success" onClick={() => setSellOn(r)} leftIcon={<ShoppingBag className="h-4 w-4" />}>Bech dein — {formatPKR(r.balance)}</Button>
                        {[3, 7].map((d) => <Button key={d} size="sm" variant="secondary" loading={extend.isPending && extend.variables?.r.id === r.id && extend.variables?.days === d} onClick={() => extend.mutate({ r, days: d })} leftIcon={<CalendarPlus className="h-4 w-4" />}>+{d} din</Button>)}
                        <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => setCancelOn(r)} leftIcon={<Ban className="h-4 w-4" />}>Cancel</Button>
                      </div>
                    )}
                    {r.bill && <Link to={`/sales/${r.bill.id}/receipt`} className="w-full text-[0.75rem] font-semibold text-brand-700 hover:underline sm:pl-[3.25rem]">Bill {r.bill.saleNumber} →</Link>}
                  </li>
                );
              })}
            </ul>
          )}
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}

      {adding && <HoldForm onClose={() => setAdding(false)} onDone={refresh} />}
      {sellOn && (
        <TakePaymentModal title="Bech dein — bill" confirmLabel="Bill banayein"
          description={`${sellOn.customerName ?? ''} · ${sellOn.productName ?? ''} · kul ${formatPKR(sellOn.total)}, deposit ${formatPKR(sellOn.depositAmount)}`}
          amount={sellOn.balance} max={sellOn.balance} allowZero loading={sell.isPending}
          onConfirm={(amount, method) => sell.mutate({ r: sellOn, paidNow: amount, method })} onClose={() => setSellOn(null)} />
      )}
      {cancelOn && <CancelModal title={`${cancelOn.customerName ?? ''} · ${cancelOn.reservationNumber}`} paid={cancelOn.depositAmount} onConfirm={(reason) => reservationsApi.cancel(cancelOn.id, reason || undefined).then(refresh)} onClose={() => setCancelOn(null)} />}

      {guide.isOpen && (
        <PageGuide title="Hold — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Hold banayein', text: 'Product scan karein ya naam likhein, size/rang chunein, deposit lein. Hold wala piece doosre customer ke liye "khaali" nahi ginta.' },
            { icon: Wallet, color: '#16a34a', title: 'Deposit', text: 'Deposit customer ke khate me advance ban kar jama hota hai, aur bechte waqt bill me kat jata hai.' },
            { icon: ShoppingBag, color: '#7c3aed', title: 'Bech dein', text: 'Customer aaye to "Bech dein" — bill banta hai, piece stock se nikalta hai.' },
            { icon: Hourglass, color: '#d97706', title: 'Waqt guzar gaya', text: 'Din barhayein ya cancel karein. Cancel se deposit khud wapas nahi hota — khate me jama rehta hai.' },
          ]}
          shortcuts={[['N', 'naya hold'], ['/', 'dhoondein'], ['G', 'guide']]} />
      )}
    </PageShell>
  );
}

function HoldForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [product, setProduct] = useState<PickedProduct | null>(null);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [days, setDays] = useState(3);
  const [notes, setNotes] = useState('');
  const quantity = Math.max(Math.floor(Number(qty) || 1), 1);
  const rate = price === '' ? product?.price ?? 0 : Number(price) || 0;
  const total = r2(rate * quantity);
  const dep = r2(Number(deposit) || 0);
  const problem = !customer.customerId && !customer.name.trim() ? 'Customer ka naam likhein' : !product ? 'Product chunein' : dep > total + 0.01 ? 'Deposit kul se zyada' : null;
  const save = useMutation({
    mutationFn: () => reservationsApi.create({
      customerId: customer.customerId || undefined, customerName: opt(customer.name), customerPhone: opt(customer.phone),
      productId: product!.productId, variantId: product!.variantId, quantity, unitPrice: rate,
      depositAmount: dep || undefined, paymentMethod: dep > 0 ? method : undefined, holdDays: days, notes: opt(notes),
    }),
    onSuccess: (r) => { toast.success(`Hold ${r.reservationNumber} — ${dayOnly(r.expiresAt)} tak`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Hold nahi bana')),
  });
  return (
    <Modal open onClose={onClose} size="lg" title="Naya hold" description="Piece customer ke liye alag rakhein"
      footer={<>
        {problem ? <p className="mr-auto text-[0.8125rem] text-amber-800">{problem}</p> : <p className="mr-auto text-[0.8125rem] text-slate-500">Kul {formatPKR(total)}{dep > 0 ? ` · baqi ${formatPKR(total - dep)}` : ''}</p>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={!!problem} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Bookmark className="h-4 w-4" />}>Hold karein</Button>
      </>}>
      <div className="space-y-4">
        <CustomerField value={customer} onChange={setCustomer} />
        <ProductPick value={product} onChange={(p) => { setProduct(p); setPrice(''); }} label="Kaunsa piece" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Piece" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))} className="text-right" />
          <Input label="Rate (1 pc)" inputMode="decimal" value={price === '' && product ? String(product.price) : price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))} className="text-right tabular-nums" hint="Jo rate tay hua" />
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kitne din</span>
            <div className="grid grid-cols-4 gap-1">{[1, 3, 7, 15].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={cn('h-10 rounded-lg text-[0.8125rem] font-semibold ring-1', days === d ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{d}</button>)}</div>
          </div>
        </div>
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-2">
          <Input label="Deposit (Rs)" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value.replace(/[^\d.]/g, ''))} className="text-right tabular-nums" hint="Khate me jama hota hai, bill me kat jata hai" />
          {dep > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
        </div>
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Shaam ko aayenge…" hint="Marzi hai" />
      </div>
    </Modal>
  );
}
