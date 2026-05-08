import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Package, Users, Receipt, Truck, X } from 'lucide-react';
import { searchApi, type SearchResults } from '@/api/search.api';
import { formatPKR } from '@nafaa/shared-utils';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchApi.global(query.trim());
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  const goAndClose = (path: string) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    navigate(path);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition px-3 py-2 text-sm text-slate-600"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-2 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono">⌘K</kbd>
      </button>

      <button
        onClick={() => setOpen(true)}
        className="sm:hidden h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                autoFocus
                placeholder="Products, customers, sales, suppliers search karein..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 outline-none text-base"
              />
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:bg-slate-100 rounded-lg p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[480px] overflow-y-auto">
              {!query.trim() ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Type karna shuru karein...
                </div>
              ) : loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Searching...</div>
              ) : !results || (
                  results.products.length === 0 &&
                  results.customers.length === 0 &&
                  results.sales.length === 0 &&
                  results.suppliers.length === 0
                ) ? (
                <div className="p-8 text-center text-sm text-slate-500">Koi result nahi mila</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {results.products.length > 0 && (
                    <div className="p-3">
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <Package className="h-3 w-3" /> Products
                      </div>
                      {results.products.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => goAndClose('/products')}
                          className="w-full px-3 py-2 hover:bg-slate-50 rounded-lg text-left flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.sku || '—'}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-slate-900">{formatPKR(p.price)}</div>
                            <div className="text-xs text-slate-500">Stock: {p.stock}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.customers.length > 0 && (
                    <div className="p-3">
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <Users className="h-3 w-3" /> Customers
                      </div>
                      {results.customers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => goAndClose('/customers')}
                          className="w-full px-3 py-2 hover:bg-slate-50 rounded-lg text-left flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{c.name}</div>
                            <div className="text-xs text-slate-500">{c.phone || '—'}</div>
                          </div>
                          {c.balance > 0 && (
                            <div className="text-rose-700 font-semibold text-sm">
                              Balance: {formatPKR(c.balance)}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {results.sales.length > 0 && (
                    <div className="p-3">
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <Receipt className="h-3 w-3" /> Sales
                      </div>
                      {results.sales.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => goAndClose(`/sales/${s.id}/receipt`)}
                          className="w-full px-3 py-2 hover:bg-slate-50 rounded-lg text-left flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{s.saleNumber}</div>
                            <div className="text-xs text-slate-500">{s.customer?.name || 'Walk-in'}</div>
                          </div>
                          <div className="font-semibold text-slate-900">{formatPKR(s.total)}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {results.suppliers.length > 0 && (
                    <div className="p-3">
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <Truck className="h-3 w-3" /> Suppliers
                      </div>
                      {results.suppliers.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => goAndClose('/suppliers')}
                          className="w-full px-3 py-2 hover:bg-slate-50 rounded-lg text-left flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-slate-900">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.phone || '—'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
              <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono">↵</kbd> to open</span>
              <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono">ESC</kbd> to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
