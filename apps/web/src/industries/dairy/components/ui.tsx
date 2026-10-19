/** Small building blocks the dairy pages share: list card, empty state, pager, status pill, money and reason dialogs. */

import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Select, Skeleton, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PAY_METHODS, numIn } from '../lib/meta';

export function ListCard({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {children}
      {footer}
    </section>
  );
}

export function ListLoading({ rows = 6 }: { rows?: number }) {
  return <div className="space-y-2 p-4">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
}

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-7 w-7" /></span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      {text && <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  if (total <= limit) return null;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[0.8125rem] text-slate-600">
      <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}</span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Pichla</button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Agla</button>
      </div>
    </footer>
  );
}

export function Pill({ tone, children, className }: { tone: string; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1', tone, className)}>{children}</span>;
}

export interface MoneyInput { amount: number; paymentMethod: string; reference?: string; notes?: string }

/**
 * Takes or pays an amount: quick chips, method and a reference. `max` stops
 * more than what is due; `hint` says where the money goes.
 */
export function MoneyModal({ title, description, due, max, hint, busy, onSubmit, onClose, cta = 'Save', withNote }: {
  title: string; description?: string; due?: number; max?: number; hint?: ReactNode; busy?: boolean; cta?: string; withNote?: boolean;
  onSubmit: (v: MoneyInput) => void; onClose: () => void;
}) {
  const [amount, setAmount] = useState(due && due > 0 ? String(Math.round(due)) : '');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const n = numIn(amount);
    if (!n || n <= 0) { setError('Amount likhein'); return; }
    if (max !== undefined && n > max + 0.01) { setError(`Zyada se zyada ${formatPKR(max)}`); return; }
    setError('');
    onSubmit({ amount: n, paymentMethod: method, reference: reference.trim() || undefined, notes: notes.trim() || undefined });
  };
  const chips = [due && due > 0 ? Math.round(due) : null, 500, 1000, 2000, 5000].filter((v, i, a): v is number => !!v && a.indexOf(v) === i);
  return (
    <Modal open onClose={onClose} size="sm" title={title} description={description}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={busy} onClick={submit}>{cta}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <Input label="Amount (Rs)" inputMode="decimal" autoFocus value={amount} error={error} onChange={(e) => setAmount(e.target.value)} hint={hint} />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => <button key={c} type="button" onClick={() => setAmount(String(c))} className="h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ring-slate-200 hover:bg-slate-50">{c === Math.round(due ?? -1) ? `Poora ${formatPKR(c)}` : formatPKR(c)}</button>)}
        </div>
        <Select label="Kaise" value={method} onChange={(e) => setMethod(e.target.value)} options={PAY_METHODS} hint={method === 'CASH' ? 'Cash khule drawer me jata hai' : 'Drawer ka cash nahi badalta'} />
        <Input label="Reference (marzi)" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID, cheque number" />
        {withNote && <Textarea label="Note (marzi)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </form>
    </Modal>
  );
}

/** Asks a reason (and the manager PIN when undoing a posted bill). */
export function ReasonModal({ title, description, cta, danger, withPin, busy, presets = [], onSubmit, onClose }: {
  title: string; description?: ReactNode; cta: string; danger?: boolean; withPin?: boolean; busy?: boolean; presets?: string[];
  onSubmit: (v: { reason: string; managerPin?: string }) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const submit = () => {
    if (withPin && pin && !/^\d{4,8}$/.test(pin)) { toast.error('PIN 4 se 8 hindse ka hota hai'); return; }
    onSubmit({ reason: reason.trim(), managerPin: pin || undefined });
  };
  return (
    <Modal open onClose={onClose} size="sm" title={title} description={description}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={submit}>{cta}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {presets.length > 0 && <div className="flex flex-wrap gap-1.5">{presets.map((p) => <button key={p} type="button" onClick={() => setReason(p)} className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1', reason === p ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-200 hover:bg-slate-50')}>{p}</button>)}</div>}
        <Input label="Wajah" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        {withPin && <Input label="Manager PIN" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} hint="Dukaan ne void par PIN lagaya ho to zaroori hai" />}
      </form>
    </Modal>
  );
}
