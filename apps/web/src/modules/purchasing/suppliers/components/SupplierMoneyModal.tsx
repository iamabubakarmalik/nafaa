/**
 * One dialog for every change to a supplier's khata: pay them, add credit
 * taken without a bill, money for returned goods, a correction, or the
 * balance from before the khata started.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { supplierLedgerApi, type SupplierPaymentMethod } from '../api/supplier-ledger.api';

export type MoneyKind = 'payment' | 'due' | 'return' | 'adjust' | 'opening';

const KINDS: Array<{ value: MoneyKind; label: string; hint: string }> = [
  { value: 'payment', label: 'Paisa diya', hint: 'Supplier ko adaigi — dena kam hoga' },
  { value: 'due', label: 'Udhaar liya', hint: 'Bagair bill ke maal liya — dena barhega' },
  { value: 'return', label: 'Maal wapas', hint: 'Wapas kiye maal ki raqam — dena kam hoga' },
  { value: 'adjust', label: 'Durusti', hint: '+ dena barhe, − dena kam ho' },
  { value: 'opening', label: 'Purana hisaab', hint: 'Khata shuru hone se pehle ka baqi (sirf ek dafa)' },
];
const METHODS: Array<{ value: SupplierPaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Cash' }, { value: 'BANK_TRANSFER', label: 'Bank' }, { value: 'JAZZCASH', label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'EasyPaisa' }, { value: 'CARD', label: 'Card' },
];

export function SupplierMoneyModal({ supplier, initial = 'payment', onClose }: {
  supplier: { id: string; name: string; outstandingDue: number };
  initial?: MoneyKind;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<MoneyKind>(initial);
  const [amount, setAmount] = useState(initial === 'payment' && supplier.outstandingDue > 0 ? String(Math.round(supplier.outstandingDue)) : '');
  const [method, setMethod] = useState<SupplierPaymentMethod>('CASH');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;
  const delta = kind === 'payment' || kind === 'return' ? -Math.abs(n) : kind === 'adjust' ? n : Math.abs(n);
  const after = kind === 'opening' ? null : supplier.outstandingDue + delta;
  const valid = kind === 'adjust' ? n !== 0 && !!note.trim() : n > 0 && (kind !== 'payment' || n <= supplier.outstandingDue + 0.01);

  const mut = useMutation({
    mutationFn: () => {
      const base = { amount: kind === 'adjust' ? n : Math.abs(n), entryDate: date, note: note.trim() || undefined };
      switch (kind) {
        case 'payment': return supplierLedgerApi.recordPayment(supplier.id, { ...base, paymentMethod: method, reference: reference.trim() || undefined });
        case 'due': return supplierLedgerApi.addDue(supplier.id, { ...base, reference: reference.trim() || undefined });
        case 'return': return supplierLedgerApi.recordReturn(supplier.id, { ...base, reference: reference.trim() || undefined });
        case 'adjust': return supplierLedgerApi.adjust(supplier.id, { amount: n, entryDate: date, note: note.trim() });
        default: return supplierLedgerApi.setOpeningBalance(supplier.id, base);
      }
    },
    onSuccess: () => {
      toast.success('Khata me darj ho gaya');
      ['suppliers', 'supplier', 'supplier-statement', 'supplier-ledger-summary', 'purchases-summary', 'dashboard-overview'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  return (
    <Modal open onClose={onClose} size="md" title={supplier.name} description={`Abhi dena hai: ${formatPKR(supplier.outstandingDue)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={mut.isPending} disabled={!valid} onClick={() => mut.mutate()}>Darj karein</Button></>}>
      <div role="radiogroup" className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {KINDS.map((k) => (
          <button key={k.value} type="button" role="radio" aria-checked={kind === k.value} onClick={() => setKind(k.value)}
            className={cn('rounded-xl px-2 py-2 text-[0.8125rem] font-medium ring-1 transition', kind === k.value ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-700 ring-slate-200 hover:ring-slate-300')}>
            {k.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[0.8125rem] text-slate-500">{KINDS.find((k) => k.value === kind)!.hint}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-[0.75rem] text-slate-500">Raqam
          <input data-autofocus type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={kind === 'adjust' ? '+500 ya −500' : '0'}
            className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-right text-lg font-semibold tabular-nums outline-none focus:border-brand-500" />
        </label>
        <label className="text-[0.75rem] text-slate-500">Tareekh
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500" />
        </label>
      </div>
      {kind === 'payment' && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {METHODS.map((m) => (
            <button key={m.value} type="button" onClick={() => setMethod(m.value)} aria-pressed={method === m.value}
              className={cn('rounded-full px-3 py-1 text-[0.8125rem] ring-1', method === m.value ? 'bg-slate-900 text-white ring-slate-900' : 'text-slate-600 ring-slate-200')}>{m.label}</button>
          ))}
          {supplier.outstandingDue > 0 && <button type="button" onClick={() => setAmount(String(Math.round(supplier.outstandingDue)))} className="ml-auto text-[0.8125rem] font-medium text-brand-700 hover:underline">Poora baqi</button>}
        </div>
      )}
      {kind !== 'adjust' && kind !== 'opening' && (
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={kind === 'payment' ? 'Cheque / transaction #' : 'Bill #'} maxLength={80}
          className="mt-3 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500" />
      )}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'adjust' ? 'Wajah (zaroori)' : 'Note'} maxLength={200}
        className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500" />
      {after != null && n !== 0 && (
        <p className={cn('mt-3 rounded-xl px-3 py-2 text-sm', after > 0 ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-800')}>
          Is ke baad dena: <b>{formatPKR(Math.max(after, 0))}</b>{after < 0 ? ` (supplier ke paas ${formatPKR(-after)} advance)` : ''}
        </p>
      )}
      {kind === 'payment' && n > supplier.outstandingDue + 0.01 && <p className="mt-2 text-[0.8125rem] text-rose-600">Baqi se zyada adaigi darj nahi hoti</p>}
    </Modal>
  );
}
