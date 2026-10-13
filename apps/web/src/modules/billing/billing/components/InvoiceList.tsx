/** Nafaa bills: list rows and the detail window with print and pay. */

import { Link } from 'react-router-dom';
import { ChevronRight, Copy, CreditCard, ExternalLink, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Modal } from '@/design-system/components';
import { PrintButton } from '@core/print';
import { formatPKR } from '@core/lib/format';
import type { Invoice } from '../api/billing.api';
import { INTERVAL, INVOICE_STATUS, PAYMENT_STATUS, PROVIDER, daysText, daysUntil, formatDate, formatDateTime } from './helpers';
import { invoiceDoc } from './print';

const isOpen = (i: Invoice) => i.status === 'PENDING' || i.status === 'OVERDUE';

export function InvoiceList({ invoices, onOpen }: { invoices: Invoice[]; onOpen: (i: Invoice) => void }) {
  return (
    <ul className="divide-y divide-slate-100">
      {invoices.map((inv) => {
        const st = INVOICE_STATUS[inv.status];
        const days = daysUntil(inv.dueDate);
        return (
          <li key={inv.id}>
            <button type="button" onClick={() => onOpen(inv)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${st.color}17`, color: st.color }}><st.icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.875rem] font-semibold text-slate-900">{inv.invoiceNumber}</span>
                  <Badge variant={st.badge} size="xs">{st.label}</Badge>
                </span>
                <span className="block truncate text-[0.75rem] text-slate-500">
                  {inv.subscription?.plan?.name || inv.description || 'Subscription'} · {formatDate(inv.createdAt)}
                  {isOpen(inv) && <> · <b className={days < 0 ? 'text-rose-700' : 'text-amber-700'}>Due {daysText(days).toLowerCase()}</b></>}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-[0.9375rem] font-bold tabular-nums text-slate-900">{formatPKR(isOpen(inv) ? inv.amountDue : inv.total)}</span>
                <span className="block text-[0.6875rem] text-slate-500">{isOpen(inv) ? 'dena hai' : 'kul'}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function InvoiceModal({ invoice: inv, onClose }: { invoice: Invoice; onClose: () => void }) {
  const st = INVOICE_STATUS[inv.status];
  const open = isOpen(inv);
  const days = daysUntil(inv.dueDate);
  const rows: Array<[string, string]> = [
    ['Plan', inv.subscription?.plan?.name || inv.description || 'Subscription'],
    ...(inv.subscription?.interval ? [['Muddat', INTERVAL[inv.subscription.interval].label] as [string, string]] : []),
    ...(inv.periodStart && inv.periodEnd ? [['Kab se kab tak', `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`] as [string, string]] : []),
    ['Bana', formatDate(inv.createdAt)],
    ['Due date', formatDate(inv.dueDate)],
    ...(inv.paidAt ? [['Ada hua', formatDateTime(inv.paidAt)] as [string, string]] : []),
  ];

  return (
    <Modal open onClose={onClose} size="md" title={<span className="font-mono">{inv.invoiceNumber}</span>} description={st.hint}
      footer={<>
        <Button variant="ghost" onClick={() => { void navigator.clipboard?.writeText(inv.invoiceNumber); toast.success('Bill number copy ho gaya'); }}><Copy className="h-4 w-4" /> Copy</Button>
        <PrintButton doc={() => invoiceDoc(inv)} />
        {open && <Link to={`/billing/invoice/${inv.id}/pay`}><Button><CreditCard className="h-4 w-4" /> Payment karein</Button></Link>}
      </>}>
      <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: `${st.color}12` }}>
        <p className="text-[0.75rem] font-medium" style={{ color: st.color }}>{open ? 'Abhi dena hai' : 'Kul raqam'}</p>
        <p className="text-3xl font-bold tabular-nums text-slate-900">{formatPKR(open ? inv.amountDue : inv.total)}</p>
        {open && <p className="mt-1 text-[0.75rem] font-semibold" style={{ color: st.color }}>{days < 0 ? `${Math.abs(days)} din der ho gayi` : `Due: ${daysText(days)}`}</p>}
      </div>

      <dl className="mt-3 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.8125rem]">
            <dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold text-slate-900">{v}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.8125rem]"><dt className="text-slate-500">Raqam</dt><dd className="font-semibold tabular-nums">{formatPKR(inv.subtotal ?? inv.total)}</dd></div>
        {!!inv.tax && <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.8125rem]"><dt className="text-slate-500">Tax</dt><dd className="font-semibold tabular-nums">{formatPKR(inv.tax)}</dd></div>}
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.875rem]"><dt className="font-semibold text-slate-900">Kul</dt><dd className="font-bold tabular-nums">{formatPKR(inv.total)}</dd></div>
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.8125rem]"><dt className="text-slate-500">Ada kiya</dt><dd className="font-semibold tabular-nums text-emerald-700">{formatPKR(inv.amountPaid)}</dd></div>
      </dl>

      {!!inv.payments?.length && (
        <div className="mt-3">
          <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Is bill ki payments</p>
          <ul className="space-y-1.5">
            {inv.payments.map((p) => {
              const ps = PAYMENT_STATUS[p.status];
              return (
                <li key={p.id} className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] ring-1 ring-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{PROVIDER[p.provider]?.label ?? p.provider} · {formatDate(p.createdAt)}</span>
                    <Badge variant={ps.badge} size="xs">{ps.label}</Badge>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-[0.75rem] text-slate-500">
                    <span>{p.transactionId ? `Ref ${p.transactionId}` : 'Ref nahi diya'}</span>
                    <span className="font-semibold tabular-nums text-slate-800">{formatPKR(p.amount)}</span>
                  </div>
                  {p.rejectionReason && <p className="mt-1 text-[0.75rem] text-rose-700">Wajah: {p.rejectionReason}</p>}
                  {p.upload?.url && <a href={p.upload.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline"><ExternalLink className="h-3 w-3" /> Receipt dekhein</a>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {inv.description && inv.subscription?.plan?.name && <p className="mt-3 flex items-start gap-2 text-[0.8125rem] text-slate-600"><Receipt className="mt-0.5 h-4 w-4 shrink-0" />{inv.description}</p>}
    </Modal>
  );
}
