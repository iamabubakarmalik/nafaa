/**
 * Monthly statement, laid out for printing (or "Save as PDF") with the
 * browser's print dialog. No app frame, so the printout is clean.
 */

import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button, Select } from '@/design-system/components';
import { partnerApi } from '@/api/partner.api';
import { EARNING_KIND, EARNING_STATUS, PAYOUT_METHOD } from '@/lib/labels';
import { day, monthLabel, pkr, recentMonths } from '@/lib/format';
import { prettyPhone } from '@/lib/phone';
import { LogoMark } from '@/ui/Logo';
import { PageSkeleton, QueryError } from '@/ui/QueryState';

export default function StatementPage() {
  const { month = '' } = useParams();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['statement', month], queryFn: () => partnerApi.statement(month) });
  const months = recentMonths(12);

  return (
    <div className="min-h-full bg-slate-100 print:bg-white">
      <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          <Link to="/earnings" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Wapas"><ArrowLeft className="h-5 w-5" /></Link>
          <Select aria-label="Mahina" value={month} onChange={(e) => navigate(`/statement/${e.target.value}`, { replace: true })}
            options={(months.includes(month) ? months : [month, ...months]).map((m) => ({ value: m, label: monthLabel(m) }))} wrapperClassName="min-w-0 flex-1 sm:max-w-xs" />
          <Button className="ms-auto" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print / PDF</Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl p-3 sm:p-6 print:max-w-none print:p-0">
        {q.isPending ? <PageSkeleton /> : q.isError ? <QueryError error={q.error} onRetry={() => void q.refetch()} /> : (() => {
          const s = q.data;
          return (
            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8 print:rounded-none print:p-0 print:shadow-none print:ring-0">
              <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                  <LogoMark className="h-11 w-11" />
                  <div>
                    <p className="text-lg font-extrabold tracking-tight text-slate-900">Nafaa</p>
                    <p className="text-[0.8125rem] text-slate-500">Partner statement</p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-lg font-bold text-slate-900">{monthLabel(s.month)}</p>
                  <p className="text-[0.8125rem] text-slate-500">Bana: {day(new Date())}</p>
                </div>
              </header>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 py-5 text-[0.875rem] sm:grid-cols-3">
                {[
                  ['Naam', s.partner.name], ['Partner code', s.partner.code], ['Mobile', prettyPhone(s.partner.phone)],
                  ['CNIC', s.partner.cnic ?? '—'], ['Shehar', s.partner.city ?? '—'],
                ].map(([k, v]) => (
                  <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v}</dd></div>
                ))}
              </dl>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 print:bg-white"><p className="text-[0.8125rem] text-slate-500">Is mahine ki kamai</p><p className="text-xl font-bold tabular-nums text-slate-900">{pkr(s.totals.earned)}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 print:bg-white"><p className="text-[0.8125rem] text-slate-500">Is mahine mila</p><p className="text-xl font-bold tabular-nums text-slate-900">{pkr(s.totals.paid)}</p></div>
              </div>

              <h2 className="mt-7 text-base font-bold text-slate-900">Kamai</h2>
              {s.earnings.length === 0 ? <p className="mt-2 text-[0.875rem] text-slate-500">Is mahine koi kamai nahi.</p> : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-[0.875rem]">
                    <thead><tr className="border-b border-slate-200 text-start text-[0.75rem] uppercase tracking-wide text-slate-500">
                      <th className="py-2 pe-3 text-start font-semibold">Tareekh</th><th className="py-2 pe-3 text-start font-semibold">Qisam</th><th className="py-2 pe-3 text-start font-semibold">Status</th><th className="py-2 text-end font-semibold">Raqam</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.earnings.map((e, i) => (
                        <tr key={i}>
                          <td className="whitespace-nowrap py-2 pe-3 text-slate-600">{day(e.createdAt)}</td>
                          <td className="py-2 pe-3"><span className="font-medium text-slate-900">{EARNING_KIND[e.kind] ?? e.kind}</span>{e.description && <span className="block text-[0.75rem] text-slate-500">{e.description}</span>}</td>
                          <td className="py-2 pe-3 text-slate-600">{EARNING_STATUS[e.status].label}</td>
                          <td className={`whitespace-nowrap py-2 text-end font-semibold tabular-nums ${e.status === 'REVERSED' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{pkr(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-slate-300"><td colSpan={3} className="py-2 font-bold text-slate-900">Kul (wapas hui raqam ke baghair)</td><td className="py-2 text-end font-bold tabular-nums text-slate-900">{pkr(s.totals.earned)}</td></tr></tfoot>
                  </table>
                </div>
              )}

              <h2 className="mt-7 text-base font-bold text-slate-900">Payouts</h2>
              {s.payouts.length === 0 ? <p className="mt-2 text-[0.875rem] text-slate-500">Is mahine koi payout nahi bheja gaya.</p> : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-[0.875rem]">
                    <thead><tr className="border-b border-slate-200 text-[0.75rem] uppercase tracking-wide text-slate-500">
                      <th className="py-2 pe-3 text-start font-semibold">Tareekh</th><th className="py-2 pe-3 text-start font-semibold">Tareeqa</th><th className="py-2 pe-3 text-start font-semibold">Reference</th><th className="py-2 text-end font-semibold">Raqam</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.payouts.map((p, i) => (
                        <tr key={i}>
                          <td className="whitespace-nowrap py-2 pe-3 text-slate-600">{day(p.paidAt)}</td>
                          <td className="py-2 pe-3 text-slate-700">{p.method ? PAYOUT_METHOD[p.method as keyof typeof PAYOUT_METHOD] ?? p.method : '—'}</td>
                          <td className="py-2 pe-3 font-mono text-[0.8125rem] text-slate-700">{p.reference ?? '—'}</td>
                          <td className="whitespace-nowrap py-2 text-end font-semibold tabular-nums text-slate-900">{pkr(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-slate-300"><td colSpan={3} className="py-2 font-bold text-slate-900">Kul</td><td className="py-2 text-end font-bold tabular-nums text-slate-900">{pkr(s.totals.paid)}</td></tr></tfoot>
                  </table>
                </div>
              )}

              <p className="mt-8 border-t border-slate-200 pt-4 text-[0.75rem] text-slate-500">Ye statement Nafaa partner portal (partner.nafaa.pk) se bani hai. Sawal ho to support@nafaa.pk par likhein.</p>
            </article>
          );
        })()}
      </div>
    </div>
  );
}
