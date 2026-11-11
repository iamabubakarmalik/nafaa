/**
 * A partner's earnings with status, hold date and payout link. Earnings on
 * hold, or payable and not in a payout, can be reversed with a reason.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';
import { Button, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { adminPartnersApi, type PartnerEarning } from '@/api/admin-partners.api';
import { apiError } from '@/lib/errors';
import { formatDate, formatDateTime, formatPKRFull } from '@/lib/format';
import { cn } from '@/lib/cn';
import { StatusBadge } from '@/ui';
import { KIND_LABEL } from '../lib/partner-text';
import { ReasonModal } from './ReasonModal';

const STATUS_LABEL: Record<string, string> = { PENDING: 'On hold', PAYABLE: 'Payable', PAID: 'Paid', REVERSED: 'Reversed' };

export function EarningsTable({ rows, canManage, showPartner = true }: { rows: PartnerEarning[]; canManage: boolean; showPartner?: boolean }) {
  const qc = useQueryClient();
  const [target, setTarget] = useState<PartnerEarning | null>(null);
  const reverse = useMutation({
    mutationFn: (reason: string) => adminPartnersApi.reverseEarning(target!.id, reason),
    onSuccess: (r) => {
      toast.success(r.reversed > 1 ? `Reversed, with ${r.reversed - 1} manager override` : 'Earning reversed');
      setTarget(null);
      qc.invalidateQueries({ queryKey: ['admin', 'partners'] });
      qc.invalidateQueries({ queryKey: ['admin', 'partner'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const reversible = (e: PartnerEarning) => e.status === 'PENDING' || (e.status === 'PAYABLE' && !e.payoutId);

  return (
    <>
      <Table minWidth="56rem">
        <THead>
          <Tr>
            <Th>Earning</Th>
            {showPartner && <Th>Partner</Th>}
            <Th>Status</Th>
            <Th>Payable from</Th>
            <Th align="right">Amount</Th>
            {canManage && <Th align="right"><span className="sr-only">Actions</span></Th>}
          </Tr>
        </THead>
        <TBody>
          {rows.map((e) => (
            <Tr key={e.id}>
              <Td className="max-w-[22rem]">
                <div className="font-medium text-slate-900">{KIND_LABEL[e.kind]}</div>
                <div className="line-clamp-2 text-[0.75rem] text-slate-500" title={e.description ?? undefined}>{e.description}</div>
                <div className="text-[0.6875rem] text-slate-400">
                  {formatDateTime(e.createdAt)}
                  {e.tenantId && <> · <Link to={`/tenants/${e.tenantId}`} className="hover:text-brand-700">{e.tenantName ?? 'Shop'}</Link></>}
                  {e.createdByName && <> · by {e.createdByName}</>}
                </div>
              </Td>
              {showPartner && (
                <Td>
                  <Link to={`/partners/${e.partner.id}`} className="font-medium text-slate-900 hover:text-brand-700">{e.partner.fullName}</Link>
                  <div className="font-mono text-[0.6875rem] text-slate-500">{e.partner.code}</div>
                </Td>
              )}
              <Td>
                <StatusBadge value={e.status === 'PENDING' ? 'PENDING' : e.status} label={STATUS_LABEL[e.status]} />
                {e.status === 'REVERSED' && e.reversedReason && <div className="mt-0.5 max-w-[14rem] text-[0.6875rem] text-slate-500">{e.reversedReason}</div>}
                {e.payout && e.status === 'PAYABLE' && <div className="mt-0.5 text-[0.6875rem] text-slate-500">In a payout request</div>}
                {e.payout?.reference && e.status === 'PAID' && <div className="mt-0.5 font-mono text-[0.6875rem] text-slate-500">Ref {e.payout.reference}</div>}
              </Td>
              <Td className="whitespace-nowrap text-[0.8125rem] text-slate-600">{formatDate(e.availableAt)}</Td>
              <Td align="right" className={cn('whitespace-nowrap font-semibold tabular-nums', e.amount < 0 ? 'text-rose-700' : 'text-slate-900', e.status === 'REVERSED' && 'text-slate-400 line-through')}>
                {formatPKRFull(e.amount)}
              </Td>
              {canManage && (
                <Td align="right">
                  {reversible(e) && <Button size="xs" variant="ghost" className="text-rose-700" leftIcon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => setTarget(e)}>Reverse</Button>}
                </Td>
              )}
            </Tr>
          ))}
        </TBody>
      </Table>
      <ReasonModal open={!!target} onClose={() => setTarget(null)} busy={reverse.isPending} danger yes="Reverse earning"
        title={target ? `Reverse ${formatPKRFull(target.amount)}?` : 'Reverse earning'}
        description="The partner will not be paid this amount. Any manager override made from it is reversed too. The partner sees your reason."
        label="Reason" placeholder="e.g. Shop was a duplicate account" onConfirm={(r) => reverse.mutate(r)} />
    </>
  );
}
