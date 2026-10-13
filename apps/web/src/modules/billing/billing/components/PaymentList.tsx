/** Payments sent to Nafaa: list rows and the detail window. */

import { ChevronRight, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, Badge, Button, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { Payment } from '../api/billing.api';
import { PAYMENT_STATUS, PROVIDER, formatDateTime } from './helpers';

export function PaymentList({ payments, onOpen }: { payments: Payment[]; onOpen: (p: Payment) => void }) {
  return (
    <ul className="divide-y divide-slate-100">
      {payments.map((p) => {
        const st = PAYMENT_STATUS[p.status];
        const pv = PROVIDER[p.provider];
        return (
          <li key={p.id}>
            <button type="button" onClick={() => onOpen(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${pv?.color ?? '#64748b'}17`, color: pv?.color ?? '#64748b' }}>
                {pv ? <pv.icon className="h-4 w-4" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.875rem] font-semibold text-slate-900">{pv?.label ?? p.provider}</span>
                  <Badge variant={st.badge} size="xs">{st.label}</Badge>
                </span>
                <span className="block truncate text-[0.75rem] text-slate-500">
                  {formatDateTime(p.createdAt)}{p.invoice?.invoiceNumber ? ` · ${p.invoice.invoiceNumber}` : ''}{p.transactionId ? ` · Ref ${p.transactionId}` : ''}
                </span>
              </span>
              <span className="text-[0.9375rem] font-bold tabular-nums text-slate-900">{formatPKR(p.amount)}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function PaymentModal({ payment: p, onClose }: { payment: Payment; onClose: () => void }) {
  const st = PAYMENT_STATUS[p.status];
  const rows: Array<[string, string]> = [
    ['Tareeqa', PROVIDER[p.provider]?.label ?? p.provider],
    ['Bheji', formatDateTime(p.createdAt)],
    ...(p.invoice?.invoiceNumber ? [['Bill', p.invoice.invoiceNumber] as [string, string]] : []),
    ...(p.transactionId ? [['Ref / TID', p.transactionId] as [string, string]] : []),
    ...(p.payerName ? [['Bhejne wala', p.payerName] as [string, string]] : []),
    ...(p.bankName ? [['Bank', p.bankName] as [string, string]] : []),
    ...(p.approvedAt ? [['Approve hui', formatDateTime(p.approvedAt)] as [string, string]] : []),
  ];
  return (
    <Modal open onClose={onClose} size="md" title="Payment ki details" description={st.hint}
      footer={<>
        {p.transactionId && <Button variant="ghost" onClick={() => { void navigator.clipboard?.writeText(p.transactionId!); toast.success('Ref copy ho gaya'); }}><Copy className="h-4 w-4" /> Ref copy</Button>}
        {p.upload?.url && <a href={p.upload.url} target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink className="h-4 w-4" /> Receipt dekhein</Button></a>}
        <Button onClick={onClose}>Theek hai</Button>
      </>}>
      <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: `${st.color}12` }}>
        <p className="text-[0.75rem] font-medium" style={{ color: st.color }}>{st.label}</p>
        <p className="text-3xl font-bold tabular-nums text-slate-900">{formatPKR(p.amount)}</p>
      </div>
      <dl className="mt-3 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[0.8125rem]">
            <dt className="text-slate-500">{k}</dt><dd className="break-all text-right font-semibold text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      {p.rejectionReason && <Alert tone="danger" title="Wapas kyun ki gayi" className="mt-3">{p.rejectionReason}</Alert>}
      {p.notes && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-100">{p.notes}</p>}
    </Modal>
  );
}
