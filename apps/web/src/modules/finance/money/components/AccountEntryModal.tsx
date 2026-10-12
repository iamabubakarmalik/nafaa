/**
 * Money into or out of one account from outside the shop: owner's capital,
 * drawings, bank charges, profit, or a correction to match the real balance.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Checkbox, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { moneyApi, type MoneyAccountRow } from '../api/money.api';
import { MONEY_KEY, apiError, newRequestId } from './meta';

export type EntryKind = 'DEPOSIT' | 'WITHDRAW' | 'ADJUSTMENT';

const KIND_TEXT: Record<EntryKind, { label: string; reasons: string[] }> = {
  DEPOSIT: { label: 'Jama', reasons: ['Malik ne paisa lagaya', 'Bank ka munafa', 'Udhaar liya', 'Doosri jagah se aaya'] },
  WITHDRAW: { label: 'Nikala', reasons: ['Malik ne liya', 'Bank charges', 'Ghar ke kharch', 'Udhaar wapas kiya'] },
  ADJUSTMENT: { label: 'Durusti', reasons: ['Bank statement se milaya', 'Purani ghalti theek ki', 'Gin kar milaya'] },
};

export function AccountEntryModal({ account, kind: initial, onClose }: {
  account: MoneyAccountRow;
  kind: EntryKind;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<EntryKind>(initial);
  const [amount, setAmount] = useState('');
  /** For an adjustment: the balance the bank or wallet really shows. */
  const [actual, setActual] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [allowNegative, setAllowNegative] = useState(false);
  const [tried, setTried] = useState(false);
  const [requestId] = useState(newRequestId);

  const adjust = kind === 'ADJUSTMENT';
  const delta = adjust
    ? (actual.trim() === '' ? 0 : Math.round((Number(actual) - account.balance) * 100) / 100)
    : (Number(amount) || 0) * (kind === 'WITHDRAW' ? -1 : 1);
  const after = account.balance + delta;
  const short = delta < 0 && after < -0.005;
  const errors = {
    amount: adjust
      ? (actual.trim() === '' || Number.isNaN(Number(actual)) ? 'Asal balance likhein' : delta === 0 ? 'Balance pehle hi barabar hai' : undefined)
      : (Number(amount) || 0) <= 0 ? 'Raqam likhein' : short && !allowNegative ? 'Itna paisa nahi hai' : undefined,
    reason: reason.trim().length < 2 ? 'Wajah likhein ya neeche se chunein' : undefined,
  };
  const ok = !errors.amount && !errors.reason;

  const save = useMutation({
    mutationFn: () => moneyApi.entry({
      accountId: account.id, type: kind, amount: adjust ? delta : Math.abs(delta),
      reason: reason.trim(), note: note.trim() || undefined, requestId, allowNegative: adjust || allowNegative,
    }),
    onSuccess: (r) => {
      toast.success(r.duplicate ? 'Ye entry pehle hi save ho chuki thi' : `${account.name}: ${KIND_TEXT[kind].label} save ho gaya`);
      qc.invalidateQueries({ queryKey: [MONEY_KEY] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });

  const submit = () => {
    setTried(true);
    if (ok && !save.isPending) save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="md" title={account.name}
      description="Dukaan ke bahar se aaya ya bahar gaya paisa. Golak ya doosre account ke liye 'Paisa bhejein' istemal karein."
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant={kind === 'WITHDRAW' ? 'danger' : 'primary'} loading={save.isPending} onClick={submit}>{KIND_TEXT[kind].label} save karein</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div role="radiogroup" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {(Object.keys(KIND_TEXT) as EntryKind[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setReason(''); }}
              className={cn('h-9 rounded-lg text-[0.8125rem] font-semibold transition',
                kind === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
              {KIND_TEXT[k].label}
            </button>
          ))}
        </div>

        {adjust ? (
          <Input label="Asal balance" required type="number" inputMode="decimal" step="any" value={actual} data-autofocus
            onChange={(e) => setActual(e.target.value)} placeholder={String(account.balance)} size="lg"
            error={tried ? errors.amount : undefined}
            hint="Bank app ya statement par jitna dikh raha hai — farq khud entry ban jayega" />
        ) : (
          <Input label="Raqam" required type="number" inputMode="decimal" min={0} step="any" value={amount} data-autofocus
            onChange={(e) => setAmount(e.target.value)} placeholder="0" size="lg" error={tried ? errors.amount : undefined} />
        )}

        <p className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">
          <span>Abhi <b className="tabular-nums text-slate-900">{formatPKR(account.balance)}</b></span>
          {delta !== 0 && <span>{delta > 0 ? '+' : '−'}{formatPKR(Math.abs(delta))}</span>}
          <span>Baad me <b className={cn('tabular-nums', after < 0 ? 'text-rose-700' : 'text-slate-900')}>{formatPKR(after)}</b></span>
        </p>

        {short && !adjust && (
          <Checkbox checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)}
            label="Phir bhi nikalein (minus me jane dein)" description="Asal account me zyada ho to theek hai; baad me durusti kar lein." />
        )}

        <div>
          <Input label="Wajah" required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120}
            error={tried ? errors.reason : undefined} hint="Statement me yahi likha dikhega" />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {KIND_TEXT[kind].reasons.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 transition',
                  reason === r ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{r}</button>
            ))}
          </div>
        </div>

        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Marzi hai" />
      </form>
    </Modal>
  );
}
