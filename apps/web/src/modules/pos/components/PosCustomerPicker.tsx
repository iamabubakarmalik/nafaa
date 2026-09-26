import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, User, UserPlus, ChevronDown, Check } from 'lucide-react';
import { formatPKR } from '@core/lib/format';

/* ═════════════════════════════════════════════════════════════
   CUSTOMER PICKER — khata kis ke naam par
   ─────────────────────────────────────────────────────────────
   Retail POS ka design, ab shared. Naam ke saath purana udhaar
   bhi dikhta hai: udhaar denay ka faisla usi waqt hota hai jab
   customer chuna ja raha ho, baad me khata khol kar nahi.
   ═════════════════════════════════════════════════════════════ */

/* ═════════════════════════════════════════════════════════════
   CUSTOMER PICKER — naam likh kar dhoondo
   ─────────────────────────────────────────────────────────────
   Pehle yahan saada <select> tha. Jis dukaan ke 200 khatedaar
   hain, wahan counter par aadmi poori list me neeche scroll
   karta reh jata tha — naam likh kar dhoondne ka koi zariya
   nahi tha.

   Ab: likho, list chhant jati hai. Naam, phone, dono se milta
   hai. Teer ke nishan se chalo, Enter se chuno, Esc se band.
   ═════════════════════════════════════════════════════════════ */
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
        onClick={() => setOpen((v) => !v)}
        className={`h-12 sm:h-14 w-full rounded-2xl border-4 bg-white dark:bg-slate-800 pl-3 pr-3 flex items-center gap-2.5 text-left transition ${
          open
            ? 'border-violet-500 ring-4 ring-violet-200 dark:ring-violet-500/25'
            : 'border-slate-200 dark:border-slate-700 hover:border-violet-400'
        }`}
      >
        <span className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 sm:h-5 sm:w-5 text-violet-600 dark:text-violet-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
          </span>
          {selectedCustomer?.balance > 0 && (
            <span className="block text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
              Udhaar {formatPKR(selectedCustomer.balance)}
            </span>
          )}
        </span>
        <Search className="h-4 w-4 text-slate-400 shrink-0" />
        <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 text-slate-400 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-[80]" onClick={() => setOpen(false)} />
          <div
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[81] rounded-2xl bg-white dark:bg-slate-900 border-4 border-violet-300 dark:border-violet-500/40 shadow-2xl overflow-hidden"
          >
            <div className="p-2.5 border-b-2 border-slate-100 dark:border-slate-800 bg-violet-50 dark:bg-violet-500/10">
              <div className="relative">
                <Search className="h-4 w-4 text-violet-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Naam ya phone likho…"
                  className="h-11 w-full rounded-xl border-2 border-violet-200 dark:border-violet-500/30 bg-white dark:bg-slate-800 pl-9 pr-8 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500"
                />
                {q && (
                  <button
                    onClick={() => { setQ(''); inputRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider">
                <span className="text-slate-500 dark:text-slate-400">{filtered.length} customer</span>
                {totalUdhaar > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">Kul udhaar {formatPKR(totalUdhaar)}</span>
                )}
              </div>
            </div>

            <div ref={listRef} className="max-h-[46vh] overflow-y-auto">
              <button
                data-hi={hi === 0 ? '1' : '0'}
                onClick={() => choose(null)}
                className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left border-b border-slate-100 dark:border-slate-800 transition ${
                  hi === 0 ? 'bg-violet-100 dark:bg-violet-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-slate-500" />
                </span>
                <span className="font-extrabold text-sm text-slate-700 dark:text-slate-200">Walk-in Customer</span>
                {!customerId && <Check className="h-4 w-4 text-violet-600 ml-auto shrink-0" />}
              </button>

              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm font-extrabold text-slate-600 dark:text-slate-300">Koi customer nahi mila</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">"{q}" ke naam se kuch nahi</p>
                  <button
                    onClick={() => { setOpen(false); onAddCustomer(); }}
                    className="mt-3 h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="h-4 w-4" /> Naya customer banao
                  </button>
                </div>
              ) : (
                filtered.map((c: any, idx: number) => {
                  const i = idx + 1;
                  const bal = Number(c.balance) || 0;
                  return (
                    <button
                      key={c.id}
                      data-hi={hi === i ? '1' : '0'}
                      onClick={() => choose(c)}
                      className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left border-b border-slate-100 dark:border-slate-800 transition ${
                        hi === i ? 'bg-violet-100 dark:bg-violet-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0 text-xs font-black text-violet-700 dark:text-violet-300">
                        {(c.name || '?').trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-slate-900 dark:text-white">{c.name}</span>
                        {c.phone && (
                          <span className="block text-[11px] font-bold text-slate-400 tabular-nums">{c.phone}</span>
                        )}
                      </span>
                      {bal > 0 && (
                        <span className="shrink-0 text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatPKR(bal)}
                        </span>
                      )}
                      {customerId === c.id && <Check className="h-4 w-4 text-violet-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={() => { setOpen(false); onAddCustomer(); }}
              className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 transition"
            >
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
