/**
 * One booking: items, money, payment history, pickup timing and every
 * action — payment, ready, sale at pickup, new date, WhatsApp reminder,
 * slip print, cancel and (once cancelled) delete.
 *
 * Keys: P payment · C sale · R ready · D date · S slip · W WhatsApp · X cancel · G guide.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlarmClock, ArrowLeft, BookmarkPlus, CalendarClock, Copy, GraduationCap, MessageCircle, PackageCheck, Phone, Printer, Receipt,
  ShoppingCart, StickyNote, Trash2, Undo2, UserRound, Wallet, XCircle,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Button, Card, Modal, PageHero, PageShell, Skeleton, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import { bookingsApi } from '../api/bookings.api';
import { CancelModal, ConvertModal, PaymentModal, RescheduleModal, useMarkReady, useRefreshBookings } from '../components/ActionModals';
import { BookingPrintModal } from '../components/BookingPrintModal';
import { BOOKINGS_KEY, PICKUP, STATUS, apiError, bookingWaLink, daysFromPickup, dayText, isOpen, itemLabel, pickupState, qtyText, when } from '../components/meta';

type Dialog = 'pay' | 'convert' | 'cancel' | 'date' | 'print' | 'delete';
const method = (m: string) => POS_PAYMENT_METHODS.find((x) => x.id === m)?.label ?? m;

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const shopName = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const guide = usePageGuide();
  const ready = useMarkReady();
  const refresh = useRefreshBookings();

  const q = useQuery({ queryKey: [BOOKINGS_KEY, 'one', id], queryFn: () => bookingsApi.getOne(id!), enabled: !!id });
  const b = q.data;

  const remove = useMutation({
    mutationFn: () => bookingsApi.remove(id!),
    onSuccess: () => { toast.success('Booking mita di'); refresh(); navigate('/bookings'); },
    onError: (e) => toast.error(apiError(e, 'Mitayi nahi gayi')),
  });

  const active = !!b && isOpen(b);
  const canPay = active && b.balanceDue > 0;
  const wa = b ? bookingWaLink(b, shopName, startHour) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!b || e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      const hit = (d: Dialog) => { e.preventDefault(); setDialog(d); };
      if (k === 'p' && canPay) hit('pay');
      else if (k === 'c' && active) hit('convert');
      else if (k === 'x' && active) hit('cancel');
      else if (k === 'd' && active) hit('date');
      else if (k === 's') hit('print');
      else if (k === 'r' && active) { e.preventDefault(); ready.mutate({ id: b.id, ready: b.status !== 'READY_FOR_PICKUP' }); }
      else if (k === 'w' && wa) { e.preventDefault(); window.open(wa, '_blank'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [b, canPay, active, wa, ready]);

  if (q.isLoading) {
    return <PageShell><Skeleton className="h-32 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-80 rounded-3xl lg:col-span-2" /><Skeleton className="h-80 rounded-3xl" /></div></PageShell>;
  }
  if (!b) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <BookmarkPlus className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">Booking nahi mili</p>
          <p className="mt-1 text-sm text-slate-500">Shayad mita di gayi ya doosri branch ki hai.</p>
          <Link to="/bookings" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" />Bookings par wapas</Link>
        </div>
      </PageShell>
    );
  }

  const s = STATUS[b.status];
  const ps = pickupState(b, startHour);
  const late = ps === 'overdue' && b.expectedPickupAt ? daysFromPickup(b.expectedPickupAt, startHour) : 0;
  const expired = active && b.expiresAt && new Date(b.expiresAt).getTime() < Date.now();
  const paid = b.totalPaid - b.totalRefunded;
  const pct = b.total > 0 ? Math.min(100, (b.totalPaid / b.total) * 100) : 0;
  const copy = () => { void navigator.clipboard?.writeText(b.bookingNumber); toast.success(`${b.bookingNumber} copy ho gaya`); };

  return (
    <PageShell>
      <Link to="/bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700"><ArrowLeft className="h-4 w-4" />Bookings</Link>

      <PageHero
        title={<button type="button" onClick={copy} title="Copy" className="inline-flex items-center gap-2">{b.bookingNumber}<Copy className="h-4 w-4 opacity-60" /></button>}
        chip={<><s.icon /> {s.label}</>}
        meta={`${b.customer?.name ?? ''} · ${when(b.createdAt)}${b.createdBy ? ` · ${b.createdBy.fullName}` : ''}`}
        busy={q.isFetching}
        actions={<>
          {wa && <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp (W)" className={heroButton}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
          <button type="button" onClick={() => setDialog('print')} title="Slip print (S)" className={heroButton}><Printer className="h-4 w-4" />Slip</button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {active && <button type="button" onClick={() => setDialog('convert')} title="Bikri (C)" className={heroPrimaryButton}><ShoppingCart className="h-4 w-4" />Bikri karein</button>}
          {b.sale && <Link to={`/sales/${b.sale.id}/receipt`} className={heroPrimaryButton}><Receipt className="h-4 w-4" />Bill {b.sale.saleNumber}</Link>}
        </>}
        stats={[
          { label: 'Kul', value: formatPKR(b.total), hint: `${b.items?.length ?? 0} cheez` },
          { label: 'Diya', value: formatPKR(paid), hint: b.totalRefunded ? `${formatPKR(b.totalRefunded)} wapas` : undefined },
          { label: 'Baqi', value: formatPKR(active ? b.balanceDue : 0) },
          { label: 'Pickup', value: b.expectedPickupAt ? dayText(b.expectedPickupAt) : '—' },
        ]}
      />

      {ps === 'overdue' && (
        <Banner tone="rose" icon={AlarmClock} text={`Pickup ka din ${late} din pehle guzar gaya. Customer ko yaad dilayein ya nayi tareekh rakhein.`}
          action={<>{wa && <a href={wa} target="_blank" rel="noreferrer" className="text-[0.8125rem] font-semibold underline">WhatsApp</a>}<button type="button" onClick={() => setDialog('date')} className="text-[0.8125rem] font-semibold underline">Tareekh badlein</button></>} />
      )}
      {(ps === 'today' || ps === 'tomorrow') && <Banner tone="amber" icon={CalendarClock} text={`${PICKUP[ps].label} — maal tayyar rakhein${b.balanceDue > 0 ? `, ${formatPKR(b.balanceDue)} wasool karne hain` : ''}.`} />}
      {expired && <Banner tone="rose" icon={AlarmClock} text={`Aakhri din (${dayText(b.expiresAt)}) guzar gaya. Booking khud cancel nahi hoti — faisla karein.`} />}
      {b.status === 'CANCELLED' && <Banner tone="slate" icon={XCircle} text={`Cancel ${b.cancelledAt ? when(b.cancelledAt) : ''}${b.cancelReason ? ` — ${b.cancelReason}` : ''}. ${b.totalRefunded ? `${formatPKR(b.totalRefunded)} wapas diye.` : b.totalPaid ? `${formatPKR(b.totalPaid)} advance customer ke khate me jama hai.` : ''}`} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="rounded-3xl" title="Cheezen" description={active ? 'Booking ke waqt stock nahi ghatta; bikri par is branch se nikalta hai' : undefined}>
            <ul className="divide-y divide-slate-100">
              {(b.items ?? []).map((i) => (
                <li key={i.id} className="flex items-start gap-3 py-2.5">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[0.75rem] font-semibold text-slate-600" style={i.variant?.colorHex ? { backgroundColor: i.variant.colorHex } : undefined}>
                    {i.variant?.colorHex ? '' : qtyText(i.quantity)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{itemLabel(i)}</p>
                    <p className="text-[0.75rem] text-slate-500">{qtyText(i.quantity)} {i.product?.unit ?? ''} × {formatPKR(i.price)}{i.lineDiscount ? ` · chhoot ${formatPKR(i.lineDiscount)}` : ''}</p>
                    {(i.imei || i.cutPiece || i.roll) && (
                      <p className="mt-0.5 text-[0.75rem] text-slate-600">
                        {i.imei && <>IMEI <span className="font-mono">{i.imei.imei1}</span></>}
                        {i.cutPiece && <>Piece {i.cutPiece.pieceCode} · {i.cutPiece.widthFt}×{i.cutPiece.lengthFt} ft</>}
                        {i.roll && <>Roll {i.roll.rollNumber}{i.cutSqft ? ` · ${qtyText(i.cutSqft)} sqft` : ''}</>}
                      </p>
                    )}
                    {i.note && <p className="mt-0.5 text-[0.75rem] text-slate-600">{i.note}</p>}
                    {i.internalNote && <p className="mt-0.5 text-[0.75rem] italic text-slate-500">Team: {i.internalNote}</p>}
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-slate-900">{formatPKR(i.total)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-slate-100 pt-3 text-[0.875rem]">
              <Line k="Subtotal" v={formatPKR(b.subtotal)} />
              {b.discount > 0 && <Line k="Chhoot" v={`−${formatPKR(b.discount)}`} />}
              {(b.serviceChargesBreakdown ?? []).map((c, n) => <Line key={n} k={c.label} v={`+${formatPKR(Number(c.amount))}`} />)}
              <Line k="Kul" v={formatPKR(b.total)} strong />
            </dl>
          </Card>

          <Card className="rounded-3xl" title="Payments" description="Har advance, baad ki payment aur wapsi"
            actions={canPay ? <Button size="sm" onClick={() => setDialog('pay')} leftIcon={<Wallet className="h-4 w-4" />}>Payment (P)</Button> : undefined}>
            <div className="mb-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
              <p className="mt-1 text-[0.75rem] text-slate-500">{Math.round(pct)}% mil chuka · baqi {formatPKR(active ? b.balanceDue : 0)}</p>
            </div>
            {!(b.payments ?? []).length ? <p className="py-6 text-center text-sm text-slate-500">Abhi koi payment nahi aayi</p> : (
              <ul className="divide-y divide-slate-100">
                {(b.payments ?? []).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900">{p.type === 'REFUND' ? 'Wapsi' : p.type === 'ADVANCE' ? 'Advance' : 'Mazeed payment'} · {method(p.paymentMethod)}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500">{when(p.paidAt)}{p.createdBy ? ` · ${p.createdBy.fullName}` : ''}{p.notes ? ` · ${p.notes}` : ''}{p.reference ? ` · ${p.reference}` : ''}</span>
                    </span>
                    <span className={cn('shrink-0 font-semibold tabular-nums', p.type === 'REFUND' ? 'text-rose-700' : 'text-emerald-700')}>{p.type === 'REFUND' ? '−' : '+'}{formatPKR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-3xl" title="Customer">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><UserRound className="h-5 w-5" /></span>
              <div className="min-w-0">
                <Link to={`/customers/${b.customerId}`} className="block truncate font-semibold text-slate-900 hover:text-brand-700">{b.customer?.name}</Link>
                {b.customer?.phone && <a href={`tel:${b.customer.phone}`} className="inline-flex items-center gap-1 text-[0.8125rem] text-slate-600 hover:text-brand-700"><Phone className="h-3.5 w-3.5" />{b.customer.phone}</a>}
              </div>
            </div>
            {typeof b.customer?.balance === 'number' && b.customer.balance !== 0 && (
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] ring-1 ring-slate-200">
                Khata: <b className={cn('tabular-nums', b.customer.balance > 0 ? 'text-rose-700' : 'text-emerald-700')}>{b.customer.balance > 0 ? `${formatPKR(b.customer.balance)} dena hai` : `${formatPKR(-b.customer.balance)} jama hai`}</b>
              </p>
            )}
          </Card>

          <Card className="rounded-3xl" title="Waqt" actions={active ? <Button size="sm" variant="secondary" onClick={() => setDialog('date')} leftIcon={<CalendarClock className="h-4 w-4" />}>Badlein</Button> : undefined}>
            <dl className="space-y-2 text-[0.8125rem]">
              <Line k="Booking" v={when(b.createdAt)} />
              <Line k="Pickup" v={b.expectedPickupAt ? dayText(b.expectedPickupAt) : 'Nahi rakhi'} />
              {b.expiresAt && <Line k="Aakhri din" v={dayText(b.expiresAt)} />}
              {b.convertedAt && <Line k="Bikri" v={when(b.convertedAt)} />}
              {b.shop && <Line k="Branch" v={b.shop.name} />}
            </dl>
          </Card>

          {active && (
            <Card className="rounded-3xl" title="Kaam">
              <div className="grid gap-2">
                <Button onClick={() => setDialog('convert')} leftIcon={<ShoppingCart className="h-4 w-4" />}>Bikri karein (C)</Button>
                {canPay && <Button variant="secondary" onClick={() => setDialog('pay')} leftIcon={<Wallet className="h-4 w-4" />}>Payment lein (P)</Button>}
                {b.status === 'READY_FOR_PICKUP'
                  ? <Button variant="ghost" loading={ready.isPending} onClick={() => ready.mutate({ id: b.id, ready: false })} leftIcon={<Undo2 className="h-4 w-4" />}>Abhi tayyar nahi (R)</Button>
                  : <Button variant="secondary" loading={ready.isPending} onClick={() => ready.mutate({ id: b.id, ready: true })} leftIcon={<PackageCheck className="h-4 w-4" />}>Tayyar hai (R)</Button>}
                <Button variant="ghost" className="text-rose-700" onClick={() => setDialog('cancel')} leftIcon={<XCircle className="h-4 w-4" />}>Cancel (X)</Button>
              </div>
              <p className="mt-2 text-[0.6875rem] text-slate-500">"Tayyar" par customer ko WhatsApp bhejein: maal le jayein.</p>
            </Card>
          )}

          {(b.notes || b.internalNotes) && (
            <Card className="rounded-3xl" title={<span className="inline-flex items-center gap-2"><StickyNote className="h-4 w-4 text-amber-500" />Notes</span>}>
              {b.notes && <p className="whitespace-pre-line text-[0.8125rem] text-slate-800">{b.notes}</p>}
              {b.internalNotes && <p className="mt-2 whitespace-pre-line rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Team: {b.internalNotes}</p>}
            </Card>
          )}

          {(b.status === 'CANCELLED' || b.status === 'EXPIRED') && (
            <Button variant="ghost" className="w-full text-rose-700" onClick={() => setDialog('delete')} leftIcon={<Trash2 className="h-4 w-4" />}>Booking mitayein</Button>
          )}
        </div>
      </div>

      {dialog === 'pay' && <PaymentModal booking={b} onClose={() => setDialog(null)} />}
      {dialog === 'convert' && <ConvertModal booking={b} onClose={() => setDialog(null)} />}
      {dialog === 'cancel' && <CancelModal booking={b} onClose={() => setDialog(null)} />}
      {dialog === 'date' && <RescheduleModal booking={b} onClose={() => setDialog(null)} />}
      {dialog === 'print' && <BookingPrintModal booking={b} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && (
        <Modal open onClose={() => setDialog(null)} size="sm" title="Booking mitayein?" description="Record hamesha ke liye hat jayega. Khate ki entries rahengi."
          footer={<>
            <Button variant="secondary" onClick={() => setDialog(null)}>Rehne dein</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()} leftIcon={<Trash2 className="h-4 w-4" />}>Mitayein</Button>
          </>}>
          <p className="text-sm text-slate-600">{b.bookingNumber} · {b.customer?.name}</p>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title="Booking — kya kya kar sakte hain" onClose={guide.close}
          steps={[
            { icon: Wallet, color: '#16a34a', title: 'Payment', text: 'Customer aur paise de to "Payment lein". Poora paisa aate hi booking "Tayyar" ho jati hai.' },
            { icon: PackageCheck, color: '#7c3aed', title: 'Tayyar', text: 'Maal tayyar ho jaye to "Tayyar hai" dabayein aur WhatsApp par customer ko bata dein.' },
            { icon: ShoppingCart, color: '#2563eb', title: 'Bikri', text: 'Customer maal le jaye to "Bikri karein": bill banta hai, stock nikalta hai, advance bill me lagta hai.' },
            { icon: CalendarClock, color: '#d97706', title: 'Tareekh', text: 'Pickup aage peeche ho to "Badlein" se nayi tareekh rakhein.' },
            { icon: XCircle, color: '#e11d48', title: 'Cancel', text: 'Advance wapas dein ya khate me rehne dein. Reserve IMEI aur piece wapas stock me.' },
          ]}
          shortcuts={[['P', 'payment'], ['C', 'bikri'], ['R', 'tayyar'], ['D', 'tareekh'], ['S', 'slip'], ['W', 'WhatsApp'], ['X', 'cancel'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'border-t border-slate-100 pt-1.5 text-base font-bold text-slate-900')}>
      <dt className={strong ? '' : 'text-slate-500'}>{k}</dt><dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function Banner({ tone, icon: I, text, action }: { tone: 'rose' | 'amber' | 'slate'; icon: typeof AlarmClock; text: string; action?: ReactNode }) {
  const cls = { rose: 'bg-rose-50 text-rose-900 ring-rose-200', amber: 'bg-amber-50 text-amber-900 ring-amber-200', slate: 'bg-slate-100 text-slate-800 ring-slate-200' }[tone];
  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-2xl px-4 py-2.5 text-[0.8125rem] ring-1', cls)}>
      <I className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{text}</span>{action && <span className="flex gap-3">{action}</span>}
    </div>
  );
}
