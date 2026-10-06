import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowRight, Ban, CheckCircle2, Clock, Copy, ExternalLink, Link2, Loader2,
  MapPin, MessageCircle, Package, Phone, Printer, Receipt, Truck, Wallet, X,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Modal } from '@core/ui/Modal';
import {
  apiErrorMessage, onlineOrdersApi, unmatchedFromError, type OnlineOrderDetail,
} from '../api/online-orders.api';
import { LIVE_ORDERS_KEY } from '../hooks/useLiveOnlineOrders';
import { COURIER_OPTIONS, NEXT_ACTION, PAYMENT_LABEL, STATUS_LABEL, rs, sourceOf, waNumber, whenText } from '../lib/labels';
import { MatchItemsModal, type Matches } from './MatchItemsModal';
import { CourierSection } from './CourierSection';
import { RiskCard } from './RiskBadge';
import { ConfirmCard } from './ConfirmCard';
import { OrderExtras } from './OrderExtras';
import { OrderBranchPicker } from './OrderBranchPicker';
import { DarazOrderSection } from './daraz/Daraz';
import { PaymentLinkSection } from './PaymentLinkSection';
import { cn } from '@core/lib/cn';

const CANCEL_REASONS = ['Stock khatam', 'Customer ne mana kiya', 'Address/number ghalat', 'Fake order', 'Delivery nahi ho sakti'];

export function OrderDetailPanel({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [matchOpen, setMatchOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const { data: o, isLoading, error } = useQuery({
    queryKey: ['online-order', orderId],
    queryFn: () => onlineOrdersApi.detail(orderId),
    refetchInterval: 20_000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['online-order', orderId] });
    qc.invalidateQueries({ queryKey: ['online-orders'] });
    qc.invalidateQueries({ queryKey: LIVE_ORDERS_KEY });
  };

  const accept = useMutation({
    mutationFn: (matches?: Matches) =>
      onlineOrdersApi.accept(orderId, {
        matches: matches
          ? Object.fromEntries(Object.entries(matches).map(([k, v]) => [k, { productId: v.productId, variantId: v.variantId }]))
          : undefined,
      }),
    onSuccess: (res) => {
      setMatchOpen(false);
      refresh();
      toast.success(`✅ Bill ban gaya — ${res.sale.saleNumber}`, { description: 'Stock inventory se kam ho gaya' });
      if (res.autoPrint) navigate(`/sales/${res.sale.id}/receipt?auto=1`);
    },
    onError: async (err: any) => {
      // 409 = kuch items ka product nahi mila (ya koi aur accept kar raha hai).
      // Taaza detail le kar dekho — match baqi ho to jodne ka safha kholo.
      if (unmatchedFromError(err) !== null || err?.response?.status === 409) {
        const fresh = await qc.fetchQuery({ queryKey: ['online-order', orderId], queryFn: () => onlineOrdersApi.detail(orderId) });
        if (fresh.lines.some((l) => !l.match)) {
          setMatchOpen(true);
          return;
        }
      }
      toast.error(apiErrorMessage(err, 'Accept nahi hua'));
    },
  });

  const setStatus = useMutation({
    mutationFn: (body: { status: string; trackingNumber?: string; courierName?: string; courierCode?: string }) => onlineOrdersApi.setStatus(orderId, body),
    onSuccess: (r) => {
      refresh();
      setDispatchOpen(false);
      toast.success(STATUS_LABEL[r.orderStatus]?.label ?? 'Update ho gaya');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const cancel = useMutation({
    mutationFn: (reason: string) => onlineOrdersApi.cancel(orderId, reason),
    onSuccess: () => {
      refresh();
      setCancelOpen(false);
      toast.success(o?.nafaaSaleId ? 'Order cancel — bill void, stock wapas aa gaya' : 'Order cancel ho gaya');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const [rtoOpen, setRtoOpen] = useState(false);
  const returned = useMutation({
    mutationFn: (reason: string) => onlineOrdersApi.markReturned(orderId, reason),
    onSuccess: () => { refresh(); setRtoOpen(false); toast.success('Parcel wapas — bill void, stock wapas aa gaya'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const paid = useMutation({
    mutationFn: () => onlineOrdersApi.paymentReceived(orderId),
    onSuccess: () => { refresh(); toast.success('💰 Paisa mil gaya — mark ho gaya'); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (error || !o) {
    return (
      <div className="p-8 text-center">
        <div className="font-black text-slate-800 dark:text-white">Order nahi khula</div>
        <p className="mt-1 text-sm text-slate-500">{apiErrorMessage(error)}</p>
        <Button className="mt-4" variant="outline" onClick={onClose}>Band karein</Button>
      </div>
    );
  }

  const st = STATUS_LABEL[o.orderStatus] ?? STATUS_LABEL.PENDING;
  const src = sourceOf(o);
  const num = o.externalOrderNumber ?? o.externalOrderId;
  const isPending = o.orderStatus === 'PENDING';
  const isClosed = ['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus);
  const canRto = !!o.nafaaSaleId && !!o.dispatchedAt && !isClosed && !o.codSettledAt;
  const pay = PAYMENT_LABEL[o.paymentStatus] ?? PAYMENT_LABEL.PENDING;
  const track = () => {
    if (o.trackingNumber) navigator.clipboard?.writeText(o.trackingNumber).then(() => toast.success(`CN ${o.trackingNumber} copy — courier ke safhe par paste karein`));
    if (o.courierSite) window.open(o.courierSite, '_blank', 'noopener');
  };
  const unmatched = o.lines.filter((l) => !l.match).length;
  const lowStock = o.lines.filter((l) => l.match && !l.match.enough && isPending);
  const wa = waNumber(o.customerPhone);
  const mapsUrl = o.customerLat && o.customerLng
    ? `https://www.google.com/maps?q=${o.customerLat},${o.customerLng}`
    : o.customerAddress ? `https://www.google.com/maps/search/${encodeURIComponent(`${o.customerAddress} ${o.customerCity ?? ''}`)}` : null;

  const waText = encodeURIComponent(
    isPending || o.orderStatus === 'CONFIRMED'
      ? `Assalam o Alaikum ${o.customerName}! Aap ka order #${num} confirm ho gaya hai. Total ${rs(o.total)}. Shukriya 🙏`
      : o.orderStatus === 'OUT_FOR_DELIVERY'
        ? `Assalam o Alaikum ${o.customerName}! Aap ka order #${num} raste me hai 🚚${o.trackingNumber ? ` Tracking: ${o.trackingNumber}` : ''}${o.isCod && o.paymentStatus !== 'PAID' ? ` — ${rs(o.total)} cash tayyar rakhein.` : ''}`
        : `Assalam o Alaikum ${o.customerName}! Aap ke order #${num} ke baare me…`,
  );

  const copyAddress = () => {
    const text = [o.customerName, o.customerPhone, o.customerAddress, o.customerCity].filter(Boolean).join('\n');
    navigator.clipboard?.writeText(text).then(() => toast.success('Address copy ho gaya'));
  };

  return (
    <div className="flex h-full flex-col">
      {/* ─── Header ─── */}
      <div className="flex items-start gap-3 border-b border-slate-200 p-4 dark:border-neutral-800">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">#{num}</h2>
            <span className={cn('rounded-lg px-2 py-0.5 text-xs font-black', st.tone)}>{st.label}</span>
            {o.isTest && <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">TEST</span>}
          </div>
          <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {src.emoji} {o.integration?.displayName ?? src.label} · {whenText(o.receivedAt)}
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800" aria-label="Band karein">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* ─── Warnings ─── */}
        {o.metadata?.cancelRequested && !isClosed && (
          <Warn tone="rose" icon={<Ban className="h-4 w-4" />}>
            Customer ne website par ye order cancel kar diya hai. Bill ban chuka hai — neeche "Cancel" dabayein taake bill void ho aur stock wapas aaye.
          </Warn>
        )}
        {o.metadata?.autoAcceptError && isPending && (
          <Warn tone="amber" icon={<AlertTriangle className="h-4 w-4" />}>
            Khud accept nahi ho saka: {o.metadata.autoAcceptError}
          </Warn>
        )}
        {isPending && unmatched > 0 && (
          <Warn tone="amber" icon={<Link2 className="h-4 w-4" />}>
            {unmatched} item ka Nafaa product nahi mila. Accept dabayein — jodne ka safha khul jayega (sirf ek dafa).
          </Warn>
        )}
        {lowStock.length > 0 && (
          <Warn tone="rose" icon={<Package className="h-4 w-4" />}>
            Stock kam hai: {lowStock.map((l) => `${l.match!.name} (${l.match!.stock} hai, ${l.quantity} chahiye)`).join(', ')}
          </Warn>
        )}

        {o.autoBookError && !o.courierBooked && (
          <Warn tone="amber" icon={<Truck className="h-4 w-4" />}>
            Courier par khud booking nahi hui: {o.autoBookError}
          </Warn>
        )}

        <OrderBranchPicker order={o} onChanged={refresh} />

        <ConfirmCard order={o} onChanged={refresh} onRefused={() => setCancelOpen(true)} />

        {/* ─── Customer ─── */}
        <section className="rounded-2xl border border-slate-200 p-4 dark:border-neutral-800">
          <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Customer</div>
          <div className="text-base font-black text-slate-900 dark:text-white">{o.customerName}</div>
          {o.customerPhone && <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{o.customerPhone}</div>}
          {o.customerEmail && <div className="text-xs text-slate-500">{o.customerEmail}</div>}
          {(o.customerAddress || o.customerCity) && (
            <div className="mt-2 flex items-start gap-1.5 text-sm text-slate-700 dark:text-slate-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>{[o.customerAddress, o.customerCity].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <RiskCard risk={o.risk} />
          {o.notes && (
            <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
              📝 {o.notes}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {o.customerPhone && (
              <a href={`tel:${o.customerPhone}`} className={chip}><Phone className="h-3.5 w-3.5" /> Call</a>
            )}
            {wa && (
              <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noreferrer" className={cn(chip, 'text-emerald-700 dark:text-emerald-400')}>
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className={chip}><MapPin className="h-3.5 w-3.5" /> Map</a>
            )}
            <button onClick={copyAddress} className={chip}><Copy className="h-3.5 w-3.5" /> Address copy</button>
          </div>
        </section>

        <OrderExtras order={o} onChanged={refresh} />

        {/* ─── Items ─── */}
        <section className="rounded-2xl border border-slate-200 dark:border-neutral-800">
          <div className="border-b border-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:border-neutral-800">
            Items ({o.lines.length})
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {o.lines.map((l) => (
              <li key={l.index} className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-neutral-800">
                  {l.image || l.match?.image
                    ? <img src={l.image ?? l.match?.image ?? ''} alt="" className="h-full w-full object-cover" />
                    : <Package className="h-5 w-5 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {l.name}{l.variant ? <span className="text-slate-500"> · {l.variant}</span> : null}
                  </div>
                  <div className="text-xs text-slate-500">
                    {l.quantity} × {rs(l.price)}{l.sku ? ` · ${l.sku}` : ''}
                  </div>
                  {l.match ? (
                    <div className={cn('mt-0.5 text-[11px] font-bold', !isPending || l.match.enough ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600')}>
                      ✓ {l.match.name}{isPending ? ` · stock ${l.match.stock}` : ''}
                    </div>
                  ) : (
                    <div className="mt-0.5 text-[11px] font-bold text-amber-600">⚠ Nafaa product se jodna hai</div>
                  )}
                </div>
                <div className="text-sm font-black text-slate-800 dark:text-slate-100">{rs(l.lineTotal)}</div>
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-slate-100 px-4 py-3 text-sm dark:border-neutral-800">
            <Row label="Items" value={rs(o.subtotal)} />
            {o.discount > 0 && <Row label="Discount" value={`− ${rs(o.discount)}`} />}
            {o.deliveryFee > 0 && <Row label={`Delivery${o.metadata?.shippingMethod ? ` (${o.metadata.shippingMethod})` : ''}`} value={rs(o.deliveryFee)} />}
            <div className="flex items-center justify-between pt-1 text-base font-black text-slate-900 dark:text-white">
              <span>Total</span><span>{rs(o.total)}</span>
            </div>
          </div>
        </section>

        {/* ─── Payment ─── */}
        <section className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-neutral-800">
          <Wallet className="h-5 w-5 text-slate-400" />
          <div className="flex-1">
            <div className="text-sm font-black text-slate-900 dark:text-white">
              {o.metadata?.paymentTitle ?? o.paymentMethod ?? 'Cash on Delivery'}
            </div>
            <div className="text-xs text-slate-500">
              {o.paymentStatus === 'PAID'
                ? `Paisa mil gaya${o.paymentReceivedAt ? ` · ${whenText(o.paymentReceivedAt)}` : ''}${o.codSettlementRef ? ` · ref ${o.codSettlementRef}` : ''}`
                : o.paymentStatus === 'COLLECTED' ? `${o.courierLabel ?? 'Courier'} ne customer se le liya — aap ke paas settlement par aayega`
                  : o.paymentStatus === 'NOT_COLLECTED' ? 'Parcel wapas aaya — paisa nahi aayega'
                    : o.isCod ? 'Delivery par cash milega (COD)' : 'Payment baqi'}
            </div>
          </div>
          <span className={cn('rounded-lg px-2 py-1 text-xs font-black', pay.tone)}>{pay.label}</span>
          {o.paymentStatus !== 'PAID' && o.nafaaSaleId && !isClosed && (
            <Button size="xs" variant="outline" loading={paid.isPending} onClick={() => paid.mutate()}>Paisa mil gaya</Button>
          )}
        </section>

        {o.integration?.type !== 'DARAZ' && <PaymentLinkSection order={o} onChanged={refresh} />}

        {/* ─── Bill ─── */}
        {o.sale && (
          <section className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/5">
            <Receipt className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <div className="text-sm font-black text-slate-900 dark:text-white">Bill {o.sale.saleNumber}</div>
              <div className="text-xs text-slate-500">
                {o.sale.status === 'VOIDED' ? 'Void ho gaya — stock wapas aa gaya' : `${rs(o.sale.total)}${o.sale.shop ? ` · ${o.sale.shop.name}` : ''}`}
              </div>
            </div>
            {o.sale.status !== 'VOIDED' && (
              <div className="flex gap-1.5">
                <Button size="xs" variant="outline" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => window.open(`/online-orders/print?auto=1&ids=${o.id}`, '_blank')}>
                  Invoice
                </Button>
                <Button size="xs" variant="outline" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => navigate(`/sales/${o.sale!.id}/receipt`)}>
                  Receipt
                </Button>
              </div>
            )}
          </section>
        )}

        {/* ─── Timeline ─── */}
        <section className="rounded-2xl border border-slate-200 p-4 dark:border-neutral-800">
          <div className="mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400">Order ka safar</div>
          <ol className="space-y-2.5">
            <Step done at={o.receivedAt} label="Order aaya" icon={<Clock className="h-3.5 w-3.5" />} />
            <Step done={!!o.acceptedAt} at={o.acceptedAt} label="Accept — bill bana, stock kam hua" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
            <Step
              done={!!o.dispatchedAt}
              at={o.dispatchedAt}
              label={`Rider/courier ko diya${o.courierLabel ?? o.courierName ? ` (${o.courierLabel ?? o.courierName})` : ''}${o.trackingNumber ? ` · CN ${o.trackingNumber}` : ''}`}
              icon={<Truck className="h-3.5 w-3.5" />}
            />
            {o.orderStatus === 'RETURNED'
              ? <Step done bad at={o.returnedAt} label={`Parcel wapas aaya (RTO)${o.returnReason ? ` — ${o.returnReason}` : ''}`} icon={<Ban className="h-3.5 w-3.5" />} />
              : isClosed
              ? <Step done bad at={o.cancelledAt} label={`Cancel${o.cancelReason ? ` — ${o.cancelReason}` : ''}`} icon={<Ban className="h-3.5 w-3.5" />} />
              : <Step done={!!o.deliveredAt} at={o.deliveredAt} label="Customer ko mil gaya" icon={<Package className="h-3.5 w-3.5" />} />}
          </ol>
        </section>
        {o.integration?.type === 'DARAZ'
          ? <DarazOrderSection order={o} onChanged={refresh} />
          : <CourierSection order={o} onChanged={refresh} />}
        {o.trackingNumber && !o.courierBooked && (
          <section className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-neutral-800">
            <Truck className="h-5 w-5 text-slate-400" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-900 dark:text-white">{o.courierLabel ?? o.courierName ?? 'Courier'} · CN {o.trackingNumber}</div>
              <div className="text-xs text-slate-500">Track dabane se CN copy hota hai aur courier ka safha khulta hai</div>
            </div>
            <Button size="xs" variant="outline" onClick={track} leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>Track</Button>
          </section>
        )}
      </div>

      {/* ─── Actions ─── */}
      {!isClosed && (o.orderStatus !== 'DELIVERED' || canRto) && (
        <div className="border-t border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
          {isPending ? (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Button
                size="lg"
                variant="success"
                loading={accept.isPending}
                onClick={() => (unmatched > 0 ? setMatchOpen(true) : accept.mutate(undefined))}
                leftIcon={<CheckCircle2 className="h-5 w-5" />}
              >
                Accept + Bill banao
              </Button>
              <Button size="lg" variant="outline" onClick={() => setCancelOpen(true)}>Reject</Button>
            </div>
          ) : o.orderStatus === 'ACCEPTING' ? (
            <div className="flex items-center justify-center gap-2 p-2 text-sm font-bold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Bill ban raha hai…
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 [&>*:first-child]:flex-1">
              {o.nextStatus && (
                <Button
                  size="lg"
                  variant="primary"
                  loading={setStatus.isPending}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() =>
                    // Courier par book hai to CN/courier pehle se — seedha "raste me"
                    o.nextStatus === 'OUT_FOR_DELIVERY' && !o.courierBooked ? setDispatchOpen(true) : setStatus.mutate({ status: o.nextStatus! })
                  }
                >
                  {NEXT_ACTION[o.orderStatus] ?? 'Aage'}
                </Button>
              )}
              {canRto && (
                <Button size="lg" variant="outline" onClick={() => setRtoOpen(true)}>Wapas aaya (RTO)</Button>
              )}
              {o.orderStatus !== 'DELIVERED' && !o.dispatchedAt && (
                <Button size="lg" variant="ghost" className="text-rose-600" onClick={() => setCancelOpen(true)}>Cancel</Button>
              )}
            </div>
          )}
        </div>
      )}

      <MatchItemsModal
        open={matchOpen}
        lines={o.lines}
        loading={accept.isPending}
        onClose={() => setMatchOpen(false)}
        onConfirm={(m) => accept.mutate(m)}
      />

      <CancelModal
        open={cancelOpen}
        hasBill={!!o.nafaaSaleId}
        loading={cancel.isPending}
        onClose={() => setCancelOpen(false)}
        onConfirm={(r) => cancel.mutate(r)}
      />

      <DispatchModal
        open={dispatchOpen}
        order={o}
        loading={setStatus.isPending}
        onClose={() => setDispatchOpen(false)}
        onConfirm={(courierCode, courierName, trackingNumber) => setStatus.mutate({ status: 'OUT_FOR_DELIVERY', courierCode, courierName, trackingNumber })}
      />

      <RtoModal open={rtoOpen} loading={returned.isPending} onClose={() => setRtoOpen(false)} onConfirm={(r) => returned.mutate(r)} />
    </div>
  );
}

const chip =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-200 dark:hover:bg-neutral-800';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
      <span>{label}</span><span className="font-bold">{value}</span>
    </div>
  );
}

function Warn({ tone, icon, children }: { tone: 'amber' | 'rose'; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold',
      tone === 'amber'
        ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200'
        : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200',
    )}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Step({ done, bad, at, label, icon }: { done: boolean; bad?: boolean; at?: string | null; label: string; icon: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        bad ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/15'
          : done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-400 dark:bg-neutral-800',
      )}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-bold', done ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>{label}</div>
        {at && <div className="text-[11px] text-slate-500">{whenText(at)}</div>}
      </div>
    </li>
  );
}

function CancelModal({ open, hasBill, loading, onClose, onConfirm }: {
  open: boolean; hasBill: boolean; loading: boolean; onClose: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Order cancel karein?"
      description={hasBill ? 'Bill void ho jayega aur saara stock wapas inventory me aa jayega.' : 'Order cancel list me chala jayega.'}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Nahi</Button>
          <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>Haan, cancel</Button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {CANCEL_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-bold', reason === r
              ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-200')}
          >{r}</button>
        ))}
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Wajah likhein…"
        rows={2}
        className="mt-3 w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-sm outline-none focus:border-rose-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
      />
    </Modal>
  );
}

function DispatchModal({ open, order, loading, onClose, onConfirm }: {
  open: boolean; order: OnlineOrderDetail; loading: boolean; onClose: () => void;
  onConfirm: (courierCode?: string, courierName?: string, trackingNumber?: string) => void;
}) {
  const [code, setCode] = useState(order.courierCode ?? '');
  const [other, setOther] = useState(order.courierCode === 'OTHER' ? order.courierName ?? '' : '');
  const [tracking, setTracking] = useState(order.trackingNumber ?? '');
  const isRider = code === 'RIDER';
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Rider / courier ko de diya"
      description="Courier chunein aur CN daalein — tracking aur COD ka hisaab courier-wise banega."
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Wapas</Button>
          <Button loading={loading} disabled={!code} leftIcon={<Truck className="h-4 w-4" />}
            onClick={() => onConfirm(code || undefined, code === 'OTHER' ? other.trim() || undefined : undefined, tracking.trim() || undefined)}>
            Raste me hai
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-1.5">
        {COURIER_OPTIONS.map((c) => (
          <button key={c.code} onClick={() => setCode(c.code)}
            className={cn('rounded-lg border px-2 py-2 text-xs font-bold', code === c.code
              ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-200')}>
            {c.name}
          </button>
        ))}
      </div>
      {code === 'OTHER' && (
        <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Courier ka naam"
          className="mt-3 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
      )}
      {!isRider && (
        <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="CN / tracking number"
          className="mt-3 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-slate-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
      )}
      {order.isCod && order.paymentStatus !== 'PAID' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Wallet className="h-3.5 w-3.5" />
          {isRider ? `Rider ko ${rs(order.total)} wasool karne hain` : `COD ${rs(order.total)} — deliver ke baad courier ke paas, settlement par aap ko milega`}
        </p>
      )}
    </Modal>
  );
}

function RtoModal({ open, loading, onClose, onConfirm }: { open: boolean; loading: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const reasons = ['Customer ne parcel nahi liya', 'Phone band / nahi utha', 'Address ghalat', 'Customer ne mana kar diya', 'Fake order'];
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Parcel wapas aaya (RTO)?"
      description="Bill void ho jayega aur saara stock wapas inventory me. COD ka paisa nahi aayega."
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Nahi</Button>
          <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>Haan, wapas aaya</Button>
        </div>
      }>
      <div className="flex flex-wrap gap-1.5">
        {reasons.map((r) => (
          <button key={r} onClick={() => setReason(r)}
            className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-bold', reason === r
              ? 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-slate-200')}>{r}</button>
        ))}
      </div>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Wajah…"
        className="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-rose-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
    </Modal>
  );
}
