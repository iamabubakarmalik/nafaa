/**
 * Take a payment, add credit, or bring in old credit from a paper register,
 * for one customer. Shows the balance before and after, and for a payment the
 * bills it clears (oldest first, as the server counts it) with the profit it
 * brings in; the same figures show again once it is saved.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { HandCoins, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import { formatPKR } from '@core/lib/format';
import { customerLedgerApi, type PaymentPreview } from '@modules/customers/khata/api/customer-ledger.api';
import { NoCostWarning } from '@modules/reports/ProfitSplit';
import { runKhataAction } from '../offlineKhataActions';

export type KhataAction = 'payment' | 'udhaar' | 'opening';

const TITLES: Record<KhataAction, { title: string; hint: string; button: string }> = {
  payment: { title: 'Payment receive', hint: 'Customer ne kitne diye', button: 'Receive karein' },
  udhaar: { title: 'Udhaar chadhayein', hint: 'Bina bill ke udhaar — jaise naqd paise diye', button: 'Chadhayein' },
  opening: { title: 'Purana khata', hint: 'Kaapi / register ka purana baqi — maujooda khate mein jurega', button: 'Jor dein' },
};

export function KhataActionModal({ action, customer, money, onClose, onDone }: {
  action: KhataAction;
  customer: { id: string; name: string; balance: number };
  money: (n: number) => string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(action === 'payment' && customer.balance > 0 ? String(Math.round(customer.balance)) : '');
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const n = Number(amount) || 0;
  const after = action === 'payment' ? customer.balance - n : customer.balance + n;
  const tooMuch = action === 'payment' && n > customer.balance + 0.009;
  const t = TITLES[action];
  // Preview of the bills this payment clears, a moment after typing stops.
  const [asked, setAsked] = useState(0);
  useEffect(() => { const id = setTimeout(() => setAsked(n), 350); return () => clearTimeout(id); }, [n]);
  const preview = useQuery({
    queryKey: ['khata-payment-preview', customer.id, asked],
    queryFn: () => customerLedgerApi.paymentPreview(customer.id, asked),
    enabled: action === 'payment' && asked > 0 && !tooMuch && navigator.onLine,
    staleTime: 15_000,
    retry: false,
  });
  const save = useMutation({
    mutationFn: () => runKhataAction(action, customer.id, n, note || undefined, action === 'payment' ? method : undefined),
    onSuccess: ({ queued, settles }) => {
      const profit = settles && !settles.costHidden && settles.profit != null ? ` · Is payment se Profit ${formatPKR(settles.profit)}` : '';
      toast.success(`${customer.name}: ${t.title} — ${money(n)}${queued ? ' (internet aate hi server par jayega)' : profit}`,
        settles?.bills.length ? { description: billsLine(settles, money) } : undefined);
      onDone(); onClose();
    },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || 'Nahi hua'),
  });
  const quick = action === 'payment' && customer.balance > 0
    ? [...new Set([Math.round(customer.balance), Math.round(customer.balance / 2), 500, 1000, 5000].filter((v) => v > 0 && v <= customer.balance))]
    : [500, 1000, 2000, 5000, 10000];
  return (
    <Modal open onClose={onClose} size="sm" title={`${t.title} · ${customer.name}`} description={t.hint}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={!(n > 0) || tooMuch} loading={save.isPending} onClick={() => save.mutate()} variant={action === 'payment' ? 'success' : 'primary'}>{t.button}</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (n > 0 && !tooMuch) save.mutate(); }}>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[0.875rem] font-semibold text-slate-400">Rs</span>
          <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0"
            className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-[1.75rem] font-bold tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quick.map((q) => <button key={q} type="button" onClick={() => setAmount(String(q))} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-200">{q === Math.round(customer.balance) && action === 'payment' ? `Poora ${q.toLocaleString('en-PK')}` : q.toLocaleString('en-PK')}</button>)}
        </div>
        {action === 'payment' && (
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold text-slate-500">Kaise mile</p>
            <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {POS_PAYMENT_METHODS.map((m) => {
                const on = method === m.id;
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMethod(m.id)}
                    className={cn('flex h-9 items-center justify-center gap-1 rounded-lg border text-[0.75rem] font-semibold transition',
                      on ? 'border-transparent text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')}
                    style={on ? { backgroundColor: m.color } : undefined}>
                    <m.icon className="h-3.5 w-3.5" /> {m.label}
                  </button>
                );
              })}
            </div>
            {method !== 'CASH' && <p className="mt-1.5 text-[0.75rem] text-slate-500">Ye paisa galle (drawer) me nahi, {POS_PAYMENT_METHODS.find((m) => m.id === method)?.label} ke account me jayega.</p>}
          </div>
        )}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={action === 'payment' ? 'Note (jaise: transaction ID)' : 'Note (kis cheez ka)'}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[0.875rem] outline-none focus:border-brand-500" />
        <div className={cn('grid grid-cols-2 gap-2 rounded-2xl p-3 text-center', tooMuch ? 'bg-rose-50' : 'bg-slate-50')}>
          <div><p className="text-[0.6875rem] text-slate-500">Abhi</p><p className="font-bold tabular-nums">{money(customer.balance)}</p></div>
          <div><p className="text-[0.6875rem] text-slate-500">Is ke baad</p><p className={cn('font-bold tabular-nums', after > 0 ? 'text-rose-700' : 'text-success-700')}>{money(after)}</p></div>
        </div>
        {tooMuch && <p className="text-[0.8125rem] font-medium text-rose-700">Baqi sirf {money(customer.balance)} hai — is se zyada receive nahi ho sakta.</p>}
        {action === 'payment' && n > 0 && !tooMuch && (
          <PreviewCard data={asked === n ? preview.data : undefined} loading={preview.isFetching || asked !== n} money={money} />
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

/** "NF-123 (12 Oct) 1,500 · NF-130 poora" for the toast after saving. */
function billsLine(p: PaymentPreview, money: (n: number) => string) {
  const parts = p.bills.slice(0, 3).map((b) => `${b.saleNumber} ${b.leftAfter <= 0.5 ? 'poora' : money(b.amount)}`);
  return `${p.bills.length} bill${p.bills.length > 1 ? 's' : ''}: ${parts.join(' · ')}${p.bills.length > 3 ? ' …' : ''}${p.toOther > 0.5 ? ` · purana khata / advance ${money(p.toOther)}` : ''}`;
}

/** The bills a payment clears, oldest first, with the profit each part brings in. */
function PreviewCard({ data, loading, money }: { data?: PaymentPreview; loading: boolean; money: (n: number) => string }) {
  if (!data) {
    return loading
      ? <p className="flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Kaun se bill clear honge…</p>
      : null;
  }
  const showProfit = !data.costHidden && data.profit != null;
  return (
    <div className="space-y-2 rounded-2xl border border-success-200 bg-success-50/50 p-3">
      {showProfit && (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-700"><HandCoins className="h-4 w-4 text-success-700" />Is payment se Profit</span>
          <span className="text-lg font-bold tabular-nums text-success-700">{formatPKR(data.profit ?? 0)}</span>
        </div>
      )}
      {data.bills.length > 0 ? (
        <ul className="max-h-40 space-y-1 overflow-auto text-[0.75rem]">
          {data.bills.map((b) => (
            <li key={b.saleId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200/70">
              <span className="min-w-0 truncate text-slate-700">
                <b className="text-slate-900">{b.saleNumber}</b> · {shortDate(b.soldAt)} · {money(b.amount)}
                {b.leftAfter <= 0.5 ? <span className="ml-1 font-semibold text-success-700">poora clear</span> : <span className="ml-1 text-slate-500">baqi {money(b.leftAfter)}</span>}
              </span>
              {showProfit && <span className="tabular-nums font-semibold text-slate-800">+{formatPKR(b.profit ?? 0)}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.75rem] text-slate-600">Ye payment kisi bill par nahi jayegi.</p>
      )}
      {data.toOther > 0.5 && (
        <p className="text-[0.75rem] text-slate-600">{money(data.toOther)} purane khate / bina bill ke udhaar ya advance mein — is par Profit nahi.</p>
      )}
      {showProfit && <NoCostWarning count={data.noCostLines ?? 0} />}
    </div>
  );
}
