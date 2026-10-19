/**
 * Name, phone, CNIC (and address) of a customer or seller, with a search over
 * the customer list: picking one links the record to that khata. Typing a
 * phone that already belongs to a customer offers the same link.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, Search, UserCheck, X } from 'lucide-react';
import { Input } from '@/design-system/components';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';
import { digits, formatCnic } from './meta';

export interface Person { customerId: string; name: string; phone: string; cnic: string; address: string }
export const EMPTY_PERSON: Person = { customerId: '', name: '', phone: '', cnic: '', address: '' };

export function PersonFields({ value, onChange, cnicRequired, withAddress, errors = {} }: {
  value: Person;
  onChange: (p: Person) => void;
  cnicRequired?: boolean;
  withAddress?: boolean;
  errors?: Partial<Record<keyof Person, string>>;
}) {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(term.trim()), 250); return () => clearTimeout(t); }, [term]);
  const phone = digits(value.phone);
  const found = useQuery({
    queryKey: ['mobile-person-search', q],
    queryFn: () => customersApi.list({ search: q, scope: 'all', limit: 8 }),
    enabled: q.length >= 2,
  });
  const byPhone = useQuery({
    queryKey: ['mobile-person-phone', phone],
    queryFn: () => customersApi.list({ search: phone, scope: 'all', limit: 3 }),
    enabled: !value.customerId && phone.length >= 10,
  });
  const match = byPhone.data?.items.find((c) => digits(c.phone ?? '') === phone);
  const pickCustomer = (c: Customer) => {
    onChange({ customerId: c.id, name: c.name, phone: c.phone ?? value.phone, cnic: c.cnic ?? value.cnic, address: c.address ?? value.address });
    setOpen(false);
    setTerm('');
  };
  const set = (patch: Partial<Person>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      {value.customerId ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[0.8125rem] text-emerald-900 ring-1 ring-emerald-200">
          <UserCheck className="h-4 w-4" />Khata wale customer se jura hai
          <button type="button" onClick={() => set({ customerId: '' })} className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline"><X className="h-3.5 w-3.5" />Alag karein</button>
        </div>
      ) : (
        <div className="relative">
          <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
            <Search className="h-3.5 w-3.5" />Purane customer me se chunein
          </button>
          {open && (
            <div className="mt-2 rounded-xl bg-white p-2 ring-1 ring-slate-200">
              <Input autoFocus size="sm" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Naam ya phone…" leftIcon={<Search className="h-4 w-4" />} />
              <ul className="mt-1 max-h-48 overflow-y-auto">
                {(found.data?.items ?? []).map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => pickCustomer(c)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[0.8125rem] hover:bg-slate-50">
                      <span className="font-medium text-slate-900">{c.name}</span><span className="text-slate-500">{c.phone}</span>
                    </button>
                  </li>
                ))}
                {q.length >= 2 && found.data && !found.data.items.length && <li className="px-2 py-1.5 text-[0.8125rem] text-slate-500">Koi nahi mila — neeche naya likhein</li>}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Naam" required value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ahmed Khan" error={errors.name} />
        <Input label="Phone" required inputMode="tel" value={value.phone} onChange={(e) => set({ phone: e.target.value.replace(/[^\d+\-\s]/g, '') })} placeholder="03001234567" error={errors.phone}
          hint={match && !value.customerId ? <button type="button" onClick={() => pickCustomer(match)} className="inline-flex items-center gap-1 font-semibold text-brand-700"><Link2 className="h-3 w-3" />{match.name} ka khata — jorein</button> : 'WhatsApp isi par'} />
        <Input label="CNIC" required={cnicRequired} inputMode="numeric" value={value.cnic} onChange={(e) => set({ cnic: formatCnic(e.target.value) })} placeholder="35202-1234567-1" error={errors.cnic}
          hint={cnicRequired ? 'Chori ke phone se bachne ke liye zaroori' : 'Marzi hai'} />
        {withAddress && <Input label="Pata" value={value.address} onChange={(e) => set({ address: e.target.value })} hint="Marzi hai" />}
      </div>
    </div>
  );
}

/** Roman Urdu problems with a person, for form validation. */
export function personErrors(p: Person, cnicRequired = false): Partial<Record<keyof Person, string>> {
  const e: Partial<Record<keyof Person, string>> = {};
  if (!p.name.trim()) e.name = 'Naam likhein';
  const d = digits(p.phone);
  if (d.length < 10 || d.length > 13) e.phone = 'Poora phone number likhein (03XX XXXXXXX)';
  const c = digits(p.cnic);
  if (cnicRequired && !c) e.cnic = 'CNIC likhein';
  else if (c && c.length !== 13) e.cnic = 'CNIC me 13 number hote hain';
  return e;
}
