import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, User, UserPlus, ChevronDown, Check } from 'lucide-react';
import { formatPKR } from '@core/lib/format';

/**
 * Customer for the bill: type a name or phone to filter, arrows and Enter
 * to choose, Esc to close. Each row shows the customer's current udhaar,
 * since credit is decided while choosing the customer.
 */
export function PosCustomerPicker({
  customers, customerId, setCustomerId, selectedCustomer, onAddCustomer,
}: {
  customers: any[];
  customerId: string;
  setCustomerId: (id: string) => void;
  selectedCustomer?: any;
  onAddCustomer: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  /* Cart panel par `overflow-hidden` hai — andar rakha panel kat
     jata. Is liye portal se seedha <body> me, button ki asli
     jagah naap kar. */
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.max(r.width, 280);
      setPos({
        top: r.bottom + 6,
        left: Math.min(r.left, window.innerWidth - width - 8),
        width,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else { setQ(''); setHi(0); }
  }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c: any) =>
      (c.name || '').toLowerCase().includes(needle) ||
      (c.phone || '').toLowerCase().includes(needle)
    );
  }, [customers, q]);

  /** Walk-in hamesha pehli qatar — is liye index 0 usi ka hai */
  const rows = useMemo(() => [null, ...filtered], [filtered]);

  useEffect(() => { setHi(0); }, [q]);

  const choose = (c: any | null) => {
    setCustomerId(c ? c.id : '');
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(i + 1, rows.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); choose(rows[hi] ?? null); }
  };

  useEffect(() => {
    listRef.current?.querySelector('[data-hi="1"]')?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  const totalUdhaar = useMemo(
    () => customers.reduce((s: number, c: any) => s + (Number(c.balance) > 0 ? Number(c.balance) : 0), 0),
    [customers]
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-11 w-full items-center gap-2.5 rounded-lg border bg-white px-2.5 text-left transition ${
          open ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
          {selectedCustomer ? <span className="text-[0.75rem] font-semibold">{(selectedCustomer.name || '?').trim().charAt(0).toUpperCase()}</span> : <User className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.875rem] font-medium text-slate-900">{selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}</span>
          {selectedCustomer?.phone && <span className="block truncate text-[0.6875rem] text-slate-500 tabular-nums">{selectedCustomer.phone}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[81] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
                  placeholder="Naam ya phone likhein…" aria-label="Customer dhoondein"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-[0.875rem] text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
                {q && (
                  <button type="button" onClick={() => { setQ(''); inputRef.current?.focus(); }} aria-label="Saaf"
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md hover:bg-slate-100">
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between px-0.5 text-[0.6875rem] text-slate-500">
                <span>{filtered.length} customers</span>
                {totalUdhaar > 0 && <span className="font-medium text-amber-700">Kul udhaar {formatPKR(totalUdhaar)}</span>}
              </div>
            </div>

            <div ref={listRef} role="listbox" className="max-h-[46vh] overflow-y-auto py-1">
              <button type="button" role="option" aria-selected={!customerId} data-hi={hi === 0 ? '1' : '0'} onClick={() => choose(null)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition ${hi === 0 ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500"><User className="h-4 w-4" /></span>
                <span className="text-[0.875rem] text-slate-700">Walk-in customer</span>
                {!customerId && <Check className="ml-auto h-4 w-4 shrink-0 text-brand-600" />}
              </button>

              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-[0.875rem] font-medium text-slate-700">Koi customer nahi mila</p>
                  <p className="mt-0.5 text-[0.75rem] text-slate-500">"{q}" ke naam se kuch nahi</p>
                </div>
              ) : (
                filtered.map((c: any, idx: number) => {
                  const i = idx + 1;
                  const bal = Number(c.balance) || 0;
                  return (
                    <button key={c.id} type="button" role="option" aria-selected={customerId === c.id} data-hi={hi === i ? '1' : '0'} onClick={() => choose(c)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition ${hi === i ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[0.75rem] font-semibold text-brand-700">
                        {(c.name || '?').trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] font-medium text-slate-900">{c.name}</span>
                        {c.phone && <span className="block text-[0.6875rem] tabular-nums text-slate-500">{c.phone}</span>}
                      </span>
                      {bal > 0 && <span className="shrink-0 text-[0.75rem] font-medium tabular-nums text-amber-700">{formatPKR(bal)}</span>}
                      {customerId === c.id && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                    </button>
                  );
                })
              )}
            </div>

            <button type="button" onClick={() => { setOpen(false); onAddCustomer(); }}
              className="flex h-11 w-full items-center justify-center gap-2 border-t border-slate-100 text-[0.875rem] font-semibold text-brand-700 transition hover:bg-brand-50">
              <UserPlus className="h-4 w-4" /> Naya customer
            </button>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

export default PosCustomerPicker;
