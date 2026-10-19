/**
 * Money dialogs for orders and bookings: an advance or later payment (held
 * on the customer's khata, so the drawer and day book show it today), the
 * hand-over bill with split payment, cancelling with a reason, and the cash
 * refund of a cancelled record's advance (refund PIN rule applies).
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Ban, CheckCircle2, Plus, Receipt, Trash2, Undo2 } from 'lucide-react';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { withManagerPin } from '@core/security/ManagerPin';
import { PAY_METHODS, apiError, decimal, type PayMethod } from '../lib/meta';

export function MethodPicker({ value, onChange, compact }: { value: PayMethod; onChange: (m: PayMethod) => void; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Paisa kaise mila" className={cn('grid gap-1.5', compact ? 'grid-cols-5' : 'grid-cols-3 sm:grid-cols-5')}>
      {PAY_METHODS.map((m) => (
        <button key={m.id} type="button" role="radio" aria-checked={value === m.id} onClick={() => onChange(m.id)}
          className={cn('inline-flex h-9 items-center justify-center rounded-lg px-1 text-[0.75rem] font-semibold ring-1 transition-colors',
            value === m.id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function PayModal({ title, due, onPay, onClose }: {
  title: string;
  due: number;
  onPay: (amount: number, method: PayMethod) => Promise<unknown>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(String(Math.max(due, 0)));
  const [method, setMethod] = useState<PayMethod>('CASH');
  const n = Number(amount) || 0;
  const pay = useMutation({
    mutationFn: () => onPay(n, method),
    onSuccess: () => { toast.success(`${formatPKR(n)} darj ho gaya`); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Darj nahi hua')),
  });
  const bad = n <= 0 || n > due + 0.005;
  return (
    <Modal open onClose={onClose} size="sm" title="Advance / paisa mila" description={`${title} · ${formatPKR(due)} baqi`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="success" disabled={bad} loading={pay.isPending} onClick={() => pay.mutate()} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Darj karein</Button>
      </>}>
      <div className="space-y-3">
        <Input data-autofocus inputMode="decimal" value={amount} onChange={(e) => setAmount(decimal(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !bad && !pay.isPending) pay.mutate(); }}
          size="lg" className="text-center text-2xl font-bold tabular-nums" error={n > due + 0.005 ? `Baqi sirf ${formatPKR(due)} hai` : undefined} />
        <div className="flex flex-wrap gap-1.5">
          {[{ l: 'Poora', v: due }, { l: 'Aadha', v: Math.round(due / 2) }].filter((c) => c.v > 0).map((c) => (
            <Button key={c.l} size="sm" variant="secondary" onClick={() => setAmount(String(c.v))}>{c.l} <span className="tabular-nums text-slate-500">{formatPKR(c.v)}</span></Button>
          ))}
        </div>
        <MethodPicker value={method} onChange={setMethod} />
        <p className="text-[0.75rem] text-slate-500">Ye paisa aaj ke drawer aur customer ke khate me advance ban kar jata hai. Bill bante waqt khate se kat jata hai.</p>
      </div>
    </Modal>
  );
}

interface PayPart { method: PayMethod; amount: number }

/**
 * Hand-over: money taken now, split across methods if needed; what is left
 * goes on the customer's khata, where the advance already held cancels it.
 */
export function CheckoutModal({ title, total, held, legacy = 0, customerName, lines, onConfirm, onClose }: {
  title: string;
  total: number;
  /** Advance on the khata for this record. */
  held: number;
  /** Money noted before khata posting; counted as paid with the bill. */
  legacy?: number;
  customerName?: string | null;
  lines?: Array<{ label: string; value: string }>;
  onConfirm: (parts: PayPart[]) => Promise<unknown>;
  onClose: () => void;
}) {
  const due = Math.max(Math.round((total - held - legacy) * 100) / 100, 0);
  const [parts, setParts] = useState<Array<{ method: PayMethod; amount: string }>>([{ method: 'CASH', amount: String(due) }]);
  const paid = parts.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const credit = Math.max(Math.round((due - paid) * 100) / 100, 0);
  const over = paid > due + 0.005;
  const go = useMutation({
    mutationFn: () => onConfirm(parts.map((p) => ({ method: p.method, amount: Number(p.amount) || 0 })).filter((p) => p.amount > 0)),
    onSuccess: () => onClose(),
    onError: (e) => toast.error(apiError(e, 'Bill nahi bana')),
  });
  const set = (i: number, patch: Partial<{ method: PayMethod; amount: string }>) => setParts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <Modal open onClose={onClose} size="md" title="Bill banayein aur de dein" description={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="success" disabled={over} loading={go.isPending} onClick={() => go.mutate()} leftIcon={<Receipt className="h-4 w-4" />}>
          Bill banayein · {formatPKR(total)}
        </Button>
      </>}>
      <div className="space-y-4">
        {lines && lines.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3 text-[0.8125rem] ring-1 ring-slate-200">
            {lines.map((l, i) => <li key={i} className="flex justify-between gap-3 py-1.5"><span className="text-slate-600">{l.label}</span><span className="font-semibold tabular-nums text-slate-900">{l.value}</span></li>)}
          </ul>
        )}
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200"><dt className="text-[0.6875rem] text-slate-500">Kul bill</dt><dd className="font-bold tabular-nums">{formatPKR(total)}</dd></div>
          <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-200"><dt className="text-[0.6875rem] text-emerald-700">Advance mila</dt><dd className="font-bold tabular-nums text-emerald-800">{formatPKR(held + legacy)}</dd></div>
          <div className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-200"><dt className="text-[0.6875rem] text-amber-700">Ab lena</dt><dd className="font-bold tabular-nums text-amber-800">{formatPKR(due)}</dd></div>
        </dl>
        <div className="space-y-2">
          {parts.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <Input inputMode="decimal" value={p.amount} onChange={(e) => set(i, { amount: decimal(e.target.value) })} className="w-32 text-right font-semibold tabular-nums" aria-label="Amount" data-autofocus={i === 0 ? true : undefined} />
              <div className="min-w-0 flex-1"><MethodPicker compact value={p.method} onChange={(method) => set(i, { method })} /></div>
              {parts.length > 1 && <button type="button" aria-label="Hatayein" onClick={() => setParts((ps) => ps.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Trash2 className="h-4 w-4" /></button>}
            </div>
          ))}
          {parts.length < 3 && (
            <Button size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setParts((ps) => [...ps, { method: ps.some((x) => x.method === 'CASH') ? 'CARD' : 'CASH', amount: String(credit) }])}>Doosra tareeqa (split)</Button>
          )}
        </div>
        {over && <p className="text-[0.8125rem] font-medium text-rose-600">Baqi sirf {formatPKR(due)} hai</p>}
        {credit > 0 && !over && (
          <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {formatPKR(credit)} {customerName ? `${customerName} ke` : 'customer ke'} khate me udhaar jayega.
          </p>
        )}
        <p className="text-[0.75rem] text-slate-500">Bill se stock kam hota hai, Sale aur Profit me aata hai aur paisa drawer me. Bill void karne se order wapas khul jata hai.</p>
      </div>
    </Modal>
  );
}

export function CancelModal({ title, paid, onConfirm, onClose }: {
  title: string;
  paid: number;
  onConfirm: (reason: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const cancel = useMutation({
    mutationFn: () => onConfirm(reason.trim()),
    onSuccess: () => { toast.success('Cancel ho gaya'); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Cancel karein?" description={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" disabled={reason.trim().length < 2} loading={cancel.isPending} onClick={() => cancel.mutate()} leftIcon={<Ban className="h-4 w-4" />}>Haan, cancel</Button>
      </>}>
      <div className="space-y-3">
        {paid > 0 && (
          <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Customer {formatPKR(paid)} de chuka hai. Ye advance khate me jama rehta hai — agle bill me kat jayega, ya cancel ke baad "Advance wapas" se cash me lautayein.
          </p>
        )}
        <Textarea data-autofocus label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="Customer ne mana kar diya, date badal gayi…" hint="Zaroori hai — baad me yaad rehta hai" />
      </div>
    </Modal>
  );
}

export function RefundModal({ title, held, legacy, onRefund, onClose }: {
  title: string;
  held: number;
  legacy: number;
  onRefund: (managerPin?: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const refund = useMutation({
    mutationFn: () => withManagerPin('Advance wapsi', (pin) => onRefund(pin), 'refund'),
    onSuccess: () => { toast.success(`${formatPKR(held)} advance wapas — drawer se cash nikla`); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Advance wapas nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Advance wapas karein?" description={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" disabled={!(held > 0)} loading={refund.isPending} onClick={() => refund.mutate()} leftIcon={<Undo2 className="h-4 w-4" />}>
          {held > 0 ? `${formatPKR(held)} cash wapas` : 'Wapas karne ko kuch nahi'}
        </Button>
      </>}>
      <div className="space-y-3 text-[0.8125rem]">
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-slate-700">Customer ke khate se advance hat jayega aur utna cash is branch ke khule drawer se nikalega. Day book me "Advance wapas" likha jayega.</p>
        {legacy > 0.5 && (
          <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {formatPKR(legacy)} purane tareeqe se liya gaya tha aur khate me nahi — wo yahan se wapas nahi hota.
          </p>
        )}
      </div>
    </Modal>
  );
}
