/**
 * Record a commission payment for one person and month. The amount paid now
 * is added to what is already recorded; the server gets the new total and
 * the old one, so a double click or a second screen cannot pay twice.
 */

import { useState } from 'react';
import { HandCoins, Info } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { CommissionRow } from '../api/commission.api';
import { periodLabel, signed } from './meta';

export function PayModal({ row, period, saving, onClose, onPay }: {
  row: CommissionRow;
  period: string;
  saving: boolean;
  onClose: () => void;
  onPay: (a: { amount: number; expectedPaid: number; note?: string }) => void;
}) {
  const paid = row.paidAmount ?? 0;
  const [now, setNow] = useState(row.due > 0 ? String(row.due) : '');
  const [note, setNote] = useState('');
  const amount = Number(now || 0);
  const after = paid + amount;
  const error = !(amount > 0) ? 'Kitne diye, likhein' : '';
  const [tried, setTried] = useState(false);

  const submit = () => {
    setTried(true);
    if (error) return;
    if (after > row.earned + 0.5 && !window.confirm(`Banti ${formatPKR(row.earned)} hai, aap kul ${formatPKR(after)} likh rahe hain.\n\nZyada raqam advance ki tarah likhi jayegi. Theek hai?`)) return;
    onPay({ amount: Math.round(after * 100) / 100, expectedPaid: paid, note: note.trim() || undefined });
  };

  return (
    <Modal open onClose={onClose} size="sm" title={`${row.name} ko commission`} description={periodLabel(period)}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} loading={saving} leftIcon={<HandCoins className="h-4 w-4" />}>Ada likhein</Button>
      </>}>
      <div className="space-y-4">
        <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200">
          <div><dt className="text-[0.6875rem] text-slate-500">Banti hai</dt><dd className="font-bold tabular-nums text-slate-900">{signed(row.earned)}</dd></div>
          <div><dt className="text-[0.6875rem] text-slate-500">Pehle diye</dt><dd className="font-bold tabular-nums text-slate-900">{formatPKR(paid)}</dd></div>
          <div><dt className="text-[0.6875rem] text-slate-500">Baqi</dt><dd className="font-bold tabular-nums text-amber-700">{formatPKR(row.due)}</dd></div>
        </dl>
        <Input label="Abhi kitne diye (Rs)" type="number" inputMode="decimal" min={0} value={now} onChange={(e) => setNow(e.target.value)} autoFocus
          error={tried ? error : undefined} hint={amount > 0 ? `Is mahine ki kul adaigi ${formatPKR(after)} ho jayegi` : 'Poori ya kuch raqam — baqi baad me de sakte hain'} />
        <Input label="Note (marzi se)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} hint='Maslan "cash diya" ya "JazzCash se bheja"' />
        <p className="flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900 ring-1 ring-sky-200">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Ye sirf adaigi ka record hai — galle ka cash nahi ghatta. Jis mahine ki commission yahan ada likhi ho, Payroll use tankhwah me dobara nahi jorta.
        </p>
      </div>
    </Modal>
  );
}
