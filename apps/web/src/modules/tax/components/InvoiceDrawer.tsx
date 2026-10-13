/** Side panel with one tax invoice: fiscal number and QR, the bill, what was sent and what the authority answered. */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, Copy, ExternalLink, Lock, Receipt, RefreshCw, X } from 'lucide-react';
import { Button, IconButton, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { qrSvg } from '@core/payments/qrSvg';
import { receiptLink } from '@modules/sales/history/receiptPrefs';
import { PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';
import { TAX_KEY, taxApi } from '../api';
import { AUTH, STATUS, fullTime } from '../meta';

type Money = (n: number | null | undefined) => string;

export function InvoiceDrawer({ id, money, branchOf, onClose, onOpen, onRetry, retrying }: {
  id: string;
  money: Money;
  branchOf: (id: string | null) => string;
  onClose: () => void;
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
  retrying: boolean;
}) {
  const q = useQuery({ queryKey: [TAX_KEY, 'invoice', id], queryFn: () => taxApi.invoice(id) });
  const d = q.data;
  const svg = useMemo(() => (d?.status === 'SUCCESS' && d.qrText ? qrSvg(d.qrText, 168) : ''), [d?.status, d?.qrText]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]:not([data-drawer])')) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast.success('Copy ho gaya'), () => toast.error('Copy nahi hua'));
  const st = d ? STATUS[d.status] : null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40 animate-in fade-in" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label="Tax invoice" className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            {d ? <>
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="font-mono text-lg font-semibold text-slate-900">{d.usin}</h2>
                {d.kind === 'RETURN' && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[0.6875rem] font-medium text-orange-700 ring-1 ring-orange-200">Return (credit note)</span>}
                {st && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}><st.icon className="h-3 w-3" />{st.label}</span>}
              </div>
              <p className="mt-0.5 text-[0.8125rem] text-slate-500">{AUTH[d.authority]?.label ?? d.authority} · POS {d.posId}</p>
            </> : <Skeleton className="h-6 w-40" />}
          </div>
          <IconButton label="Band karein" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {q.isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            : q.isError || !d ? <p className="text-[0.875rem] text-rose-700">Invoice nahi khuli. Dobara koshish karein.</p>
            : <>
              {d.status === 'SUCCESS' ? (
                <div className="rounded-2xl bg-emerald-50/60 p-4 text-center ring-1 ring-emerald-100">
                  <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-emerald-800">{d.label}</p>
                  <button type="button" onClick={() => d.fiscalNumber && copy(d.fiscalNumber)} className="mt-1 inline-flex items-center gap-1.5 break-all font-mono text-lg font-bold text-slate-900 hover:text-brand-700" title="Copy">
                    {d.fiscalNumber}<Copy className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                  {svg && <div className="mx-auto mt-3 inline-block rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />}
                  {/^https?:\/\//.test(d.qrText ?? '') && (
                    <a href={d.qrText!} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
                      Authority ki site par check karein <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <div className={cn('rounded-2xl p-4 ring-1', d.status === 'FAILED' ? 'bg-rose-50 ring-rose-200' : 'bg-amber-50 ring-amber-200')}>
                  <p className="text-[0.875rem] font-semibold text-slate-900">{d.status === 'FAILED' ? 'Authority ne yeh bill nahi liya' : 'Abhi authority ko bheja ja raha hai'}</p>
                  {d.error && <p className="mt-1 break-words text-[0.8125rem] text-rose-800">{d.error}</p>}
                  <p className="mt-1 text-[0.75rem] text-slate-600">
                    {d.attempts} koshish{d.nextAttemptAt ? ` · agli khud ${fullTime(d.nextAttemptAt)}` : ''}
                  </p>
                  {d.canRetry && (
                    <Button className="mt-3" size="sm" loading={retrying} onClick={() => onRetry(d.id)} leftIcon={<RefreshCw className="h-4 w-4" />}>Abhi dobara bhejein</Button>
                  )}
                  {!d.canRetry && <p className="mt-2 text-[0.75rem] text-slate-600">{d.authority} band hai. Dobara bhejne ke liye Tax settings me chalu karein.</p>}
                </div>
              )}

              <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
                <Fact k="Sale (tax ke baghair)" v={money(d.saleValue)} />
                <Fact k={`Tax (${d.taxRate}%)`} v={money(d.taxAmount)} />
                <Fact k="Kul (tax samet)" v={money(d.totalAmount)} strong />
                <Fact k="Branch" v={d.shop?.name ?? branchOf(d.shopId)} />
                <Fact k="Bana" v={fullTime(d.createdAt)} />
                {d.submittedAt && <Fact k="Aakhri dafa bheja" v={fullTime(d.submittedAt)} />}
              </dl>

              {d.sale && (
                <Link to={receiptLink(d.sale.id)} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[0.8125rem] ring-1 ring-slate-100 transition hover:bg-brand-50 hover:ring-brand-100">
                  <Receipt className="h-5 w-5 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">{d.kind === 'RETURN' ? 'Asal bill' : 'Bill'}</span>
                    <span className="block font-mono font-semibold text-slate-900">{d.sale.saleNumber}</span>
                    <span className="block text-slate-500">
                      {fullTime(d.sale.soldAt)} · {money(d.sale.total)} · {PAYMENT_LABELS[d.sale.paymentMethod] ?? d.sale.paymentMethod}
                      {d.sale.customer ? ` · ${d.sale.customer.name}` : ''}
                    </span>
                  </span>
                  <span className="text-[0.75rem] font-semibold text-brand-700">Kholein →</span>
                </Link>
              )}
              {d.return && (
                <p className="rounded-xl bg-orange-50 p-3 text-[0.8125rem] text-orange-900 ring-1 ring-orange-100">
                  Return {d.return.returnNumber} · {fullTime(d.return.returnedAt)} · {money(d.return.refundAmount)}{d.return.reason ? ` · ${d.return.reason}` : ''}
                </p>
              )}

              {d.related.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Isi bill ke aur record</p>
                  <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                    {d.related.map((x) => (
                      <li key={x.id}>
                        <button type="button" onClick={() => onOpen(x.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] hover:bg-slate-50">
                          <span className="font-mono font-semibold text-slate-900">{x.usin}</span>
                          <span className="text-slate-500">{x.kind === 'RETURN' ? 'Return' : 'Bill'} · {x.authority}</span>
                          <span className="ml-auto" style={{ color: STATUS[x.status].color }}>{x.status === 'SUCCESS' ? x.fiscalNumber : STATUS[x.status].label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Raw title="Authority ka jawab" value={d.response} />
              <Raw title="Jo authority ko bheja" value={d.request} />
              <p className="flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Lock className="h-3.5 w-3.5" />Password, token aur key yahan kabhi nahi dikhte.</p>
            </>}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function Fact({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-[0.8125rem] sm:block">
      <dt className="text-[0.75rem] text-slate-500">{k}</dt>
      <dd className={cn('tabular-nums text-slate-900', strong ? 'font-bold' : 'font-medium')}>{v}</dd>
    </div>
  );
}

function Raw({ title, value }: { title: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  if (value == null) return null;
  return (
    <div className="rounded-xl ring-1 ring-slate-200">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between px-3 py-2 text-[0.8125rem] font-semibold text-slate-700">
        {title}<ChevronDown className={cn('h-4 w-4 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && <pre className="max-h-72 overflow-auto border-t border-slate-100 bg-slate-50 px-3 py-2 text-[0.6875rem] leading-relaxed text-slate-700">{JSON.stringify(value, null, 2)}</pre>}
    </div>
  );
}
