/** Sheets on a live animal: health record, reserve, and "went back / died". */

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, ChipGroup, DatePicker, Input, MoneyInput, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { MethodChips, dateToKey, errorText, keyToDate, todayKey } from '../../_shared/deskKit';
import { liveAnimalsApi, type AnimalStatus, type LiveAnimal } from '../api';
import { PET_KEYS, RECORD_TYPES, refreshPet } from '../meta';

export function RecordSheet({ animal, open, onClose }: { animal: LiveAnimal; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const canExpense = usePermission()(P.EXPENSES_CREATE);
  const [type, setType] = useState('VACCINATION');
  const [description, setDescription] = useState('');
  const [vet, setVet] = useState('');
  const [fee, setFee] = useState<number | null>(null);
  const [next, setNext] = useState('');
  const [paidNow, setPaidNow] = useState(false);
  const [method, setMethod] = useState('CASH');
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (open) { setType('VACCINATION'); setDescription(''); setVet(''); setFee(null); setNext(''); setPaidNow(false); setMethod('CASH'); setTouched(false); } }, [open]);
  const error = !description.trim() ? t('Kya kiya — likhein') : next && next < todayKey() ? t('Agli date aage ki ho') : '';
  const save = useMutation({
    mutationFn: () => liveAnimalsApi.addMedicalRecord(animal.id, {
      type, description: description.trim(), vetName: vet.trim() || undefined, cost: fee ?? undefined, nextDueDate: next || undefined,
      ...(paidNow && fee && fee > 0 && { paidNow: true, paymentMethod: method }),
    }),
    onSuccess: () => { toast.success(paidNow && fee ? t('Record likha — fees kharche me gayi') : t('Record likh diya')); refreshPet([PET_KEYS.animal, PET_KEYS.animals], paidNow); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Record save nahi hua'))),
  });
  const submit = () => { setTouched(true); if (error) { toast.error(error); return; } save.mutate(); };
  return (
    <Sheet open={open} onClose={onClose} title={t('Sehat record')} description={`${animal.name || animal.breed || ''} ${animal.animalNumber}`.trim()}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup wrap options={RECORD_TYPES.map((r) => ({ value: r.value, label: t(r.label) }))} value={type} onChange={setType} />
        <Input label={t('Tafseel')} value={description} onChangeText={setDescription} placeholder={t('DHPP pehli dose, Ivermectin…')} error={touched && !description.trim() ? error : undefined} />
        <Input label={t('Doctor (marzi)')} value={vet} onChangeText={setVet} />
        <MoneyInput label={t('Fees (Rs, marzi)')} value={fee} onChangeValue={setFee} />
        <DatePicker label={t('Agli dose kab (marzi)')} value={keyToDate(next)} minimumDate={new Date()} onChange={(d) => setNext(dateToKey(d))} hint={t('Yaad dilane ke liye')} />
        {!!fee && fee > 0 && canExpense && (
          <>
            <Switch value={paidNow} onChange={setPaidNow} label={t('Fees abhi di (kharche me likhein)')} />
            {paidNow && <MethodChips value={method} onChange={setMethod} />}
          </>
        )}
      </View>
    </Sheet>
  );
}

export function ReserveSheet({ animal, open, onClose }: { animal: LiveAnimal; open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  useEffect(() => { if (open) setName(''); }, [open]);
  const reserve = useMutation({
    mutationFn: () => liveAnimalsApi.reserve(animal.id, name.trim() || undefined),
    onSuccess: () => { toast.success(t('Rok liya — counter par "Rok liya" dikhega')); refreshPet([PET_KEYS.animal, PET_KEYS.animals, PET_KEYS.posAnimals]); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('Kisi ke liye rok lein')} description={t('Counter par card par \'Rok liya\' aata hai')}
      footer={<Button fullWidth size="lg" loading={reserve.isPending} onPress={() => reserve.mutate()}>{t('Rok lein')}</Button>}>
      <Input label={t('Kis ke liye (marzi)')} value={name} onChangeText={setName} placeholder={t('Customer ka naam aur phone')} hint={t('Advance lena ho to customer ke Khata me jama karein')} />
    </Sheet>
  );
}

export function CloseSheet({ animal, kind, onClose }: { animal: LiveAnimal; kind: Extract<AnimalStatus, 'DECEASED' | 'RETURNED'> | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const { costHidden } = useCostMask();
  const dead = kind === 'DECEASED';
  useEffect(() => { if (kind) setReason(''); }, [kind]);
  const close = useMutation({
    mutationFn: () => liveAnimalsApi.updateStatus(animal.id, { status: kind!, reason: reason.trim() || undefined }),
    onSuccess: () => { toast.success(dead ? t('Likh diya — cost loss me gayi') : t('Record band — counter se hat gaya')); refreshPet([PET_KEYS.animal, PET_KEYS.animals, PET_KEYS.posAnimals], true); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  return (
    <Sheet open={!!kind} onClose={onClose} title={dead ? t('Janwar mar gaya?') : t('Janwar wapas gaya?')}
      footer={<Button fullWidth size="lg" variant="danger" loading={close.isPending} onPress={() => close.mutate()}>{dead ? t('Haan, likhein') : t('Haan, wapas')}</Button>}>
      <View style={{ gap: 12 }}>
        <Text size="sm" tone="secondary">
          {dead
            ? (animal.costPrice != null && !costHidden ? t('Counter se hat jayega aur {{cost}} cost loss me jayegi.', { cost: formatMoney(animal.costPrice) }) : t('Counter se hat jayega aur cost loss me jayegi.'))
            : t('Counter se hat jayega (breeder ko wapas ya kisi aur wajah se).')}
        </Text>
        <TextArea label={t('Wajah (marzi)')} value={reason} onChangeText={setReason} />
      </View>
    </Sheet>
  );
}
