/**
 * One restaurant order: dishes with their kitchen state, kitchen tickets,
 * the bill with charges, and every action a running table needs — add
 * dishes, send to kitchen, void a dish, pre-bill, take payment, move or
 * merge tables, split the bill, assign a rider, cancel. A paid order shows
 * its bill and links to it.
 *
 * Keys: A add dishes · K kitchen · B pre-bill · P payment · G guide.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Ban, Bike, ChefHat, Clock, Combine, GraduationCap, MapPin, MoveRight, Percent, Phone, Plus, Printer, Receipt, ReceiptText, Send, Split,
  Trash2, UserRound, Users, Wallet,
} from 'lucide-react';
import { Badge, Button, Kbd, Modal, PageHero, PageShell, Skeleton, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useAuthStore } from '@core/stores/auth.store';
import { withManagerPin } from '@core/security/ManagerPin';
import { ordersApi, type OrderItem, type RestaurantOrder } from '../api/orders.api';
import { deliveryApi } from '../api/delivery.api';
import { ridersApi } from '../api/riders.api';
import type { Kot } from '../api/kot.api';
import { useOrderPayment } from '../hooks/useOrderPayment';
import { CancelOrderDialog, ChargesDialog, MergeDialog, SplitItemsDialog, VoidItemDialog } from '../components/OrderDialogs';
import { TablePickerModal } from '../components/TablePickerModal';
import { MODE_META, ORDER_KEYS, STATUS_META, apiError, duration, isOpenOrder, itemName, lineExtras, minutesSince, orderTitle } from '../lib/orderMeta';
import { printKot, printPreBill } from '../lib/slips';

const ITEM_STATE: Record<string, { label: string; tone: string }> = {
  UNSENT: { label: 'Kitchen nahi gaya', tone: 'bg-slate-100 text-slate-700' },
  PLACED: { label: 'Kitchen me', tone: 'bg-blue-50 text-blue-700' },
  CONFIRMED: { label: 'Kitchen me', tone: 'bg-blue-50 text-blue-700' },
  COOKING: { label: 'Ban raha hai', tone: 'bg-orange-50 text-orange-700' },
  READY: { label: 'Tayyar', tone: 'bg-emerald-50 text-emerald-700' },
  SERVED: { label: 'Serve', tone: 'bg-teal-50 text-teal-700' },
};

type Dialog = 'void' | 'cancel' | 'charges' | 'merge' | 'split' | 'move' | 'rider' | 'guide' | null;

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Restaurant';
  const canManage = usePermission(PERMISSIONS.RESTAURANT_ORDERS_MANAGE);
  const canPay = usePermission(PERMISSIONS.POS_USE);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [voidItem, setVoidItem] = useState<OrderItem | null>(null);

  const q = useQuery({ queryKey: ['restaurant-order', id], queryFn: () => ordersApi.getOne(id!), enabled: !!id, refetchInterval: 20_000 });
  const o = q.data;
  const refresh = () => ORDER_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const payment = useOrderPayment(() => refresh());

  const act = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => { refresh(); setDialog(null); setVoidItem(null); },
    onError: (e) => toast.error(apiError(e)),
  });
  const run = (fn: () => Promise<unknown>, ok?: string) => act.mutate(async () => { const r = await fn(); if (ok) toast.success(ok); return r; });

  const open = !!o && isOpenOrder(o);
  const live = o?.items.filter((it) => !it.isReturned) ?? [];
  const voided = o?.items.filter((it) => it.isReturned) ?? [];
  const unsent = live.filter((it) => !it.sentToKitchenAt).length;
  const due = o ? Math.max(o.total - o.paidAmount, 0) : 0;

  const sendKitchen = () => o && run(async () => {
    const before = (o.kots ?? []).map((k) => k.id);
    const res = await ordersApi.sendToKitchen(o.id);
    (res.order.kots ?? []).filter((k: Kot) => !before.includes(k.id)).forEach((k: Kot) => printKot(k, shopName));
    toast.success(`${res.kots.length} ticket kitchen ko gaye`);
  });
  const preBill = () => o && run(async () => { const r = await ordersApi.printBill(o.id); printPreBill(r, shopName); }, 'Bill print — table payment ka intezar');
  const pay = () => o && payment.open(o, o.customerId ? { id: o.customerId, name: o.customerName ?? 'Customer' } : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !o) return;
      const k = e.key.toLowerCase();
      if (k === 'g') setDialog('guide');
      if (!open || !canManage) return;
      if (k === 'a') navigate(`/restaurant/orders/new?orderId=${o.id}`);
      if (k === 'k' && unsent) sendKitchen();
      if (k === 'b') preBill();
      if (k === 'p' && canPay) pay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-36 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  if (!o) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <ReceiptText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">Order nahi mila</p>
          <Link to="/restaurant/orders" className="mt-2 inline-block text-[0.875rem] font-semibold text-brand-700 hover:underline">Orders par wapas</Link>
        </div>
      </PageShell>
    );
  }

  const status = STATUS_META[o.status];
  const ModeIcon = MODE_META[o.mode].icon;
  const age = minutesSince(o.placedAt ?? o.createdAt);

  return (
    <PageShell>
      {payment.modal}
      {dialog === 'void' && voidItem && (
        <VoidItemDialog item={voidItem} saving={act.isPending} onClose={() => { setDialog(null); setVoidItem(null); }}
          onConfirm={(d) => run(() => withManagerPin('Kitchen ja chuka item hatane ke liye PIN', (managerPin) => ordersApi.voidItem(o.id, voidItem.id!, { ...d, ...(managerPin && { managerPin }) }), 'void'), 'Item hata diya')} />
      )}
      {dialog === 'cancel' && (
        <CancelOrderDialog order={o} saving={act.isPending} onClose={() => setDialog(null)}
          onConfirm={(reason) => run(() => withManagerPin('Order cancel ke liye PIN', (managerPin) => ordersApi.updateStatus(o.id, 'CANCELLED', { cancellationReason: reason, ...(managerPin && { managerPin }) }), 'void'), 'Order cancel ho gaya')} />
      )}
      {dialog === 'charges' && <ChargesDialog order={o} saving={act.isPending} onClose={() => setDialog(null)} onSave={(d) => run(() => ordersApi.update(o.id, d), 'Bill badal gaya')} />}
      {dialog === 'merge' && <MergeDialog order={o} saving={act.isPending} onClose={() => setDialog(null)} onConfirm={(from) => run(() => ordersApi.merge(o.id, from), 'Order mil gaye')} />}
      {dialog === 'split' && (
        <SplitItemsDialog order={o} saving={act.isPending} onClose={() => setDialog(null)}
          onConfirm={(lines) => act.mutate(async () => { const r = await ordersApi.splitItems(o.id, lines); toast.success(`Alag bill ${r.child.orderNumber} ban gaya`); navigate(`/restaurant/orders/${r.child.id}`); })} />
      )}
      {dialog === 'move' && (
        <TablePickerModal value={o.tableId} onClose={() => setDialog(null)}
          onPick={(t) => run(() => ordersApi.moveTable(o.id, t.id), `Table ${t.tableNumber} par chale gaye`)} />
      )}
      {dialog === 'rider' && <RiderDialog order={o} onClose={() => setDialog(null)} onDone={() => { refresh(); setDialog(null); }} />}
      {dialog === 'guide' && <OrderGuide onClose={() => setDialog(null)} />}

      <PageHero
        title={<span className="inline-flex items-center gap-2"><button type="button" onClick={() => navigate(-1)} aria-label="Wapas" className="rounded-lg p-1 hover:bg-white/15"><ArrowLeft className="h-5 w-5" /></button>{orderTitle(o)}</span>}
        chip={<><ModeIcon />{MODE_META[o.mode].label} · {status.label}</>}
        meta={`${o.orderNumber} · ${new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(o.createdAt))}${o.waiter ? ` · ${o.waiter.fullName}` : ''}`}
        actions={<>
          {open && canManage && <>
            <button type="button" onClick={() => navigate(`/restaurant/orders/new?orderId=${o.id}`)} className={heroButton}><Plus className="h-4 w-4" />Aur item <Kbd className="hidden bg-white/20 text-white md:inline-flex">A</Kbd></button>
            {unsent > 0 && <button type="button" onClick={sendKitchen} className={heroButton}><Send className="h-4 w-4" />Kitchen ({unsent})</button>}
            <button type="button" onClick={preBill} className={heroButton}><Printer className="h-4 w-4" />Bill print</button>
            {canPay && <button type="button" onClick={pay} className={heroPrimaryButton}><Wallet className="h-4 w-4" />Payment · {formatPKR(due)}</button>}
          </>}
          {o.saleId && o.sale && <Link to={`/sales/${o.saleId}/receipt`} className={heroPrimaryButton}><Receipt className="h-4 w-4" />Bill {o.sale.saleNumber}</Link>}
          <button type="button" onClick={() => setDialog('guide')} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Kul bill', value: formatPKR(o.total), hint: o.discount ? `discount ${formatPKR(o.discount)}` : undefined },
          { label: o.saleId ? 'Mila' : 'Baqi', value: formatPKR(o.saleId ? o.paidAmount : due), hint: o.sale?.creditAmount ? `udhaar ${formatPKR(o.sale.creditAmount)}` : undefined },
          { label: 'Dishes', value: String(live.reduce((s, it) => s + it.quantity, 0)), hint: voided.length ? `${voided.length} void` : undefined },
          { label: open ? 'Waqt' : 'Token', value: open ? duration(age) : o.token ? `#${o.token}` : '—' },
        ]}
      />

      {!open && o.status === 'CANCELLED' && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[0.875rem] text-rose-800 ring-1 ring-rose-100"><Ban className="mr-1.5 inline h-4 w-4" />Cancel: {o.cancellationReason || '—'}</p>
      )}
      {(o.parentOrder || (o.splitOrders?.length ?? 0) > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[0.8125rem] ring-1 ring-slate-200/80">
          <Split className="h-4 w-4 text-slate-500" />
          {o.parentOrder && <>Ye bill <Link className="font-semibold text-brand-700 hover:underline" to={`/restaurant/orders/${o.parentOrder.id}`}>{o.parentOrder.orderNumber}</Link> se alag hua</>}
          {o.splitOrders?.map((c) => (
            <Link key={c.id} to={`/restaurant/orders/${c.id}`} className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200">{c.orderNumber} · {formatPKR(c.total)} · {STATUS_META[c.status].label}</Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card title="Dishes" right={open && canManage ? <Button size="sm" variant="secondary" onClick={() => navigate(`/restaurant/orders/new?orderId=${o.id}`)}><Plus className="h-4 w-4" />Aur item</Button> : undefined}>
            {!live.length ? <p className="px-4 py-8 text-center text-[0.875rem] text-slate-500">Koi dish nahi</p> : (
              <ul className="divide-y divide-slate-100">
                {live.map((it) => {
                  const st = ITEM_STATE[it.sentToKitchenAt ? (it.status ?? 'PLACED') : 'UNSENT'] ?? ITEM_STATE.PLACED;
                  return (
                    <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 px-1.5 text-[0.875rem] font-bold tabular-nums text-slate-900">{it.quantity}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.9375rem] font-semibold text-slate-900">{itemName(it)}</p>
                        {lineExtras(it) && <p className="text-[0.8125rem] text-slate-500">{lineExtras(it)}</p>}
                        {it.specialInstructions && <p className="text-[0.8125rem] italic text-amber-700">“{it.specialInstructions}”</p>}
                        <span className={cn('mt-1 inline-block rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', st.tone)}>{st.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{formatPKR(it.total ?? 0)}</p>
                        {(it.itemDiscount ?? 0) > 0 && <p className="text-[0.75rem] text-rose-600">−{formatPKR(it.itemDiscount ?? 0)}</p>}
                        {open && canManage && (
                          <button type="button" onClick={() => { setVoidItem(it); setDialog('void'); }}
                            className="mt-1 inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-[0.75rem] font-semibold text-rose-600 hover:bg-rose-50">
                            <Trash2 className="h-3.5 w-3.5" />{it.sentToKitchenAt ? 'Void' : 'Hatayein'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {voided.length > 0 && (
              <details className="border-t border-slate-100 px-4 py-2">
                <summary className="cursor-pointer text-[0.8125rem] font-semibold text-slate-600">{voided.length} item void / hataye</summary>
                <ul className="mt-2 space-y-1 text-[0.8125rem] text-slate-500">
                  {voided.map((it) => <li key={it.id} className="flex justify-between gap-2"><span className="line-through">{it.quantity}× {it.product?.name}</span><span>{it.returnReason}</span></li>)}
                </ul>
              </details>
            )}
          </Card>

          <Card title="Kitchen tickets (KOT)">
            {!(o.kots ?? []).length ? <p className="px-4 py-6 text-center text-[0.8125rem] text-slate-500">Abhi kitchen ko kuch nahi gaya</p> : (
              <ul className="divide-y divide-slate-100">
                {(o.kots as Kot[]).map((k) => {
                  const snap = (k.itemsSnapshot ?? {}) as { items?: Array<{ name: string; quantity: number }> };
                  return (
                    <li key={k.id} className="flex items-center gap-3 px-4 py-2.5">
                      <ChefHat className={cn('h-4 w-4', k.status === 'CANCELLED' ? 'text-rose-500' : 'text-slate-400')} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.8125rem] font-semibold text-slate-900">{k.kotNumber}{k.station ? ` · ${k.station}` : ''}
                          <span className={cn('ml-2 rounded-md px-1.5 py-0.5 text-[0.6875rem]', k.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : k.status === 'READY' || k.status === 'SERVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                            {k.status === 'CANCELLED' ? 'Cancel' : k.status === 'READY' ? 'Tayyar' : k.status === 'SERVED' ? 'Serve' : k.status === 'COOKING' ? 'Ban raha' : 'Naya'}
                          </span></p>
                        <p className="truncate text-[0.75rem] text-slate-500">{(snap.items ?? []).map((x) => `${x.quantity}× ${x.name}`).join(', ')}</p>
                      </div>
                      <button type="button" onClick={() => printKot({ ...k, order: k.order ?? undefined }, shopName)} title="Dobara print" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Printer className="h-4 w-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Bill" right={open && canManage ? <Button size="sm" variant="ghost" onClick={() => setDialog('charges')}><Percent className="h-4 w-4" />Badlein</Button> : undefined}>
            <dl className="space-y-1.5 px-4 py-3 text-[0.875rem]">
              <Row label="Dishes" value={formatPKR(o.subtotal)} />
              {o.serviceCharge > 0 && <Row label={`Service ${o.serviceChargePct}%`} value={formatPKR(o.serviceCharge)} />}
              {o.taxAmount > 0 && <Row label={`Tax ${o.taxPct}%`} value={formatPKR(o.taxAmount)} />}
              {o.deliveryFee > 0 && <Row label="Delivery" value={formatPKR(o.deliveryFee)} />}
              {o.packagingFee > 0 && <Row label="Packing" value={formatPKR(o.packagingFee)} />}
              {o.tip > 0 && <Row label="Tip" value={formatPKR(o.tip)} />}
              {o.discount > 0 && <Row label="Discount" value={`−${formatPKR(o.discount)}`} tone="text-rose-600" />}
              <div className="flex items-baseline justify-between border-t border-slate-100 pt-2"><dt className="font-semibold text-slate-900">Kul</dt><dd className="text-[1.25rem] font-bold tabular-nums">{formatPKR(o.total)}</dd></div>
              {o.paidAmount > 0 && <Row label="Mila" value={formatPKR(o.paidAmount)} tone="text-emerald-700" />}
              {o.sale?.creditAmount ? <Row label="Udhaar (khata)" value={formatPKR(o.sale.creditAmount)} tone="text-amber-700" /> : null}
            </dl>
            {(o.payments ?? []).length > 0 && (
              <ul className="border-t border-slate-100 px-4 py-2 text-[0.75rem] text-slate-500">
                {(o.payments as Array<{ id: string; paymentMethod: string; amount: number; paidBy?: string | null }>).map((p) => <li key={p.id} className="flex justify-between"><span>{p.paymentMethod}{p.paidBy ? ` · ${p.paidBy}` : ''}</span><span className="tabular-nums">{formatPKR(p.amount)}</span></li>)}
              </ul>
            )}
            {open && due > 0 && <EqualShare due={due} guests={o.numberOfGuests ?? 2} />}
            {open && canManage && canPay && (
              <div className="border-t border-slate-100 p-3"><Button fullWidth size="lg" onClick={pay}><Wallet className="h-4 w-4" />Payment lein · {formatPKR(due)}</Button></div>
            )}
          </Card>

          <Card title="Order">
            <ul className="space-y-2 px-4 py-3 text-[0.8125rem] text-slate-700">
              {o.table && <li className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" />Table {o.table.tableNumber}{o.table.section ? ` · ${o.table.section}` : ''}{o.numberOfGuests ? ` · ${o.numberOfGuests} mehman` : ''}</li>}
              {o.token && <li className="flex items-center gap-2"><Receipt className="h-4 w-4 text-slate-400" />Token #{o.token}</li>}
              {o.customerName && <li className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-400" />{o.customerName}</li>}
              {o.customerPhone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /><a className="hover:underline" href={`tel:${o.customerPhone}`}>{o.customerPhone}</a></li>}
              {o.deliveryAddress && <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{o.deliveryAddress}{o.deliveryNotes ? ` — ${o.deliveryNotes}` : ''}</li>}
              {o.specialRequests && <li className="rounded-lg bg-amber-50 px-2 py-1.5 text-amber-900">{o.specialRequests}</li>}
              <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" />{new Intl.DateTimeFormat('en-PK', { timeStyle: 'short' }).format(new Date(o.createdAt))}{open ? ` · ${duration(age)} se` : ''}</li>
            </ul>
          </Card>

          {o.mode === 'DELIVERY' && (
            <Card title="Delivery" right={o.status !== 'CANCELLED' && canManage ? <Button size="sm" variant="ghost" onClick={() => setDialog('rider')}><Bike className="h-4 w-4" />{o.delivery?.rider ? 'Badlein' : 'Rider lagayein'}</Button> : undefined}>
              <div className="px-4 py-3 text-[0.8125rem] text-slate-700">
                {o.delivery?.rider ? (
                  <p><b>{o.delivery.rider.name}</b> · {o.delivery.rider.phone} · <Badge variant="info">{o.delivery.status}</Badge></p>
                ) : <p className="text-slate-500">Abhi rider nahi laga</p>}
                <Link to="/restaurant/delivery" className="mt-2 inline-block font-semibold text-brand-700 hover:underline">Delivery board →</Link>
              </div>
            </Card>
          )}

          {open && canManage && (
            <Card title="Aur kaam">
              <div className="grid grid-cols-2 gap-2 p-3">
                {o.mode === 'DINE_IN' && <Action icon={MoveRight} label="Table badlein" onClick={() => setDialog('move')} />}
                <Action icon={Combine} label="Order milayein" onClick={() => setDialog('merge')} />
                <Action icon={Split} label="Bill alag karein" onClick={() => setDialog('split')} disabled={o.paidAmount > 0 || live.length < 1 || (live.length === 1 && live[0].quantity < 2)} />
                <Action icon={Ban} label="Order cancel" onClick={() => setDialog('cancel')} danger />
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
        <h2 className="text-[0.875rem] font-semibold text-slate-900">{title}</h2>{right}
      </header>
      {children}
    </section>
  );
}

/** Each guest's share when the table splits the bill equally (paid as a split payment). */
function EqualShare({ due, guests }: { due: number; guests: number }) {
  const [n, setN] = useState(Math.max(2, guests));
  const each = Math.ceil((due / n) * 100) / 100;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 text-[0.8125rem] text-slate-600">
      <span className="inline-flex items-center gap-1.5">Barabar baantein
        <input value={n} onChange={(e) => setN(Math.min(50, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)))} inputMode="numeric" aria-label="Kitne log"
          className="h-7 w-12 rounded-lg border border-slate-200 px-1.5 text-center tabular-nums" /> log
      </span>
      <b className="tabular-nums text-slate-900">{formatPKR(each)} har ek</b>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={cn('flex justify-between text-slate-600', tone)}><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>;
}

function Action({ icon: Icon, label, onClick, disabled, danger }: { icon: typeof Ban; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn('flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[0.8125rem] font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-40',
        danger ? 'text-rose-700 ring-rose-200 hover:bg-rose-50' : 'text-slate-700 ring-slate-200 hover:bg-slate-50')}>
      <Icon className="h-4 w-4" />{label}
    </button>
  );
}

/** Assign or change the rider and move the trip forward. */
function RiderDialog({ order, onClose, onDone }: { order: RestaurantOrder; onClose: () => void; onDone: () => void }) {
  const { data: riders = [] } = useQuery({ queryKey: ['restaurant-riders', 'active'], queryFn: () => ridersApi.list({ active: true }) });
  const [riderId, setRiderId] = useState<string>(order.delivery?.riderId ?? '');
  const save = useMutation({
    mutationFn: () => deliveryApi.assign(order.id, { riderId }),
    onSuccess: () => { toast.success('Rider lag gaya'); onDone(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const free = riders.filter((r) => r.status === 'ACTIVE' || r.status === 'BUSY' || r.id === riderId);
  return (
    <Modal open onClose={onClose} size="md" title="Rider chunein" description="Rider lagte hi order delivery board par 'Rider laga' me aa jata hai"
      footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!riderId} loading={save.isPending} onClick={() => save.mutate()}>Rider lagayein</Button></div>}>
      {!free.length ? <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-[0.875rem] text-slate-600">Koi rider duty par nahi. <Link to="/restaurant/riders" className="font-semibold text-brand-700">Riders</Link></p> : (
        <ul className="space-y-1.5">
          {free.map((r) => (
            <li key={r.id}><button type="button" onClick={() => setRiderId(r.id)}
              className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ring-1', riderId === r.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:bg-slate-50')}>
              <span><span className="block text-[0.875rem] font-semibold">{r.name}</span><span className="text-[0.75rem] text-slate-500">{r.phone}{r.vehicleNumber ? ` · ${r.vehicleNumber}` : ''}</span></span>
              <span className={cn('rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', r.status === 'BUSY' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700')}>{r.status === 'BUSY' ? `${r.activeTrips ?? 1} trip par` : 'Free'}</span>
            </button></li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function OrderGuide({ onClose }: { onClose: () => void }) {
  const steps = [
    { t: 'Aur item', d: 'A dabayein ya "Aur item" — sirf naye item kitchen jate hain, naya ticket banta hai.' },
    { t: 'Void', d: 'Kitchen ja chuki dish hatane ke liye wajah aur "Bill void" ki ijazat (ya PIN) chahiye. Kitchen ko cancel ticket jata hai.' },
    { t: 'Bill print', d: 'B — table ko bill dikhayein. Table "Bill print" me chali jati hai.' },
    { t: 'Payment', d: 'P — cash, card, wallet, split ya udhaar. Payment hote hi bill banta hai aur day book, drawer aur khata me jata hai.' },
    { t: 'Table badlein / milayein', d: 'Mehman doosri table par gaye ya do tables ka ek bill — "Aur kaam" se.' },
    { t: 'Bill alag karein', d: 'Kuch log apni dishes ka alag payment karein — dishes chunein, naya bill isi table par banta hai.' },
  ];
  return (
    <Modal open onClose={onClose} size="lg" title="Order — aasaan tareeqa">
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.t} className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <p className="text-[0.875rem] font-semibold text-slate-900">{i + 1}. {s.t}</p>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{s.d}</p>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
