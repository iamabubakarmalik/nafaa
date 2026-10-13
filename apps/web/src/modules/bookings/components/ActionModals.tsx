/**
 * Dialogs for the money and status actions on one booking: take a payment,
 * turn it into a sale, cancel (with or without giving the advance back) and
 * change the pickup date. Each refreshes bookings, the customer's khata and,
 * on a sale, stock and sales history.
 */

import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Ban, CalendarClock, ShoppingCart, Wallet } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { withManagerPin } from '@core/security/ManagerPin';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import { STOCK_KEYS } from '@modules/inventory/stock-adjustments/components/meta';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { bookingsApi, type Booking } from '../api/bookings.api';
import { BOOKINGS_KEY, apiError } from './meta';

const CUSTOMER_KEYS = ['customers', 'customers-directory', 'customer', 'customer-ledger', 'customers-for-pos'];
const SALE_KEYS = ['sales-history', 'sales-list', 'sales-summary', 'products-for-pos', ...STOCK_KEYS];

/** Refreshes everything a booking action can change. */
export function useRefreshBookings() {
  const qc = useQueryClient();
  return (sale = false) => {
    [BOOKINGS_KEY, ...CUSTOMER_KEYS, ...(sale ? SALE_KEYS : [])].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
}

const inputCls = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{children}</label>;
}
function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[0.6875rem] text-slate-500">{children}</p>;
}

function MethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5" role="radiogroup" aria-label="Kaise diya">
      {POS_PAYMENT_METHODS.map((m) => (
        <button key={m.id} type="button" role="radio" aria-checked={value === m.id} onClick={() => onChange(m.id as PaymentMethod)}
          className={cn('inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[0.8125rem] font-medium ring-1 transition',
            value === m.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
          <m.icon className="h-4 w-4" />{m.label}
        </button>
      ))}
    </div>
  );
}

function Money({ b }: { b: Booking }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200">
      <div><p className="text-[0.6875rem] text-slate-500">Kul</p><p className="font-semibold tabular-nums text-slate-900">{formatPKR(b.total)}</p></div>
      <div><p className="text-[0.6875rem] text-slate-500">Diya</p><p className="font-semibold tabular-nums text-emerald-700">{formatPKR(b.totalPaid)}</p></div>
      <div><p className="text-[0.6875rem] text-slate-500">Baqi</p><p className="font-semibold tabular-nums text-amber-700">{formatPKR(b.balanceDue)}</p></div>
    </div>
  );
}

function AmountField({ id, value, onChange, max, label, hint }: { id: string; value: string; onChange: (v: string) => void; max: number; label: string; hint: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} type="number" inputMode="decimal" min={0} max={max} step="any" value={value} onChange={(e) => onChange(e.target.value)} data-autofocus
        placeholder="0" className={cn(inputCls, 'h-12 text-lg font-semibold tabular-nums')} />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {[['Poora', 1], ['Aadha', 0.5], ['25%', 0.25]].map(([l, f]) => (
          <button key={l} type="button" onClick={() => onChange(String(Math.round(max * Number(f))))}
            className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
            {l}{f === 1 ? ` (${formatPKR(max)})` : ''}
          </button>
        ))}
      </div>
      <Hint>{hint}</Hint>
    </div>
  );
}

export function PaymentModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const refresh = useRefreshBookings();
  const [amount, setAmount] = useState(String(booking.balanceDue));
  const [method, setMethod] = useState<PaymentMethod>(booking.paymentMethod ?? 'CASH');
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;
  const bad = n <= 0 ? 'Amount likhein' : n > booking.balanceDue + 0.01 ? `Baqi sirf ${formatPKR(booking.balanceDue)} hai` : '';

  const run = useMutation({
    mutationFn: () => bookingsApi.addPayment(booking.id, { amount: n, paymentMethod: method, notes: note.trim() || undefined }),
    onSuccess: (b) => { toast.success(b.balanceDue <= 0 ? 'Poori payment aa gayi, booking tayyar' : `${formatPKR(n)} mil gaye`); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Payment nahi likhi gayi')),
  });

  return (
    <Modal open onClose={onClose} size="md" title="Payment lein" description={`${booking.bookingNumber} · ${booking.customer?.name ?? ''}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={run.isPending} disabled={!!bad} onClick={() => run.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>
          {formatPKR(n)} likhein
        </Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!bad && !run.isPending) run.mutate(); }}>
        <Money b={booking} />
        <AmountField id="pay-amount" value={amount} onChange={setAmount} max={booking.balanceDue} label="Kitne mile"
          hint={bad || 'Customer ke khate me jama hota hai; bikri par bill me lag jata hai'} />
        <div><p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kaise diya</p><MethodPicker value={method} onChange={setMethod} /></div>
        <div>
          <Label htmlFor="pay-note">Note</Label>
          <input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Maslan: transaction ID" className={inputCls} />
          <Hint>Marzi hai. Bank ya JazzCash ka number likh dein to baad me milana aasaan.</Hint>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export function ConvertModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const refresh = useRefreshBookings();
  const navigate = useNavigate();
  const [amount, setAmount] = useState(String(booking.balanceDue));
  const [method, setMethod] = useState<PaymentMethod>(booking.paymentMethod ?? 'CASH');
  const n = Number(amount) || 0;
  const udhaar = Math.max(booking.balanceDue - n, 0);
  const bad = n < 0 ? 'Amount ghalat hai' : n > booking.balanceDue + 0.01 ? `Baqi sirf ${formatPKR(booking.balanceDue)} hai` : '';

  const run = useMutation({
    mutationFn: () => bookingsApi.convert(booking.id, { additionalPayment: n, paymentMethod: method }),
    onSuccess: ({ sale }) => {
      toast.success(`Bill ${sale.saleNumber} ban gaya`);
      refresh(true);
      onClose();
      navigate(`/sales/${sale.id}/receipt`);
    },
    onError: (e) => toast.error(apiError(e, 'Sale nahi hui')),
  });

  return (
    <Modal open onClose={onClose} size="md" title="Sale karein (pickup)" description="Maal customer ko dein: bill banega aur stock is branch se nikal jayega"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={run.isPending} disabled={!!bad} onClick={() => run.mutate()} leftIcon={<ShoppingCart className="h-4 w-4" />}>Bill banayein</Button>
      </>}>
      <div className="space-y-4">
        <Money b={booking} />
        {booking.balanceDue > 0 ? (<>
          <AmountField id="convert-amount" value={amount} onChange={setAmount} max={booking.balanceDue} label="Abhi kitne mile"
            hint={bad || (udhaar > 0 ? `${formatPKR(udhaar)} customer ke khate me udhaar likha jayega` : 'Poora hisaab saaf')} />
          <div><p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kaise diya</p><MethodPicker value={method} onChange={setMethod} /></div>
        </>) : (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[0.8125rem] text-emerald-800 ring-1 ring-emerald-200">Poori payment pehle aa chuki hai. Bas bill banayein.</p>
        )}
        <p className="text-[0.75rem] text-slate-500">Advance khud bill me lag jata hai. Reserve kiye IMEI aur cut piece "bik gaye" ho jate hain.</p>
      </div>
    </Modal>
  );
}

const CANCEL_CHIPS = ['Customer ne mana kar diya', 'Maal nahi mila', 'Customer nahi aaya', 'Qeemat par baat nahi bani'];

export function CancelModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const refresh = useRefreshBookings();
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(booking.totalPaid > 0);
  const [method, setMethod] = useState<PaymentMethod>(booking.paymentMethod ?? 'CASH');

  const run = useMutation({
    mutationFn: () => withManagerPin('Advance return', (managerPin) =>
      bookingsApi.cancel(booking.id, { reason: reason.trim() || undefined, refundAdvance: refund, refundMethod: method, managerPin }), 'refund'),
    onSuccess: () => { toast.success(refund && booking.totalPaid > 0 ? `Booking cancel, ${formatPKR(booking.totalPaid)} wapas` : 'Booking cancel ho gayi'); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hui')),
  });

  return (
    <Modal open onClose={onClose} size="md" title="Booking cancel karein" description="Reserve kiye IMEI, roll aur cut piece wapas stock me aa jayenge"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" loading={run.isPending} onClick={() => run.mutate()} leftIcon={<Ban className="h-4 w-4" />}>Cancel karein</Button>
      </>}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="cancel-reason">Wajah</Label>
          <textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} data-autofocus
            placeholder="Kyun cancel hui?" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {CANCEL_CHIPS.map((c) => (
              <button key={c} type="button" onClick={() => setReason(c)} className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">{c}</button>
            ))}
          </div>
          <Hint>Record me rehti hai, baad me analytics me kaam aati hai.</Hint>
        </div>
        {booking.totalPaid > 0 && (<>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              <span className="block text-sm font-medium text-slate-900">Advance wapas dein ({formatPKR(booking.totalPaid)})</span>
              <span className="block text-[0.75rem] text-slate-500">
                {refund ? 'Paise customer ko abhi wapas. Settings me ho to malik ka PIN mangega.' : 'Wapas nahi: advance customer ke khate me jama rahega, agli purchase me kaam aayega.'}
              </span>
            </span>
          </label>
          {refund && <div><p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kaise wapas diya</p><MethodPicker value={method} onChange={setMethod} /></div>}
        </>)}
      </div>
    </Modal>
  );
}

const toLocal = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function RescheduleModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const refresh = useRefreshBookings();
  const [pickup, setPickup] = useState(booking.expectedPickupAt ? toLocal(new Date(booking.expectedPickupAt)) : '');
  const [expires, setExpires] = useState(booking.expiresAt ? toLocal(new Date(booking.expiresAt)) : '');
  const shift = (days: number) => {
    const base = pickup ? new Date(pickup) : new Date();
    const d = new Date(base.getTime() + days * 86_400_000);
    if (!pickup) d.setHours(12, 0, 0, 0);
    setPickup(toLocal(d));
  };

  const run = useMutation({
    mutationFn: () => bookingsApi.update(booking.id, {
      expectedPickupAt: pickup ? new Date(pickup).toISOString() : null,
      expiresAt: expires ? new Date(expires).toISOString() : null,
    }),
    onSuccess: () => { toast.success('Date badal gayi'); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Date nahi badli')),
  });

  return (
    <Modal open onClose={onClose} size="sm" title="Pickup ki date" description={`${booking.bookingNumber} · ${booking.customer?.name ?? ''}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={run.isPending} disabled={!!pickup && !!expires && new Date(expires) < new Date(pickup)} onClick={() => run.mutate()} leftIcon={<CalendarClock className="h-4 w-4" />}>Save</Button>
      </>}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="re-pickup">Customer kab lega</Label>
          <input id="re-pickup" type="datetime-local" value={pickup} onChange={(e) => setPickup(e.target.value)} className={inputCls} data-autofocus />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[['+1 din', 1], ['+3 din', 3], ['+1 hafta', 7]].map(([l, d]) => (
              <button key={l} type="button" onClick={() => shift(Number(d))} className="rounded-full bg-white px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">{l}</button>
            ))}
            {pickup && <button type="button" onClick={() => setPickup('')} className="rounded-full px-2.5 py-1 text-[0.75rem] font-medium text-rose-700 hover:bg-rose-50">Hatayein</button>}
          </div>
          <Hint>Upcoming list, calendar aur yaad dihani isi date se chalti hai.</Hint>
        </div>
        <div>
          <Label htmlFor="re-expires">Aakhri din (deadline)</Label>
          <input id="re-expires" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className={inputCls} />
          <Hint>{pickup && expires && new Date(expires) < new Date(pickup) ? 'Aakhri din pickup se pehle nahi ho sakta' : 'Marzi hai. Is ke baad booking par laal nishan aata hai; khud cancel nahi hoti.'}</Hint>
        </div>
      </div>
    </Modal>
  );
}

/** Ready on/off as a one-click action. */
export function useMarkReady() {
  const refresh = useRefreshBookings();
  return useMutation({
    mutationFn: ({ id, ready }: { id: string; ready: boolean }) => bookingsApi.markReady(id, ready),
    onSuccess: (_b, v) => { toast.success(v.ready ? 'Tayyar likh diya' : 'Tayyar ka nishan hata diya'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Haal nahi badla')),
  });
}
