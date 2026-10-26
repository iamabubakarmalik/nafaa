/**
 * One glasses or repair order: where it stands (timeline), the eye power,
 * frame and lens, the money (advance, payments, what is left) and the bill
 * once handed over. Actions follow the order's step: send to lab, back from
 * lab, ready, take payment, hand over, cancel, print the slips, WhatsApp.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Eye, FlaskConical, Glasses, MessageCircle, Printer, Receipt, Wallet, Wrench, XCircle } from 'lucide-react';
import { Button, Card, PageHero, PageShell, Skeleton, heroButton } from '@/design-system/components';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { usePrinter } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { lensOrdersApi, type LensOrderStatus } from '../api/lens-orders.api';
import { OrderDialogs, useOrderActions, type OrderDialog } from '../components/OrderModals';
import { Box, Pill, PowerTable } from '../components/ui';
import { OPTICAL_KEYS, dateTime, dayOnly, isOrderClosed, isOrderReady, nextOrderStep, orderStatusOf, waLink } from '../lib/meta';
import { labDoc, orderDoc } from '../lib/print';

const STEPS: Array<{ key: string; label: string; done: (s: LensOrderStatus) => boolean }> = [
  { key: 'o', label: 'Order', done: () => true },
  { key: 'l', label: 'Lab', done: (s) => !['ORDERED'].includes(s) },
  { key: 'r', label: 'Lab se aaya', done: (s) => ['RECEIVED', 'QC_PASSED', 'FITTED', 'READY', 'DELIVERED'].includes(s) },
  { key: 't', label: 'Tayyar', done: (s) => ['FITTED', 'READY', 'DELIVERED'].includes(s) },
  { key: 'd', label: 'De diya', done: (s) => s === 'DELIVERED' },
];

export default function LensOrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { sales: money } = useMasked();
  const { print } = usePrinter();
  const canBill = usePermission(PERMISSIONS.POS_USE);
  const [dialog, setDialog] = useState<OrderDialog>(null);
  const actions = useOrderActions(() => setDialog(null));
  const q = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'one', id], queryFn: () => lensOrdersApi.getOne(id) });
  const o = q.data;

  if (q.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-80 rounded-2xl lg:col-span-2" /><Skeleton className="h-80 rounded-2xl" /></div></PageShell>;
  if (!o) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Ye order nahi mila</p>
          <Button className="mt-3" variant="secondary" onClick={() => navigate('/optical/lens-orders')}>Orders par wapas</Button>
        </div>
      </PageShell>
    );
  }

  const repair = o.computed.isRepair;
  const closed = isOrderClosed(o.status);
  const step = nextOrderStep(o.status, repair);
  const ready = isOrderReady(o.status);
  const wa = waLink(o.customerPhone, ready
    ? `Assalam o alaikum ${o.customerName}, aap ka ${repair ? 'chashma repair ho kar' : 'chashma'} tayyar hai (${o.orderNumber}).${o.remainingAmount > 0 ? ` Baqi: Rs ${o.remainingAmount}.` : ''} Shukriya.`
    : `Assalam o alaikum ${o.customerName}, aap ka order ${o.orderNumber} ${dayOnly(o.expectedDate)} tak tayyar hoga.`);
  const power = o.prescription ?? o;
  const notes = (o.notes ?? '').split('\n').filter(Boolean);

  return (
    <PageShell>
      <OrderDialogs dialog={dialog} close={() => setDialog(null)} actions={actions} />
      <PageHero
        title={(
          <span className="inline-flex items-center gap-2">
            {o.orderNumber}
            <Pill meta={orderStatusOf(o.status)} className="bg-white/90" />
            {repair && <span className="rounded-full bg-amber-300/90 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-950">Repair</span>}
            {o.computed.isOverdue && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[0.6875rem] font-semibold">Late</span>}
          </span>
        )}
        subtitle={<>{o.customerName} · {o.customerPhone} · order {dayOnly(o.orderedAt)} · {o.computed.daysWaiting} din se</>}
        back={() => navigate(-1)}
        actions={(
          <>
            {wa && !closed && <a href={wa} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            <button type="button" onClick={() => void print(orderDoc(o, repair))} className={heroButton}><Printer className="h-4 w-4" />Parchi</button>
            {!repair && <button type="button" onClick={() => void print(labDoc(o))} className={heroButton}><FlaskConical className="h-4 w-4" />Lab parchi</button>}
          </>
        )}
      />

      {o.status !== 'CANCELLED' && (
        <ol className="grid grid-cols-5 gap-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
          {(repair ? STEPS.filter((s) => s.key !== 'l' && s.key !== 'r') : STEPS).map((s) => {
            const done = s.done(o.status);
            return (
              <li key={s.key} className="text-center">
                <span className={`mx-auto block h-2 rounded-full ${done ? 'bg-success-500' : 'bg-slate-200'}`} />
                <span className={`mt-1 block text-[0.75rem] ${done ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {canBill && !closed && (
        <div className="flex flex-wrap gap-2">
          {step && (step[0] === 'SENT_TO_LAB'
            ? <Button leftIcon={<FlaskConical className="h-4 w-4" />} onClick={() => setDialog({ kind: 'lab', order: o })}>{step[1]}</Button>
            : <Button variant={ready ? 'secondary' : 'primary'} loading={actions.step.isPending} onClick={() => actions.step.mutate({ o, status: step[0] as LensOrderStatus })}>{step[1]}</Button>)}
          {ready && <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setDialog({ kind: 'deliver', order: o })}>Customer ko de diya</Button>}
          {o.remainingAmount > 0.009 && <Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setDialog({ kind: 'pay', order: o })}>Payment lein</Button>}
          {['SENT_TO_LAB', 'AT_LAB'].includes(o.status) && <Button variant="ghost" onClick={() => setDialog({ kind: 'lab', order: o })}>Lab / date badlein</Button>}
          <Button variant="ghost" className="text-rose-700" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setDialog({ kind: 'cancel', order: o })}>Cancel</Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          {!repair && (
            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Eye className="h-4 w-4 text-brand-600" />Number</span>}
              actions={o.prescription && <Link to={`/optical/prescriptions/${o.prescription.id}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{o.prescription.prescriptionNumber} →</Link>}>
              <PowerTable p={power} />
            </Card>
          )}
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2">{repair ? <Wrench className="h-4 w-4 text-brand-600" /> : <Glasses className="h-4 w-4 text-brand-600" />}{repair ? 'Frame aur kaam' : 'Frame aur lens'}</span>}>
            <dl className="grid gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-2">
              <div><dt className="text-[0.75rem] text-slate-500">Frame</dt><dd className="font-medium text-slate-900">{o.frameName}{o.frameProductId && <Link to={`/products/${o.frameProductId}`} className="ml-1 text-[0.75rem] text-brand-700 hover:underline">stock</Link>}</dd></div>
              {!repair && <div><dt className="text-[0.75rem] text-slate-500">Lens</dt><dd className="font-medium text-slate-900">{[o.lensType, o.lensIndex, o.lensMaterial].filter(Boolean).join(' · ')}</dd></div>}
              {!repair && o.lensCoatings.length > 0 && <div><dt className="text-[0.75rem] text-slate-500">Coating</dt><dd>{o.lensCoatings.join(', ')}</dd></div>}
              <div><dt className="text-[0.75rem] text-slate-500">{repair ? 'Kahan' : 'Lab'}</dt><dd>{o.labName ?? (repair ? 'Dukaan me' : '—')}{o.labOrderRef && <span className="text-slate-500"> · {o.labOrderRef}</span>}</dd></div>
              <div><dt className="text-[0.75rem] text-slate-500">Tayyar date</dt><dd className={o.computed.isOverdue ? 'font-semibold text-rose-600' : ''}>{dayOnly(o.expectedDate)}</dd></div>
              {o.receivedAt && <div><dt className="text-[0.75rem] text-slate-500">Lab se aaya</dt><dd>{dateTime(o.receivedAt)}</dd></div>}
              {o.deliveredAt && <div><dt className="text-[0.75rem] text-slate-500">Customer ko diya</dt><dd>{dateTime(o.deliveredAt)}</dd></div>}
              {o.fittingNotes && <div className="sm:col-span-2"><dt className="text-[0.75rem] text-slate-500">Fitting note</dt><dd>{o.fittingNotes}</dd></div>}
            </dl>
          </Card>
          {notes.length > 0 && (
            <Card className="rounded-2xl" title="Record">
              <ul className="space-y-1 text-[0.8125rem] text-slate-700">{notes.map((n, i) => <li key={i} className="flex gap-2"><span className="text-slate-400">•</span>{n}</li>)}</ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Hisaab</span>}>
            <dl className="space-y-1.5 text-[0.875rem]">
              {o.framePrice > 0 && <div className="flex justify-between"><dt className="text-slate-600">Frame</dt><dd className="tabular-nums">{money(o.framePrice)}</dd></div>}
              {o.lensPrice > 0 && <div className="flex justify-between"><dt className="text-slate-600">{repair ? 'Repair' : 'Lens'}</dt><dd className="tabular-nums">{money(o.lensPrice)}</dd></div>}
              {o.fittingCharge > 0 && <div className="flex justify-between"><dt className="text-slate-600">Fitting</dt><dd className="tabular-nums">{money(o.fittingCharge)}</dd></div>}
            </dl>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              <Box label="Kul" value={money(o.totalPrice)} />
              <Box label="Mila" value={money(o.paidAmount)} tone="text-success-700" />
              <Box label={o.status === 'DELIVERED' ? 'Khata me' : 'Baqi'} value={money(o.remainingAmount)} tone={o.remainingAmount > 0 ? 'text-amber-700' : 'text-slate-900'} />
            </dl>
            {o.booking && <p className="mt-3 text-[0.75rem] text-slate-500">Advance aur payments booking {o.booking.bookingNumber} par — har payment usi din ke cash me.</p>}
            {o.sale && (
              <Link to={`/sales?search=${o.sale.saleNumber}`} className="mt-3 flex items-center justify-between rounded-xl bg-success-50 px-3 py-2.5 text-[0.875rem] ring-1 ring-success-200 hover:bg-success-100">
                <span className="inline-flex items-center gap-2 font-semibold text-success-800"><Receipt className="h-4 w-4" />Bill {o.sale.saleNumber}</span>
                <span className="tabular-nums">{money(o.sale.total)}{o.sale.status === 'VOIDED' && <span className="ml-1 text-rose-600">void</span>}</span>
              </Link>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
