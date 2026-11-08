/**
 * Airway bills / shipping labels: /online-orders/labels?ids=a,b&size=4x6|A4
 * (auto=1 prints on open). A 4x6 thermal label per sheet, or 3 labels on an
 * A4 page. Each label carries the CN barcode, COD amount, customer, address,
 * items and the shop's return address. Couriers whose API gives its own
 * label (PDF or link) also get a button to open theirs.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import JsBarcode from 'jsbarcode';
import { ArrowLeft, ExternalLink, Loader2, Printer } from 'lucide-react';
import { Button } from '@/design-system/components';
import { apiErrorMessage, couriersApi } from '../api/online-orders.api';
import { dispatchApi, type Label } from '../api/dispatch.api';
import { t as tr } from '@core/i18n';

const API_LABEL_COURIERS = ['POSTEX', 'TRAX', 'TCS', 'LEOPARDS'];

export default function PrintLabelsPage() {
  const [params] = useSearchParams();
  const ids = useMemo(() => (params.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200), [params]);
  const auto = params.get('auto') === '1';
  const { data, isLoading, error } = useQuery({ queryKey: ['dispatch-labels', ids.join(',')], queryFn: () => dispatchApi.labels(ids), enabled: ids.length > 0 });
  const [size, setSize] = useState<'4x6' | 'A4' | null>(null);
  const paper = size ?? (params.get('size') === 'A4' ? 'A4' : params.get('size') === '4x6' ? '4x6' : data?.size ?? '4x6');

  useEffect(() => {
    if (auto && data?.labels.length) {
      const id = setTimeout(() => window.print(), 400);
      return () => clearTimeout(id);
    }
  }, [auto, data?.labels.length]);

  const labels = data?.labels ?? [];
  const pages: Label[][] = [];
  const per = paper === 'A4' ? 3 : 1;
  for (let i = 0; i < labels.length; i += per) pages.push(labels.slice(i, i + per));
  // Couriers whose own label can be fetched through their API.
  const own = Object.entries(labels.reduce<Record<string, string[]>>((m, l) => {
    if (l.courierCode && l.trackingNumber && API_LABEL_COURIERS.includes(l.courierCode)) (m[l.courierCode] ??= []).push(l.trackingNumber);
    return m;
  }, {}));

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[50rem] flex-wrap items-center gap-2 px-4 print:hidden">
        <Link to="/online-orders/dispatch" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4 rtl-flip" /> {tr('Dispatch')}</Link>
        <span className="flex-1" />
        <span className="text-[0.8125rem] text-slate-500">{tr('{{count}} label', { count: labels.length })}</span>
        <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-slate-200">
          {(['4x6', 'A4'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSize(s)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${paper === s ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
              {s === 'A4' ? tr('A4 (3 ek safhe par)') : tr('4x6 thermal')}
            </button>
          ))}
        </div>
        {own.map(([code, tns]) => (
          <Button key={code} size="sm" variant="secondary" leftIcon={<ExternalLink className="h-4 w-4" />}
            onClick={() => couriersApi.openLabels(code, tns).catch((e) => toast.error(apiErrorMessage(e)))}>{tr('{{courier}} ka apna label', { courier: code })}</Button>
        ))}
        <Button size="sm" onClick={() => window.print()} disabled={!labels.length} leftIcon={<Printer className="h-4 w-4" />}>{tr('Print')}</Button>
      </div>

      {!ids.length ? <p className="text-center text-sm text-slate-500">{tr('Koi order nahi chuna.')}</p>
        : isLoading ? <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          : error ? <p className="text-center text-sm text-rose-600">{apiErrorMessage(error)}</p>
            : pages.map((page, i) => (
              <section key={i} className={`label-page mx-auto mb-6 bg-white shadow-sm ${paper === 'A4' ? 'a4' : 'x46'}`}>
                {page.map((l) => <AirwayBill key={l.id} l={l} from={data!.from} compact={paper === 'A4'} />)}
              </section>
            ))}

      <style>{`
        .label-page.x46 { width: 4in; height: 6in; padding: 0.12in; }
        .label-page.a4 { width: 210mm; min-height: 297mm; padding: 8mm; display: flex; flex-direction: column; gap: 4mm; }
        .label-page.a4 .awb { height: 91mm; }
        .label-page.x46 .awb { height: 100%; }
        @media print {
          @page { size: ${paper === 'A4' ? 'A4' : '4in 6in'}; margin: 0; }
          .label-page { box-shadow: none !important; margin: 0 !important; break-after: page; page-break-after: always; }
          .label-page:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
    </div>
  );
}

/**
 * One airway bill. Printed for the courier and the customer, so the text is
 * not translated with the screen language; sizes stay fixed for paper.
 */
function AirwayBill({ l, from, compact }: { l: Label; from: { name: string; phone: string; address: string }; compact: boolean }) {
  return (
    <article className="awb flex flex-col overflow-hidden rounded border-2 border-black text-[11px] leading-tight text-black">
      <header className="flex items-center justify-between border-b-2 border-black px-2 py-1">
        <span className="text-[15px] font-black uppercase">{l.courierName ?? 'Courier'}</span>
        <span className="font-mono text-[12px] font-bold">Order #{l.number}</span>
      </header>
      <div className="flex flex-col items-center border-b border-black px-2 py-1">
        <Barcode value={l.barcode} height={compact ? 38 : 56} />
        <span className="font-mono text-[13px] font-bold tracking-wider">{l.trackingNumber ?? `#${l.number}`}</span>
      </div>
      <div className={`grid flex-1 ${compact ? 'grid-cols-[1.4fr_1fr]' : 'grid-cols-1'} border-b border-black`}>
        <div className="px-2 py-1">
          <div className="text-[9px] font-bold uppercase">To</div>
          <div className="text-[13px] font-black">{l.customerName}</div>
          <div className="font-bold">{l.customerPhone}</div>
          <div className="line-clamp-3">{l.address}</div>
          <div className="text-[13px] font-black uppercase">{l.city}</div>
        </div>
        <div className={`px-2 py-1 ${compact ? 'border-s border-black' : 'border-t border-black'}`}>
          <div className={`rounded border-2 border-black px-2 py-1 text-center ${l.prepaid ? '' : 'bg-black text-white'}`}>
            <div className="text-[9px] font-bold uppercase">{l.prepaid ? 'Prepaid' : 'COD amount'}</div>
            <div className="text-[18px] font-black">{l.prepaid ? 'Rs 0' : `Rs ${l.cod.toLocaleString('en-PK')}`}</div>
          </div>
          <div className="mt-1 flex justify-between"><span>Pieces</span><b>{l.pieces}</b></div>
          {l.weightKg != null && <div className="flex justify-between"><span>Weight</span><b>{l.weightKg} kg</b></div>}
        </div>
      </div>
      <div className="border-b border-black px-2 py-1">
        <div className="text-[9px] font-bold uppercase">Items</div>
        {l.lines.map((x, i) => <div key={i} className="truncate">{x}</div>)}
        {l.moreItems > 0 && <div className="italic">+ {l.moreItems} more</div>}
        {l.notes && <div className="mt-0.5 truncate font-semibold">Note: {l.notes}</div>}
      </div>
      <footer className="px-2 py-1">
        <div className="text-[9px] font-bold uppercase">Return to</div>
        <div className="font-bold">{from.name}{from.phone ? ` · ${from.phone}` : ''}</div>
        {from.address && <div className="truncate">{from.address}</div>}
      </footer>
    </article>
  );
}

function Barcode({ value, height }: { value: string; height: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, { format: 'CODE128', width: 2, height, margin: 0, displayValue: false, lineColor: '#000', background: '#fff' });
    } catch { /* an unreadable value just prints without bars */ }
  }, [value, height]);
  return <svg ref={ref} className="max-w-full" />;
}
