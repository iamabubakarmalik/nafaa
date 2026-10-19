/**
 * Small pieces the appliance desks share: status pill, list states and
 * paging, money boxes, the take-payment and reason dialogs, customer
 * fields with lookup by phone, technician select and time-slot chips.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { Wallet } from 'lucide-react';
import { Button, Input, Modal, Select, Skeleton, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { techniciansApi } from '../api/technicians.api';
import { TECH_KEY, TIME_SLOTS, digits, money, phoneOk, type Meta } from './meta';

export function Pill({ meta, className }: { meta: Meta; className?: string }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', meta.tone, className)}>{meta.label}</span>;
}

/** Loading, error and empty states around a list. */
export function ListState({ loading, error, empty, onRetry, icon: Icon, title, hint, actions, children }: {
  loading: boolean; error: boolean; empty: boolean; onRetry: () => void;
  icon: LucideIcon; title: string; hint?: string; actions?: ReactNode; children: ReactNode;
}) {
  if (loading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (error) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">List load nahi hui</p>
        <Button className="mt-3" variant="secondary" onClick={onRetry}>Dobara koshish</Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Icon className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{title}</p>
        {hint && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{hint}</p>}
        {actions && <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    );
  }
  return <>{children}</>;
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Pichla</Button>
      <span className="text-sm text-slate-600">Safha {page} / {pages}</span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Agla</Button>
    </div>
  );
}

export function Box({ label, value, tone = 'text-slate-900' }: { label: string; value: ReactNode; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[0.75rem] text-slate-500">{label}</dt><dd className={cn('text-base font-bold tabular-nums', tone)}>{value}</dd></div>;
}

/** Card section used by analytics tabs and detail panels. */
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

/** Takes money against a job: amount (up to what is due), how it came, a note. */
export function PayModal({ title, description, due, pending, onConfirm, onClose }: {
  title: string; description?: string; due: number; pending: boolean;
  onConfirm: (v: { amount: number; paymentMethod: PaymentMethod; note?: string }) => void; onClose: () => void;
}) {
  const [amount, setAmount] = useState(due > 0 ? String(due) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;
  const error = !amount ? undefined : n <= 0 ? 'Amount likhein' : n > due + 0.01 ? `Sirf ${formatPKR(due)} baqi hai` : undefined;
  const submit = () => { if (n > 0 && !error && !pending) onConfirm({ amount: n, paymentMethod: method, note: note.trim() || undefined }); };
  return (
    <Modal open onClose={onClose} size="sm" title={title} description={description}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} disabled={!(n > 0) || !!error} loading={pending} leftIcon={<Wallet className="h-4 w-4" />}>{n > 0 ? `${formatPKR(n)} lein` : 'Paisa lein'}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">Baqi: <strong className="tabular-nums">{formatPKR(due)}</strong></p>
        <Input label="Kitna mila" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(money(e.target.value))} error={error} />
        <PaymentMethodPicker value={method} onChange={setMethod} />
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Marzi hai" />
      </form>
    </Modal>
  );
}

/** Asks for the reason before a cancel or a failed visit. */
export function ReasonModal({ title, label = 'Wajah', confirm, pending, presets = [], onConfirm, onClose }: {
  title: string; label?: string; confirm: string; pending: boolean; presets?: string[];
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
        {presets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => <button key={p} type="button" onClick={() => setReason(p)} className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] ring-1', reason === p ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{p}</button>)}
          </div>
        )}
        <Textarea label={label} rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} error={reason && !ok ? 'Thori si wajah likhein' : undefined} />
      </div>
    </Modal>
  );
}

export interface PartyDraft { customerId?: string; name: string; phone: string; address: string; area: string }
export const emptyParty: PartyDraft = { name: '', phone: '', address: '', area: '' };

/** Customer name, phone and address; typing a phone offers saved customers to fill from. */
export function CustomerFields({ value, onChange, errors = {}, needAddress = true }: {
  value: PartyDraft; onChange: (v: PartyDraft) => void; errors?: Partial<Record<'name' | 'phone' | 'address', string>>; needAddress?: boolean;
}) {
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(value.customerId ? '' : (digits(value.phone).length >= 4 ? value.phone : value.name.trim().length >= 3 ? value.name.trim() : '')), 300);
    return () => clearTimeout(t);
  }, [value.phone, value.name, value.customerId]);
  const found = useQuery({ queryKey: ['appliance-customer-lookup', q], queryFn: () => customersApi.list({ search: q, limit: 5, scope: 'all' }), enabled: q.length >= 3, staleTime: 30_000 });
  const matches = useMemo(() => (found.data?.items ?? []).slice(0, 5), [found.data]);
  const set = (patch: Partial<PartyDraft>) => onChange({ ...value, ...patch, ...(('name' in patch || 'phone' in patch) && !('customerId' in patch) ? { customerId: undefined } : {}) });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Customer ka naam" required value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ali Raza" error={errors.name} />
        <Input label="Phone" required inputMode="tel" value={value.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="0300-1234567"
          error={errors.phone ?? (value.phone && !phoneOk(value.phone) ? '03xx-xxxxxxx likhein' : undefined)} />
      </div>
      {matches.length > 0 && !value.customerId && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[0.75rem] text-slate-500">Pehle se customer:</span>
          {matches.map((c) => (
            <button key={c.id} type="button" onClick={() => onChange({ customerId: c.id, name: c.name, phone: c.phone ?? value.phone, address: c.address ?? value.address, area: c.area ?? value.area })}
              className="h-7 rounded-lg bg-brand-50 px-2 text-[0.75rem] font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100">{c.name}{c.phone ? ` · ${c.phone}` : ''}</button>
          ))}
        </div>
      )}
      {value.customerId && <p className="text-[0.75rem] text-emerald-700">Saved customer — khata isi ke naam chalega. <button type="button" className="underline" onClick={() => onChange({ ...value, customerId: undefined })}>Alag customer</button></p>}
      {needAddress && (
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Input label="Pata" required value={value.address} onChange={(e) => set({ address: e.target.value })} placeholder="House 12, Street 4" error={errors.address} hint="Technician / driver isi par jayega" />
          <Input label="Ilaqa" value={value.area} onChange={(e) => set({ area: e.target.value })} placeholder="Gulberg" />
        </div>
      )}
    </div>
  );
}

/** Problems with a party draft, for forms that need name, phone and address. */
export function partyErrors(p: PartyDraft, needAddress = true) {
  const e: Partial<Record<'name' | 'phone' | 'address', string>> = {};
  if (p.name.trim().length < 2) e.name = 'Customer ka naam likhein';
  if (!phoneOk(p.phone)) e.phone = 'Sahi mobile number likhein (03xx-xxxxxxx)';
  if (needAddress && p.address.trim().length < 5) e.address = 'Poora pata likhein';
  return e;
}

/** Active technicians to pick for a job. */
export function TechSelect({ value, onChange, label = 'Technician', hint }: { value: string; onChange: (id: string) => void; label?: string; hint?: string }) {
  const q = useQuery({ queryKey: [TECH_KEY, 'active'], queryFn: () => techniciansApi.list({ active: true }), staleTime: 60_000 });
  return (
    <Select label={label} hint={hint} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Baad me lagayein"
      options={(q.data ?? []).map((t) => ({ value: t.id, label: `${t.name}${t.currentZone ? ` · ${t.currentZone}` : ''}${t.openJobs ? ` · ${t.openJobs} kaam` : ''}` }))} />
  );
}

export function SlotChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Waqt</span>
      <div className="flex flex-wrap gap-1.5">
        {TIME_SLOTS.map((s) => (
          <button key={s.value} type="button" onClick={() => onChange(value === s.value ? '' : s.value)} aria-pressed={value === s.value}
            className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', value === s.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{s.label}</button>
        ))}
      </div>
    </div>
  );
}

/** Chip toggles for a list of options. */
export function Chips<T extends string>({ options, value, onChange }: { options: Array<{ value: T; label: string }>; value: T | ''; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', value === o.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{o.label}</button>
      ))}
    </div>
  );
}

/** Summary strip above a list: count and money in the current filter. */
export function Strip({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">{children}</div>;
}
