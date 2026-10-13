/**
 * Take a payment, add credit, or bring in old credit from a paper register,
 * for one customer. Shows the balance before and after.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
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
  const save = useMutation({
    mutationFn: () => runKhataAction(action, customer.id, n, note || undefined, action === 'payment' ? method : undefined),
    onSuccess: (queued) => {
      toast.success(`${customer.name}: ${t.title} — ${money(n)}${queued ? ' (internet aate hi server par jayega)' : ''}`);
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
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
