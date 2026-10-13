/**
 * Small dialogs shared by cake and bulk orders: money received on an order,
 * and cancelling with a reason and a reminder about the advance.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Ban, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { apiError } from './meta';

export function PayModal({ name, due, advanceLeft = 0, onPay, onClose, onDone }: {
  name: string;
  due: number;
  /** Still missing from the advance asked for. */
  advanceLeft?: number;
  onPay: (amount: number) => Promise<unknown>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(advanceLeft > 0 ? Math.min(advanceLeft, due) : due));
  const n = Number(amount) || 0;
  const pay = useMutation({
    mutationFn: () => onPay(n),
    onSuccess: () => { toast.success(`${formatPKR(n)} darj ho gaya`); onDone(); },
    onError: (e) => toast.error(apiError(e, 'Darj nahi hua')),
  });
  const bad = n <= 0 || n > due + 0.005;
  const chips = [
    { l: 'Poora', v: due },
    { l: 'Advance', v: Math.min(advanceLeft, due) },
    { l: 'Aadha', v: Math.round(due / 2) },
  ].filter((c, i, a) => c.v > 0 && a.findIndex((x) => x.v === c.v) === i);

  return (
    <Modal open onClose={onClose} size="sm" title="Paisa mila" description={`${name} · ${formatPKR(due)} baqi`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="success" disabled={bad} loading={pay.isPending} onClick={() => pay.mutate()} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Darj karein</Button>
      </>}>
      <div className="space-y-3">
        <Input data-autofocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !bad && !pay.isPending) pay.mutate(); }}
          size="lg" className="text-center text-2xl font-bold tabular-nums" error={n > due + 0.005 ? `Baqi sirf ${formatPKR(due)} hai` : undefined} />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => <Button key={c.l} size="sm" variant="secondary" onClick={() => setAmount(String(c.v))}>{c.l} <span className="tabular-nums text-slate-500">{formatPKR(c.v)}</span></Button>)}
        </div>
        <p className="text-[0.75rem] text-slate-500">Yeh paisa order par darj hota hai. Dete waqt jo bill banta hai us me yeh "pehle mila" gina jata hai.</p>
      </div>
    </Modal>
  );
}

export function CancelModal({ title, paid, askReason = true, onConfirm, onClose }: {
  title: string;
  paid: number;
  /** Bulk orders keep no reason, so the field is left out for them. */
  askReason?: boolean;
  onConfirm: (reason: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const cancel = useMutation({
    mutationFn: () => onConfirm(reason.trim()),
    onSuccess: () => { toast.success('Order cancel ho gaya'); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Order cancel karein?" description={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate()} leftIcon={<Ban className="h-4 w-4" />}>Haan, cancel</Button>
      </>}>
      <div className="space-y-3">
        {paid > 0 && (
          <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Customer {formatPKR(paid)} de chuka hai. Wapas karna hai ya agle order me ginna hai — customer se tay kar lein. Cancel se paisa khud wapas nahi hota.
          </p>
        )}
        {askReason && <Textarea data-autofocus label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="Customer ne mana kar diya, date badal gayi…" hint="Marzi hai — baad me yaad rehta hai" />}
      </div>
    </Modal>
  );
}
