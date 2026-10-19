/**
 * Form pieces used by several garments screens: the customer box (pick a
 * saved customer or type a new name and phone), the tailor list and the
 * cancel dialog with the advance reminder.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Ban, Phone, Search, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Select, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';
import { staffApi } from '@modules/organization/staff/api/staff.api';
import { apiError } from './meta';

export interface CustomerValue { customerId: string; name: string; phone: string; balance?: number }
export const emptyCustomer: CustomerValue = { customerId: '', name: '', phone: '' };

/**
 * Customer of a job: search by name or phone and pick, or just type a new
 * name and phone (the khata opens by itself when money is held).
 */
export function CustomerField({ value, onChange, error, hint, locked }: {
  value: CustomerValue;
  onChange: (v: CustomerValue) => void;
  error?: string;
  hint?: string;
  /** Customer cannot change (money already taken). */
  locked?: boolean;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const term = q.trim();
  const found = useQuery({
    queryKey: ['customers', 'garments-pick', term],
    queryFn: () => customersApi.list({ search: term, limit: 8 }),
    enabled: open && term.length >= 2,
    staleTime: 30_000,
  });
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  const pick = (c: Customer) => {
    onChange({ customerId: c.id, name: c.name, phone: c.phone ?? '', balance: Number(c.balance ?? 0) });
    setQ(''); setOpen(false);
  };

  if (value.customerId) {
    const bal = Number(value.balance ?? 0);
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50/60 px-3 py-2.5 ring-1 ring-brand-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-100"><UserRound className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-slate-900">{value.name}</p>
          <p className="text-[0.75rem] text-slate-500">
            {value.phone || 'Phone nahi'}
            {bal > 0.5 && <span className="ml-2 font-semibold text-rose-700">Udhaar {formatPKR(bal)}</span>}
            {bal < -0.5 && <span className="ml-2 font-semibold text-success-700">Advance jama {formatPKR(-bal)}</span>}
          </p>
        </div>
        {!locked && <button type="button" onClick={() => onChange(emptyCustomer)} aria-label="Customer hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>}
      </div>
    );
  }

  return (
    <div ref={box} className="space-y-3">
      <div className="relative">
        <Input label="Purana customer dhoondein" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Naam ya phone likhein" leftIcon={<Search className="h-4 w-4" />} hint={hint ?? 'Na mile to neeche naya naam aur phone likh dein'} />
        {open && term.length >= 2 && (
          <div className="absolute inset-x-0 top-[4.25rem] z-30 max-h-72 overflow-auto rounded-2xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
            {found.isLoading ? <p className="px-3 py-2 text-[0.8125rem] text-slate-500">Dhoond rahe hain…</p>
              : !(found.data?.items ?? []).length ? <p className="px-3 py-2 text-[0.8125rem] text-slate-500">Koi nahi mila — neeche naya likhein</p>
              : found.data!.items.map((c) => (
                <button key={c.id} type="button" onClick={() => pick(c)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                  <span className="min-w-0"><span className="block truncate text-[0.875rem] font-medium text-slate-900">{c.name}</span><span className="text-[0.75rem] text-slate-500">{c.phone ?? '—'}</span></span>
                  {Number(c.balance) > 0.5 && <span className="shrink-0 text-[0.75rem] font-semibold text-rose-700">{formatPKR(Number(c.balance))}</span>}
                </button>
              ))}
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Naya customer — naam" value={value.name} error={error} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Ahmad Raza" maxLength={120} />
        <Input label="Phone" inputMode="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value.replace(/[^\d+\- ]/g, '') })} placeholder="03001234567"
          leftIcon={<Phone className="h-4 w-4" />} maxLength={20} hint="Tayyar hone par WhatsApp isi par" />
      </div>
    </div>
  );
}

/** Staff list as tailor choices; empty when the user cannot see staff. */
export function useTailors() {
  const q = useQuery({ queryKey: ['staff', 'garments-tailors'], queryFn: () => staffApi.list({ status: 'ACTIVE' }).catch(() => []), staleTime: 5 * 60_000 });
  return (q.data ?? []).map((s) => ({ id: s.id, name: s.fullName, job: s.designation }));
}

export function TailorSelect({ value, onChange, hint }: { value: string; onChange: (id: string) => void; hint?: string }) {
  const tailors = useTailors();
  return (
    <Select label="Karigar" value={value} onChange={(e) => onChange(e.target.value)}
      options={[{ value: '', label: tailors.length ? '— Baad me —' : 'Staff me karigar nahi' }, ...tailors.map((t) => ({ value: t.id, label: t.job ? `${t.name} · ${t.job}` : t.name }))]}
      hint={hint ?? 'Kis ko kaam diya — report me karigar ke hisaab se ginti'} />
  );
}

/** Cancel with a reason; reminds that money taken stays on the customer's khata. */
export function CancelModal({ title, paid, onConfirm, onClose }: {
  title: string;
  paid: number;
  onConfirm: (reason: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const run = useMutation({
    mutationFn: () => onConfirm(reason.trim()),
    onSuccess: () => { toast.success('Cancel ho gaya'); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Cancel karein?" description={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" loading={run.isPending} onClick={() => run.mutate()} leftIcon={<Ban className="h-4 w-4" />}>Haan, cancel</Button>
      </>}>
      <div className="space-y-3">
        {paid > 0 && (
          <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {formatPKR(paid)} customer ke khate me advance ban kar jama rahenge. Wapas dene hon to Khata se "Paisa wapas" karein, ya agle bill me kat jayenge.
          </p>
        )}
        <Textarea data-autofocus label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300}
          placeholder="Customer ne mana kar diya, kapra pasand nahi aaya…" hint="Marzi hai — baad me yaad rehta hai" />
      </div>
    </Modal>
  );
}

/** Small coloured status pill. */
export function Pill({ tone, children, className }: { tone: string; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', tone, className)}>{children}</span>;
}
