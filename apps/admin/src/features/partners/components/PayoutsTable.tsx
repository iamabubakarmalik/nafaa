/**
 * Payout requests with their state and the account to send money to.
 * Admins with the payouts permission approve, mark paid (with the transfer
 * reference) or reject. Money is sent by hand outside Nafaa.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, Check, Copy, X } from 'lucide-react';
import { Alert, Button, Table, TBody, Td, Th, THead, Tr, confirmDialog } from '@/design-system/components';
import { adminPartnersApi, type PartnerPayout } from '@/api/admin-partners.api';
import { apiError } from '@/lib/errors';
import { formatDateTime, formatPKRFull, formatRelative } from '@/lib/format';
import { StatusBadge } from '@/ui';
import { methodLabel } from '../lib/partner-text';
import { ReasonModal } from './ReasonModal';

export function PayoutAccount({ p }: { p: Pick<PartnerPayout, 'method' | 'account' | 'accountTitle'> & { bankName?: string | null } }) {
  const copy = () => p.account && navigator.clipboard?.writeText(p.account).then(() => toast.success('Account copied'), () => toast.error('Could not copy'));
  return (
    <div className="min-w-0">
      <div className="text-[0.8125rem] font-medium text-slate-900">{methodLabel(p.method)}{p.bankName ? ` · ${p.bankName}` : ''}</div>
      {p.account && (
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 font-mono text-[0.75rem] text-slate-700 hover:text-brand-700" title="Copy account">
          {p.account}<Copy className="h-3 w-3" />
        </button>
      )}
      {p.accountTitle && <div className="truncate text-[0.6875rem] text-slate-500">{p.accountTitle}</div>}
    </div>
  );
}

export function PayoutsTable({ rows, canPay, showPartner = true }: { rows: PartnerPayout[]; canPay: boolean; showPartner?: boolean }) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState<PartnerPayout | null>(null);
  const [rejecting, setRejecting] = useState<PartnerPayout | null>(null);
  const done = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ['admin', 'partners'] });
    qc.invalidateQueries({ queryKey: ['admin', 'partner'] });
  };
  const approve = useMutation({ mutationFn: (id: string) => adminPartnersApi.approvePayout(id), onSuccess: () => done('Payout approved. Send the money, then mark it paid.'), onError: (e) => toast.error(apiError(e)) });
  const paid = useMutation({
    mutationFn: (reference: string) => adminPartnersApi.markPaid(paying!.id, { reference }),
    onSuccess: () => { setPaying(null); done('Payout marked paid'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const reject = useMutation({
    mutationFn: (reason: string) => adminPartnersApi.rejectPayout(rejecting!.id, reason),
    onSuccess: () => { setRejecting(null); done('Payout rejected. The amount is back in the partner’s balance.'); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <>
      <Table minWidth="60rem">
        <THead>
          <Tr>
            {showPartner && <Th>Partner</Th>}
            <Th>Send to</Th>
            <Th align="right">Amount</Th>
            <Th>Status</Th>
            <Th>Requested</Th>
            {canPay && <Th align="right"><span className="sr-only">Actions</span></Th>}
          </Tr>
        </THead>
        <TBody>
          {rows.map((p) => (
            <Tr key={p.id}>
              {showPartner && (
                <Td>
                  <Link to={`/partners/${p.partner.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{p.partner.fullName}</Link>
                  <div className="text-[0.75rem] text-slate-500">{p.partner.phone} · <span className="font-mono">{p.partner.code}</span></div>
                </Td>
              )}
              <Td className="max-w-[16rem]"><PayoutAccount p={p} /></Td>
              <Td align="right" className="whitespace-nowrap text-[0.9375rem] font-bold tabular-nums text-slate-900">
                {formatPKRFull(p.amount)}
                <div className="text-[0.6875rem] font-normal text-slate-500">{p.earningsCount} earnings</div>
              </Td>
              <Td>
                <StatusBadge value={p.status} />
                {p.status === 'PAID' && (
                  <div className="mt-0.5 text-[0.6875rem] text-slate-500">
                    {p.paidAt && formatDateTime(p.paidAt)}{p.reference && <> · <span className="font-mono">{p.reference}</span></>}
                  </div>
                )}
                {p.status === 'REJECTED' && p.rejectReason && <div className="mt-0.5 max-w-[14rem] text-[0.6875rem] text-slate-500">{p.rejectReason}</div>}
                {p.status === 'APPROVED' && p.decidedByName && <div className="mt-0.5 text-[0.6875rem] text-slate-500">by {p.decidedByName}</div>}
              </Td>
              <Td className="whitespace-nowrap text-[0.8125rem]" title={formatDateTime(p.requestedAt)}>{formatRelative(p.requestedAt)}</Td>
              {canPay && (
                <Td align="right">
                  <div className="flex justify-end gap-1.5">
                    {p.status === 'REQUESTED' && (
                      <Button size="xs" leftIcon={<Check className="h-3.5 w-3.5" />} loading={approve.isPending && approve.variables === p.id}
                        onClick={async () => { if (await confirmDialog({ title: `Approve ${formatPKRFull(p.amount)} for ${p.partner.fullName}?`, text: 'Approving does not send money. Send it by hand, then mark the payout paid.', yes: 'Approve' })) approve.mutate(p.id); }}>Approve</Button>
                    )}
                    {p.status === 'APPROVED' && <Button size="xs" variant="success" leftIcon={<Banknote className="h-3.5 w-3.5" />} onClick={() => setPaying(p)}>Mark paid</Button>}
                    {(p.status === 'REQUESTED' || p.status === 'APPROVED') && (
                      <Button size="xs" variant="ghost" className="text-rose-700" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => setRejecting(p)}>Reject</Button>
                    )}
                  </div>
                </Td>
              )}
            </Tr>
          ))}
        </TBody>
      </Table>

      <ReasonModal open={!!paying} onClose={() => setPaying(null)} busy={paid.isPending} yes="Mark paid" multiline={false}
        title={paying ? `Mark ${formatPKRFull(paying.amount)} paid?` : 'Mark paid'}
        description="Only do this after the money has reached the partner. Nafaa does not send it."
        label="Transaction reference (TID)" placeholder="From the JazzCash, Easypaisa or bank receipt" onConfirm={(r) => paid.mutate(r)}>
        {paying && (
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="mb-1 text-[0.75rem] font-medium text-slate-500">Send {formatPKRFull(paying.amount)} to</div>
            <PayoutAccount p={paying} />
          </div>
        )}
        <Alert tone="info">The partner sees the reference in their payout history.</Alert>
      </ReasonModal>
      <ReasonModal open={!!rejecting} onClose={() => setRejecting(null)} busy={reject.isPending} danger yes="Reject payout"
        title={rejecting ? `Reject ${formatPKRFull(rejecting.amount)}?` : 'Reject payout'}
        description="The amount goes back to the partner's available balance, and they can ask again. They see your reason."
        label="Reason" placeholder="e.g. Account title does not match the CNIC" onConfirm={(r) => reject.mutate(r)} />
    </>
  );
}
