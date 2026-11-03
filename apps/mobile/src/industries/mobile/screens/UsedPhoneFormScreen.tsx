/**
 * Take a used phone in (web UsedPhoneFormPage): bought for cash (paid from the
 * drawer), taken as an exchange toward a new phone, or kept to sell for its
 * owner. Records the seller with CNIC, the device and IMEI, PTA, condition and
 * accessories, and the buying and selling price.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, ChipGroup, EmptyState, FormSection, FormTemplate, Input, MoneyInput, Skeleton, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { Tiles } from '@/modules/inventory/components/fields';
import { PhotoField, type ImageDraft } from '@/modules/inventory/components/PhotoField';
import { isLuhnValid } from '@nafaa/core/industries/mobile';
import { imeiApi, usedPhonesApi, type CreateUsedPhonePayload, type PtaStatus, type TradeInSource, type UsedPhoneCondition } from '../api';
import { CustomerBox, ImeiInput, emptyCustomer, useShopId, type CustomerValue } from '../components/kit';
import { CONDITIONS, PTA_LIST, SOURCES, USED_KEY, conditionOf, formatCnic, metaText, opt, ptaOf, refreshMobile, sourceOf, usedStatusOf } from '../meta';

const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Infinix', 'Tecno', 'Realme', 'OnePlus', 'Google', 'Huawei', 'Nokia'];
const STORAGE = ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'];
const RAM = ['3GB', '4GB', '6GB', '8GB', '12GB'];
type Extra = 'hasOriginalBox' | 'hasOriginalCharger' | 'hasOriginalCable' | 'hasOriginalEarphones' | 'hasOriginalReceipt' | 'hasWarrantyLeft';
const EXTRAS: Array<[Extra, string]> = [['hasOriginalBox', 'Dabba'], ['hasOriginalCharger', 'Charger'], ['hasOriginalCable', 'Cable'], ['hasOriginalEarphones', 'Handsfree'], ['hasOriginalReceipt', 'Pakki raseed'], ['hasWarrantyLeft', 'Company warranty baqi']];

interface Draft {
  source: TradeInSource; brand: string; model: string; storage: string; ram: string; color: string; modelYear: string; imei1: string; imei2: string; ptaStatus: PtaStatus; condition: UsedPhoneCondition; conditionNotes: string;
  extras: Record<Extra, boolean>; reference: number | null; buyback: number | null; refurbish: number | null; resale: number | null; ready: boolean; cnic: string; cnicPhoto: ImageDraft[]; imeiPhoto: ImageDraft[]; notes: string;
}
const blank = (): Draft => ({
  source: 'CASH_BUYBACK', brand: '', model: '', storage: '', ram: '', color: '', modelYear: '', imei1: '', imei2: '', ptaStatus: 'APPROVED', condition: 'GOOD', conditionNotes: '',
  extras: { hasOriginalBox: false, hasOriginalCharger: false, hasOriginalCable: false, hasOriginalEarphones: false, hasOriginalReceipt: false, hasWarrantyLeft: false },
  reference: null, buyback: null, refurbish: null, resale: null, ready: false, cnic: '', cnicPhoto: [], imeiPhoto: [], notes: '',
});

export function UsedPhoneFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const shopId = useShopId();
  const [d, setD] = useState<Draft>(blank);
  const [seller, setSeller] = useState<CustomerValue>(emptyCustomer);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDirty(true); setD((x) => ({ ...x, [k]: v })); };

  const q = useQuery({ queryKey: [USED_KEY, 'detail', id], queryFn: () => usedPhonesApi.detail(id!), enabled: editing });
  const p = q.data;
  useEffect(() => {
    if (!p) return;
    setD({
      source: p.source, brand: p.brand, model: p.model, storage: p.storage ?? '', ram: p.ram ?? '', color: p.color ?? '', modelYear: p.modelYear ? String(p.modelYear) : '', imei1: p.imei1, imei2: p.imei2 ?? '', ptaStatus: p.ptaStatus,
      condition: p.condition, conditionNotes: p.conditionNotes ?? '', extras: { hasOriginalBox: p.hasOriginalBox, hasOriginalCharger: p.hasOriginalCharger, hasOriginalCable: p.hasOriginalCable, hasOriginalEarphones: p.hasOriginalEarphones, hasOriginalReceipt: p.hasOriginalReceipt, hasWarrantyLeft: p.hasWarrantyLeft },
      reference: null, buyback: Number(p.buybackPrice) || null, refurbish: Number(p.refurbishCost) || null, resale: Number(p.resalePrice) || null, ready: false, cnic: p.fromCustomerCnic ?? '',
      cnicPhoto: p.cnicPhotoUrl ? [{ url: p.cnicPhotoUrl }] : [], imeiPhoto: p.imeiPhotoUrl ? [{ url: p.imeiPhotoUrl }] : [], notes: p.notes ?? '',
    });
    setSeller({ customerId: p.fromCustomerId ?? '', name: p.fromCustomerName ?? '', phone: p.fromCustomerPhone ?? '' });
    setDirty(false);
  }, [p]);
  const moneyLocked = editing && !!p && (p.paidFromDrawer || !!p.tradeInBill);
  const closed = editing && !!p && (p.status === 'SOLD' || p.status === 'DISCARDED');
  const needCnic = d.source !== 'CONSIGNMENT';
  const cost = (d.buyback ?? 0) + (d.refurbish ?? 0);

  const est = useMutation({
    mutationFn: () => usedPhonesApi.estimate({ referencePrice: d.reference ?? 0, condition: d.condition, modelYear: Number(d.modelYear) || undefined, hasOriginalBox: d.extras.hasOriginalBox, hasOriginalCharger: d.extras.hasOriginalCharger, hasOriginalReceipt: d.extras.hasOriginalReceipt, hasWarrantyLeft: d.extras.hasWarrantyLeft }),
    onError: (e) => toast.error(apiErrorMessage(e, t('Andaza nahi bana'))),
  });

  const imeiChanged = !editing || (!!p && d.imei1 !== p.imei1);
  const known = useQuery({ queryKey: ['mobile-imei-lookup', d.imei1], queryFn: () => imeiApi.lookup(d.imei1), enabled: imeiChanged && d.imei1.length === 15, retry: false });
  const k = imeiChanged && d.imei1.length === 15 ? known.data : undefined;
  const held = k?.usedPhones.find((u) => u.id !== id && u.status !== 'SOLD' && u.status !== 'DISCARDED');
  const onShelf = k?.newPhones.find((x) => x.status !== 'SOLD');
  const past = (k?.usedPhones.filter((u) => u.id !== id && u.status === 'SOLD').length ?? 0) + (k?.newPhones.filter((x) => x.status === 'SOLD').length ?? 0);
  const cnicDigits = d.cnic.replace(/\D/g, '');

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!d.brand.trim()) e.push(t('Brand likhein'));
    if (!d.model.trim()) e.push(t('Model likhein'));
    if (!/^\d{15}$/.test(d.imei1)) e.push(t('IMEI 1 me 15 number hon'));
    if (d.imei2 && !/^\d{15}$/.test(d.imei2)) e.push(t('IMEI 2 me 15 number hon'));
    if (d.imei2 && d.imei2 === d.imei1) e.push(t('IMEI 1 aur 2 ek jaise nahi ho sakte'));
    if (held) e.push(t('Ye phone abhi dukaan me hai ({{usedPhoneCode}}) — usi record ko kholein', { usedPhoneCode: held.usedPhoneCode }));
    if (onShelf) e.push(t('Ye IMEI naye phone ke stock me hai — wapas khareeda nahi ja sakta'));
    if (!seller.name.trim()) e.push(t('Bechne wale ka naam likhein'));
    if (!/^[0-9+\-\s]{10,15}$/.test(seller.phone.trim())) e.push(t('Bechne wale ka phone likhein'));
    if (needCnic && cnicDigits.length !== 13) e.push(t('CNIC me 13 number hon'));
    if (d.source !== 'CONSIGNMENT' && !((d.buyback ?? 0) > 0)) e.push(d.source === 'EXCHANGE' ? t('Exchange me phone kitne ka liya — likhein') : t('Kitne me khareeda — likhein'));
    if (d.modelYear && (Number(d.modelYear) < 2000 || Number(d.modelYear) > new Date().getFullYear())) e.push(t('Saal sahi likhein'));
    if (d.resale && d.resale > 0 && d.resale < cost) e.push(t('Bechne ki qeemat cost ({{value}}) se kam hai', { value: formatMoney(cost) }));
    return e;
  }, [d, seller, held, onShelf, needCnic, cnicDigits, cost]);

  const save = async () => {
    setTouched(true);
    if (errors.length) { toast.error(errors[0]); return; }
    setSaving(true);
    try {
      const body: CreateUsedPhonePayload = {
        shopId: editing ? undefined : shopId ?? undefined, source: d.source, brand: d.brand.trim(), model: d.model.trim(), storage: opt(d.storage), ram: opt(d.ram), color: opt(d.color), modelYear: Number(d.modelYear) || undefined,
        imei1: d.imei1, imei2: opt(d.imei2), ptaStatus: d.ptaStatus, condition: d.condition, conditionNotes: opt(d.conditionNotes), ...d.extras,
        buybackPrice: d.buyback ?? 0, estimatedValue: est.data?.suggestedBuyback, refurbishCost: d.refurbish ?? 0, resalePrice: d.resale ?? 0,
        fromCustomerId: seller.customerId || undefined, fromCustomerName: seller.name.trim(), fromCustomerPhone: seller.phone.trim(), fromCustomerCnic: opt(cnicDigits.length === 13 ? formatCnic(d.cnic) : d.cnic),
        cnicPhotoUrl: d.cnicPhoto[0]?.url, imeiPhotoUrl: d.imeiPhoto[0]?.url, notes: opt(d.notes), ...(editing ? {} : { status: d.ready ? 'IN_STOCK' as const : 'PENDING_INSPECTION' as const }),
      };
      let res: { id: string; usedPhoneCode: string; paidFromDrawer?: boolean };
      if (editing && closed) res = await usedPhonesApi.update(id!, { notes: body.notes, conditionNotes: body.conditionNotes, cnicPhotoUrl: body.cnicPhotoUrl, imeiPhotoUrl: body.imeiPhotoUrl });
      else if (editing) res = await usedPhonesApi.update(id!, moneyLocked ? { ...body, buybackPrice: undefined, source: undefined } : body);
      else res = await usedPhonesApi.create(body);
      const paid = res.paidFromDrawer;
      if (!editing && d.source === 'CASH_BUYBACK') {
        if (paid) toast.success(t('{{usedPhoneCode}} darj — {{formatPKR}} galle se nikle', { usedPhoneCode: res.usedPhoneCode, formatPKR: formatMoney(d.buyback ?? 0) }));
        else toast.warning(t('{{usedPhoneCode}} darj — galla khula nahi tha, ye paise kisi register me nahi likhe gaye', { usedPhoneCode: res.usedPhoneCode }));
      } else toast.success(editing ? t('Save ho gaya') : t('{{usedPhoneCode}} darj ho gaya', { usedPhoneCode: res.usedPhoneCode }));
      refreshMobile([USED_KEY], true);
      setDirty(false);
      router.replace(`/mobile/used-phones/${res.id}` as never);
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };

  if (editing && q.isLoading) return <FormTemplate title={t('Used phone')} onSave={() => undefined}><Skeleton height={200} /></FormTemplate>;
  if (editing && !p) return <FormTemplate title={t('Used phone')} onSave={() => undefined}><EmptyState title={t('Ye phone nahi mila')} /></FormTemplate>;
  const err = (cond: boolean, msg: string) => (touched && cond ? msg : undefined);

  return (
    <FormTemplate title={editing ? t('{{usedPhoneCode}} — badlein', { usedPhoneCode: p?.usedPhoneCode ?? '' }) : t('Used phone lein')} dirty={dirty} saving={saving} onSave={() => void save()}>
      {closed && <Text size="sm" tone="warning">{t('Bika ya hataya hua phone — sirf note aur tasveerein badalti hain')}</Text>}
      {!closed && (
        <>
          <FormSection title={t('Kaise liya')}>
            <Tiles value={d.source} onChange={(v) => set('source', v)} columns={1} options={SOURCES.map((s) => ({ value: s, label: t(sourceOf(s).label) }))} />
            <Text size="xs" tone="muted">{t(sourceOf(d.source).hint)}</Text>
            {moneyLocked && <Text size="xs" tone="muted">{t('Diye hue paise aur trade-in bill ke baad qeemat nahi badalti')}</Text>}
          </FormSection>

          <FormSection title={d.source === 'CONSIGNMENT' ? t('Malik') : t('Bechne wala')}>
            <CustomerBox value={seller} onChange={(v) => { setDirty(true); setSeller(v); }} nameLabel={t('Naam')} />
            <Input label={t('CNIC')} value={d.cnic} onChangeText={(v) => set('cnic', formatCnic(v))} keyboardType="number-pad" ltr placeholder="35202-1234567-1" error={err(needCnic && cnicDigits.length !== 13, t('CNIC me 13 number hon'))} hint={needCnic ? undefined : t('Marzi hai')} />
            <Text size="sm" weight="medium" tone="secondary">{t('CNIC ki tasveer')}</Text>
            <PhotoField value={d.cnicPhoto} onChange={(v) => set('cnicPhoto', v)} max={1} />
          </FormSection>

          <FormSection title={t('Phone')}>
            <ChipGroup wrap value={BRANDS.includes(d.brand) ? d.brand : ''} onChange={(v) => set('brand', v)} options={BRANDS.map((b) => ({ value: b, label: b }))} />
            <Input label={t('Brand')} value={d.brand} onChangeText={(v) => set('brand', v)} error={err(!d.brand.trim(), t('Brand likhein'))} />
            <Input label={t('Model')} value={d.model} onChangeText={(v) => set('model', v)} error={err(!d.model.trim(), t('Model likhein'))} />
            <ImeiInput label={t('IMEI 1')} value={d.imei1} onValue={(v) => set('imei1', v)} error={err(!/^\d{15}$/.test(d.imei1), t('IMEI 1 me 15 number hon'))} disabled={editing && !!p && p.status === 'SOLD'} />
            {held && <Text size="xs" tone="danger">{t('Ye phone abhi dukaan me hai ({{usedPhoneCode}}) — usi record ko kholein', { usedPhoneCode: held.usedPhoneCode })}</Text>}
            {onShelf && <Text size="xs" tone="danger">{t('Ye IMEI naye phone ke stock me hai — wapas khareeda nahi ja sakta')}</Text>}
            {past > 0 && !held && !onShelf && <Text size="xs" tone="info">{t('Ye phone pehle bhi is dukaan se guzra hai ({{count}} dafa)', { count: past })}</Text>}
            <ImeiInput label={t('IMEI 2')} value={d.imei2} onValue={(v) => set('imei2', v)} hint={t('Dual SIM')} />
            <Text size="sm" weight="medium" tone="secondary">{t('IMEI / dabbe ki tasveer')}</Text>
            <PhotoField value={d.imeiPhoto} onChange={(v) => set('imeiPhoto', v)} max={1} />
            <Text size="sm" weight="medium" tone="secondary">{t('Storage')}</Text>
            <ChipGroup wrap value={d.storage} onChange={(v) => set('storage', v)} options={STORAGE.map((s) => ({ value: s, label: s }))} />
            <Text size="sm" weight="medium" tone="secondary">{t('RAM')}</Text>
            <ChipGroup wrap value={d.ram} onChange={(v) => set('ram', v)} options={RAM.map((s) => ({ value: s, label: s }))} />
            <View style={{ flexDirection: 'row', gap: th.space(2) }}>
              <Input containerStyle={{ flex: 1 }} label={t('Rang')} value={d.color} onChangeText={(v) => set('color', v)} />
              <Input containerStyle={{ flex: 1 }} label={t('Model saal')} value={d.modelYear} onChangeText={(v) => set('modelYear', v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" ltr error={err(!!d.modelYear && (Number(d.modelYear) < 2000 || Number(d.modelYear) > new Date().getFullYear()), t('Saal sahi likhein'))} />
            </View>
          </FormSection>

          <FormSection title={t('PTA')}>
            <ChipGroup wrap value={d.ptaStatus} onChange={(v) => set('ptaStatus', v)} options={PTA_LIST.map((x) => ({ value: x, label: t(ptaOf(x).label) }))} />
          </FormSection>

          <FormSection title={t('Halat')}>
            <ChipGroup wrap value={d.condition} onChange={(v) => set('condition', v)} options={CONDITIONS.map((c) => ({ value: c, label: `${t(conditionOf(c).label)} (${conditionOf(c).score})` }))} />
            <TextArea label={t('Halat ka note')} value={d.conditionNotes} onChangeText={(v) => set('conditionNotes', v)} />
            {EXTRAS.map(([key, label]) => <Switch key={key} value={d.extras[key]} onChange={(v) => set('extras', { ...d.extras, [key]: v })} label={t(label)} />)}
          </FormSection>
        </>
      )}

      {!closed && (
        <FormSection title={t('Qeemat')}>
          {!editing && (
            <Card>
              <MoneyInput label={t('Naye phone ki qeemat (andaze ke liye)')} value={d.reference} onChangeValue={(v) => set('reference', v)} />
              <Button variant="soft" icon={Sparkles} loading={est.isPending} disabled={!(d.reference && d.reference > 0)} onPress={() => est.mutate()}>{t('Khareedne ka andaza')}</Button>
              {est.data && (
                <View style={{ gap: 2 }}>
                  <Text weight="bold">{formatMoney(est.data.suggestedBuyback)}</Text>
                  {est.data.reasoning.map((r, i) => <Text key={i} size="xs" tone="muted">{r}</Text>)}
                  <Button variant="ghost" size="sm" onPress={() => set('buyback', est.data!.suggestedBuyback)}>{t('Ye qeemat lagayein')}</Button>
                </View>
              )}
            </Card>
          )}
          <MoneyInput label={d.source === 'CONSIGNMENT' ? t('Malik ko dena') : t('Kitne me liya')} value={d.buyback} onChangeValue={(v) => set('buyback', v)} disabled={moneyLocked} error={err(d.source !== 'CONSIGNMENT' && !((d.buyback ?? 0) > 0), t('Kitne me khareeda — likhein'))} />
          <MoneyInput label={t('Repair / safai ka kharcha')} value={d.refurbish} onChangeValue={(v) => set('refurbish', v)} />
          <MoneyInput label={t('Bechne ki qeemat')} value={d.resale} onChangeValue={(v) => set('resale', v)} error={err(!!d.resale && d.resale > 0 && d.resale < cost, t('Bechne ki qeemat cost ({{value}}) se kam hai', { value: formatMoney(cost) }))} />
          {(d.resale ?? 0) > 0 && <Text size="sm" tone={(d.resale ?? 0) - cost >= 0 ? 'success' : 'danger'}>{t('Profit {{value}}', { value: formatMoney((d.resale ?? 0) - cost) })}</Text>}
          {!editing && <Switch value={d.ready} onChange={(v) => set('ready', v)} label={t('Bikne ko tayyar (check ho chuka)')} />}
        </FormSection>
      )}
      <FormSection title={t('Note')}>
        <TextArea value={d.notes} onChangeText={(v) => set('notes', v)} />
      </FormSection>
    </FormTemplate>
  );
}
