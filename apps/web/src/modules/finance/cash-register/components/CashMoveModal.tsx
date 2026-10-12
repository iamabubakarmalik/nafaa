/**
 * Cash in / cash out of an open till with a reason: change put in, the
 * owner taking cash, a bank deposit. Each dialog sends one request key, so
 * a double click or a retry posts the entry once.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownToLine, ArrowUpFromLine, TriangleAlert } from 'lucide-react';
import { Button, Input, Modal, Segmented, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { cashRegisterApi, type CashRegister } from '../api/cash-register.api';
import { CASH_KEY, REASONS, requestKey, tillName } from './meta';

type Kind = 'CASH_IN' | 'CASH_OUT';

export function CashMoveModal({ register, kind: initial, onClose }: { register: CashRegister; kind: Kind; onClose: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>(initial);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [key] = useState(requestKey);

  const value = Number(amount);
  const validAmount = amount.trim() !== '' && Number.isFinite(value) && value > 0;
  const valid = validAmount && reason.trim().length > 0;
  const inDrawer = register.expectedBalance;
  const tooMuch = kind === 'CASH_OUT' && validAmount && value > inDrawer;

  const m = useMutation({
    mutationFn: () => cashRegisterApi.transaction({
      registerId: register.id, type: kind, amount: value, reason: reason.trim(), note: note.trim() || undefined, requestId: key,
    }),
    onSuccess: () => {
      toast.success(kind === 'CASH_IN' ? `${formatPKR(value)} galle me daale` : `${formatPKR(value)} galle se nikale`, { description: reason.trim() });
      void qc.invalidateQueries({ queryKey: [CASH_KEY] });
      void qc.invalidateQueries({ queryKey: ['money'] });
      onClose();
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? 'Entry nahi hui'),
  });

  const Icon = kind === 'CASH_IN' ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <Modal open onClose={onClose} title={kind === 'CASH_IN' ? 'Galle me cash daalein' : 'Galle se cash nikalein'}
      description={`${tillName(register)} · abhi galle me ${formatPKR(inDrawer)} hona chahiye`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant={kind === 'CASH_IN' ? 'success' : 'danger'} onClick={() => m.mutate()} loading={m.isPending} disabled={!valid} leftIcon={<Icon className="h-4 w-4" />}>
          {kind === 'CASH_IN' ? 'Daal dein' : 'Nikal dein'}
        </Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid && !m.isPending) m.mutate(); }}>
        <Segmented label="Kya karna hai" value={kind} onChange={(v) => { setKind(v as Kind); setReason(''); }}
          items={[{ value: 'CASH_IN', label: 'Cash in (daalna)' }, { value: 'CASH_OUT', label: 'Cash out (nikalna)' }]} />
        <Input data-autofocus label="Raqam" type="number" inputMode="decimal" min={0} size="lg" required value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="1000"
          error={amount && !validAmount ? 'Raqam 0 se zyada likhein' : undefined}
          hint={kind === 'CASH_IN' ? 'Jo cash bikri ke ilawa galle me aaya' : 'Jo cash bikri ki wapsi ya kharch ke ilawa galle se gaya'} />
        {tooMuch && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-800 ring-1 ring-amber-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />Ye raqam galle ke hisaab ({formatPKR(inDrawer)}) se zyada hai. Pehle gin lein, phir nikalein.
          </p>
        )}
        <div>
          <Input label="Wajah" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200}
            placeholder="Kis liye?" hint="Neeche se chunein ya apni likhein; shift report me yahi dikhegi" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS[kind].map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r}
                className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 transition',
                  reason === r ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{r}</button>
            ))}
          </div>
        </div>
        <Textarea label="Tafseel (marzi se)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
          placeholder="Masalan: bank slip number" hint="Sirf record ke liye" />
        <button type="submit" hidden aria-hidden />
      </form>
    </Modal>
  );
}
