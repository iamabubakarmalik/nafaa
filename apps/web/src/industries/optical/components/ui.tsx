/**
 * Small pieces the optical desks share: status pill, list states and paging,
 * money boxes, payment and reason dialogs, customer fields with lookup by
 * phone, the eye power grid (entry and print-like view) and the form header.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { Button, Input, Kbd, Modal, PageHero, Skeleton, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { digits, fmtPower, moneyInput, phoneOk, type Meta, type Power } from '../lib/meta';

export function Pill({ meta, className }: { meta: Meta; className?: string }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', meta.tone, className)}>{meta.label}</span>;
}

/** Loading, error and empty states inside a ListCard. */
export function ListState({ loading, error, empty, onRetry, icon: Icon, title, hint, actions, children }: {
  loading: boolean; error: boolean; empty: boolean; onRetry: () => void;
  icon: LucideIcon; title: string; hint?: string; actions?: ReactNode; children: ReactNode;
}) {
  if (loading) return <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  if (error) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="font-semibold text-slate-900">List nahi khuli</p>
        <Button className="mt-3" variant="secondary" onClick={onRetry}>Dobara koshish</Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="px-6 py-14 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-7 w-7" /></span>
        <p className="mt-3 font-semibold text-slate-900">{title}</p>
        {hint && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{hint}</p>}
        {actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    );
  }
  return <>{children}</>;
}

/** White card that holds a list or table. */
export function ListCard({ children }: { children: ReactNode }) {
  return <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">{children}</section>;
}

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(Math.ceil(total / limit), 1);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[0.8125rem] text-slate-600">
      <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}</span>
      <div className="flex gap-1.5">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>Pichhla</Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} rightIcon={<ChevronRight className="h-4 w-4" />}>Agla</Button>
      </div>
    </div>
  );
}

export function Box({ label, value, tone = 'text-slate-900' }: { label: string; value: ReactNode; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[0.75rem] text-slate-500">{label}</dt><dd className={cn('text-base font-bold tabular-nums', tone)}>{value}</dd></div>;
}

/** Card section for analytics tabs and detail panels. */
export function Panel({ title, hint, actions, children, className }: { title: ReactNode; hint?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><h3 className="font-semibold text-slate-900">{title}</h3>{hint && <p className="mt-0.5 text-[0.8125rem] text-slate-500">{hint}</p>}</div>
        {actions}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Horizontal bars for "count by status/type" panels. */
export function Bars({ rows, empty = 'Abhi kuch nahi' }: { rows: Array<{ key: string; label: string; value: number; color: string; hint?: string }>; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-[0.8125rem] text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex justify-between text-[0.8125rem]"><span className="font-medium text-slate-700">{r.label}</span><span className="tabular-nums text-slate-600">{r.hint ?? r.value}</span></div>
          <div className="mt-1 h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.color }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Summary strip above a list: count and money in the current filter. */
export function Strip({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">{children}</div>;
}

/** Chip toggles for a list of options; clicking the chosen one clears it when `clearable`. */
export function Chips({ options, value, onChange, clearable }: { options: string[]; value: string; onChange: (v: string) => void; clearable?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(clearable && value === o ? '' : o)} aria-pressed={value === o}
          className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', value === o ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{o}</button>
      ))}
    </div>
  );
}

/** Header for form pages: back, title, what the page does, save shortcut. */
export function FormHeader({ title, hint }: { title: string; hint: string }) {
  const navigate = useNavigate();
  return (
    <PageHero
      title={title}
      subtitle={hint}
      back={() => navigate(-1)}
      backLabel="Wapas (Esc)"
      meta={<span className="inline-flex items-center gap-1.5"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save · <Kbd>Esc</Kbd> wapas</span>}
    />
  );
}

/** Takes money: amount (up to what is due), how it came. */
export function PayModal({ title, description, due, pending, onConfirm, onClose }: {
  title: string; description?: string; due: number; pending: boolean;
  onConfirm: (v: { amount: number; paymentMethod: PaymentMethod }) => void; onClose: () => void;
}) {
  const [amount, setAmount] = useState(due > 0 ? String(due) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const n = Number(amount) || 0;
  const error = !amount ? undefined : n <= 0 ? 'Amount likhein' : n > due + 0.01 ? `Sirf ${formatPKR(due)} baqi hai` : undefined;
  const submit = () => { if (n > 0 && !error && !pending) onConfirm({ amount: n, paymentMethod: method }); };
  return (
    <Modal open onClose={onClose} size="sm" title={title} description={description}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} disabled={!(n > 0) || !!error} loading={pending} leftIcon={<Wallet className="h-4 w-4" />}>{n > 0 ? `${formatPKR(n)} lein` : 'Paisa lein'}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">Baqi: <strong className="tabular-nums">{formatPKR(due)}</strong></p>
        <Input label="Kitna mila" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(moneyInput(e.target.value))} error={error} />
        <PaymentMethodPicker value={method} onChange={setMethod} />
      </form>
    </Modal>
  );
}

/** Asks for a reason before a cancel or a no-show. */
export function ReasonModal({ title, confirm, pending, presets = [], children, onConfirm, onClose }: {
  title: string; confirm: string; pending: boolean; presets?: string[]; children?: ReactNode;
  onConfirm: (reason: string) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const ok = reason.trim().length >= 3;
  return (
    <Modal open onClose={onClose} size="sm" title={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" onClick={() => ok && onConfirm(reason.trim())} disabled={!ok} loading={pending}>{confirm}</Button>
      </>}>
      <div className="space-y-3">
        {presets.length > 0 && <Chips options={presets} value={reason} onChange={setReason} />}
        <Textarea label="Wajah" rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} error={reason && !ok ? 'Thori si wajah likhein' : undefined} />
        {children}
      </div>
    </Modal>
  );
}

export interface PartyDraft { customerId?: string; name: string; phone: string }
export const emptyParty: PartyDraft = { name: '', phone: '' };

/** Customer name and phone; typing either offers saved customers to fill from. */
export function CustomerFields({ value, onChange, errors = {}, phoneRequired = true }: {
  value: PartyDraft; onChange: (v: PartyDraft) => void; errors?: Partial<Record<'name' | 'phone', string>>; phoneRequired?: boolean;
}) {
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(value.customerId ? '' : (digits(value.phone).length >= 4 ? value.phone : value.name.trim().length >= 3 ? value.name.trim() : '')), 300);
    return () => clearTimeout(t);
  }, [value.phone, value.name, value.customerId]);
  const found = useQuery({ queryKey: ['optical-customer-lookup', q], queryFn: () => customersApi.list({ search: q, limit: 5, scope: 'all' }), enabled: q.length >= 3, staleTime: 30_000 });
  const matches = useMemo(() => (found.data?.items ?? []).slice(0, 5), [found.data]);
  const set = (patch: Partial<PartyDraft>) => onChange({ ...value, ...patch, customerId: undefined });
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Customer ka naam" required value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ali Raza" error={errors.name} maxLength={120} />
        <Input label="Mobile" required={phoneRequired} inputMode="tel" value={value.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="0300-1234567" maxLength={20}
          error={errors.phone ?? (value.phone && !phoneOk(value.phone) ? '03xx-xxxxxxx likhein' : undefined)} hint="Isi number se customer ka record aur khata judta hai" />
      </div>
      {matches.length > 0 && !value.customerId && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[0.75rem] text-slate-500">Pehle se customer:</span>
          {matches.map((c) => (
            <button key={c.id} type="button" onClick={() => onChange({ customerId: c.id, name: c.name, phone: c.phone ?? value.phone })}
              className="h-7 rounded-lg bg-brand-50 px-2 text-[0.75rem] font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100">{c.name}{c.phone ? ` · ${c.phone}` : ''}</button>
          ))}
        </div>
      )}
      {value.customerId && <p className="text-[0.75rem] text-success-700">Saved customer — record aur khata isi ke naam. <button type="button" className="underline" onClick={() => onChange({ ...value, customerId: undefined })}>Alag customer</button></p>}
    </div>
  );
}

export function partyErrors(p: PartyDraft, phoneRequired = true) {
  const e: Partial<Record<'name' | 'phone', string>> = {};
  if (p.name.trim().length < 2) e.name = 'Customer ka naam likhein';
  if ((phoneRequired || p.phone.trim()) && !phoneOk(p.phone)) e.phone = 'Sahi mobile number likhein (03xx-xxxxxxx)';
  return e;
}

/* ── Eye power ── */

export type PowerDraft = Record<keyof Power, string>;
export const emptyPower: PowerDraft = { rightSph: '', rightCyl: '', rightAxis: '', rightAdd: '', leftSph: '', leftCyl: '', leftAxis: '', leftAdd: '', pupilDistance: '' };

export const powerDraftOf = (p?: Power | null): PowerDraft => {
  const out = { ...emptyPower };
  if (!p) return out;
  for (const k of Object.keys(emptyPower) as Array<keyof Power>) if (p[k] != null) out[k] = String(p[k]);
  return out;
};

/** Typed strings → numbers (empty stays out); axis is whole degrees. */
export function powerOf(d: PowerDraft): Power {
  const out: Power = {};
  for (const k of Object.keys(d) as Array<keyof Power>) {
    const v = d[k].trim();
    if (v === '' || v === '-' || v === '+') continue;
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = k.endsWith('Axis') ? Math.round(n) : n;
  }
  return out;
}

const powerInput = (v: string) => v.replace(/[^\d.+-]/g, '').replace(/(?!^)[+-]/g, '').replace(/(\..*)\./g, '$1');
const COLS: Array<{ key: 'Sph' | 'Cyl' | 'Axis' | 'Add'; label: string; hint: string }> = [
  { key: 'Sph', label: 'SPH', hint: '-1.25' }, { key: 'Cyl', label: 'CYL', hint: '-0.50' }, { key: 'Axis', label: 'AXIS', hint: '180' }, { key: 'Add', label: 'ADD', hint: '+2.00' },
];

/** Entry grid for both eyes, the way a nuskha is written: R and L rows, SPH CYL AXIS ADD, and PD. */
export function PowerGrid({ value, onChange, errors = {}, showAdd = true }: { value: PowerDraft; onChange: (v: PowerDraft) => void; errors?: Record<string, string>; showAdd?: boolean }) {
  const cols = showAdd ? COLS : COLS.filter((c) => c.key !== 'Add');
  const set = (k: keyof Power, v: string) => onChange({ ...value, [k]: k.endsWith('Axis') || k === 'pupilDistance' ? v.replace(/[^\d.]/g, '') : powerInput(v) });
  const err = Object.entries(errors).filter(([k]) => k in emptyPower).map(([, v]) => v);
  return (
    <div>
      <div role="group" aria-label="Eye power" className="grid gap-1.5 overflow-x-auto" style={{ gridTemplateColumns: `4.5rem repeat(${cols.length}, minmax(4rem, 1fr))` }}>
        <span />
        {cols.map((c) => <span key={c.key} className="text-center text-[0.75rem] font-semibold text-slate-600">{c.label}</span>)}
        {(['right', 'left'] as const).map((side) => [
          <span key={side} className="self-center text-[0.8125rem] font-semibold text-slate-700">{side === 'right' ? 'R (Dayan)' : 'L (Bayan)'}</span>,
          ...cols.map((c) => {
            const k = `${side}${c.key}` as keyof Power;
            return (
              <input key={k} aria-label={`${side === 'right' ? 'Right' : 'Left'} ${c.label}`} inputMode="decimal" value={value[k]} onChange={(e) => set(k, e.target.value)} placeholder={c.hint}
                className={cn('h-10 w-full rounded-lg border bg-white px-2 text-center font-mono text-[0.875rem] tabular-nums outline-none focus:ring-2 focus:ring-brand-500', errors[k] ? 'border-rose-400' : 'border-slate-300')} />
            );
          }),
        ])}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[0.8125rem] font-medium text-slate-700">PD (mm)
          <input inputMode="decimal" value={value.pupilDistance} onChange={(e) => set('pupilDistance', e.target.value)} placeholder="62"
            className={cn('h-10 w-20 rounded-lg border bg-white px-2 text-center font-mono outline-none focus:ring-2 focus:ring-brand-500', errors.pupilDistance ? 'border-rose-400' : 'border-slate-300')} />
        </label>
        <p className="text-[0.75rem] text-slate-500">Minus number ke aage "-" likhein. CYL ho to AXIS zaroori. 0.25 ke qadam.</p>
      </div>
      {err.length > 0 && <p className="mt-1.5 text-[0.8125rem] font-medium text-rose-600">{[...new Set(err)].join(' · ')}</p>}
    </div>
  );
}

/** Read-only eye power, like the printed nuskha. */
export function PowerTable({ p, compact }: { p: Power; compact?: boolean }) {
  const cell = (v?: number | null, axis?: boolean) => (v == null ? '—' : axis ? `${v}°` : fmtPower(v));
  const rows: Array<['R' | 'L', 'right' | 'left']> = [['R', 'right'], ['L', 'left']];
  return (
    <div className={cn('tabular-nums', compact ? 'text-[0.8125rem]' : 'text-[0.875rem]')}>
      <div className="grid grid-cols-[2.5rem_repeat(4,minmax(0,1fr))] gap-y-1 text-center">
        <span className="text-left text-[0.75rem] font-medium text-slate-500">Aankh</span>
        {['SPH', 'CYL', 'AXIS', 'ADD'].map((h) => <span key={h} className="text-[0.75rem] font-medium text-slate-500">{h}</span>)}
        {rows.map(([label, side]) => [
          <span key={label} className="border-t border-slate-100 pt-1 text-left font-semibold text-slate-700">{label}</span>,
          <span key={`${label}s`} className="border-t border-slate-100 pt-1 font-mono">{cell(p[`${side}Sph`])}</span>,
          <span key={`${label}c`} className="border-t border-slate-100 pt-1 font-mono">{cell(p[`${side}Cyl`])}</span>,
          <span key={`${label}x`} className="border-t border-slate-100 pt-1 font-mono">{cell(p[`${side}Axis`], true)}</span>,
          <span key={`${label}a`} className="border-t border-slate-100 pt-1 font-mono">{cell(p[`${side}Add`])}</span>,
        ])}
      </div>
      {p.pupilDistance != null && <p className="mt-1 text-[0.75rem] text-slate-500">PD: <span className="font-mono font-semibold text-slate-700">{p.pupilDistance} mm</span></p>}
    </div>
  );
}

/** Print rows for eye power, used in slips. */
export function powerPrintRows(p: Power): string[][] {
  const c = (v?: number | null, axis?: boolean) => (v == null ? '—' : axis ? `${v}` : fmtPower(v));
  return [
    ['R', c(p.rightSph), c(p.rightCyl), c(p.rightAxis, true), c(p.rightAdd)],
    ['L', c(p.leftSph), c(p.leftCyl), c(p.leftAxis, true), c(p.leftAdd)],
  ];
}
