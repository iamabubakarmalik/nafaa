/** Adds a plus or minus amount to a partner's balance, payable at once, with a note the partner sees. */

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, Button, Input, Modal, Segmented, Textarea } from '@/design-system/components';
import { adminPartnersApi } from '@/api/admin-partners.api';
import { apiError } from '@/lib/errors';
import { formatPKRFull } from '@/lib/format';

export function AdjustmentModal({ open, onClose, partnerId, partnerName }: { open: boolean; onClose: () => void; partnerId: string; partnerName: string }) {
  const qc = useQueryClient();
  const [sign, setSign] = useState<'plus' | 'minus'>('plus');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => { if (open) { setSign('plus'); setAmount(''); setNote(''); } }, [open]);
  const value = Number(amount) * (sign === 'minus' ? -1 : 1);
  const valid = Number(amount) > 0 && note.trim().length >= 3;
  const save = useMutation({
    mutationFn: () => adminPartnersApi.adjust(partnerId, { amount: value, note: note.trim() }),
    onSuccess: () => {
      toast.success(`${formatPKRFull(value)} ${sign === 'plus' ? 'added to' : 'taken from'} ${partnerName}`);
      qc.invalidateQueries({ queryKey: ['admin', 'partners'] });
      qc.invalidateQueries({ queryKey: ['admin', 'partner'] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e)),
  });
  return (
    <Modal open={open} onClose={onClose} title="Adjust balance" description={`A hand-made change to ${partnerName}'s balance. It is payable at once and the partner sees the note.`}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={sign === 'minus' ? 'danger' : 'primary'} loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>{sign === 'plus' ? 'Add amount' : 'Take amount'}</Button></div>}>
      <div className="space-y-3">
        <Segmented value={sign} onChange={setSign} label="Add or take" items={[{ value: 'plus', label: 'Add' }, { value: 'minus', label: 'Take away' }]} />
        <Input label="Amount (PKR)" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Textarea label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={sign === 'plus' ? 'e.g. Bonus for the Lahore launch week' : 'e.g. Paid twice in October by mistake'} />
        {sign === 'minus' && <Alert tone="warning">A taken amount is subtracted from the partner's next payout request.</Alert>}
      </div>
    </Modal>
  );
}
