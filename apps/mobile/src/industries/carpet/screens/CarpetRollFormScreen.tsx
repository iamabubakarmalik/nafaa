/**
 * Add an opening roll or edit a roll's details (web RollFormModal). Size can be
 * changed only before the first cut (the server refuses it after); length
 * changes after that go through Adjust so every change is recorded.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, FormSection, FormTemplate, Input, MoneyInput, Select, Skeleton, Text, toast, useTheme } from '@/design';
import { variantsApi } from '@/modules/inventory/api/products';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { carpetRollsApi, type CarpetRoll } from '../api';
import { SizeInput } from '../components/SizeInput';
import { ROLLS_KEY, isRollUnit, opt, r2, realFt, refreshCarpet } from '../meta';
import { useCarpetProducts } from '../components/useCarpetProducts';

interface Draft {
  productId: string; variantId: string; rollNumber: string; designCode: string;
  wFt: number | null; wIn: number | null; lFt: number | null; lIn: number | null;
  cost: number | null; rate: number | null; wholesale: number | null; rack: string; quality: string; notes: string;
}
const blank = (productId = ''): Draft => ({ productId, variantId: '', rollNumber: '', designCode: '', wFt: 12, wIn: null, lFt: null, lIn: null, cost: null, rate: null, wholesale: null, rack: '', quality: '', notes: '' });
const fromRoll = (r: CarpetRoll): Draft => ({
  productId: r.productId, variantId: r.variantId ?? '', rollNumber: r.rollNumber, designCode: r.designCode ?? '', wFt: r.widthFt, wIn: r.widthInch || null, lFt: r.originalLengthFt,
  lIn: r.originalLengthInch || null, cost: r.costPerSqft, rate: r.salePricePerSqft, wholesale: r.wholesalePricePerSqft ?? null, rack: r.rackNumber ?? '', quality: r.quality ?? '', notes: r.notes ?? '',
});

export function CarpetRollFormScreen() {
  const th = useTheme();
  const { id, productId } = useLocalSearchParams<{ id?: string; productId?: string }>();
  const edit = !!id;
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const { guard } = useDeskOnline('carpetDesk');
  const [d, setD] = useState<Draft>(() => blank(productId));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (p: Partial<Draft>) => { setDirty(true); setD((x) => ({ ...x, ...p })); };

  const rollQ = useQuery({ queryKey: [ROLLS_KEY, 'one', id], queryFn: () => carpetRollsApi.getOne(id!), enabled: edit });
  useEffect(() => { if (rollQ.data) { setD(fromRoll(rollQ.data)); setDirty(false); } }, [rollQ.data]);
  const cut = (rollQ.data?._count?.movements ?? rollQ.data?.movements?.length ?? 1) > 1;
  const products = useCarpetProducts(!edit);
  const variants = useQuery({ queryKey: ['carpet-roll-variants', d.productId], queryFn: () => variantsApi.list(d.productId), enabled: !!d.productId });

  const sqft = r2(realFt(d.wFt ?? 0, d.wIn ?? 0) * realFt(d.lFt ?? 0, d.lIn ?? 0));
  const errors: Record<string, string> = {};
  if (!d.productId) errors.product = t('Carpet chunein');
  if (!(realFt(d.wFt ?? 0, d.wIn ?? 0) > 0)) errors.width = t('Chaurai likhein');
  if (!(realFt(d.lFt ?? 0, d.lIn ?? 0) > 0)) errors.length = t('Lambai likhein');
  if ((d.wIn ?? 0) >= 12 || (d.lIn ?? 0) >= 12) errors.length = t('Inch 12 se kam likhein');
  if (!((d.rate ?? 0) > 0)) errors.rate = t('Bechne ka rate likhein');
  if ((d.cost ?? 0) > (d.rate ?? 0) && (d.rate ?? 0) > 0) errors.cost = t('Cost rate se zyada hai — check karein');
  const err = (k: string) => (tried ? errors[k] : undefined);

  const submit = () => guard(async () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    const body = {
      variantId: d.variantId || undefined, rollNumber: opt(d.rollNumber), designCode: opt(d.designCode), costPerSqft: d.cost ?? 0, salePricePerSqft: d.rate ?? 0,
      wholesalePricePerSqft: d.wholesale ?? undefined, rackNumber: opt(d.rack), quality: opt(d.quality), notes: opt(d.notes),
      ...(!cut && { widthFt: d.wFt ?? 0, widthInch: d.wIn ?? 0, originalLengthFt: d.lFt ?? 0, originalLengthInch: d.lIn ?? 0 }),
    };
    setSaving(true);
    try {
      const saved = edit
        ? await carpetRollsApi.update(id!, body)
        : await carpetRollsApi.create({ ...body, productId: d.productId, shopId, widthFt: d.wFt ?? 0, originalLengthFt: d.lFt ?? 0, sourceType: 'OPENING_STOCK' });
      setDirty(false);
      refreshCarpet();
      toast.success(edit ? t('Roll save ho gaya') : t('Roll {{rollNumber}} ban gaya', { rollNumber: saved.rollNumber }));
      if (edit) router.back(); else router.replace(`/carpet/rolls/${saved.id}` as never);
    } catch (e) { toast.error(apiErrorMessage(e, t('Roll save nahi hua'))); } finally { setSaving(false); }
  });

  if (edit && rollQ.isLoading) return <FormTemplate title={t('Roll')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  return (
    <FormTemplate title={edit ? t('Roll {{rollNumber}}', { rollNumber: d.rollNumber }) : t('Naya roll (opening stock)')}
      subtitle={edit ? t('Rate, rack aur details. Lambai badalni ho to Adjust karein.') : t('Dukaan me para roll. Supplier se aaya roll Purchase se daalein, taake payment bhi likhi jaye.')}
      dirty={dirty} saving={saving} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <OfflineNote feature="carpetDesk" />
        <FormSection title={t('Carpet')}>
          {!edit && (
            <Select label={t('Carpet')} value={d.productId} searchable onChange={(v) => set({ productId: v, variantId: '' })} error={err('product')} placeholder={t('Carpet chunein')}
              options={products.items.filter((p) => isRollUnit(p.unit)).map((p) => ({ value: p.id, label: p.name }))} hint={products.items.length ? undefined : t('Pehle sqft / running ft wala product banayein')} />
          )}
          {(variants.data ?? []).length > 0 && (
            <Select label={t('Design / rang')} value={d.variantId} onChange={(v) => set({ variantId: v })} placeholder={t('Koi nahi')}
              options={[{ value: '', label: t('Koi nahi') }, ...(variants.data ?? []).filter((v) => v.isActive).map((v) => ({ value: v.id, label: v.name }))]} />
          )}
          <Input label={t('Roll number')} value={d.rollNumber} onChangeText={(v) => set({ rollNumber: v })} ltr hint={t('Khaali chhorein to khud banega (CR-2026-0001)')} />
          <Input label={t('Supplier ka design code')} value={d.designCode} onChangeText={(v) => set({ designCode: v })} ltr />
        </FormSection>
        <FormSection title={t('Naap')}>
          <SizeInput label={t('Chaurai')} ft={d.wFt} inch={d.wIn} disabled={cut} onChange={(wFt, wIn) => set({ wFt, wIn })} error={err('width')} />
          <SizeInput label={t('Lambai')} ft={d.lFt} inch={d.lIn} disabled={cut} onChange={(lFt, lIn) => set({ lFt, lIn })} error={err('length')} />
          <Card tone="default"><Text size="sm">{t('Roll ka area:')} <Text size="sm" weight="bold" ltr>{t('{{sqft}} sqft', { sqft })}</Text>{(d.rate ?? 0) > 0 ? <Text size="sm">{`  ${t('· bechne par')} ${formatMoney(Math.round(sqft * (d.rate ?? 0)))}`}</Text> : null}</Text>{cut ? <Text size="xs" tone="muted">{t('size ab nahi badal sakta (roll kat chuka)')}</Text> : null}</Card>
        </FormSection>
        <FormSection title={t('Rate')}>
          <MoneyInput label={t('Cost / sqft')} value={d.cost} onChangeValue={(v) => set({ cost: v })} error={err('cost')} hint={t('Aap ne kitne me liya')} />
          <MoneyInput label={t('Rate / sqft')} value={d.rate} onChangeValue={(v) => set({ rate: v })} error={err('rate')} hint={t('Counter par yehi rate lagta hai')} />
          <MoneyInput label={t('Wholesale rate / sqft')} value={d.wholesale} onChangeValue={(v) => set({ wholesale: v })} />
        </FormSection>
        <FormSection title={t('Details')}>
          <Input label={t('Rack / jagah')} value={d.rack} onChangeText={(v) => set({ rack: v })} placeholder={t('Godown-A, Rack 3')} />
          <Input label={t('Quality')} value={d.quality} onChangeText={(v) => set({ quality: v })} placeholder={t('Premium, Standard')} />
          <Input label={t('Note')} value={d.notes} onChangeText={(v) => set({ notes: v })} />
        </FormSection>
      </View>
    </FormTemplate>
  );
}
