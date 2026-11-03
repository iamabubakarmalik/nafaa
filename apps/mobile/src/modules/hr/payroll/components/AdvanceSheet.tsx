/** Gives an advance / loan: who, how much, how many months it is cut over, and where the money comes from. */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, ChipGroup, Input, MoneyInput, Select, Sheet, Text, toast } from '@/design';
import { payrollApi, type PayrollStaff, type Sources } from '../api/payroll';
import { TOUCHED_KEYS, monthName, requestKey, shiftMonth } from '../lib/meta';
import { SourcePicker, defaultSource, sourceReady, type SourceValue } from './SourcePicker';

const REASONS = [t('Ghar ka expense'), t('Beemari / ilaaj'), t('Shaadi'), t('School fees'), t('Qarz')];

export function AdvanceSheet({ open, staff, thisMonth, savedThisMonth, sources, shopId, staffId, onClose }: {
  open: boolean; staff: PayrollStaff[]; thisMonth: string; savedThisMonth: Set<string>; sources: Sources; shopId?: string; staffId?: string; onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} height={0.92} title={t('Advance / qarz dein')} description={t('Paisa abhi jata hai, tankhwah se khud kat jata hai')}>
      {open && <Body key={staffId ?? 'new'} staff={staff} thisMonth={thisMonth} savedThisMonth={savedThisMonth} sources={sources} shopId={shopId} staffId={staffId} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ staff, thisMonth, savedThisMonth, sources, shopId, staffId: initial, onClose }: {
  staff: PayrollStaff[]; thisMonth: string; savedThisMonth: Set<string>; sources: Sources; shopId?: string; staffId?: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [key] = useState(requestKey);
  const [staffId, setStaffId] = useState(initial ?? '');
  const [amount, setAmount] = useState<number | null>(null);
  const [parts, setParts] = useState('1');
  const [reason, setReason] = useState('');
  const [src, setSrc] = useState<SourceValue>(() => defaultSource(sources, false));
  const firstFree = staffId && savedThisMonth.has(staffId) ? shiftMonth(thisMonth, 1) : thisMonth;
  const [first, setFirst] = useState('');
  const firstMonth = first || firstFree;
  const months = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftMonth(thisMonth, i)), [thisMonth]);
  const person = staff.find((s) => s.id === staffId);
  const n = Number(parts);
  const value = amount ?? 0;
  const validAmount = value >= n && value <= 100_000_000;
  const each = validAmount ? Math.floor(value / n) : 0;
  const ready = !!person && validAmount && reason.trim().length > 0 && src.source !== 'NONE' && sourceReady(sources, src, value);
  const bigShare = person && person.salaryType !== 'COMMISSION' && person.baseSalary > 0 && each > person.baseSalary;

  const m = useMutation({
    mutationFn: () => payrollApi.giveAdvance({
      staffId, amount: value, installments: n, firstMonth, reason: reason.trim(), shopId,
      source: src.source, accountId: src.accountId, allowNegative: src.allowNegative || undefined, requestId: key,
    }),
    onSuccess: (r) => {
      toast.success(r.duplicate ? t('Ye advance pehle hi diya ja chuka tha') : t('{{number}} · {{fullName}} ko {{amount}} advance', { number: r.number ?? '', fullName: person?.fullName ?? '', amount: formatPKR(value) }));
      TOUCHED_KEYS.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Advance nahi diya'))),
  });

  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <Select label={t('Kis ko')} value={staffId || null} onChange={(v) => { setStaffId(v); setFirst(''); }} placeholder={t('Staff chunein')}
        options={staff.map((s) => ({ value: s.id, label: s.fullName, description: s.designation }))}
        hint={person ? t('Tankhwah {{baseSalary}}', { baseSalary: formatPKR(person.baseSalary) }) : t('Sirf is branch ka staff')} />
      <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount} placeholder="10000" error={amount != null && !validAmount ? t('Sahi amount likhein') : undefined} hint={t('Jitna abhi de rahe hain')} />
      <View style={{ gap: 8 }}>
        <Text size="sm" weight="medium">{t('Kitne mahine me katega')}</Text>
        <ChipGroup wrap value={parts} onChange={setParts} options={['1', '2', '3', '4', '6', '12'].map((k) => ({ value: k, label: k === '1' ? t('Ek dafa') : t('{{k}} qist', { k }) }))} />
        <Text size="xs" tone="muted">
          {validAmount ? (n > 1 ? t('Har mahine {{each}} katega (aakhri qist me baqi paise)', { each: formatPKR(each) }) : t('Poora {{amount}} ek tankhwah se katega', { amount: formatPKR(value) })) : t('Bari amount ko kai mahino me baant sakte hain')}
        </Text>
        {bigShare && <Text size="xs" tone="warning">{t('Qist poori tankhwah se zyada hai — tankhwah banate waqt masla aayega. Zyada qisten chunein.')}</Text>}
      </View>
      <Select label={t('Pehli katauti kis mahine')} value={firstMonth} onChange={setFirst}
        options={months.map((k) => ({ value: k, label: `${monthName(k, t)}${savedThisMonth.has(staffId) && k === thisMonth ? ` (${t('tankhwah ban chuki')})` : ''}` }))}
        hint={t('Jis mahine ki tankhwah ban chuki ho us me nahi kat sakta')} />
      <View style={{ gap: 8 }}>
        <Input label={t('Wajah')} value={reason} onChangeText={setReason} maxLength={120} placeholder={t('Kis liye?')} hint={t('Payslip aur record par dikhegi')} />
        <ChipGroup wrap value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: r }))} />
      </View>
      <SourcePicker sources={sources} value={src} onChange={setSrc} total={validAmount ? value : 0} />
      <Button fullWidth size="lg" loading={m.isPending} disabled={!ready} onPress={() => m.mutate()}>{validAmount && amount ? t('{{amount}} dein', { amount: formatPKR(value) }) : t('Advance dein')}</Button>
    </View>
  );
}
