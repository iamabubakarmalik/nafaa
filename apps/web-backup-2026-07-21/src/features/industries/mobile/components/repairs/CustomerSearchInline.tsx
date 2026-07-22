import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Search, X, Phone, CreditCard } from 'lucide-react';
import { customersApi } from '@/api/customers.api';

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

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-repair'],
    queryFn: () => customersApi.list({ page: 1, limit: 500 }),
  });

  const customers = customersData?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.cnic || '').includes(q),
      )
      .slice(0, 8);
  }, [customers, search]);

  return (
    <div className="space-y-3">
      {/* Search existing customer */}
      <div className="relative">
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Existing Customer (optional)
        </label>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search by name, phone, or CNIC..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-9 text-sm focus:outline-none focus:border-violet-500"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setShowResults(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5 text-slate-500" />
            </button>
          )}
        </div>

        {showResults && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg divide-y divide-slate-100">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onCustomerSelect({
                    id: c.id,
                    name: c.name,
                    phone: c.phone || '',
                    cnic: c.cnic || '',
                    address: c.address || '',
                  });
                  setSearch('');
                  setShowResults(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-violet-50 transition"
              >
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-violet-600" />
                  {c.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
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
                    <span className="text-amber-700 font-bold">
                      Udhaar: Rs {c.balance.toLocaleString()}
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
        <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-violet-700" />
            <span className="font-bold text-violet-900">{customerName}</span>
            <span className="text-violet-700 text-xs">— Existing customer</span>
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
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Customer Name *
          </label>
          <input
            value={customerName}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Full name"
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Phone *
          </label>
          <input
            value={customerPhone}
            onChange={(e) => onChangePhone(e.target.value)}
            placeholder="03XXXXXXXXX"
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            CNIC (13 digits)
          </label>
          <input
            value={customerCnic}
            onChange={(e) =>
              onChangeCnic(e.target.value.replace(/\D/g, '').slice(0, 13))
            }
            placeholder="XXXXXXXXXXXXX"
            maxLength={13}
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-violet-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Address
          </label>
          <input
            value={customerAddress}
            onChange={(e) => onChangeAddress(e.target.value)}
            placeholder="Optional"
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>
    </div>
  );
}
