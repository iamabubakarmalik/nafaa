/**
 * Close a shift: count the drawer (one amount or note by note), see the
 * expected cash and the difference before saving, and give a reason when
 * the count is short or over. The server works out the final expected cash
 * at the moment of closing; the Z-report opens right after.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calculator, StopCircle } from 'lucide-react';
import { Button, Input, Modal, Segmented, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { cashRegisterApi, type CashRegister } from '../api/cash-register.api';
import { DenominationCounter } from './DenominationCounter';
import { CASH_KEY, DIFF, cleanDenoms, diffKind, duration, signed, sumDenoms, tillName } from './meta';

type Mode = 'amount' | 'notes';

export function CloseShiftModal({ register, onClose, onClosed }: {
  register: CashRegister;
  onClose: () => void;
  /** Called with the closed shift's id, to open its report. */
  onClosed: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('notes');
  const [amount, setAmount] = useState('');
  const [denoms, setDenoms] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const expected = register.expectedBalance;
  const counted = mode === 'notes' ? sumDenoms(denoms) : Number(amount);
  const hasCount = mode === 'notes' ? Object.values(denoms).some((v) => Number(v) > 0) : amount.trim() !== '' && Number.isFinite(counted) && counted >= 0;
  const diff = hasCount ? counted - expected : 0;
  const kind = diffKind(diff);
  const needsReason = hasCount && kind !== 'match' && !notes.trim();
  const valid = hasCount && !needsReason;

  const m = useMutation({
    mutationFn: () => cashRegisterApi.close({
      registerId: register.id,
      closingBalance: counted,
      notes: notes.trim() || undefined,
      denominations: mode === 'notes' ? cleanDenoms(denoms) : undefined,
    }),
    onSuccess: (r) => {
      const k = diffKind(r.difference);
      const text = k === 'match' ? 'Galla barabar nikla' : k === 'short' ? `${formatPKR(Math.abs(r.difference))} kam nikle` : `${formatPKR(r.difference)} zyada nikle`;
      (k === 'short' ? toast.warning : toast.success)(`Shift band — ${text}`, { description: `Hona chahiye tha ${formatPKR(r.expectedBalance)}, gina ${formatPKR(r.closingBalance)}` });
      void qc.invalidateQueries({ queryKey: [CASH_KEY] });
      void qc.invalidateQueries({ queryKey: ['money'] });
      onClosed(r.id);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? 'Shift band nahi hui'),
  });

  const D = DIFF[kind];
  return (
    <Modal open onClose={onClose} size="lg" title={`Shift band karein — ${tillName(register)}`}
      description={`${duration(register.openedAt)} se khuli · ${register.openedBy?.fullName ?? ''}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" onClick={() => m.mutate()} loading={m.isPending} disabled={!valid} leftIcon={<StopCircle className="h-4 w-4" />}>Shift band karein</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid && !m.isPending) m.mutate(); }}>
        <div className="grid grid-cols-3 gap-2">
          <Fig label="Hona chahiye" value={formatPKR(expected)} />
          <Fig label="Gina" value={hasCount ? formatPKR(counted) : '—'} />
          <div className={cn('rounded-xl px-3 py-2 ring-1', hasCount ? D.tone : 'bg-slate-50 text-slate-500 ring-slate-200')}>
            <p className="text-[0.6875rem] font-medium">{hasCount ? D.label : 'Farak'}</p>
            <p className="text-base font-bold tabular-nums">{hasCount ? signed(diff) : '—'}</p>
          </div>
        </div>

        <Segmented label="Ginti ka tareeqa" value={mode} onChange={(v) => setMode(v as Mode)}
          items={[{ value: 'notes', label: 'Note gin kar' }, { value: 'amount', label: 'Kul amount' }]} />
        {mode === 'notes' ? <DenominationCounter value={denoms} onChange={setDenoms} /> : (
          <Input data-autofocus label="Galle me gina hua cash" type="number" inputMode="decimal" min={0} size="lg" required
            value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" leftIcon={<Calculator className="h-4 w-4" />}
            hint="Pehle galla gin lein, phir kul amount likhein. 'Hona chahiye' dekh kar mat likhein — asal ginti likhein." />
        )}

        <Textarea label={kind !== 'match' && hasCount ? 'Farak ki wajah' : 'Note (marzi se)'} required={kind !== 'match' && hasCount}
          rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
          error={needsReason ? 'Paise kam ya zyada hain — wajah likhna zaroori hai' : undefined}
          placeholder={kind === 'short' ? 'Masalan: 500 ka khula customer ko zyada diya' : 'Masalan: shaam ki shift, sab theek'}
          hint="Shift record aur Z-report me dikhega" />
        <p className="text-[0.75rem] text-slate-500">Band karte waqt "hona chahiye" dobara taaza hisaab se banta hai — beech me koi sale hui to woh bhi gini jayegi.</p>
        <button type="submit" hidden aria-hidden />
      </form>
    </Modal>
  );
}

function Fig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <p className="text-[0.6875rem] font-medium text-slate-500">{label}</p>
      <p className="text-base font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
