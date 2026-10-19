/**
 * Form pieces used by several salon screens: the customer box (pick a saved
 * customer or type a walk-in name and phone), the stylist and service
 * lists, the product finder (retail and products used on a service) and
 * the cancel dialog with the advance reminder.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Ban, Package, Phone, Search, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';
import { offlineProductsApi } from '@core/lib/offline/offlineProducts';
import type { Product } from '@modules/inventory/products/api/products.api';
import { salonServicesApi } from '../api/services.api';
import { staffProfilesApi } from '../api/staff-profiles.api';
import { SALON_KEYS, apiError, staffName } from '../lib/meta';

export interface CustomerValue { customerId: string; name: string; phone: string; balance?: number }
export const emptyCustomer: CustomerValue = { customerId: '', name: '', phone: '' };

/** Bookable stylists, cached for every salon screen. */
export function useStylists() {
  const q = useQuery({ queryKey: [SALON_KEYS.staff, 'list'], queryFn: () => staffProfilesApi.list(), staleTime: 60_000 });
  const all = q.data ?? [];
  return { all, bookable: all.filter((s) => s.isBookable), loading: q.isLoading, nameOf: (id?: string | null) => staffName(all.find((s) => s.id === id)) };
}

/** Active services, cached for every salon screen. */
export function useServices() {
  const q = useQuery({ queryKey: [SALON_KEYS.services, 'active'], queryFn: () => salonServicesApi.list({ active: true }), staleTime: 60_000 });
  return { services: q.data ?? [], loading: q.isLoading };
}

/**
 * Customer of a booking or bill: search by name or phone and pick, or type
 * a walk-in name and phone (a khata opens by itself when money is held).
 */
export function CustomerField({ value, onChange, error, hint, locked, compact }: {
  value: CustomerValue;
  onChange: (v: CustomerValue) => void;
  error?: string;
  hint?: string;
  locked?: boolean;
  /** Search only, no walk-in name fields. */
  compact?: boolean;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const term = q.trim();
  const found = useQuery({
    queryKey: ['customers', 'salon-pick', term],
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
        <Input label={compact ? undefined : 'Customer dhoondein'} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="Naam ya phone likhein" leftIcon={<Search className="h-4 w-4" />} hint={compact ? undefined : hint ?? 'Na mile to neeche naam aur phone likh dein'} />
        {open && term.length >= 2 && (
          <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-2xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
            {found.isLoading ? <p className="px-3 py-2 text-[0.8125rem] text-slate-500">Dhoond rahe hain…</p>
              : !(found.data?.items ?? []).length ? <p className="px-3 py-2 text-[0.8125rem] text-slate-500">Koi nahi mila{compact ? '' : ' — neeche naya likhein'}</p>
              : found.data!.items.map((c) => (
                <button key={c.id} type="button" onClick={() => pick(c)} className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50">
                  <span className="min-w-0"><span className="block truncate text-[0.875rem] font-medium text-slate-900">{c.name}</span><span className="text-[0.75rem] text-slate-500">{c.phone ?? '—'}</span></span>
                  {Number(c.balance) > 0.5 && <span className="shrink-0 text-[0.75rem] font-semibold text-rose-700">{formatPKR(Number(c.balance))}</span>}
                </button>
              ))}
          </div>
        )}
      </div>
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Naya customer — naam" value={value.name} error={error} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Ayesha Khan" maxLength={120} />
          <Input label="Phone" inputMode="tel" value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value.replace(/[^\d+\- ]/g, '') })} placeholder="03001234567"
            leftIcon={<Phone className="h-4 w-4" />} maxLength={20} hint="Yaad dihani aur WhatsApp isi par" />
        </div>
      )}
    </div>
  );
}

/** Products from the offline store (works without internet), raw materials included. */
export function useProductFinder(term: string, enabled = true) {
  const q = useQuery({
    queryKey: ['products-for-pos'],
    queryFn: () => offlineProductsApi.list({ page: 1, limit: 100_000 }),
    staleTime: 30_000,
    enabled,
  });
  const all = ((q.data?.items ?? []) as Product[]).filter((p) => p.isActive !== false && p.unit !== 'service' && !(p.sku ?? '').startsWith('SALON-SVC-'));
  const t = term.trim().toLowerCase();
  const list = t ? all.filter((p) => `${p.name} ${p.sku ?? ''} ${p.barcode ?? ''}`.toLowerCase().includes(t)) : all;
  return { products: list.slice(0, 30), all, loading: q.isLoading };
}

/** Search box that picks one product. */
export function ProductPicker({ onPick, placeholder = 'Cheez ka naam ya barcode', autoFocus }: { onPick: (p: Product) => void; placeholder?: string; autoFocus?: boolean }) {
  const [term, setTerm] = useState('');
  const { products, loading } = useProductFinder(term);
  return (
    <div className="space-y-2">
      <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={placeholder} leftIcon={<Search className="h-4 w-4" />} autoFocus={autoFocus} />
      <div className="max-h-72 overflow-auto rounded-2xl ring-1 ring-slate-200">
        {loading ? <p className="px-3 py-3 text-[0.8125rem] text-slate-500">Load ho raha hai…</p>
          : !products.length ? <p className="px-3 py-3 text-[0.8125rem] text-slate-500">Koi cheez nahi mili — pehle Products me daalein</p>
          : products.map((p) => (
            <button key={p.id} type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-slate-50">
              <Package className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-slate-900">{p.name}</span>
                <span className="text-[0.75rem] text-slate-500">Stock {Number((p as Product & { shopStock?: number }).shopStock ?? p.stock ?? 0)} {p.unit}</span>
              </span>
              <span className="shrink-0 text-[0.8125rem] tabular-nums text-slate-700">{formatPKR(Number(p.price || 0))}</span>
            </button>
          ))}
      </div>
    </div>
  );
}

/** Cancel with a reason; reminds that an advance stays on the customer's khata. */
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
        <Textarea label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300}
          placeholder="Customer ne mana kar diya, shaadi ki date badal gayi…" hint="Marzi hai — baad me yaad rehta hai" />
      </div>
    </Modal>
  );
}
