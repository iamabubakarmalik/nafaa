/** Small building blocks the florist pages share: list card, empty state, pager, pill, info box, analytics bars, confirm and money dialogs. */

import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, EmptyState, Input, Modal, Select, Skeleton, Textarea } from '@/design-system/components';
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
  return <EmptyState className="py-16" icon={<Icon className="h-6 w-6" />} title={title} description={text} action={action} />;
}

/** Labelled grey box for a detail dialog (who, where, when). */
export function Info({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70">
      <p className="mb-1 flex items-center gap-1.5 text-[0.75rem] font-semibold text-slate-500"><Icon className="h-3.5 w-3.5" />{title}</p>
      {children}
    </div>
  );
}

/** Asks before a step that cannot be undone from this screen. */
export function ConfirmModal({ title, text, cta, danger, busy, onConfirm, onClose }: {
  title: string; text: ReactNode; cta: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} size="sm" title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>{cta}</Button></>}>
      <div className="text-[0.875rem] text-slate-700">{text}</div>
    </Modal>
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

export const actionBtn = 'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-semibold ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50';
export const primaryBtn = 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg hover:bg-brand-700 disabled:opacity-50';

/** Analytics block: a title and horizontal bars (count and money per row). */
export function BarList({ title, rows, money, empty = 'Is period me kuch nahi' }: {
  title: string; rows: Array<{ key: string; label?: string; count: number; value: number }>; money: (n: number) => string; empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <h3 className="text-[0.9375rem] font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? <p className="mt-3 text-[0.8125rem] text-slate-500">{empty}</p> : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
                <span className="truncate font-medium text-slate-700">{r.label ?? r.key}</span>
                <span className="shrink-0 tabular-nums text-slate-600">{r.count} · <span className="font-semibold text-slate-900">{money(r.value)}</span></span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface MoneyInput { amount: number; paymentMethod: string; notes?: string }

/** Takes an amount with its method; `max` stops more than what is due. */
export function MoneyModal({ title, description, due, max, hint, busy, onSubmit, onClose, cta = 'Payment lein' }: {
  title: string; description?: string; due?: number; max?: number; hint?: ReactNode; busy?: boolean; cta?: string;
  onSubmit: (v: MoneyInput) => void; onClose: () => void;
}) {
  const [amount, setAmount] = useState(due && due > 0 ? String(Math.round(due)) : '');
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    const n = numIn(amount);
    if (!n || n <= 0) { setError('Amount likhein'); return; }
    if (max !== undefined && n > max + 0.01) { setError(`Zyada se zyada ${formatPKR(max)}`); return; }
    setError('');
    onSubmit({ amount: Math.round(n * 100) / 100, paymentMethod: method, notes: notes.trim() || undefined });
  };
  const chips = [due && due > 0 ? Math.round(due) : null, 1000, 5000, 10000, 25000].filter((v, i, a): v is number => !!v && a.indexOf(v) === i && (max === undefined || v <= max + 0.01));
  return (
    <Modal open onClose={onClose} size="sm" title={title} description={description}
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={busy} onClick={submit}>{cta}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <Input label="Amount (Rs)" inputMode="decimal" autoFocus value={amount} error={error} onChange={(e) => setAmount(e.target.value)} hint={hint} />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => <button key={c} type="button" onClick={() => setAmount(String(c))} className="h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ring-slate-200 hover:bg-slate-50">{c === Math.round(due ?? -1) ? `Poora ${formatPKR(c)}` : formatPKR(c)}</button>)}
        </div>
        <Select label="Kaise mila" value={method} onChange={(e) => setMethod(e.target.value)} options={PAY_METHODS} hint={method === 'CASH' ? 'Cash khule drawer me jata hai' : 'Is account me jata hai; drawer ka cash nahi badalta'} />
        <Textarea label="Note (marzi)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </form>
    </Modal>
  );
}
