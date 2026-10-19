/**
 * Delivery board: delivery orders by stage — waiting for a rider, rider
 * assigned, on the way, delivered with the cash still with the rider. The
 * rider hands the cash over at the counter ("Cash lein"): each order then
 * becomes a cash bill, so the drawer and day book match what is in hand.
 *
 * Keys: N new delivery order · R riders · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bike, CheckCircle2, Clock, GraduationCap, HandCoins, MapPin, Navigation, PackageCheck, Phone, Plus, Users, XCircle } from 'lucide-react';
import { Button, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { deliveryApi, type BoardOrder, type DeliveryStage, type RiderCash } from '../api/delivery.api';
import { ridersApi } from '../api/riders.api';
import { ORDER_KEYS, apiError, duration, minutesSince } from '../lib/orderMeta';

const STAGES: Array<{ id: Exclude<DeliveryStage, 'done'>; label: string; color: string; hint: string }> = [
  { id: 'needsRider', label: 'Rider chahiye', color: '#e11d48', hint: 'Kitchen me ya tayyar' },
  { id: 'assigned', label: 'Rider laga', color: '#2563eb', hint: 'Uthane ka intezar' },
  { id: 'onTheWay', label: 'Raste me', color: '#7c3aed', hint: 'Customer ki taraf' },
  { id: 'cash', label: 'Cash rider ke paas', color: '#d97706', hint: 'Deliver ho gaya' },
];

export default function DeliveryTrackingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.RESTAURANT_ORDERS_MANAGE);
  const canPay = usePermission(PERMISSIONS.POS_USE);
  const [assign, setAssign] = useState<BoardOrder | null>(null);
  const [fail, setFail] = useState<BoardOrder | null>(null);
  const [settle, setSettle] = useState<RiderCash | null>(null);
  const [guide, setGuide] = useState(false);

  const board = useQuery({ queryKey: ['restaurant-delivery-board'], queryFn: () => deliveryApi.board(), refetchInterval: 15_000 });
  const cash = useQuery({ queryKey: ['restaurant-rider-cash'], queryFn: () => deliveryApi.riderCash(), refetchInterval: 30_000 });
  const rows = board.data ?? [];
  const by = (s: DeliveryStage) => rows.filter((o) => o.stage === s);
  const done = by('done');
  const cashTotal = (cash.data ?? []).reduce((n, r) => n + r.amount, 0);
  const refresh = () => ORDER_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const step = useMutation({
    mutationFn: ({ id, status, failureReason }: { id: string; status: string; failureReason?: string }) => deliveryApi.updateStatus(id, { status, failureReason }),
    onSuccess: () => { refresh(); setFail(null); },
    onError: (e) => toast.error(apiError(e)),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'n') navigate('/restaurant/orders/new?mode=DELIVERY');
      if (k === 'r') navigate('/restaurant/riders');
      if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <PageShell>
      {assign && <AssignDialog order={assign} onClose={() => setAssign(null)} onDone={() => { refresh(); setAssign(null); }} />}
      {fail && <FailDialog order={fail} saving={step.isPending} onClose={() => setFail(null)} onConfirm={(reason) => step.mutate({ id: fail.id, status: 'FAILED', failureReason: reason })} />}
      {settle && <SettleDialog rider={settle} onClose={() => setSettle(null)} onDone={() => { refresh(); setSettle(null); }} />}
      {guide && (
        <Modal open onClose={() => setGuide(false)} size="md" title="Delivery — aasaan tareeqa">
          <ol className="list-decimal space-y-2 pl-5 text-[0.875rem] text-slate-700">
            <li>Delivery order lein (<Kbd>N</Kbd>) — pata aur phone zaroori.</li>
            <li>"Rider lagayein" — rider busy ho jata hai.</li>
            <li>Rider khana uthaye to "Nikal gaya", pahunchaye to "Deliver".</li>
            <li>Wapas aa kar rider cash de: upar "Cash lein" — har order ka cash bill banta hai, drawer me jata hai.</li>
            <li>Card / online paid order ho to order khol kar payment lein.</li>
          </ol>
        </Modal>
      )}

      <PageHero
        title="Delivery"
        chip={<><Bike />{rows.filter((o) => o.stage !== 'done').length} chalu</>}
        busy={board.isFetching && !board.isLoading}
        meta="Har 15 second taaza"
        loading={board.isLoading}
        actions={<>
          <Link to="/restaurant/riders" className={heroButton}><Users className="h-4 w-4" />Riders <Kbd className="hidden bg-white/20 text-white md:inline-flex">R</Kbd></Link>
          <Link to="/restaurant/orders/new?mode=DELIVERY" className={heroPrimaryButton}><Plus className="h-4 w-4" />Delivery order</Link>
          <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Riders ke paas cash', value: formatPKR(cashTotal), hint: `${(cash.data ?? []).length} rider` },
          { label: 'Rider chahiye', value: String(by('needsRider').length) },
          { label: 'Raste me', value: String(by('onTheWay').length + by('assigned').length) },
          { label: 'Aaj deliver', value: String(done.length + by('cash').length) },
        ]}
      />

      {(cash.data ?? []).length > 0 && (
        <KpiRow cols={4}>
          {(cash.data ?? []).map((r) => (
            <KpiCard key={r.rider.id} icon={HandCoins} color="#d97706" label={r.rider.name} value={formatPKR(r.amount)}
              hint={canPay ? `${r.orders.length} order · cash lein` : `${r.orders.length} order`} onClick={canPay ? () => setSettle(r) : undefined} />
          ))}
        </KpiRow>
      )}

      {board.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-80 rounded-3xl" />)}</div>
      ) : !rows.length ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg"><Bike className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi delivery nahi</h3>
          <Button className="mt-4" onClick={() => navigate('/restaurant/orders/new?mode=DELIVERY')}><Plus className="h-4 w-4" />Delivery order lein</Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((s) => {
            const list = by(s.id);
            return (
              <section key={s.id} className="flex flex-col rounded-3xl bg-slate-100/70 p-3 ring-1 ring-slate-200/80">
                <h2 className="mb-2 flex items-center justify-between px-1 text-[0.875rem] font-semibold text-slate-900">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />{s.label}</span>
                  <span className="rounded-full bg-white px-2 text-[0.75rem] tabular-nums text-slate-600">{list.length}</span>
                </h2>
                {!list.length ? <p className="py-8 text-center text-[0.8125rem] text-slate-400">{s.hint} — koi nahi</p> : (
                  <div className="space-y-2">
                    {list.map((o) => (
                      <DeliveryCard key={o.id} o={o} canManage={canManage} busy={step.isPending && step.variables?.id === o.id}
                        onAssign={() => setAssign(o)} onFail={() => setFail(o)}
                        onStep={(status) => step.mutate({ id: o.id, status })} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      {done.length > 0 && (
        <details className="rounded-3xl bg-white px-4 py-3 ring-1 ring-slate-200/80">
          <summary className="cursor-pointer text-[0.875rem] font-semibold text-slate-700">Pichhle 12 ghante me mukammal · {done.length}</summary>
          <ul className="mt-2 divide-y divide-slate-100 text-[0.8125rem]">
            {done.map((o) => (
              <li key={o.id} className="flex justify-between py-1.5"><Link to={`/restaurant/orders/${o.id}`} className="hover:underline">{o.token ? `#${o.token} · ` : ''}{o.customerName ?? o.orderNumber}</Link>
                <span className="text-slate-500">{o.delivery?.rider?.name ?? '—'} · {formatPKR(o.total)}</span></li>
            ))}
          </ul>
        </details>
      )}
    </PageShell>
  );
}

function DeliveryCard({ o, canManage, busy, onAssign, onFail, onStep }: {
  o: BoardOrder; canManage: boolean; busy: boolean; onAssign: () => void; onFail: () => void; onStep: (s: string) => void;
}) {
  const rider = o.delivery?.rider;
  const ready = o.items.length > 0 && o.items.every((i) => i.status === 'READY' || i.status === 'SERVED');
  const age = minutesSince(o.createdAt);
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <Link to={`/restaurant/orders/${o.id}`} className="block px-3 py-2.5 hover:bg-slate-50">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[0.9375rem] font-bold text-slate-900">{o.token ? `#${o.token} · ` : ''}{o.customerName || o.orderNumber}</p>
          <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', age > 45 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600')}><Clock className="h-3 w-3" />{duration(age)}</span>
        </div>
        {o.deliveryAddress && <p className="mt-0.5 flex items-start gap-1 text-[0.8125rem] text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{o.deliveryAddress}</span></p>}
        <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{o.items.map((i) => `${i.quantity}× ${i.product?.name ?? ''}`).join(', ')}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[0.75rem] text-slate-500">{rider ? <><Bike className="mr-1 inline h-3.5 w-3.5" />{rider.name}</> : ready ? <span className="font-semibold text-emerald-700">Khana tayyar</span> : 'Kitchen me'}</span>
          <span className="text-[0.9375rem] font-bold tabular-nums">{formatPKR(o.due || o.total)}</span>
        </div>
      </Link>
      {canManage && o.stage !== 'done' && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-3 py-2">
          {o.customerPhone && <a href={`tel:${o.customerPhone}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Customer ko call"><Phone className="h-4 w-4" /></a>}
          {(o.stage === 'needsRider' || o.stage === 'assigned') && <Button size="xs" variant={o.stage === 'needsRider' ? 'primary' : 'ghost'} onClick={onAssign}><Bike className="h-3.5 w-3.5" />{rider ? 'Badlein' : 'Rider lagayein'}</Button>}
          {o.stage === 'assigned' && <Button size="xs" loading={busy} onClick={() => onStep('PICKED_UP')}><Navigation className="h-3.5 w-3.5" />Nikal gaya</Button>}
          {o.stage === 'onTheWay' && <Button size="xs" variant="success" loading={busy} onClick={() => onStep('DELIVERED')}><PackageCheck className="h-3.5 w-3.5" />Deliver</Button>}
          {(o.stage === 'assigned' || o.stage === 'onTheWay') && <button type="button" onClick={onFail} className="ml-auto rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" title="Delivery nahi hui"><XCircle className="h-4 w-4" /></button>}
          {o.stage === 'cash' && <span className="text-[0.75rem] font-medium text-amber-800">Rider se cash lena hai</span>}
        </div>
      )}
    </article>
  );
}

function AssignDialog({ order, onClose, onDone }: { order: BoardOrder; onClose: () => void; onDone: () => void }) {
  const { data: riders = [], isLoading } = useQuery({ queryKey: ['restaurant-riders', 'active'], queryFn: () => ridersApi.list({ active: true }) });
  const [riderId, setRiderId] = useState(order.delivery?.riderId ?? '');
  const [fee, setFee] = useState('');
  const save = useMutation({
    mutationFn: () => deliveryApi.assign(order.id, { riderId, ...(Number(fee) > 0 && { riderCommission: Number(fee) }) }),
    onSuccess: () => { toast.success('Rider lag gaya'); onDone(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const usable = riders.filter((r) => r.status === 'ACTIVE' || r.status === 'BUSY');
  return (
    <Modal open onClose={onClose} size="md" title={`${order.customerName || order.orderNumber} — rider`} description={order.deliveryAddress ?? undefined}
      footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!riderId} loading={save.isPending} onClick={() => save.mutate()}>Rider lagayein</Button></div>}>
      {isLoading ? <p className="py-6 text-center text-slate-500">…</p> : !usable.length ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-[0.875rem] text-slate-600">Koi rider duty par nahi. <Link className="font-semibold text-brand-700" to="/restaurant/riders">Riders</Link></p>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            {usable.map((r) => (
              <li key={r.id}><button type="button" onClick={() => setRiderId(r.id)}
                className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ring-1', riderId === r.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:bg-slate-50')}>
                <span><span className="block text-[0.875rem] font-semibold">{r.name}</span><span className="text-[0.75rem] text-slate-500">{r.phone}{r.vehicleNumber ? ` · ${r.vehicleNumber}` : ''}{r.cashDue ? ` · cash ${formatPKR(r.cashDue)}` : ''}</span></span>
                <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', r.status === 'BUSY' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700')}>{r.status === 'BUSY' ? `${r.activeTrips ?? 1} trip` : 'Free'}</span>
              </button></li>
            ))}
          </ul>
          <label className="block text-[0.8125rem] font-medium text-slate-700">Rider ka kiraya (marzi)
            <input value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="0"
              className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] font-normal tabular-nums outline-none focus:border-brand-500" />
            <span className="mt-0.5 block text-[0.75rem] font-normal text-slate-500">Cash lete waqt drawer se de sakte hain — tab yeh Expense me khud likh jata hai</span>
          </label>
        </div>
      )}
    </Modal>
  );
}

function FailDialog({ order, saving, onConfirm, onClose }: { order: BoardOrder; saving: boolean; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open onClose={onClose} size="md" title="Delivery nahi hui" description="Rider free ho jata hai. Order khula rehta hai — naya rider lagayein ya order cancel karein."
      footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={saving} disabled={reason.trim().length < 3} onClick={() => onConfirm(reason.trim())}>Save karein</Button></div>}>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {['Customer ne phone nahi uthaya', 'Ghalat pata', 'Customer ne lene se mana kiya', 'Bike kharab'].map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium', reason === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>{r}</button>
        ))}
      </div>
      <input data-autofocus value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} placeholder="Wajah" aria-label="Wajah"
        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-[0.875rem] outline-none focus:border-brand-500" />
      <p className="mt-2 text-[0.75rem] text-slate-500">{order.orderNumber}</p>
    </Modal>
  );
}

function SettleDialog({ rider, onClose, onDone }: { rider: RiderCash; onClose: () => void; onDone: () => void }) {
  const canExpense = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const delivered = rider.orders.filter((o) => o.status === 'DELIVERED');
  const [pick, setPick] = useState<Set<string>>(() => new Set(delivered.map((o) => o.id)));
  const amount = useMemo(() => rider.orders.filter((o) => pick.has(o.id)).reduce((n, o) => n + o.due, 0), [rider.orders, pick]);
  const fee = useMemo(() => rider.orders.filter((o) => pick.has(o.id)).reduce((n, o) => n + (o.riderFee ?? 0), 0), [rider.orders, pick]);
  const [payFee, setPayFee] = useState(true);
  const paying = canExpense && payFee && fee > 0;
  const save = useMutation({
    mutationFn: () => deliveryApi.settle(rider.rider.id, [...pick], paying),
    onSuccess: (r) => {
      if (r.settled.length) toast.success(`${formatPKR(r.amount)} cash mila — ${r.settled.length} bill ban gaye`);
      if (r.riderFee?.error) toast.error(r.riderFee.error);
      else if (r.riderFee?.amount) toast.success(`Rider ko ${formatPKR(r.riderFee.amount)} kiraya diya — Expense ${r.riderFee.expenseNumbers.join(', ')}`);
      r.failed.forEach((f) => toast.error(`${f.orderNumber}: ${f.error}`));
      onDone();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const toggle = (id: string) => setPick((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <Modal open onClose={onClose} size="md" title={`${rider.rider.name} se cash lein`} description="Har chuna hua order cash bill ban jata hai — drawer aur day book me abhi jata hai"
      footer={<div className="flex w-full items-center justify-between gap-3"><span className="text-[0.875rem] text-slate-600">{paying ? 'Drawer me' : 'Lena hai'} <b className="text-[1.125rem] tabular-nums text-slate-900">{formatPKR(paying ? amount - fee : amount)}</b></span>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!pick.size} loading={save.isPending} onClick={() => save.mutate()}><CheckCircle2 className="h-4 w-4" />Cash mil gaya</Button></div></div>}>
      <ul className="divide-y divide-slate-100">
        {rider.orders.map((o) => (
          <li key={o.id}>
            <label className="flex cursor-pointer items-center gap-3 py-2">
              <input type="checkbox" checked={pick.has(o.id)} onChange={() => toggle(o.id)} className="h-4 w-4 accent-[rgb(var(--brand-600))]" />
              <span className="min-w-0 flex-1"><span className="block text-[0.875rem] font-semibold">{o.customerName || o.orderNumber}</span>
                <span className="text-[0.75rem] text-slate-500">{o.orderNumber} · {o.status === 'DELIVERED' ? 'deliver ho gaya' : 'abhi raste me'}</span></span>
              <span className="text-right"><span className="block text-[0.875rem] font-bold tabular-nums">{formatPKR(o.due)}</span>
                {(o.riderFee ?? 0) > 0 && <span className="block text-[0.6875rem] text-slate-500">kiraya {formatPKR(o.riderFee ?? 0)}</span>}</span>
            </label>
          </li>
        ))}
      </ul>
      {fee > 0 && (
        canExpense ? (
          <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-100">
            <input type="checkbox" checked={payFee} onChange={(e) => setPayFee(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand-600))]" />
            <span>Rider ka kiraya <b className="tabular-nums">{formatPKR(fee)}</b> abhi drawer se dein
              <span className="block text-[0.75rem] text-amber-800/80">Cash Expense ban jata hai, taake drawer aur profit dono sahi rahein</span></span>
          </label>
        ) : (
          <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600">Rider ka kiraya {formatPKR(fee)} — drawer se dene ke liye Expense likhne ki permission chahiye</p>
        )
      )}
    </Modal>
  );
}
