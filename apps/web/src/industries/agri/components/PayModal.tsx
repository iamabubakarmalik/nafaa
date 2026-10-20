/**
 * Takes money: amount, how it was paid and a note. Used for a farmer's
 * khata receipt and a bulk order's advance; the caller writes it.
 */

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PAY_METHODS, amountInput } from '../lib/meta';

export function PayModal({ title, description, max, suggest, busy, withNote = true, onClose, onPay }: {
  title: string;
  description?: string;
  /** Highest amount allowed (what is owed); none means no cap. */
  max?: number;
  suggest?: number[];
  busy?: boolean;
  withNote?: boolean;
  onClose: () => void;
  onPay: (v: { amount: number; method: string; note: string }) => void;
}) {
  const [value, setValue] = useState('');
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const amount = Number(value) || 0;
  const error = value && !(amount > 0) ? 'Amount likhein' : max != null && amount > max + 0.01 ? `Zyada se zyada ${formatPKR(max)}` : undefined;
  const ok = amount > 0 && !error;
  const submit = () => { if (ok && !busy) onPay({ amount, method, note: note.trim() }); };
  return (
    <Modal open onClose={onClose} size="sm" title={title} description={description}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Wapas</Button>
        <Button disabled={!ok} loading={busy} onClick={submit} leftIcon={<Wallet className="h-4 w-4" />}>Wasool karein</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Amount (Rs)" inputMode="decimal" value={value} onChange={(e) => setValue(amountInput(e.target.value))} placeholder="0" error={error}
          hint={max != null ? `Baqi ${formatPKR(max)}` : undefined} className="text-right text-lg font-semibold tabular-nums" data-autofocus />
        {!!suggest?.length && (
          <div className="flex flex-wrap gap-1.5">
            {suggest.filter((s) => s > 0).map((s) => (
              <button key={s} type="button" onClick={() => setValue(String(s))} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.75rem] font-semibold text-slate-700 hover:bg-slate-200">{formatPKR(s)}</button>
            ))}
          </div>
        )}
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaise diya</span>
          <div className="flex flex-wrap gap-1.5">
            {PAY_METHODS.map((m) => (
              <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                className={cn('h-8 rounded-lg px-2.5 text-[0.75rem] font-semibold ring-1', method === m.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{m.label}</button>
            ))}
          </div>
        </div>
        {withNote && <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Gandum ki fasal ke baad" hint="Marzi hai — khate me likha jata hai" maxLength={200} />}
      </form>
    </Modal>
  );
}
