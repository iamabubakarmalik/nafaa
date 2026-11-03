/** Add or change a child, and note a gift bought for the child (web BirthdayForm and GiftModal). Need the server. */

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { birthdayProblem, type BirthdayProblem } from '@nafaa/core/industries/toystore';
import { businessDayKey } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { Button, DatePicker, Input, MoneyInput, Select, Sheet, Text, toast, useTheme } from '@/design';
import { toyBirthdaysApi, type ToyBirthdayReminder } from '../api';
import { KEYS, refreshToy, todayKey } from '../meta';

const PROBLEM: Record<BirthdayProblem, string> = {
  child: msg('Bachay ka naam likhein'), date: msg('Paidaish ki tareekh chunein'), future: msg('Paidaish ki tareekh aage ki nahi ho sakti'),
  parent: msg('Walid / walida ka naam likhein'), phone: msg('Phone number poora likhein'), days: msg('Yaad dihani 0 se 60 din pehle'),
};

const asDate = (key: string) => new Date(`${key}T12:00:00+05:00`);
const keyOf = (d: Date) => businessDayKey(d);

interface Draft { childName: string; birth: string; gender: string; parentName: string; phone: string; relation: string; budget: string; days: string; notes: string }
const blank: Draft = { childName: '', birth: '', gender: '', parentName: '', phone: '', relation: '', budget: '', days: '7', notes: '' };

export function BirthdaySheet({ open, value, onClose, onSaved }: { open: boolean; value: ToyBirthdayReminder | null; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [d, setD] = useState<Draft>(blank);
  useEffect(() => {
    if (!open) return;
    setD(value ? {
      childName: value.childName, birth: value.childBirthDate.slice(0, 10), gender: value.childGender ?? '', parentName: value.customerName, phone: value.customerPhone,
      relation: value.parentRelation ?? '', budget: value.budgetRange ?? '', days: String(value.reminderDaysBefore ?? 7), notes: value.notes ?? '',
    } : blank);
  }, [open, value]);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const problem = birthdayProblem({ childName: d.childName, birthDate: d.birth, parentName: d.parentName, phone: d.phone, reminderDays: Number(d.days) }, todayKey());
  const save = useMutation({
    mutationFn: () => {
      const body = {
        childName: d.childName.trim(), childBirthDate: d.birth, childGender: d.gender || undefined, customerName: d.parentName.trim(), customerPhone: d.phone.trim(),
        parentRelation: d.relation.trim() || undefined, budgetRange: d.budget.trim() || undefined, reminderDaysBefore: Math.round(Number(d.days) || 7), notes: d.notes.trim() || undefined,
      };
      return value ? toyBirthdaysApi.update(value.id, body) : toyBirthdaysApi.create(body);
    },
    onSuccess: () => { toast.success(value ? t('Save ho gaya') : t('Bacha jur gaya')); refreshToy([KEYS.birthdays, KEYS.overview]); onSaved(); },
  });
  const submit = () => {
    if (problem) { toast.error(t(PROBLEM[problem])); return; }
    if (!online) { toast.warning(onlineNeededText('toystoreDesk')); return; }
    if (!save.isPending) save.mutate();
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.92} title={value ? t('{{childName}} — badlein', { childName: value.childName }) : t('Naya bacha')} description={t('Saalgirah se pehle walidain ko message jata hai')}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{value ? t('Save karein') : t('Jorein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Bachay ka naam')} value={d.childName} onChangeText={(childName) => set({ childName })} placeholder={t('Ayaan')} />
        <DatePicker label={t('Paidaish ki tareekh')} value={d.birth ? asDate(d.birth) : null} maximumDate={new Date()} hint={t('Isi se umar aur saalgirah ka din')} onChange={(x) => set({ birth: keyOf(x) })} />
        <Select label={t('Bacha / bachi')} value={d.gender} onChange={(gender) => set({ gender })} hint={t('Gift ke mashwaray ke liye')} options={[{ value: '', label: '—' }, { value: 'BOYS', label: t('Larka') }, { value: 'GIRLS', label: t('Larki') }]} />
        <Input label={t('Budget')} value={d.budget} onChangeText={(budget) => set({ budget })} placeholder="1000-3000" ltr hint={t('Is se mehnge khilone mashwaray me nahi aate')} />
        <Input label={t('Walid / walida ka naam')} value={d.parentName} onChangeText={(parentName) => set({ parentName })} placeholder={t('Imran Khan')} />
        <Input label={t('WhatsApp number')} value={d.phone} onChangeText={(phone) => set({ phone })} placeholder="03001234567" keyboardType="phone-pad" />
        <Input label={t('Rishta')} value={d.relation} onChangeText={(relation) => set({ relation })} placeholder={t('Walid, mamu, phuppo')} hint={t('Marzi hai')} />
        <Input label={t('Kitne din pehle yaad dilayein')} value={d.days} onChangeText={(days) => set({ days: days.replace(/\D/g, '') })} keyboardType="number-pad" hint={t('Aam tor par 7 din')} />
        <Input label={t('Note')} value={d.notes} onChangeText={(notes) => set({ notes })} placeholder={t('Cars pasand hain')} hint={t('Marzi hai')} />
        {problem && (d.childName || d.parentName) ? <Text size="xs" tone="warning">{t(PROBLEM[problem])}</Text> : null}
      </View>
    </Sheet>
  );
}

/** Notes a gift bought for the child (for next year's ideas); the money is on the POS bill. */
export function GiftSheet({ open, id, onClose, onSaved }: { open: boolean; id: string; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [what, setWhat] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  useEffect(() => { if (open) { setWhat(''); setAmount(null); } }, [open]);
  const save = useMutation({
    mutationFn: () => toyBirthdaysApi.recordPurchase(id, { giftDescription: what.trim(), amount: amount ?? 0 }),
    onSuccess: () => { toast.success(t('Gift likh liya')); refreshToy([KEYS.birthdays]); onSaved(); },
  });
  const submit = () => {
    if (!what.trim()) { toast.error(t('Kya gift liya, likhein')); return; }
    if (!online) { toast.warning(onlineNeededText('toystoreDesk')); return; }
    save.mutate();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Gift likhein')} footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Kya liya')} value={what} onChangeText={setWhat} placeholder={t('Remote car')} />
        <MoneyInput label={t('Kitne ka (Rs)')} value={amount} onChangeValue={setAmount} hint={t('Bill ka amount — sirf hisaab ke liye')} />
      </View>
    </Sheet>
  );
}
