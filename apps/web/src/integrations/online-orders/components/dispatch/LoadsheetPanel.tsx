/**
 * The day's loadsheets: booked parcels per courier with totals, printed
 * with signature lines, as CSV, or handed to the courier's own loadsheet
 * API (Leopards, PostEx).
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardList, Download, Send } from 'lucide-react';
import { Button, EmptyState, Input, Skeleton } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { PrintButton } from '@core/print';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { apiErrorMessage } from '../../api/online-orders.api';
import { dispatchApi, openPdfBase64 } from '../../api/dispatch.api';
import { courierBrand, rs } from '../../lib/labels';
import { downloadCsv } from '../../lib/orders';
import { loadsheetCsv, loadsheetDoc } from '../../lib/dispatchPrint';
import { t } from '@core/i18n';

export function LoadsheetPanel() {
  const startHour = useBusinessDayStart();
  const qc = useQueryClient();
  const [day, setDay] = useState(() => businessDayKey(new Date(), startHour));
  const { data, isLoading, error } = useQuery({ queryKey: ['dispatch-loadsheet', day], queryFn: () => dispatchApi.loadsheet(day) });
  const submit = useMutation({
    mutationFn: (courier: string) => dispatchApi.submitLoadsheet({ day, courier }),
    onSuccess: (r) => {
      if (r.apiError) toast.error(t('Courier ne loadsheet nahi li: {{error}} — Nafaa ki sheet print karein', { error: r.apiError }), { duration: 10_000 });
      else toast.success(r.externalRef ? t('Courier ko {{count}} parcels ki loadsheet chali gayi · Ref {{ref}}', { count: r.parcels, ref: r.externalRef }) : t('{{count}} parcels ki loadsheet save ho gayi', { count: r.parcels }));
      if (r.pdfBase64) openPdfBase64(r.pdfBase64); else if (r.url) window.open(r.url, '_blank', 'noopener');
      qc.invalidateQueries({ queryKey: ['dispatch-loadsheet', day] });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <Input type="date" label={t('Din')} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} wrapperClassName="w-44" />
        <p className="min-w-[12rem] flex-1 text-[0.8125rem] text-slate-500">{t('Is din book hue parcels, courier-wise. Rider ko dete waqt print karke dastkhat le lein.')}</p>
      </div>
      {isLoading ? <Skeleton className="h-48 rounded-3xl" /> : error ? (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{apiErrorMessage(error)}</p>
      ) : !data?.sheets.length ? (
        <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80"><EmptyState icon={<ClipboardList className="h-6 w-6" />} title={t('Is din koi parcel book nahi hua')} description={t('Board se orders chun kar "Book courier" karein — yahan courier-wise list ban jayegi.')} /></div>
      ) : data.sheets.map((g) => (
        <article key={g.courierCode} className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
            <BrandLogo name={courierBrand(g.courierCode)} size={30} />
            <div className="min-w-0 flex-1">
              <div className="text-[0.9375rem] font-semibold text-slate-900">{g.courierName ?? g.courierCode}</div>
              <div className="text-[0.75rem] text-slate-500">
                {t('{{parcels}} parcels · {{pieces}} pieces · {{weight}} kg · COD {{cod}}', { parcels: g.totals.parcels, pieces: g.totals.pieces, weight: g.totals.weightKg, cod: rs(g.totals.cod) })}
                {g.submitted[0] && <span className="ms-1 text-success-700">{t('· courier ko di: {{ref}}', { ref: g.submitted[0].externalRef ?? t('Nafaa sheet') })}</span>}
              </div>
            </div>
            <PrintButton doc={() => loadsheetDoc(g, data.day)} />
            <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={() => downloadCsv(`loadsheet-${g.courierCode}-${data.day}.csv`, loadsheetCsv(g))}>CSV</Button>
            <Button size="sm" leftIcon={<Send className="h-4 w-4" />} loading={submit.isPending && submit.variables === g.courierCode} onClick={() => submit.mutate(g.courierCode)}
              title={g.canSubmit ? t('Courier ke system me bhi loadsheet banayein') : t('Is courier ka loadsheet API nahi — Nafaa me save hogi')}>
              {g.canSubmit ? t('Courier ko bhejein') : t('Save karein')}
            </Button>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8125rem]">
              <thead><tr className="text-start text-[0.6875rem] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 text-start">CN</th><th className="px-2 py-2 text-start">{t('Order')}</th><th className="px-2 py-2 text-start">{t('Customer')}</th>
                <th className="px-2 py-2 text-start">{t('Shehar')}</th><th className="px-2 py-2 text-end">{t('Pcs')}</th><th className="px-4 py-2 text-end">COD</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {g.rows.map((r) => (
                  <tr key={r.orderId}>
                    <td className="px-4 py-1.5 font-mono">{r.trackingNumber}</td><td className="px-2 py-1.5">#{r.number}</td><td className="px-2 py-1.5">{r.customerName}</td>
                    <td className="px-2 py-1.5">{r.city ?? ''}</td><td className="px-2 py-1.5 text-end tabular-nums">{r.pieces}</td><td className="px-4 py-1.5 text-end tabular-nums">{rs(r.cod)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </section>
  );
}
