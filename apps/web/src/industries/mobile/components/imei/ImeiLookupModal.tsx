/**
 * IMEI check: one number's whole story in this shop — the new phone (on the
 * shelf or sold, to whom, warranty left), buy-backs with the seller's CNIC,
 * and repairs with their own warranty. Used at the counter for warranty
 * claims and before buying a phone in.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Recycle, ScanLine, Search, ShieldCheck, ShieldOff, Smartphone, Wrench } from 'lucide-react';
import { Button, Modal, Skeleton } from '@/design-system/components';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { imeiApi } from '../../api/imei.api';
import { conditionOf, dayOnly, digits, imeiStatusOf, ptaOf, repairStatusOf, sourceOf, usedStatusOf } from '../meta';

export function ImeiLookupModal({ initial = '', onClose }: { initial?: string; onClose: () => void }) {
  const [text, setText] = useState(initial);
  const [code, setCode] = useState(digits(initial).length >= 5 ? digits(initial) : '');
  const [scan, setScan] = useState(false);
  useEffect(() => { if (digits(initial).length >= 5) setCode(digits(initial)); }, [initial]);

  const q = useQuery({ queryKey: ['mobile-imei-lookup', code], queryFn: () => imeiApi.lookup(code), enabled: code.length >= 5, retry: false });
  const d = q.data;
  const empty = d && !d.newPhones.length && !d.usedPhones.length && !d.repairs.length;
  const run = () => { const c = digits(text); if (c.length >= 5) setCode(c); };

  return (
    <Modal open onClose={onClose} size="lg" title="IMEI check" description="Warranty, bill, purana record — sab ek jagah">
      {scan && <BarcodeScanner onDetected={(c: string) => { setText(c); setCode(digits(c)); setScan(false); }} onClose={() => setScan(false)} />}
      <div className="space-y-4">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoFocus inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
              placeholder="IMEI likhein ya scan karein (*#06#)" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 font-mono text-[0.9375rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
          </label>
          <Button variant="secondary" onClick={() => setScan(true)} leftIcon={<ScanLine className="h-4 w-4" />}>Scan</Button>
          <Button onClick={run} disabled={digits(text).length < 5}>Dekhein</Button>
        </div>

        {d?.luhnOk === false && (
          <p className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="h-4 w-4" />Ye IMEI ka check digit nahi milta — number dobara dekhein, ya phone ki asliyat check karein.
          </p>
        )}
        {q.isFetching && !d && <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>}
        {q.isError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800">Check nahi ho saka — dobara koshish karein</p>}
        {empty && (
          <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center">
            <Smartphone className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 font-semibold text-slate-800">Is dukaan me is IMEI ka koi record nahi</p>
            <p className="mt-1 text-[0.8125rem] text-slate-500">Na ye phone yahan se bika, na khareeda gaya, na repair hua.</p>
          </div>
        )}

        {d?.newPhones.map((p) => {
          const st = imeiStatusOf(p.status);
          const w = p.warranty;
          return (
            <section key={p.id} className="rounded-2xl p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-900">{p.product.name}{p.variant ? ` · ${p.variant.name}` : ''}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
                <span className="text-[0.75rem] font-medium" style={{ color: ptaOf(p.ptaStatus).color }}>{ptaOf(p.ptaStatus).label}</span>
              </div>
              <p className="mt-1 font-mono text-[0.8125rem] text-slate-600">{p.imei1}{p.imei2 ? ` / ${p.imei2}` : ''}{p.color ? ` · ${p.color}` : ''}</p>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-[0.8125rem] sm:grid-cols-2">
                <div className="flex justify-between"><dt className="text-slate-500">Aaya</dt><dd>{dayOnly(p.purchasedAt)}{p.shop ? ` · ${p.shop.name}` : ''}</dd></div>
                {p.sale && <div className="flex justify-between"><dt className="text-slate-500">Bill</dt><dd className="font-mono">{p.sale.saleNumber} · {dayOnly(p.sale.createdAt)}</dd></div>}
                {p.sale?.customer && <div className="flex justify-between"><dt className="text-slate-500">Customer</dt><dd>{p.sale.customer.name}{p.sale.customer.phone ? ` · ${p.sale.customer.phone}` : ''}</dd></div>}
                {p.sale && <div className="flex justify-between"><dt className="text-slate-500">Bika</dt><dd className="tabular-nums">{formatPKR(p.sale.price)}</dd></div>}
              </dl>
              {p.status === 'SOLD' && (
                <div className={cn('mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[0.8125rem] font-medium', w.active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600')}>
                  {w.active ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                  {!w.months ? 'Is phone par dukaan ki warranty nahi thi' : w.active ? `Warranty baqi — ${w.daysLeft} din (${dayOnly(w.end)} tak)` : `Warranty khatam — ${dayOnly(w.end)} ko`}
                </div>
              )}
              {p.notes && <p className="mt-2 whitespace-pre-line text-[0.75rem] text-slate-500">{p.notes}</p>}
            </section>
          );
        })}

        {d?.usedPhones.map((u) => (
          <section key={u.id} className="rounded-2xl p-4 ring-1 ring-violet-200">
            <div className="flex flex-wrap items-center gap-2">
              <Recycle className="h-4 w-4 text-violet-600" />
              <Link to={`/used-phones/${u.id}`} onClick={onClose} className="font-semibold text-slate-900 hover:text-brand-700">{u.brand} {u.model}{u.storage ? ` ${u.storage}` : ''}</Link>
              <span className="font-mono text-[0.75rem] text-slate-500">{u.usedPhoneCode}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', usedStatusOf(u.status).tone)}>{usedStatusOf(u.status).label}</span>
            </div>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-[0.8125rem] sm:grid-cols-2">
              <div className="flex justify-between"><dt className="text-slate-500">Kis se liya</dt><dd>{u.fromCustomerName || '—'}{u.fromCustomerPhone ? ` · ${u.fromCustomerPhone}` : ''}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">CNIC</dt><dd className="font-mono">{u.fromCustomerCnic || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Kaise</dt><dd>{sourceOf(u.source).label} · {dayOnly(u.receivedAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Halat</dt><dd>{conditionOf(u.condition).label}</dd></div>
              {u.sale && <div className="flex justify-between"><dt className="text-slate-500">Aage bika</dt><dd>{u.sale.saleNumber}{u.sale.customer ? ` · ${u.sale.customer.name}` : ''}</dd></div>}
            </dl>
          </section>
        ))}

        {d?.repairs.map((r) => (
          <section key={r.id} className="rounded-2xl p-4 ring-1 ring-amber-200">
            <div className="flex flex-wrap items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-600" />
              <Link to={`/repair-tickets/${r.id}`} onClick={onClose} className="font-semibold text-slate-900 hover:text-brand-700">{r.ticketNumber}</Link>
              <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', repairStatusOf(r.status).tone)}>{repairStatusOf(r.status).label}</span>
              {r.warrantyActive && <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Repair warranty {dayOnly(r.warrantyEnds)} tak</span>}
            </div>
            <p className="mt-1 text-[0.8125rem] text-slate-600">{r.deviceBrand} {r.deviceModel} — {r.diagnosedIssue || r.reportedIssue}</p>
            <p className="text-[0.75rem] text-slate-500">{r.customerName} · {r.customerPhone} · {dayOnly(r.receivedAt)} · {formatPKR(r.totalCost)}</p>
          </section>
        ))}
      </div>
    </Modal>
  );
}
