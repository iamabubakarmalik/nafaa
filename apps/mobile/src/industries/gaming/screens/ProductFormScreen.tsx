/**
 * Game or gear profile (web GamingProductWizardPage): which product it is, its
 * platform and condition, publisher and genre, what is in the box, rental rates,
 * used price and trade-in value, and the flags that show on the counter.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Gamepad2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, FormSection, FormTemplate, Input, MoneyInput, Row, Select, Skeleton, Switch, Text, toast, useTheme } from '@/design';
import { ProductPickerSheet } from '../../_shared/payKit';
import { errorText, numIn } from '../../_shared/deskKit';
import { clean } from '../../_shared/serviceKit';
import { gamingApi } from '../api';
import { GAMING_KEYS, categoryOptions, conditionOptions, platformOptions, refreshGaming } from '../meta';

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export function ProductFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id && id !== 'new';
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const profiles = useQuery({ queryKey: [GAMING_KEYS.profiles, 'all'], queryFn: () => gamingApi.profiles.list(), enabled: editing });
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [pick, setPick] = useState(false);
  const [f, setF] = useState({ categoryType: 'GAME_DISC', platform: 'PS5', conditionType: 'NEW_SEALED', publisher: '', genre: '', ageRating: '', region: '', playerCount: '', onlineMultiplayer: false,
    accessories: '', numberOfControllers: 0 as number | null, isRentable: false, rentalPricePerHour: null as number | null, rentalPricePerDay: null as number | null, rentalDeposit: null as number | null,
    usedPrice: null as number | null, tradeInValue: null as number | null, isFeatured: false, isNewRelease: false, isPreOrder: false, notes: '' });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const p = profiles.data?.find((x) => x.productId === id);
    if (!p) return;
    setProduct({ id: p.productId, name: p.product?.name ?? '' });
    setF({ categoryType: p.categoryType ?? 'OTHER', platform: p.platform, conditionType: p.conditionType, publisher: p.publisher ?? '', genre: p.genre.join(', '), ageRating: p.ageRating ?? '', region: p.region ?? '', playerCount: p.playerCount ?? '',
      onlineMultiplayer: p.onlineMultiplayer, accessories: p.includedAccessories.join(', '), numberOfControllers: p.numberOfControllers, isRentable: p.isRentable, rentalPricePerHour: p.rentalPricePerHour ?? null, rentalPricePerDay: p.rentalPricePerDay ?? null,
      rentalDeposit: p.rentalDeposit ?? null, usedPrice: p.usedPrice ?? null, tradeInValue: p.tradeInValue ?? null, isFeatured: p.isFeatured, isNewRelease: p.isNewRelease, isPreOrder: p.isPreOrder, notes: p.notes ?? '' });
  }, [profiles.data, id]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((x) => ({ ...x, [k]: v })); setDirty(true); };
  const save = async () => {
    if (!product) { toast.warning(t('Pehle product chunein')); return; }
    setSaving(true);
    try {
      await gamingApi.profiles.upsert(clean({ productId: product.id, categoryType: f.categoryType, platform: f.platform, conditionType: f.conditionType, publisher: f.publisher.trim(), genre: list(f.genre), ageRating: f.ageRating.trim(), region: f.region.trim(), playerCount: f.playerCount.trim(),
        onlineMultiplayer: f.onlineMultiplayer, includedAccessories: list(f.accessories), numberOfControllers: f.numberOfControllers ?? 0, isRentable: f.isRentable,
        rentalPricePerHour: f.isRentable ? f.rentalPricePerHour : null, rentalPricePerDay: f.isRentable ? f.rentalPricePerDay : null, rentalDeposit: f.isRentable ? f.rentalDeposit : null,
        usedPrice: f.usedPrice, tradeInValue: f.tradeInValue, isFeatured: f.isFeatured, isNewRelease: f.isNewRelease, isPreOrder: f.isPreOrder, notes: f.notes.trim() }));
      refreshGaming(); toast.success(t('Save ho gaya')); setDirty(false); router.back();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };
  if (editing && profiles.isLoading) return <View style={{ padding: th.space(4) }}><Skeleton height={200} /></View>;
  const used = f.conditionType !== 'NEW_SEALED';
  return (
    <FormTemplate title={editing ? t('Edit game profile') : t('New game profile')} dirty={dirty} saving={saving} saveDisabled={!canEdit} onSave={() => void save()}>
      <FormSection title={t('Product')}>
        {product ? <Row justify="between"><Text weight="semibold" style={{ flex: 1 }}>{product.name}</Text>{!editing && <Button size="sm" variant="ghost" onPress={() => setPick(true)}>{t('Badlein')}</Button>}</Row>
          : <Button variant="soft" icon={Gamepad2} onPress={() => setPick(true)}>{t('Product chunein')}</Button>}
        <Select label={t('Category')} value={f.categoryType} onChange={(v) => set('categoryType', v)} options={categoryOptions()} />
        <Select label={t('Platform')} value={f.platform} onChange={(v) => set('platform', v)} options={platformOptions()} />
        <Select label={t('Halat')} value={f.conditionType} onChange={(v) => set('conditionType', v)} options={conditionOptions()} />
      </FormSection>
      <FormSection title={t('Tafseel')}>
        <Input label={t('Publisher')} value={f.publisher} onChangeText={(v) => set('publisher', v)} />
        <Input label={t('Genre')} hint={t('Comma laga kar')} value={f.genre} onChangeText={(v) => set('genre', v)} />
        <Row gap={2}>
          <View style={{ flex: 1 }}><Input label={t('Age rating')} value={f.ageRating} onChangeText={(v) => set('ageRating', v)} /></View>
          <View style={{ flex: 1 }}><Input label={t('Region')} value={f.region} onChangeText={(v) => set('region', v)} /></View>
        </Row>
        <Input label={t('Players')} value={f.playerCount} onChangeText={(v) => set('playerCount', v)} />
        <Switch label={t('Online multiplayer')} value={f.onlineMultiplayer} onChange={(v) => set('onlineMultiplayer', v)} />
        <Input label={t('Saath kya milta hai')} hint={t('Comma laga kar')} value={f.accessories} onChangeText={(v) => set('accessories', v)} />
        <Input label={t('Controllers')} keyboardType="number-pad" ltr value={String(f.numberOfControllers ?? '')} onChangeText={(v) => set('numberOfControllers', numIn(v))} />
      </FormSection>
      <FormSection title={t('Kiraya aur used')}>
        <Switch label={t('Kiraye par milta hai')} value={f.isRentable} onChange={(v) => set('isRentable', v)} />
        {f.isRentable && (
          <>
            <MoneyInput label={t('Kiraya fi ghanta')} value={f.rentalPricePerHour} onChangeValue={(v) => set('rentalPricePerHour', v)} />
            <MoneyInput label={t('Kiraya fi din')} value={f.rentalPricePerDay} onChangeValue={(v) => set('rentalPricePerDay', v)} />
            <MoneyInput label={t('Deposit')} value={f.rentalDeposit} onChangeValue={(v) => set('rentalDeposit', v)} />
          </>
        )}
        {used && <MoneyInput label={t('Used price')} value={f.usedPrice} onChangeValue={(v) => set('usedPrice', v)} />}
        <MoneyInput label={t('Trade-in value')} value={f.tradeInValue} onChangeValue={(v) => set('tradeInValue', v)} />
      </FormSection>
      <FormSection title={t('Counter par')}>
        <Switch label={t('Featured')} value={f.isFeatured} onChange={(v) => set('isFeatured', v)} />
        <Switch label={t('Naya release')} value={f.isNewRelease} onChange={(v) => set('isNewRelease', v)} />
        <Switch label={t('Pre-order')} value={f.isPreOrder} onChange={(v) => set('isPreOrder', v)} />
        <Input label={t('Note')} value={f.notes} onChangeText={(v) => set('notes', v)} multiline />
      </FormSection>
      <ProductPickerSheet open={pick} onClose={() => setPick(false)} onPick={(p) => { setProduct({ id: p.id, name: p.name }); setDirty(true); }} />
    </FormTemplate>
  );
}
