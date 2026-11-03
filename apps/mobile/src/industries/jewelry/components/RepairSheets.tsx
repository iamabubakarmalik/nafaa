/** Repair sheets (web RepairsPage modals): book in or change a repair, and take an advance. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, DatePicker, Input, MoneyInput, Select, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { MethodChips, dateToKey, errorText, keyToDate } from '@/industries/_shared/deskKit';
import { NumberInput } from '@/modules/inventory/components/fields';
import { repairsApi, karigarsApi, type Repair } from '../api';
import { KEYS, refreshJewelry } from '../meta';

const KARATS = [24, 22, 21, 18, 14];

export function RepairFormSheet({ repair, open, onClose }: { repair: Repair | null; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const karigars = useQuery({ queryKey: [KEYS.karigars, 'list', { isActive: 'true' }], queryFn: () => karigarsApi.list({ isActive: 'true' }), staleTime: 60_000, enabled: open });
  const editing = !!repair;
  const blank = { customerName: '', customerPhone: '', itemDescription: '', weightGrams: null as number | null, karat: '', promisedDate: null as Date | null, charge: null as number | null, karigarId: '', advance: null as number | null, paymentMethod: 'CASH', notes: '' };
  const [f, setF] = useState(blank);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setF(repair ? {
      customerName: repair.customerName ?? '', customerPhone: repair.customerPhone ?? '', itemDescription: repair.itemDescription, weightGrams: repair.weightGrams ?? null,
      karat: repair.karat ? String(repair.karat) : '', promisedDate: repair.promisedDate ? keyToDate(repair.promisedDate) : null, charge: repair.charge || null, karigarId: repair.karigarId ?? '',
      advance: null, paymentMethod: 'CASH', notes: repair.notes ?? '',
    } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, repair]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({
    mutationFn: () => {
      const common = {
        itemDescription: f.itemDescription.trim(), weightGrams: f.weightGrams, karat: f.karat ? Number(f.karat) : null, promisedDate: f.promisedDate ? dateToKey(f.promisedDate) : null,
        charge: f.charge ?? 0, karigarId: f.karigarId || null, notes: f.notes.trim() || undefined,
      };
      return editing ? repairsApi.update(repair!.id, common)
        : repairsApi.create({ ...common, customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), advance: f.advance ?? 0, paymentMethod: f.paymentMethod });
    },
    onSuccess: (r) => { toast.success(editing ? t('Repair save ho gayi') : t('Repair {{no}} darj', { no: r.repairNumber })); refreshJewelry([KEYS.repairs, KEYS.karigars], true); onClose(); },
    onError: (e) => setError(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => {
    if (!editing && !f.customerName.trim()) return setError(t('Customer ka naam likhein'));
    if (!editing && !/^[\d+\-\s]{7,20}$/.test(f.customerPhone.trim())) return setError(t('Customer ka sahi phone likhein'));
    if (!f.itemDescription.trim()) return setError(t('Zewar aur kaam likhein'));
    if ((f.charge ?? 0) > 0 && (f.advance ?? 0) > (f.charge ?? 0)) return setError(t('Advance charges se zyada nahi ho sakta'));
    setError('');
    save.mutate();
  };
  return (
    <Sheet open={open} onClose={onClose} title={editing ? repair!.repairNumber : t('Repair lein')} height={0.94}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {!editing && <Input label={t('Customer')} value={f.customerName} onChangeText={(v) => set({ customerName: v })} maxLength={80} />}
        {!editing && <Input label={t('Phone')} value={f.customerPhone} onChangeText={(v) => set({ customerPhone: v })} keyboardType="phone-pad" ltr placeholder="03xx xxxxxxx" />}
        <TextArea label={t('Zewar aur kaam')} value={f.itemDescription} onChangeText={(v) => set({ itemDescription: v })} maxLength={300} placeholder={t('Jaise: toota bunda jodna, choori ka size chhota')} />
        <NumberInput label={t('Wazan (g)')} value={f.weightGrams} onChangeValue={(v) => set({ weightGrams: v })} hint={t('Lete waqt tol kar likhein')} />
        <Select label={t('Karat')} value={f.karat} onChange={(v) => set({ karat: v })} options={[{ value: '', label: t('Pata nahi') }, ...KARATS.map((k) => ({ value: String(k), label: `${k}K` }))]} />
        <DatePicker label={t('Wapas dene ki date')} value={f.promisedDate} onChange={(d) => set({ promisedDate: d })} minimumDate={new Date()} />
        <MoneyInput label={t('Repair charges (Rs)')} value={f.charge} onChangeValue={(v) => set({ charge: v })} hint={t('Wapas dete waqt bill')} />
        <Select label={t('Karigar')} value={f.karigarId} onChange={(v) => set({ karigarId: v })} options={[{ value: '', label: t('Baad me') }, ...(karigars.data ?? []).map((k) => ({ value: k.id, label: k.fullName }))]} />
        {!editing && <MoneyInput label={t('Advance (Rs)')} value={f.advance} onChangeValue={(v) => set({ advance: v })} hint={t('Customer ke khate me jama')} />}
        {!editing && (f.advance ?? 0) > 0 && <><Text size="sm" weight="semibold" tone="secondary">{t('Advance kaise mila')}</Text><MethodChips value={f.paymentMethod} onChange={(m) => set({ paymentMethod: m })} /></>}
        <TextArea label={t('Note')} value={f.notes} onChangeText={(v) => set({ notes: v })} maxLength={300} />
        {!!error && <Card tone="danger"><Text size="sm">{error}</Text></Card>}
      </View>
    </Sheet>
  );
}

/** Advance on a repair; with a charge set it cannot pass what is still due. */
export function AdvanceSheet({ r, onClose }: { r: Repair | null; onClose: () => void }) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  useEffect(() => { if (r) { setAmount(r.due > 0 ? r.due : null); setMethod('CASH'); } }, [r?.id]);
  const max = r && r.charge > 0 ? r.due : undefined;
  const bad = !((amount ?? 0) > 0) || (max !== undefined && (amount ?? 0) > max + 0.005);
  const save = useMutation({
    mutationFn: () => repairsApi.payment(r!.id, amount ?? 0, method),
    onSuccess: () => { toast.success(t('Advance khate me jama')); refreshJewelry([KEYS.repairs], true); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Advance save nahi hua'))),
  });
  return (
    <Sheet open={!!r} onClose={onClose} title={t('Advance jama karein')} description={r ? `${r.customerName ?? ''} · ${r.repairNumber}${max !== undefined ? ` · ${t('baqi {{due}}', { due: formatMoney(max) })}` : ''}` : undefined}
      footer={<Button fullWidth size="lg" variant="success" loading={save.isPending} disabled={bad} onPress={() => save.mutate()}>{t('Advance jama karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Kitne mile')} value={amount} onChangeValue={setAmount} size="xl" />
        <Text size="sm" weight="semibold" tone="secondary">{t('Payment kaise mili')}</Text>
        <MethodChips value={method} onChange={setMethod} />
      </View>
    </Sheet>
  );
}
