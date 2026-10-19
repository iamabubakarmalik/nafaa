/**
 * Picks a customer from the shop's customers (search by name or phone),
 * showing the khata balance, or makes a new one with name and phone.
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Phone, Plus, Search, UserRound, X } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';
import { useDebounced } from '../hooks/usePageKeys';
import { errorText } from '../lib/meta';

export type PickedCustomer = Pick<Customer, 'id' | 'name' | 'phone' | 'address' | 'balance' | 'creditLimit'>;

export function CustomerPick({ value, onChange, allowCreate = true, error }: {
  value: PickedCustomer | null;
  onChange: (c: PickedCustomer | null) => void;
  allowCreate?: boolean;
  error?: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const term = useDebounced(q.trim());
  const { data } = useQuery({
    queryKey: ['hardware-customer-pick', term],
    queryFn: () => customersApi.list({ search: term, scope: 'all', limit: 8 }),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });
  const list = (data?.items ?? []) as Customer[];

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
        <UserRound className="h-5 w-5 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{value.name}</span>
          <span className="block truncate text-[0.75rem] text-slate-500">{[value.phone, value.balance > 0 ? `Udhaar ${formatPKR(value.balance)}` : 'Koi udhaar nahi'].filter(Boolean).join(' · ')}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} aria-label="Customer hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  const create = async () => {
    const name = q.trim();
    if (name.length < 2) { toast.error('Customer ka naam likhein'); return; }
    if (phone && !/^[0-9+\-\s]{10,15}$/.test(phone.trim())) { toast.error('Phone number theek likhein (03xx-xxxxxxx)'); return; }
    setBusy(true);
    try {
      const c = await customersApi.create({ name, phone: phone.trim() || undefined });
      qc.invalidateQueries({ queryKey: ['customers'] });
      onChange(c);
      setQ(''); setPhone('');
      toast.success(`${c.name} customer ban gaya`);
    } catch (e) { toast.error(errorText(e, 'Customer nahi bana')); } finally { setBusy(false); }
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-[1.375rem] h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Customer ka naam ya phone…" aria-invalid={!!error}
        className="h-11 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-3 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500 aria-[invalid=true]:ring-rose-400" />
      {error && <p className="mt-1 text-[0.8125rem] font-medium text-rose-600">{error}</p>}
      {q.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-12 z-30 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => { onChange(c); setQ(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-50">
              <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-slate-900">{c.name}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{c.phone || 'Phone nahi'}</span>
              </span>
              {c.balance > 0 && <span className="text-[0.75rem] font-semibold tabular-nums text-amber-700">{formatPKR(c.balance)}</span>}
            </button>
          ))}
          {allowCreate && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-2">
              <span className="relative min-w-0 flex-1">
                <Phone className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (marzi)" inputMode="tel"
                  className="h-9 w-full rounded-lg bg-slate-100 pl-8 pr-2 text-[0.8125rem] outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
              </span>
              <button type="button" disabled={busy} onClick={() => void create()} className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg disabled:opacity-60">
                <Plus className="h-4 w-4" />"{q.trim()}" naya customer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
