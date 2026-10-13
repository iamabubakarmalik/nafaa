/**
 * The money dialogs of payroll: save and pay the chosen salaries of a month,
 * pay what is left on one salary, and cancel a salary or an advance (money
 * paid goes back where it came from). Each dialog sends one request key, so
 * a double click or a retry posts once.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, CircleSlash, HandCoins } from 'lucide-react';
import { Avatar, Button, Input, Modal, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { payrollApi, type RunEdit, type RunResult, type SalaryRecord, type Sources } from '../api/payroll.api';
import { TOUCHED_KEYS, apiError, requestKey } from './meta';
import { SourcePicker, defaultSource, sourceReady, type SourceValue } from './SourcePicker';

const refreshAll = (qc: ReturnType<typeof useQueryClient>) => TOUCHED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

export interface PayLineView { staffId: string; name: string; avatarUrl?: string | null; designation: string; net: number; payNow: number; edit?: RunEdit }

/** Saves the chosen salaries of a month and pays them from one source (or keeps them due). */
export function RunPayModal({ month, monthLabel, shopId, lines, sources, onDone, onClose }: {
  month: string; monthLabel: string; shopId?: string; lines: PayLineView[]; sources: Sources; onDone: (r: RunResult) => void; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [key] = useState(requestKey);
  const [src, setSrc] = useState<SourceValue>(() => defaultSource(sources, true));
  const total = lines.reduce((a, l) => a + l.payNow, 0);
  const net = lines.reduce((a, l) => a + l.net, 0);
  const paying = src.source !== 'NONE' ? total : 0;
  const ready = sourceReady(sources, src, paying);

  const m = useMutation({
    mutationFn: () => payrollApi.process({
      month, shopId, source: src.source, accountId: src.accountId, allowNegative: src.allowNegative || undefined, requestId: key,
      rows: lines.map((l) => ({ staffId: l.staffId, ...(l.edit ?? {}) })),
    }),
    onSuccess: (r) => {
      if (r.duplicate) toast.info('Ye payment pehle hi ho chuki thi');
      else if (!r.created.length) toast.info(r.skipped.map((s) => `${s.name}: ${s.reason}`).join(' · ') || 'Kuch nahi bana');
      else {
        toast.success(`${r.created.length} tankhwah ban gayi${r.paid ? ` · ${formatPKR(r.paid)} ada (${r.source})` : ' · abhi ada nahi'}`);
        r.skipped.forEach((s) => toast.warning(`${s.name}: ${s.reason}`));
      }
      refreshAll(qc);
      onDone(r);
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Tankhwah nahi bani')),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={`${monthLabel} ki tankhwah — ${lines.length} staff`}
      description={`Banti kul ${formatPKR(net)}${total !== net ? ` · abhi dena ${formatPKR(total)}` : ''}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!ready || !lines.length} leftIcon={<HandCoins className="h-4 w-4" />}>
          {src.source === 'NONE' ? 'Tankhwah banayein' : `${formatPKR(total)} ada karein`}
        </Button>
      </>}>
      <div className="space-y-4">
        <ul className="max-h-64 divide-y divide-slate-100 overflow-auto rounded-2xl ring-1 ring-slate-200">
          {lines.map((l) => (
            <li key={l.staffId} className="flex items-center gap-3 px-3 py-2">
              <Avatar name={l.name} url={l.avatarUrl} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{l.name}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{l.designation}</span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold tabular-nums text-slate-900">{formatPKR(src.source === 'NONE' ? l.net : l.payNow)}</span>
                {src.source !== 'NONE' && l.payNow < l.net && <span className="block text-[0.6875rem] text-amber-700">baqi {formatPKR(l.net - l.payNow)}</span>}
              </span>
            </li>
          ))}
        </ul>
        <SourcePicker sources={sources} value={src} onChange={setSrc} total={paying} allowLater />
        <p className="text-[0.75rem] text-slate-500">Ek bande ki ek mahine ki tankhwah ek hi dafa banti hai. Ghalti ho to record khol kar "Cancel" karein — diya hua paisa wapas hisaab me aa jata hai.</p>
      </div>
    </Modal>
  );
}

/** Pays all or part of what is left on one salary. */
export type BalanceTarget = Pick<SalaryRecord, 'id' | 'paymentNumber' | 'monthLabel' | 'balanceAmount'> & { staff: { fullName: string } };

export function PayBalanceModal({ record, sources, shopId, onClose }: { record: BalanceTarget; sources: Sources; shopId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [key] = useState(requestKey);
  const [amount, setAmount] = useState(String(Math.round(record.balanceAmount)));
  const [src, setSrc] = useState<SourceValue>(() => defaultSource(sources, false));
  const value = Number(amount);
  const valid = amount.trim() !== '' && value > 0 && value <= record.balanceAmount + 0.5;
  const ready = valid && src.source !== 'NONE' && sourceReady(sources, src, value);

  const m = useMutation({
    mutationFn: () => payrollApi.payBalance(record.id, {
      amount: value, source: src.source, accountId: src.accountId, allowNegative: src.allowNegative || undefined, requestId: key, shopId,
    }),
    onSuccess: (r) => {
      toast.success(r.duplicate ? 'Ye payment pehle hi ho chuki thi' : `${formatPKR(value)} ada — ${record.staff.fullName}`);
      refreshAll(qc);
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Payment nahi hui')),
  });

  return (
    <Modal open onClose={onClose} size="md" title={`Baqi tankhwah — ${record.staff.fullName}`}
      description={`${record.paymentNumber} · ${record.monthLabel} · baqi ${formatPKR(record.balanceAmount)}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!ready} leftIcon={<Banknote className="h-4 w-4" />}>Ada karein</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (ready && !m.isPending) m.mutate(); }}>
        <Input data-autofocus label="Amount" type="number" inputMode="numeric" min={1} size="lg" value={amount} onChange={(e) => setAmount(e.target.value)}
          error={amount && !valid ? `1 se ${formatPKR(record.balanceAmount)} tak likhein` : undefined}
          hint="Poori baqi ya us ka kuch hissa — jo reh jaye baad me de sakte hain" />
        <SourcePicker sources={sources} value={src} onChange={setSrc} total={valid ? value : 0} />
        <button type="submit" hidden aria-hidden />
      </form>
    </Modal>
  );
}

/** Cancels a salary or a whole advance and puts any paid money back. */
export type CancelTarget = Pick<SalaryRecord, 'id' | 'paymentNumber' | 'kind' | 'paidAmount'> & { staffName: string };

export function CancelModal({ record, shopId, onClose }: { record: CancelTarget; shopId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [key] = useState(requestKey);
  const [reason, setReason] = useState('');
  const advance = record.kind === 'advance';
  const m = useMutation({
    mutationFn: () => payrollApi.cancel(record.id, { reason: reason.trim(), requestId: key, shopId }),
    onSuccess: (r) => { toast.success(`${r.number} cancel ho gaya`); refreshAll(qc); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="md" title={`${advance ? 'Advance' : 'Tankhwah'} cancel karein`} description={`${record.paymentNumber} · ${record.staffName}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button variant="danger" onClick={() => m.mutate()} loading={m.isPending} disabled={!reason.trim()} leftIcon={<CircleSlash className="h-4 w-4" />}>Cancel karein</Button>
      </>}>
      <div className="space-y-3">
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          {record.paidAmount > 0
            ? `Diya hua paisa wapas usi jagah likha jayega jahan se gaya tha (galle se gaya to is branch ke khule galle me). Paisa staff se wapas le lein.`
            : 'Abhi kuch ada nahi hua — sirf record cancel hoga.'}
          {advance ? ' Advance ki saari qisten cancel hongi.' : ' Is mahine ki tankhwah dobara bana sakte hain.'}
        </p>
        <Textarea data-autofocus label="Wajah" required rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Masalan: ghalat amount likhi thi" hint="Record aur activity log me rehti hai" />
      </div>
    </Modal>
  );
}
