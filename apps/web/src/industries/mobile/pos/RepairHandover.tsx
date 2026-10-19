/**
 * Hands a repaired phone back from the counter: takes what is left, closes
 * the job and posts its bill (sales, cash register, khata) in one step,
 * the same as "Wapas dein" on the job's own page.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { repairsApi, type RepairTicket } from '../api/repairs.api';
import { DeliverRepairModal } from '../components/repairs/DeliverRepairModal';
import { MONEY_KEYS, REPAIR_KEY, apiError } from '../components/meta';

export function RepairHandover({ ticket, onClose }: { ticket: RepairTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const deliver = useMutation({
    mutationFn: (v: { amount: number; method: PaymentMethod }) => repairsApi.deliver(ticket.id, { amount: v.amount, paymentMethod: v.method }),
    onSuccess: (r) => {
      toast.success(r.sale ? `${ticket.ticketNumber} wapas — bill ${r.sale.saleNumber}` : `${ticket.ticketNumber} wapas de diya`);
      [REPAIR_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Wapas nahi hua')),
  });
  return (
    <DeliverRepairModal ticket={ticket} pending={deliver.isPending} onClose={onClose}
      onConfirm={(amount, method) => { if (!deliver.isPending) deliver.mutate({ amount, method }); }} />
  );
}
