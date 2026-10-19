/**
 * Taking installment money: any amount, settling the oldest open
 * installments first. It is a khata payment, so the khata, galla and day
 * book show it at once.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { emiApi, type EmiPlan } from '../../api/emi.api';
import { EMI_KEY, METHODS, MONEY_KEYS, apiError, dayOnly, money } from '../meta';

export function RecordEmiPaymentModal({ plan, onClose }: { plan: EmiPlan; onClose: () => void }) {
  const qc = useQueryClient();
  const open = plan.installments.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');
  const total = open.reduce((s, i) => s + Number(i.amount) - Number(i.paidAmount), 0);
  const first = open[0] ? Number(open[0].amount) - Number(open[0].paidAmount) : 0;
  const [amount, setAmount] = useState(String(plan.overdueAmount > 0 ? plan.overdueAmount : first || ''));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const n = Number(amount) || 0;
  const problem = !(n > 0) ? 'Amount likhein' : n > total + 0.01 ? `Kul baqi sirf ${formatPKR(total)} hai` : null;

  // Which installments this money settles.
  const preview = useMemo(() => {
    let left = n;
    return open.map((i) => {
      const due = Number(i.amount) - Number(i.paidAmount);
      const take = Math.max(Math.min(due, left), 0);
      left -= take;
      return { i, take, full: take >= due - 0.005 };
    }).filter((x) => x.take > 0);
  }, [n, open]);

  const save = useMutation({
    mutationFn: () => emiApi.collect(plan.id, { amount: n, paymentMethod: method, notes: notes.trim() || undefined }),
    onSuccess: () => { toast.success(`${formatPKR(n)} qist mili — khata me jama`); [EMI_KEY, 'emi-stats', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Qist save nahi hui')),
  });

  return (
    <Modal open onClose={onClose} size="md" title={`Qist lein — ${plan.planNumber}`} description={`${plan.customerName} · kul baqi ${formatPKR(total)}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={() => save.mutate()} disabled={!!problem} loading={save.isPending}>{formatPKR(n)} lein</Button></>}>
      <div className="space-y-3">
        <Input label="Kitne mile" inputMode="decimal" value={amount} onChange={(e) => setAmount(money(e.target.value))} autoFocus error={amount && problem ? problem : undefined} />
        <div className="flex flex-wrap gap-1.5">
          {plan.overdueAmount > 0 && <Quick onClick={() => setAmount(String(plan.overdueAmount))}>Late {formatPKR(plan.overdueAmount)}</Quick>}
          {first > 0 && <Quick onClick={() => setAmount(String(first))}>Ek qist {formatPKR(first)}</Quick>}
          {total > 0 && <Quick onClick={() => setAmount(String(Math.round(total * 100) / 100))}>Poora {formatPKR(total)}</Quick>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {METHODS.map((m) => (
            <button key={m.value} type="button" onClick={() => setMethod(m.value)}
              className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', method === m.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{m.label}</button>
          ))}
        </div>
        {preview.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.8125rem]">
            {preview.map(({ i, take, full }) => (
              <li key={i.id} className="flex justify-between">
                <span className="text-slate-600">Qist {i.installmentNumber} · {dayOnly(i.dueDate)}</span>
                <span className={cn('font-semibold tabular-nums', full ? 'text-emerald-700' : 'text-amber-700')}>{formatPKR(take)}{full ? ' ✓' : ' (adhoori)'}</span>
              </li>
            ))}
          </ul>
        )}
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} hint="Marzi hai — jaise transaction number" />
      </div>
    </Modal>
  );
}

const Quick = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button type="button" onClick={onClick} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-200">{children}</button>
);
