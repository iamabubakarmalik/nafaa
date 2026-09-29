import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { apiErrorMessage, onlineOrdersApi, type OnlineOrderDetail } from '../api/online-orders.api';
import { rs, whenText } from '../lib/labels';

/* ═════════════════════════════════════════════════════════════
   INVOICE / PACKING SLIP — parcel ke andar rakhne wala bill.
   /online-orders/print?ids=a,b,c  (auto=1 → khulte hi print)
   Har order alag safha. A4, A5 aur 4x6 label printer par chalta hai.
   ═════════════════════════════════════════════════════════════ */

export default function PrintInvoicesPage() {
  const [params] = useSearchParams();
  const ids = useMemo(() => (params.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100), [params]);
  const auto = params.get('auto') === '1';
  const tenant = useAuthStore((s) => s.tenant);

  const results = useQueries({
    queries: ids.map((id) => ({ queryKey: ['online-order', id], queryFn: () => onlineOrdersApi.detail(id), staleTime: 60_000 })),
  });
  const loading = results.some((r) => r.isLoading);
  const orders = results.map((r) => r.data).filter(Boolean) as OnlineOrderDetail[];
  const failed = results.filter((r) => r.error).length;

  useEffect(() => {
    if (auto && !loading && orders.length) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [auto, loading, orders.length]);

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[800px] items-center gap-3 px-4 print:hidden">
        <Link to="/online-orders" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Online orders</Link>
        <span className="flex-1" />
        <span className="text-[13px] text-slate-500">{orders.length} invoice{failed ? ` · ${failed} nahi khule` : ''}</span>
        <button onClick={() => window.print()} disabled={loading || !orders.length}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {!ids.length ? (
        <p className="text-center text-sm text-slate-500">Koi order nahi chuna.</p>
      ) : loading ? (
        <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : (
        orders.map((o) => <Invoice key={o.id} o={o} shopName={tenant?.name ?? ''} />)
      )}
      {failed > 0 && !loading && (
        <p className="mt-4 text-center text-sm text-rose-600 print:hidden">{apiErrorMessage(results.find((r) => r.error)?.error)}</p>
      )}

      <style>{`
        @media print {
          @page { margin: 10mm; }
          .invoice { break-after: page; page-break-after: always; box-shadow: none !important; margin: 0 !important; border: 0 !important; }
          .invoice:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
    </div>
  );
}

function Invoice({ o, shopName }: { o: OnlineOrderDetail; shopName: string }) {
  const num = o.externalOrderNumber ?? o.externalOrderId;
  const codDue = o.isCod && o.paymentStatus !== 'PAID' ? o.total : 0;
  return (
    <section className="invoice mx-auto mb-6 max-w-[800px] bg-white p-8 text-[13px] text-slate-900 shadow-sm">
      <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
        <div>
          <div className="text-xl font-black">{shopName || o.integration?.displayName}</div>
          {o.integration?.displayName && shopName && <div className="text-slate-600">{o.integration.displayName}</div>}
        </div>
        <div className="text-right">
          <div className="text-lg font-black">INVOICE</div>
          <div className="font-mono text-base font-bold">#{num}</div>
          <div className="text-slate-600">{whenText(o.receivedAt)}</div>
          {o.sale?.saleNumber && <div className="text-slate-600">Bill {o.sale.saleNumber}</div>}
        </div>
      </header>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Bhejna hai</div>
          <div className="mt-1 text-base font-bold">{o.customerName}</div>
          {o.customerPhone && <div className="font-semibold">{o.customerPhone}</div>}
          <div className="mt-1 whitespace-pre-line">{[o.customerAddress, o.customerCity].filter(Boolean).join(', ')}</div>
        </div>
        <div className="sm:text-right">
          {o.trackingNumber && (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{o.courierLabel ?? o.courierName ?? 'Courier'}</div>
              <div className="mt-1 font-mono text-2xl font-black tracking-wider">{o.trackingNumber}</div>
            </>
          )}
          <div className={`mt-2 inline-block rounded-lg border-2 px-3 py-1.5 text-lg font-black ${codDue ? 'border-slate-900' : 'border-emerald-700 text-emerald-700'}`}>
            {codDue ? `COD: ${rs(codDue)}` : 'PAID — paisa nahi lena'}
          </div>
        </div>
      </div>

      <table className="mt-5 w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-300 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <th className="py-1.5">Cheez</th>
            <th className="py-1.5 text-center">Qty</th>
            <th className="py-1.5 text-right">Qeemat</th>
            <th className="py-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {o.lines.map((l) => (
            <tr key={l.index} className="border-b border-slate-100">
              <td className="py-2">
                <div className="font-semibold">{l.name}</div>
                {(l.variant || l.sku) && <div className="text-[11.5px] text-slate-500">{[l.variant, l.sku].filter(Boolean).join(' · ')}</div>}
              </td>
              <td className="py-2 text-center tabular-nums">{l.quantity}</td>
              <td className="py-2 text-right tabular-nums">{rs(l.price)}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{rs(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 ml-auto w-full max-w-[260px] space-y-1 tabular-nums">
        <Row label="Items" value={rs(o.subtotal)} />
        {o.discount > 0 && <Row label="Discount" value={`− ${rs(o.discount)}`} />}
        {o.deliveryFee > 0 && <Row label="Delivery" value={rs(o.deliveryFee)} />}
        <div className="flex justify-between border-t-2 border-slate-900 pt-1.5 text-base font-black"><span>Total</span><span>{rs(o.total)}</span></div>
      </div>

      {o.notes && <div className="mt-4 rounded border border-slate-200 p-2 text-[12px]"><b>Note:</b> {o.notes}</div>}
      <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-[12px] text-slate-500">
        Shukriya! Parcel kholne se pehle video bana lein — koi masla ho to isi order # ke saath rabta karein.
      </footer>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-slate-700"><span>{label}</span><span>{value}</span></div>;
}
