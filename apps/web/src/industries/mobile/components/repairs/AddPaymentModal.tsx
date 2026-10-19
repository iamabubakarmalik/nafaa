/**
 * Money taken on a repair before the phone goes back: kept on the
 * customer's khata as an advance and used up by the bill at hand-over.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { repairsApi, type RepairTicket } from '../../api/repairs.api';
import { METHODS, MONEY_KEYS, REPAIR_KEY, apiError, money } from '../meta';

export function AddPaymentModal({ ticket, onClose }: { ticket: RepairTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const ceiling = Number(ticket.totalCost) > 0 ? Number(ticket.totalCost) : Number(ticket.estimatedCost) || 0;
  const left = Math.max(ceiling - Number(ticket.paidAmount || 0), 0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [ref, setRef] = useState('');
  const n = Number(amount) || 0;
  const problem = !(n > 0) ? 'Amount likhein' : ceiling > 0 && n > left + 0.01 ? `Baqi sirf ${formatPKR(left)} hai` : null;

  const save = useMutation({
    mutationFn: () => repairsApi.addPayment(ticket.id, { amount: n, paymentMethod: method, reference: ref.trim() || undefined }),
    onSuccess: () => { toast.success(`${formatPKR(n)} advance mila — khata me jama`); [REPAIR_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Payment save nahi hui')),
  });

  return (
    <Modal open onClose={onClose} size="sm" title="Advance lein" description={`${ticket.ticketNumber} · ${ticket.customerName}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={() => save.mutate()} disabled={!!problem} loading={save.isPending}>{formatPKR(n)} lein</Button></>}>
      <div className="space-y-3">
        <p className="text-[0.8125rem] text-slate-600">{ceiling > 0 ? <>Bill/andaza {formatPKR(ceiling)} · mila {formatPKR(Number(ticket.paidAmount || 0))} · baqi <b>{formatPKR(left)}</b></> : 'Andaza abhi nahi likha'}</p>
        <Input label="Amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(money(e.target.value))} autoFocus error={amount && problem ? problem : undefined} />
        <div className="flex flex-wrap gap-1.5">
          {left > 0 && <button type="button" onClick={() => setAmount(String(left))} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.8125rem] font-semibold text-slate-700">Poora {formatPKR(left)}</button>}
          {left > 0 && <button type="button" onClick={() => setAmount(String(Math.round(left / 2)))} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.8125rem] font-semibold text-slate-700">Aadha</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {METHODS.map((m) => (
            <button key={m.value} type="button" onClick={() => setMethod(m.value)}
              className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', method === m.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{m.label}</button>
          ))}
        </div>
        {method !== 'CASH' && <Input label="Transaction / slip number" value={ref} onChange={(e) => setRef(e.target.value)} hint="Marzi hai" />}
      </div>
    </Modal>
  );
}
