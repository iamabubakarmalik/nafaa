/** Monthly sales-tax return figures per authority, with rate, branch and day breakdowns. */

import { useState, type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { AlertTriangle, FileText } from 'lucide-react';
import { Button, Card, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { Authority, TaxReport, TaxStatus } from '../api';
import { AUTH, dayShort, fullTime, monthName } from '../meta';
import { t as tr } from '@core/i18n';

type Money = (n: number | null | undefined) => string;

export function MonthlyReportView({ q, money, onInvoices }: {
  q: UseQueryResult<TaxReport>;
  money: Money;
  onInvoices: (status: TaxStatus | '', authority?: Authority) => void;
}) {
  const [allDays, setAllDays] = useState(false);
  const r = q.data;
  if (q.isLoading) return <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>;
  if (q.isError && !r) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">{tr('Report nahi bani')}</p>
        <Button className="mt-3" variant="secondary" onClick={() => q.refetch()}>{tr('Dobara koshish')}</Button>
      </div>
    );
  }
  if (!r) return null;
  const days = allDays ? r.daily : r.daily.filter((d) => d.bills || d.returns);

  return (
    <div className="space-y-4">
      {r.migrationPending && (
        <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{tr('Server par tax ka database update abhi baqi hai.')}</p>
      )}
      {r.notSent.bills > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{tr('{{bills}} bill (tax {{tax}}) authority ne abhi nahi liye, is liye report me shamil nahi. Return file karne se pehle inhe bhej dein.', { bills: r.notSent.bills, tax: money(r.notSent.tax) })}</span>
          <Button size="sm" variant="secondary" onClick={() => onInvoices('FAILED')}>{tr('Fail bill dekhein')}</Button>
        </div>
      )}

      {!r.byAuthority.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{tr('{{month}} me koi bill authority ko nahi gaya', { month: monthName(r.month) })}</p>
          <p className="mt-1 text-sm text-slate-500">{tr('Doosra mahina chunein, ya Settings me tax chalu karein.')}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {r.byAuthority.map((a) => {
            const t = a.totals;
            const meta = AUTH[a.authority];
            return (
              <section key={a.authority} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-slate-900"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta?.color }} />{a.name}</h3>
                    <p className="mt-0.5 text-[0.75rem] text-slate-500">
                      {[a.businessName, a.ntn.length && `NTN ${a.ntn.join(', ')}`].filter(Boolean).join(' · ') || tr('Registration ki details Settings me')}
                    </p>
                  </div>
                  <span className="text-[0.75rem] text-slate-500">{monthName(r.month)}</span>
                </div>
                <dl className="mt-3 space-y-1.5 text-[0.8125rem]">
                  <Line k={tr('Sale, tax ke baghair ({{bills}} bill)', { bills: t.bills })} v={money(t.grossValue)} />
                  <Line k={tr('Output tax')} v={money(t.grossTax)} />
                  <Line k={tr('Credit notes / return ({{returns}})', { returns: t.returns })} v={`- ${money(t.returnValue)}`} sub />
                  <Line k={tr('Credit notes ka tax')} v={`- ${money(t.returnTax)}`} sub />
                  <Line k={tr('Net taxable sale')} v={money(t.saleValue)} strong />
                  <Line k={tr('Net tax (jama karna hai)')} v={money(t.tax)} strong />
                </dl>
                {a.posIds.length > 0 && (
                  <p className="mt-3 text-[0.75rem] text-slate-500">{tr('POS ID: {{value}}', { value: a.posIds.map((p) => `${p.posId} (${p.branch})`).join(', ') })}</p>
                )}
                {a.notSent.bills > 0 && (
                  <button type="button" onClick={() => onInvoices('FAILED', a.authority)} className="mt-2 text-[0.75rem] font-semibold text-rose-700 hover:underline">
                    {tr('{{bills}} bill abhi nahi liye gaye (tax {{tax}}) →', { bills: a.notSent.bills, tax: money(a.notSent.tax) })}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}

      {r.byAuthority.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <FigureTable title={tr('Rate ke hisaab se')} head={[tr('Rate'), tr('Bill'), tr('Sale'), tr('Tax')]} rows={r.byRate.map((x) => [`${x.rate}%`, x.bills, money(x.saleValue), money(x.tax)])} />
          <FigureTable title={tr('Branch ke hisaab se')} head={[tr('Branch'), tr('Bill'), tr('Sale'), tr('Tax')]} rows={r.byShop.map((x) => [x.name, x.bills, money(x.saleValue), money(x.tax)])} />
        </div>
      )}

      {r.byAuthority.length > 0 && (
        <FigureTable
          title={tr('Roz ka hisaab: {{month}}', { month: monthName(r.month) })}
          right={<Button size="sm" variant="ghost" onClick={() => setAllDays((v) => !v)}>{allDays ? tr('Sirf sale wale din') : tr('Mahine ke sab din')}</Button>}
          head={[tr('Din'), tr('Bill'), tr('Return'), tr('Sale'), tr('Tax'), tr('Kul')]}
          rows={days.map((d) => [dayShort(d.day), d.bills, d.returns, money(d.saleValue), money(d.tax), money(d.total)])}
          foot={[tr('Kul'), r.totals.bills, r.totals.returns, money(r.totals.saleValue), money(r.totals.tax), money(r.totals.total)]}
        />
      )}

      <p className="text-[0.75rem] text-slate-500">
        {tr('Sirf woh bill jo authority ne qabool kiye. Qeemat tax samet maani gayi hai, tax us me se nikala gaya hai. Bana: {{generatedAt}}.', { generatedAt: fullTime(r.generatedAt) })}
      </p>
    </div>
  );
}

function Line({ k, v, strong, sub }: { k: string; v: string; strong?: boolean; sub?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', strong && 'border-t border-slate-100 pt-1.5', sub && 'ps-3')}>
      <dt className={strong ? 'font-semibold text-slate-900' : 'text-slate-500'}>{k}</dt>
      <dd className={cn('tabular-nums', strong ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-900')}>{v}</dd>
    </div>
  );
}

function FigureTable({ title, head, rows, foot, right }: { title: string; head: string[]; rows: Array<Array<string | number>>; foot?: Array<string | number>; right?: ReactNode }) {
  return (
    <Card flush title={title} actions={right} className="overflow-hidden rounded-3xl">
      {!rows.length ? <p className="px-4 pb-4 text-[0.8125rem] text-slate-500 sm:px-5">{tr('Kuch nahi')}</p> : (
        <Table className="[&_table]:text-[0.8125rem]">
          <THead className="text-[0.6875rem]">
            <Tr>{head.map((h, i) => <Th key={h} align={i > 0 ? 'right' : 'left'} className="py-2">{h}</Th>)}</Tr>
          </THead>
          <TBody>
            {rows.map((r, i) => <Tr key={i}>{r.map((c, j) => <Td key={j} align={j > 0 ? 'right' : 'left'} className={cn('py-1.5', j === 0 && 'font-medium text-slate-900')}>{c}</Td>)}</Tr>)}
          </TBody>
          {foot && (
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
              <Tr>{foot.map((c, j) => <Td key={j} align={j > 0 ? 'right' : 'left'} className="py-2 text-slate-900">{c}</Td>)}</Tr>
            </tfoot>
          )}
        </Table>
      )}
    </Card>
  );
}
