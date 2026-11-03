/** Milk supplier (gawala) form and payment sheets (web FarmerFormModal and FarmerPayModal). */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, ChipGroup, Input, MoneyInput, Select, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { errorText } from '../../_shared/deskKit';
import { farmersApi, type DairyFarmer, type FarmerInput } from '../api';
import { CYCLE, DAIRY_KEYS, PAY_METHODS, cnicOk, opt, phoneOk, refreshDairy } from '../meta';

export function FarmerFormSheet({ farmer, open, onClose }: { farmer: DairyFarmer | null; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const blank = { name: '', fatherName: '', phone: '', cnic: '', village: '', address: '', ratePerLiter: null as number | null, fatBonusRate: null as number | null, paymentCycle: 'WEEKLY', buffaloCount: null as number | null, cowCount: null as number | null, notes: '', isActive: true };
  const [f, setF] = useState(blank);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setF(farmer ? { name: farmer.name, fatherName: farmer.fatherName ?? '', phone: farmer.phone ?? '', cnic: farmer.cnic ?? '', village: farmer.village ?? '', address: farmer.address ?? '', ratePerLiter: farmer.ratePerLiter || null, fatBonusRate: farmer.fatBonusRate || null, paymentCycle: farmer.paymentCycle, buffaloCount: farmer.buffaloCount ?? null, cowCount: farmer.cowCount ?? null, notes: farmer.notes ?? '', isActive: farmer.isActive } : blank);
  }, [open, farmer]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const error = !f.name.trim() ? t('Naam likhein') : !phoneOk(f.phone) ? t('Phone 10 se 15 hindse') : !cnicOk(f.cnic) ? t('CNIC 13 hindsay ka hota hai') : !((f.ratePerLiter ?? 0) > 0) ? t('Rate likhein') : '';
  const save = async () => {
    setTouched(true);
    if (error) { toast.error(error); return; }
    const body: Partial<FarmerInput> = {
      name: f.name.trim(), fatherName: opt(f.fatherName), phone: opt(f.phone), cnic: opt(f.cnic), village: opt(f.village), address: opt(f.address), ratePerLiter: f.ratePerLiter ?? 0, fatBonusRate: f.fatBonusRate ?? 0,
      paymentCycle: f.paymentCycle as FarmerInput['paymentCycle'], buffaloCount: f.buffaloCount ?? undefined, cowCount: f.cowCount ?? undefined, notes: opt(f.notes), ...(farmer ? { isActive: f.isActive } : {}),
    };
    setBusy(true);
    try { await farmersApi.save(farmer?.id, body); refreshDairy([DAIRY_KEYS.farmers, DAIRY_KEYS.farmer]); toast.success(farmer ? t('Save ho gaya') : t('Gawala jur gaya')); onClose(); }
    catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.94} title={farmer ? t('{{name}} badlein', { name: farmer.name }) : t('Naya gawala')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam *')} value={f.name} onChangeText={(v) => set('name', v)} error={touched && !f.name.trim() ? error : undefined} />
        <Input label={t('Walid ka naam')} value={f.fatherName} onChangeText={(v) => set('fatherName', v)} />
        <Input label={t('Phone')} keyboardType="phone-pad" ltr value={f.phone} onChangeText={(v) => set('phone', v)} error={touched && f.name.trim() && !phoneOk(f.phone) ? error : undefined} />
        <Input label={t('CNIC')} ltr value={f.cnic} onChangeText={(v) => set('cnic', v)} placeholder="35202-1234567-1" error={touched && f.name.trim() && !cnicOk(f.cnic) ? error : undefined} />
        <Input label={t('Gaon')} value={f.village} onChangeText={(v) => set('village', v)} />
        <Input label={t('Pata')} value={f.address} onChangeText={(v) => set('address', v)} />
        <MoneyInput label={t('Rate (ek liter) *')} value={f.ratePerLiter} onChangeValue={(v) => set('ratePerLiter', v)} error={touched && f.name.trim() && !((f.ratePerLiter ?? 0) > 0) ? error : undefined} />
        <MoneyInput label={t('Fat bonus (har point)')} value={f.fatBonusRate} onChangeValue={(v) => set('fatBonusRate', v)} hint={t('6% se upar har point par, ek liter')} />
        <Select label={t('Payment kab')} value={f.paymentCycle} onChange={(v) => set('paymentCycle', v)} options={Object.entries(CYCLE).map(([value, label]) => ({ value, label: t(label) }))} />
        <NumberInput label={t('Bhainsen')} integer value={f.buffaloCount} onChangeValue={(v) => set('buffaloCount', v)} />
        <NumberInput label={t('Gayen')} integer value={f.cowCount} onChangeValue={(v) => set('cowCount', v)} />
        <TextArea label={t('Note')} value={f.notes} onChangeText={(v) => set('notes', v)} />
        {farmer && <Switch value={f.isActive} onChange={(v) => set('isActive', v)} label={t('Chalu hai')} description={t('Band gawale ki nayi entry nahi hoti; hisaab rehta hai')} />}
      </View>
    </Sheet>
  );
}

const DRAWER = '';
/** Pay a gawala: amount, method and the account the money leaves from (drawer cash by default). */
export function FarmerPaySheet({ farmer, open, onClose }: { farmer: DairyFarmer | null; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [accountId, setAccountId] = useState(DRAWER);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const accountsQ = useQuery({ queryKey: ['dairy-pay-accounts'], queryFn: () => farmersApi.payAccounts(), enabled: open, staleTime: 60_000 });
  const due = Math.max(farmer?.currentBalance ?? 0, 0);
  useEffect(() => { if (open) { setAmount(due || null); setMethod('CASH'); setAccountId(DRAWER); setReference(''); setNotes(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const accounts = (accountsQ.data ?? []).filter((a) => (method === 'CASH' ? a.kind === 'CASH' || a.method === 'CASH' : a.method === method || (a.kind !== 'CASH' && !a.method)));
  const error = amount != null && amount > due + 0.01 ? t('Baqi sirf {{due}} hai', { due: formatMoney(due) }) : undefined;
  const run = async () => {
    if (!farmer || !(amount && amount > 0) || error) return;
    setBusy(true);
    try {
      await farmersApi.payment(farmer.id, { amount, paymentMethod: method, accountId: accountId || undefined, reference: opt(reference), notes: opt(notes) });
      refreshDairy([DAIRY_KEYS.farmers, DAIRY_KEYS.farmer, DAIRY_KEYS.supplies], true);
      toast.success(t('Payment likh di'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} height={0.9} title={farmer ? t('{{fullName}} ko payment', { fullName: farmer.name }) : ''} description={farmer ? t('{{name}} · {{due}} baqi', { name: farmer.farmerNumber, due: formatMoney(due) }) : undefined}
      footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={!(amount && amount > 0) || !!error} onPress={() => void run()}>{t('Payment karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Amount (Rs)')} size="xl" value={amount} onChangeValue={setAmount} error={error} />
        <ChipGroup wrap value={String(amount ?? '')} onChange={(v) => setAmount(Number(v))} options={[due, Math.round(due / 2)].filter((v) => v > 0).map((v) => ({ value: String(v), label: formatMoney(v) }))} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Kaise')}</Text>
        <ChipGroup wrap value={method} onChange={(v) => { setMethod(v); setAccountId(DRAWER); }} options={PAY_METHODS.filter((m) => m.value !== 'CARD').map((m) => ({ value: m.value, label: t(m.label) }))} />
        <Select label={t('Kahan se')} value={accountId} onChange={setAccountId}
          options={[{ value: DRAWER, label: method === 'CASH' ? t('Galla (khula cash register)') : t('Default account') }, ...accounts.map((a) => ({ value: a.id, label: `${a.name}${a.shopName ? ` · ${a.shopName}` : ''}${a.isDefault ? ' (default)' : ''}` }))]} />
        <Text size="xs" tone="muted">{method === 'CASH' ? (accountId ? t('Cash is account se niklega — galla nahi badlega') : t('Cash khule galle se niklega — galla band ho to pehle kholein')) : accountId ? t('Paisa is account se niklega') : t('Is tareeqe ka default account ho to us se niklega; warna sirf record banega')}</Text>
        <Input label={t('Reference (marzi)')} value={reference} onChangeText={setReference} placeholder={t('Transaction ID, cheque number')} maxLength={80} />
        <TextArea label={t('Note (marzi)')} value={notes} onChangeText={setNotes} maxLength={200} />
      </View>
    </Sheet>
  );
}
