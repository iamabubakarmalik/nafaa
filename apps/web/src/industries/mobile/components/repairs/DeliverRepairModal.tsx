/**
 * Handing a repaired phone back, in one step: take what is left, close the
 * job and post its bill (sales, cash register, khata). Whatever is still
 * unpaid goes on the customer's khata.
 */

import { useState } from 'react';
import { AlertTriangle, Receipt } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { RepairTicket } from '../../api/repairs.api';
import { METHODS, money } from '../meta';

export function DeliverRepairModal({ ticket, pending, onConfirm, onClose }: {
  ticket: RepairTicket;
  pending: boolean;
  onConfirm: (amount: number, paymentMethod: PaymentMethod) => void;
  onClose: () => void;
}) {
  const total = Number(ticket.totalCost) || 0;
  const paid = Number(ticket.paidAmount) || 0;
  const balance = Math.max(total - paid, 0);
  const [amount, setAmount] = useState(balance ? String(balance) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const entered = Number(amount) || 0;
  const left = Math.max(balance - entered, 0);
  const tooMuch = entered > balance + 0.01;
  const noBill = total <= 0;

  return (
    <Modal open onClose={onClose} size="md" title={`Phone wapas dein — ${ticket.ticketNumber}`} description={`${ticket.deviceBrand} ${ticket.deviceModel} · ${ticket.customerName}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => onConfirm(entered, method)} disabled={tooMuch} loading={pending} leftIcon={<Receipt className="h-4 w-4" />}>
          {noBill ? 'Wapas de diya' : left > 0 ? `Wapas dein — ${formatPKR(left)} khata me` : 'Paisa le kar wapas dein'}
        </Button>
      </>}>
      <div className="space-y-4">
        <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.875rem]">
          <div className="flex justify-between"><dt className="text-slate-500">Kul bill</dt><dd className="font-semibold tabular-nums">{formatPKR(total)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Pehle mila (advance)</dt><dd className="tabular-nums">{formatPKR(paid)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-1"><dt className="font-medium text-slate-700">Baqi</dt><dd className="text-lg font-bold tabular-nums text-slate-900">{formatPKR(balance)}</dd></div>
        </dl>
        {noBill ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">Is kaam ka koi bill nahi (warranty ya muft) — sirf phone wapas hoga.</p>
        ) : balance > 0 && (
          <>
            <Input label="Abhi kitna liya" inputMode="decimal" value={amount} onChange={(e) => setAmount(money(e.target.value))} autoFocus
              error={tooMuch ? `Baqi sirf ${formatPKR(balance)} hai` : undefined} />
            <div className="flex flex-wrap gap-1.5">
              {METHODS.map((m) => (
                <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                  className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', method === m.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{m.label}</button>
              ))}
            </div>
            {left > 0 && (
              <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{formatPKR(left)} {ticket.customerName} ke khata me udhaar likha jayega.
              </p>
            )}
          </>
        )}
        {ticket.status === 'UNREPAIRABLE' && <p className="text-[0.8125rem] text-slate-600">Phone theek nahi hua — sirf check ka kharcha (agar likha hai) bill me aayega, warranty nahi.</p>}
      </div>
    </Modal>
  );
}
