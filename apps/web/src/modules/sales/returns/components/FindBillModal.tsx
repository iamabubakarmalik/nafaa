/**
 * Start a return: find the bill by its number, the customer's name or phone,
 * or the IMEI/serial of a phone or device on it — typed or scanned. Picking
 * a bill loads it in full and opens the return form.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, Receipt, ScanLine, Search } from 'lucide-react';
import { Button, Modal, Skeleton } from '@/design-system/components';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { salesApi, type Sale } from '@modules/sales/sales/api/sales.api';
import { returnsApi, type BillHit } from '../api/returns.api';
import { RETURNS_KEY, qtyText, when } from './meta';

export function FindBillModal({ initial = '', scan = false, onPick, onClose }: {
  initial?: string;
  scan?: boolean;
  onPick: (sale: Sale) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(initial);
  const [code, setCode] = useState(initial.trim());
  const [cursor, setCursor] = useState(0);
  const [scanner, setScanner] = useState(scan);
  const [loading, setLoading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setTimeout(() => setCode(text.trim()), 250); return () => clearTimeout(t); }, [text]);
  useEffect(() => setCursor(0), [code]);

  const q = useQuery({
    queryKey: [RETURNS_KEY, 'find-bill', code],
    queryFn: () => returnsApi.findBill(code),
    enabled: code.length >= 2,
    placeholderData: (p) => p,
  });
  const hits = code.length >= 2 ? q.data ?? [] : [];

  const pick = async (b: BillHit) => {
    if (loading) return;
    setLoading(b.id);
    try { onPick(await salesApi.getOne(b.id)); }
    catch { toast.error('Bill khul nahi saka — dobara koshish karein'); }
    finally { setLoading(null); }
  };

  // A scan of an exact bill number opens it straight away.
  useEffect(() => {
    const exact = hits.find((h) => h.exact);
    if (exact && code === initial.trim() && initial) void pick(exact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hits]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!hits.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, hits.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); void pick(hits[cursor]); }
  };

  return (
    <>
      {scanner && (
        <BarcodeScanner title="Bill ya IMEI scan" hint="Bill ka barcode ya phone ka IMEI dabbe me rakhein"
          onDetected={(c: string) => { setScanner(false); setText(c); setCode(c.trim()); }} onClose={() => setScanner(false)} />
      )}
      <Modal open onClose={onClose} size="lg" title="Nayi return — bill search" description="Bill number, customer ka naam ya phone, ya IMEI/serial likhein ya scan karein">
        <div className="flex gap-2">
          <label className="group relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600" />
            <input ref={inputRef} autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey}
              placeholder="Jaise S-1042, 0300…, ya IMEI" aria-label="Bill search"
              className="h-11 w-full rounded-2xl border-0 bg-slate-100/80 pl-11 pr-3 text-[0.9375rem] text-slate-900 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-500" />
          </label>
          <Button variant="secondary" onClick={() => setScanner(true)} leftIcon={<ScanLine className="h-4 w-4" />}>Scan</Button>
        </div>
        <p className="mt-1.5 text-[0.6875rem] text-slate-500">Kam se kam 2 harf. ↑ ↓ se chunein, Enter se kholein. Sirf is branch ke bill aate hain.</p>

        <div className="mt-3 min-h-[12rem]">
          {code.length < 2 ? (
            <div className="flex flex-col items-center py-10 text-center text-slate-500">
              <Receipt className="h-9 w-9 text-slate-300" />
              <p className="mt-2 text-[0.875rem]">Customer ke paas bill ho to us ka barcode scan karein — sab se jaldi yahi hai.</p>
            </div>
          ) : q.isLoading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : !hits.length ? (
            <p className="py-10 text-center text-[0.875rem] text-slate-500">"{code}" se koi bill nahi mila. Bill number ya phone dobara dekhein.</p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200" role="listbox" aria-label="Bill">
              {hits.map((b, i) => {
                const done = b.status === 'FULLY_RETURNED' || b.returnableQty <= 0;
                return (
                  <li key={b.id}>
                    <button type="button" role="option" aria-selected={i === cursor} onClick={() => void pick(b)} onMouseEnter={() => setCursor(i)}
                      className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition', i === cursor ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100"><Receipt className="h-4 w-4 text-slate-500" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-900">{b.saleNumber}</span>
                          {done
                            ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-500">Poora wapas ho chuka</span>
                            : b.status === 'PARTIALLY_RETURNED' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] text-amber-700 ring-1 ring-amber-200">Kuch wapas ho chuka</span>}
                        </span>
                        <span className="block truncate text-[0.75rem] text-slate-500">
                          {[when(b.soldAt), b.customer?.name ?? 'Walk-in', b.customer?.phone, `${b.lines} cheezein`, !done && `${qtyText(b.returnableQty)} wapas ho sakti`, b.shop?.name].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-slate-900">{formatPKR(b.total)}</span>
                      {loading === b.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
