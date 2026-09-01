import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User, Search, X, Phone, CreditCard, MapPin, Star, AlertTriangle, UserPlus,
} from 'lucide-react';
import { customersApi } from '@modules/customers/customers/api/customers.api';

interface Props {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCnic: string;
  customerAddress: string;
  onCustomerSelect: (data: {
    id: string;
    name: string;
    phone: string;
    cnic: string;
    address: string;
  }) => void;
  onChangeName: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangeCnic: (v: string) => void;
  onChangeAddress: (v: string) => void;
}

const formatCnic = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5) return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
};

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 4) return d;
  return `${d.slice(0, 4)}-${d.slice(4)}`;
};

export function CustomerSearchInline({
  customerId,
  customerName,
  customerPhone,
  customerCnic,
  customerAddress,
  onCustomerSelect,
  onChangeName,
  onChangePhone,
  onChangeCnic,
  onChangeAddress,
}: Props) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-repair'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });

  const customers = customersData?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim().replace(/-/g, '');
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').replace(/\D/g, '').includes(q) ||
          (c.cnic || '').replace(/\D/g, '').includes(q),
      )
      .slice(0, 8);
  }, [customers, search]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [search]);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const pick = (c: any) => {
    onCustomerSelect({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      cnic: c.cnic || '',
      address: c.address || '',
    });
    setSearch('');
    setShowResults(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!showResults || !filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Search existing */}
      <div className="relative">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 items-center justify-between">
          <span>Existing Customer</span>
          <span className="text-[9px] text-slate-500 font-normal">
            ↑↓ navigate · Enter select
          </span>
        </label>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowResults(true);
            }}
            onKeyDown={handleKey}
            onFocus={() => setShowResults(true)}
            placeholder="Naam, phone, ya CNIC se search..."
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-9 pr-9 text-sm focus:outline-none focus:border-violet-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setShowResults(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          )}
        </div>

        {showResults && search && filtered.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-4 text-center">
            <UserPlus className="h-6 w-6 text-slate-300 mx-auto mb-1" />
            <div className="text-xs text-slate-500">
              Koi match nahi — neechay manual fields fill karo, new customer save ho jayega.
            </div>
          </div>
        )}

        {showResults && filtered.length > 0 && (
          <div className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseEnter={() => setHighlightIdx(i)}
                onClick={() => pick(c)}
                className={`w-full px-3 py-2 text-left transition ${
                  i === highlightIdx
                    ? 'bg-violet-50 dark:bg-violet-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-violet-600" />
                  {c.name}
                  {c.isVip && <Star className="h-3 w-3 text-amber-500 fill-current" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                  {c.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5" />
                      {c.phone}
                    </span>
                  )}
                  {c.cnic && (
                    <span className="inline-flex items-center gap-1">
                      <CreditCard className="h-2.5 w-2.5" />
                      {c.cnic}
                    </span>
                  )}
                  {c.balance > 0 && (
                    <span className="text-amber-700 dark:text-amber-400 font-bold inline-flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Udhaar Rs {c.balance.toLocaleString()}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected indicator */}
      {customerId && (
        <div className="rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 border-2 border-violet-200 dark:border-violet-800 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-8 w-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-violet-900 dark:text-violet-100">{customerName}</div>
              <div className="text-[10px] text-violet-700 dark:text-violet-300">
                ✓ Existing customer linked
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onCustomerSelect({ id: '', name: '', phone: '', cnic: '', address: '' })
            }
            className="text-xs font-bold text-rose-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Manual fields */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Customer Name *
          </label>
          <input
            value={customerName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Poora naam"
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Phone *
          </label>
          <input
            value={customerPhone}
            onChange={(e) => onChangePhone(formatPhone(e.target.value))}
            placeholder="0300-1234567"
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm font-mono focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 items-center gap-1">
            <CreditCard className="h-3 w-3" /> CNIC
          </label>
          <input
            value={formatCnic(customerCnic)}
            onChange={(e) => onChangeCnic(e.target.value.replace(/\D/g, '').slice(0, 13))}
            placeholder="XXXXX-XXXXXXX-X"
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm font-mono focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 items-center gap-1">
            <MapPin className="h-3 w-3" /> Address
          </label>
          <input
            value={customerAddress}
            onChange={(e) => onChangeAddress(e.target.value)}
            placeholder="Optional"
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>
    </div>
  );
}
