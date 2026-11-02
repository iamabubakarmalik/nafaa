/**
 * Gives a salary advance or a loan. The money leaves the drawer or an account
 * now; the amount is cut from the chosen month's salary, or spread over
 * several months as equal instalments.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HandCoins } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { payrollApi, type PayrollStaff, type Sources } from '../api/payroll.api';
import { TOUCHED_KEYS, apiError, monthName, requestKey, shiftMonth } from './meta';
import { SourcePicker, defaultSource, sourceReady, type SourceValue } from './SourcePicker';
import { t } from '@core/i18n';

const REASONS = [t('Ghar ka expense'), t('Beemari / ilaaj'), t('Shaadi'), t('School fees'), t('Qarz')];

export function AdvanceModal({ staff, thisMonth, savedThisMonth, sources, shopId, staffId: initial, onClose }: {
  staff: PayrollStaff[]; thisMonth: string; savedThisMonth: Set<string>; sources: Sources; shopId?: string; staffId?: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [key] = useState(requestKey);
  const [staffId, setStaffId] = useState(initial ?? '');
  const [amount, setAmount] = useState('');
  const [parts, setParts] = useState(1);
  const [reason, setReason] = useState('');
  const [src, setSrc] = useState<SourceValue>(() => defaultSource(sources, false));
  const firstFree = staffId && savedThisMonth.has(staffId) ? shiftMonth(thisMonth, 1) : thisMonth;
  const [first, setFirst] = useState<string>('');
  const firstMonth = first || firstFree;

  const months = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftMonth(thisMonth, i)), [thisMonth]);
  const person = staff.find((s) => s.id === staffId);
  const value = Number(amount);
  const validAmount = amount.trim() !== '' && value >= parts && value <= 100_000_000;
  const each = validAmount ? Math.floor(value / parts) : 0;
  const ready = !!person && validAmount && reason.trim().length > 0 && src.source !== 'NONE' && sourceReady(sources, src, value);
  const bigShare = person && person.salaryType !== 'COMMISSION' && person.baseSalary > 0 && each > person.baseSalary;

  const m = useMutation({
    mutationFn: () => payrollApi.giveAdvance({
      staffId, amount: value, installments: parts, firstMonth, reason: reason.trim(), shopId,
      source: src.source, accountId: src.accountId, allowNegative: src.allowNegative || undefined, requestId: key,
    }),
    onSuccess: (r) => {
      toast.success(r.duplicate ? t('Ye advance pehle hi diya ja chuka tha') : t('{{number}} · {{fullName}} ko {{formatPKR}} advance', { number: r.number, fullName: person?.fullName, formatPKR: formatPKR(value) }));
      TOUCHED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, t('Advance nahi diya'))),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={t('Advance / qarz dein')} description={t('Paisa abhi jata hai, tankhwah se khud kat jata hai')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={() => m.mutate()} loading={m.isPending} disabled={!ready} leftIcon={<HandCoins className="h-4 w-4" />}>
          {validAmount ? t('{{formatPKR}} dein', { formatPKR: formatPKR(value) }) : t('Advance dein')}
        </Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (ready && !m.isPending) m.mutate(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('Kis ko')} required value={staffId} onChange={(e) => { setStaffId(e.target.value); setFirst(''); }}
            placeholder={t('Staff chunein')} options={staff.map((s) => ({ value: s.id, label: `${s.fullName} · ${s.designation}` }))}
            hint={person ? t('Tankhwah {{baseSalary}}', { baseSalary: formatPKR(person.baseSalary) }) : t('Sirf is branch ka staff')} />
          <Input data-autofocus label={t('Amount')} type="number" inputMode="numeric" min={1} required value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="10000" error={amount && !validAmount ? t('Sahi amount likhein') : undefined} hint={t('Jitna abhi de rahe hain')} />
        </div>
        <div>
          <p className="text-[0.8125rem] font-medium text-slate-700">{t('Kitne mahine me katega')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 6, 12].map((k) => (
              <button key={k} type="button" onClick={() => setParts(k)} aria-pressed={parts === k}
                className={cn('rounded-full px-3 py-1 text-[0.8125rem] font-medium ring-1 transition', parts === k ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                {k === 1 ? t('Ek dafa') : t('{{k}} qist', { k })}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[0.75rem] text-slate-500">
            {validAmount ? (parts > 1 ? t('Har mahine {{each}} katega (aakhri qist me baqi paise)', { each: formatPKR(each) }) : t('Poora {{formatPKR}} ek tankhwah se katega', { formatPKR: formatPKR(value) })) : t('Bari amount ko qiston me baant dein taake tankhwah khatam na ho')}
          </p>
          {bigShare && <p className="mt-1 text-[0.75rem] text-amber-700">{t('Qist poori tankhwah se zyada hai — tankhwah banate waqt masla aayega. Zyada qisten chunein.')}</p>}
        </div>
        <Select label={t('Pehli katauti kis mahine')} value={firstMonth} onChange={(e) => setFirst(e.target.value)}
          options={months.map((k) => ({ value: k, label: `${monthName(k)}${savedThisMonth.has(staffId) && k === thisMonth ? ' (tankhwah ban chuki)' : ''}`, disabled: !!staffId && savedThisMonth.has(staffId) && k === thisMonth }))}
          hint={t('Jis mahine ki tankhwah ban chuki ho us me nahi kat sakta')} />
        <div>
          <Input label={t('Wajah')} required value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder={t('Kis liye?')} hint={t('Payslip aur record par dikhegi')} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)} aria-pressed={reason === r}
                className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 transition', reason === r ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{r}</button>
            ))}
          </div>
        </div>
        <SourcePicker sources={sources} value={src} onChange={setSrc} total={validAmount ? value : 0} />
        <button type="submit" hidden aria-hidden />
      </form>
    </Modal>
  );
}
