/**
 * Book or change a cake order (web CakeCustomizerPage): customer, the cake
 * (size, shape, flavour, cream, diet), design with the cake photo and
 * reference pictures, occasion, pickup or delivery time and place, and the
 * price with advance and balance. After booking: WhatsApp confirmation and
 * the order slips. Cake orders are bookings and need the server.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, ChefHat, Link2, MessageCircle, Printer, UserRound, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { advanceAsk, balanceAfter, cakeTotal, isClosedOrder, isDelivery } from '@nafaa/core/bakery';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { useBillLanguage } from '@/core/receipt';
import {
  Amount, Button, Card, Chip, ChipGroup, DatePicker, DetailRow, EmptyState, FormSection, FormTemplate, IconButton, Input, ListRow, MoneyInput, Row, Select, Sheet, Switch, Text, TextArea, toast, useTheme,
} from '@/design';
import { CustomerPickerSheet } from '@/modules/customers/components/CustomerPickerSheet';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { NumberInput } from '@/modules/inventory/components/fields';
import { PhotoField } from '@/modules/inventory/components/PhotoField';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { cakeOrdersApi, type CakeOrder, type OrderPayMethod } from '../api';
import {
  ALLERGIES, CAKE_KEY, CREAMS, DECORATIONS, DELIVERY, FLAVORS, OCCASIONS, PAY_METHODS, QUICK_SIZES, SHAPES, SIZES, TIER_SHAPES, cakeText, dateTime, refreshBakery,
} from '../meta';
import { cakeSlip, sendSlip } from '../slip';

interface Draft {
  customerId: string; customerName: string; customerPhone: string; customerEmail: string; productId: string; productName: string;
  size: string; customWeightKg: number | null; shape: string; customShapeDesc: string; numberOfTiers: number | null; numberOrLetter: string;
  flavor: string; customFlavorDesc: string; creamType: string;
  isEggless: boolean; isSugarFree: boolean; isVegan: boolean; allergies: string[]; dietaryNotes: string;
  messageOnCake: string; messageColor: string; hasPhotoOnCake: boolean; photoUrl: string; hasEdibleImage: boolean;
  designReferenceUrls: string[]; designInstructions: string; colorTheme: string; primaryColor: string; secondaryColor: string;
  decorativeItems: string[]; candlesRequired: number | null; candleType: string; cakeStand: boolean; cakeKnife: boolean;
  occasion: string; celebrantName: string; celebrantAge: number | null; eventDate: Date | null; eventTime: string; eventVenue: string;
  deliveryType: string; neededBy: Date | null; deliveryAddress: string; deliveryLandmark: string; deliveryCharges: number | null;
  basePrice: number | null; customizationCharges: number | null; photoCakeCharges: number | null; taxAmount: number | null; discount: number | null;
  advanceRequired: number | null; advancePaid: number | null; payMethod: OrderPayMethod; confirmed: boolean;
  specialInstructions: string; internalNotes: string;
}

const EMPTY: Draft = {
  customerId: '', customerName: '', customerPhone: '', customerEmail: '', productId: '', productName: '',
  size: 'TWO_POUND', customWeightKg: null, shape: 'ROUND', customShapeDesc: '', numberOfTiers: 2, numberOrLetter: '',
  flavor: 'CHOCOLATE', customFlavorDesc: '', creamType: 'WHIPPED_CREAM',
  isEggless: false, isSugarFree: false, isVegan: false, allergies: [], dietaryNotes: '',
  messageOnCake: '', messageColor: '', hasPhotoOnCake: false, photoUrl: '', hasEdibleImage: false,
  designReferenceUrls: [], designInstructions: '', colorTheme: '', primaryColor: '', secondaryColor: '',
  decorativeItems: [], candlesRequired: null, candleType: '', cakeStand: false, cakeKnife: false,
  occasion: 'BIRTHDAY', celebrantName: '', celebrantAge: null, eventDate: null, eventTime: '', eventVenue: '',
  deliveryType: 'SELF_PICKUP', neededBy: null, deliveryAddress: '', deliveryLandmark: '', deliveryCharges: null,
  basePrice: null, customizationCharges: null, photoCakeCharges: null, taxAmount: null, discount: null,
  advanceRequired: null, advancePaid: null, payMethod: 'CASH', confirmed: true, specialInstructions: '', internalNotes: '',
};

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const n = (v: number | null) => Number(v) || 0;

function fromOrder(o: CakeOrder): Draft {
  const s = (v?: string | null) => v ?? '';
  return {
    ...EMPTY,
    customerId: s(o.customerId), customerName: o.customerName, customerPhone: o.customerPhone, customerEmail: s(o.customerEmail),
    productId: s(o.productId), productName: s(o.productName),
    size: o.size, customWeightKg: o.customWeightKg ?? null, shape: o.shape, customShapeDesc: s(o.customShapeDesc), numberOfTiers: o.numberOfTiers || 1, numberOrLetter: s(o.numberOrLetter),
    flavor: o.flavor, customFlavorDesc: s(o.customFlavorDesc), creamType: s(o.creamType),
    isEggless: o.isEggless, isSugarFree: o.isSugarFree, isVegan: o.isVegan, allergies: o.allergies ?? [], dietaryNotes: s(o.dietaryNotes),
    messageOnCake: s(o.messageOnCake), messageColor: s(o.messageColor), hasPhotoOnCake: o.hasPhotoOnCake, photoUrl: s(o.photoUrl), hasEdibleImage: o.hasEdibleImage,
    designReferenceUrls: o.designReferenceUrls ?? [], designInstructions: s(o.designInstructions), colorTheme: s(o.colorTheme), primaryColor: s(o.primaryColor), secondaryColor: s(o.secondaryColor),
    decorativeItems: o.decorativeItems ?? [], candlesRequired: o.candlesRequired ?? null, candleType: s(o.candleType), cakeStand: o.cakeStand, cakeKnife: o.cakeKnife,
    occasion: o.occasion || 'OTHER', celebrantName: s(o.celebrantName), celebrantAge: o.celebrantAge ?? null,
    eventDate: o.eventDate ? new Date(o.eventDate) : null, eventTime: s(o.eventTime), eventVenue: s(o.eventVenue),
    deliveryType: o.deliveryType, neededBy: new Date(o.neededBy), deliveryAddress: s(o.deliveryAddress), deliveryLandmark: s(o.deliveryLandmark),
    deliveryCharges: o.deliveryCharges || null, basePrice: o.basePrice || null, customizationCharges: o.customizationCharges || null,
    photoCakeCharges: o.photoCakeCharges || null, taxAmount: o.taxAmount || null, discount: o.discount || null,
    advanceRequired: o.advanceRequired ?? null, advancePaid: null, confirmed: !['DRAFT', 'QUOTED'].includes(o.status),
    specialInstructions: s(o.specialInstructions), internalNotes: s(o.internalNotes),
  };
}

/** This evening, tomorrow morning and evening, day after (only times still ahead). */
function quickTimes() {
  const at = (days: number, h: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d; };
  return [
    { label: t('Aaj shaam 7'), d: at(0, 19) }, { label: t('Kal subah 11'), d: at(1, 11) },
    { label: t('Kal shaam 7'), d: at(1, 19) }, { label: t('Parson shaam 7'), d: at(2, 19) },
  ].filter((x) => x.d.getTime() > Date.now() + 30 * 60_000);
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function CakeOrderFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const online = useOnlineStatus();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Bakery');
  const orderQ = useQuery({ queryKey: [CAKE_KEY, 'one', id], queryFn: () => cakeOrdersApi.getOne(id!), enabled: editing });
  const [f, setF] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<CakeOrder | null>(null);
  const [pickCustomer, setPickCustomer] = useState(false);
  const [pickProduct, setPickProduct] = useState(false);
  const lock = useRef(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDirty(true); setF((x) => ({ ...x, [k]: v })); };
  useEffect(() => { if (orderQ.data && !loaded) { setF(fromOrder(orderQ.data)); setLoaded(true); } }, [orderQ.data, loaded]);

  const delivers = isDelivery(f.deliveryType);
  const total = cakeTotal({ basePrice: n(f.basePrice), customizationCharges: n(f.customizationCharges), photoCakeCharges: n(f.photoCakeCharges), deliveryCharges: n(f.deliveryCharges), taxAmount: n(f.taxAmount), discount: n(f.discount), deliveryType: f.deliveryType });
  const alreadyPaid = editing ? Number(orderQ.data?.paidAmount || 0) : 0;
  const advanceNow = editing ? 0 : n(f.advancePaid);
  const ask = advanceAsk(total, f.advanceRequired);
  const balance = balanceAfter(total, alreadyPaid, advanceNow);

  const problems = useMemo(() => {
    const out: string[] = [];
    if (editing && orderQ.data && isClosedOrder(orderQ.data.status)) out.push(t('De diya ya cancel order badla nahi ja sakta'));
    if (!f.customerName.trim()) out.push(t('Customer ka naam likhein'));
    if (f.customerPhone.replace(/\D/g, '').length < 10) out.push(t('Customer ka poora phone number likhein'));
    if (f.size === 'CUSTOM' && !(n(f.customWeightKg) > 0)) out.push(t('Apne size ka wazan (kg) likhein'));
    if (!f.neededBy) out.push(t('Cake kab chahiye — date aur waqt chunein'));
    else if (!editing && f.neededBy.getTime() < Date.now() - 5 * 60_000) out.push(t('Yeh waqt guzar chuka — aage ka waqt chunein'));
    if (!(n(f.basePrice) > 0)) out.push(t('Cake ki qeemat likhein'));
    if (delivers && !f.deliveryAddress.trim()) out.push(t('Pahunchane ka pata likhein'));
    if (advanceNow > total) out.push(t('Advance kul rakam se zyada nahi ho sakta'));
    if (editing && total + 0.005 < alreadyPaid) out.push(t('{{alreadyPaid}} pehle mil chuka — kul rakam is se kam nahi ho sakti', { alreadyPaid: formatMoney(alreadyPaid) }));
    return out;
  }, [f, editing, orderQ.data, total, advanceNow, alreadyPaid, delivers]);

  const submit = async () => {
    if (lock.current || saving || saved) return;
    if (!online) { toast.warning(onlineNeededText('bakeryOrders')); return; }
    if (problems.length) { toast.error(problems[0]); return; }
    lock.current = true;
    setSaving(true);
    const opt = (v: string) => v.trim();
    const tiered = TIER_SHAPES.includes(f.shape);
    const body: Record<string, unknown> = {
      customerId: f.customerId || undefined, customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), customerEmail: opt(f.customerEmail),
      productId: f.productId || undefined, productName: opt(f.productName),
      size: f.size, customWeightKg: f.size === 'CUSTOM' ? n(f.customWeightKg) : undefined,
      shape: f.shape, customShapeDesc: f.shape === 'CUSTOM_SHAPE' ? opt(f.customShapeDesc) : '',
      numberOfTiers: tiered ? Math.max(Math.round(n(f.numberOfTiers)), 2) : 1,
      numberOrLetter: ['NUMBER', 'LETTER'].includes(f.shape) ? opt(f.numberOrLetter) : '',
      flavor: f.flavor, customFlavorDesc: f.flavor === 'CUSTOM_FLAVOR' ? opt(f.customFlavorDesc) : '', creamType: f.creamType || undefined,
      isEggless: f.isEggless, isSugarFree: f.isSugarFree, isVegan: f.isVegan, allergies: f.allergies, dietaryNotes: opt(f.dietaryNotes),
      messageOnCake: opt(f.messageOnCake), messageColor: opt(f.messageColor),
      hasPhotoOnCake: f.hasPhotoOnCake, photoUrl: f.hasPhotoOnCake ? f.photoUrl : '', hasEdibleImage: f.hasPhotoOnCake && f.hasEdibleImage,
      designReferenceUrls: f.designReferenceUrls, designInstructions: opt(f.designInstructions),
      colorTheme: opt(f.colorTheme), primaryColor: opt(f.primaryColor), secondaryColor: opt(f.secondaryColor), decorativeItems: f.decorativeItems,
      candlesRequired: n(f.candlesRequired) > 0 ? Math.round(n(f.candlesRequired)) : undefined, candleType: opt(f.candleType),
      cakeStand: f.cakeStand, cakeKnife: f.cakeKnife,
      occasion: f.occasion, celebrantName: opt(f.celebrantName), celebrantAge: n(f.celebrantAge) > 0 ? Math.round(n(f.celebrantAge)) : undefined,
      eventDate: f.eventDate ? f.eventDate.toISOString().slice(0, 10) : '', eventTime: opt(f.eventTime), eventVenue: opt(f.eventVenue),
      deliveryType: f.deliveryType, neededBy: f.neededBy!.toISOString(), deliveryTime: hhmm(f.neededBy!),
      deliveryAddress: delivers ? opt(f.deliveryAddress) : '', deliveryLandmark: delivers ? opt(f.deliveryLandmark) : '',
      deliveryCharges: delivers ? n(f.deliveryCharges) : 0,
      basePrice: n(f.basePrice), customizationCharges: n(f.customizationCharges), photoCakeCharges: n(f.photoCakeCharges),
      taxAmount: n(f.taxAmount), discount: n(f.discount), advanceRequired: ask,
      specialInstructions: opt(f.specialInstructions), internalNotes: opt(f.internalNotes),
    };
    try {
      if (editing) {
        await cakeOrdersApi.update(id!, body);
        refreshBakery([CAKE_KEY]);
        toast.success(t('Order save ho gaya'));
        setDirty(false);
        router.back();
        return;
      }
      const o = await cakeOrdersApi.create({ ...body, advancePaid: advanceNow, ...(advanceNow > 0 && { paymentMethod: f.payMethod }), status: f.confirmed || advanceNow > 0 ? 'CONFIRMED' : 'QUOTED' });
      refreshBakery([CAKE_KEY], advanceNow > 0);
      toast.success(t('Order {{orderNumber}} ban gaya', { orderNumber: o.orderNumber }));
      setDirty(false);
      setSaved(o);
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setSaving(false); lock.current = false; }
  };

  if (editing && !orderQ.data) {
    return orderQ.isLoading ? <FormTemplate title={t('Cake order')} onSave={() => undefined} saveDisabled><View /></FormTemplate>
      : <FormTemplate title={t('Cake order')} onSave={() => undefined} saveDisabled><EmptyState title={t('Yeh order nahi mila')} /></FormTemplate>;
  }

  const sizeOther = SIZES.filter((s) => !QUICK_SIZES.includes(s.value));
  return (
    <>
      <FormTemplate
        title={editing ? t('{{orderNumber}} — badlein', { orderNumber: orderQ.data?.orderNumber }) : t('Naya cake order')}
        subtitle={editing ? t('Jo badalna hai badlein — mila hua paisa yahan se nahi badalta') : undefined}
        dirty={dirty} saving={saving} onSave={() => void submit()}
        saveLabel={editing ? t('Save karein') : t('Order banayein')}
      >
        {!online && <Card tone="warning"><Text size="sm">{onlineNeededText('bakeryOrders')}</Text></Card>}

        <FormSection title={t('Customer')} description={t('Purana customer ho to dhoond lein — naam aur phone khud bhar jayenge')}>
          {f.customerId ? (
            <ListRow icon={UserRound} iconTone="brand" title={f.customerName} subtitle={f.customerPhone}
              trailing={<Button size="sm" variant="ghost" onPress={() => set('customerId', '')}>{t('Alag customer')}</Button>} />
          ) : <Button variant="secondary" icon={UserRound} onPress={() => setPickCustomer(true)}>{t('Purana customer — naam ya phone…')}</Button>}
          <Input label={t('Naam')} value={f.customerName} onChangeText={(v) => set('customerName', v)} placeholder={t('Ayesha Khan')} disabled={!!f.customerId} />
          <Input label={t('Phone')} value={f.customerPhone} onChangeText={(v) => set('customerPhone', v)} keyboardType="phone-pad" ltr placeholder="03001234567" hint={t('WhatsApp tasdeeq isi par jati hai')} disabled={!!f.customerId} />
          <Input label={t('Email')} value={f.customerEmail} onChangeText={(v) => set('customerEmail', v)} keyboardType="email-address" autoCapitalize="none" ltr hint={t('Marzi hai')} />
        </FormSection>

        <FormSection title={t('Cake')} description={t('Size, shakal, flavour aur cream')}>
          {f.productId ? (
            <ListRow icon={Link2} iconTone="success" title={f.productName} subtitle={t('Maal se jura — dete waqt is ka stock ghatega')}
              trailing={<IconButton icon={X} label={t('Jor hatayein')} onPress={() => { set('productId', ''); set('productName', ''); }} />} />
          ) : <Button variant="soft" icon={Link2} onPress={() => setPickProduct(true)}>{t('Maal se jorein (marzi)')}</Button>}
          <Text size="sm" weight="semibold" tone="secondary">{t('Size')}</Text>
          <ChipGroup wrap value={QUICK_SIZES.includes(f.size) ? f.size : ''} onChange={(v) => set('size', v)} options={QUICK_SIZES.map((s) => ({ value: s, label: t(SIZES.find((x) => x.value === s)!.label) }))} />
          <Select label={t('Aur size')} value={QUICK_SIZES.includes(f.size) ? '' : f.size} onChange={(v) => v && set('size', v)} placeholder={t('Aur size…')} options={sizeOther.map((s) => ({ value: s.value, label: `${s.emoji} ${t(s.label)}` }))} />
          {f.size === 'CUSTOM' && <NumberInput label={t('Wazan (kg)')} value={f.customWeightKg} onChangeValue={(v) => set('customWeightKg', v)} placeholder="2.5" hint={t('Kitne kilo ka cake')} />}
          <Select label={t('Shape')} value={f.shape} onChange={(v) => set('shape', v)} options={SHAPES.map((s) => ({ value: s.value, label: `${s.emoji} ${t(s.label)}` }))} />
          {f.shape === 'CUSTOM_SHAPE' && <Input label={t('Kaisi shakal')} value={f.customShapeDesc} onChangeText={(v) => set('customShapeDesc', v)} placeholder={t('Car, guitar, kitaab…')} />}
          {['NUMBER', 'LETTER'].includes(f.shape) && <Input label={f.shape === 'NUMBER' ? t('Kaunsa number') : t('Kaunsa harf')} value={f.numberOrLetter} onChangeText={(v) => set('numberOrLetter', v)} placeholder={f.shape === 'NUMBER' ? '25' : 'A'} />}
          {TIER_SHAPES.includes(f.shape) && <NumberInput integer label={t('Kitni manzil')} value={f.numberOfTiers} onChangeValue={(v) => set('numberOfTiers', v)} hint={t('2 se 5')} />}
          <Select label={t('Cream')} value={f.creamType} onChange={(v) => set('creamType', v)} options={[{ value: '', label: '—' }, ...CREAMS.map((c) => ({ value: c.value, label: `${c.emoji} ${t(c.label)}` }))]} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Flavour')}</Text>
          <ChipGroup wrap value={f.flavor} onChange={(v) => set('flavor', v)} options={FLAVORS.map((x) => ({ value: x.value, label: `${x.emoji} ${t(x.label)}` }))} />
          {f.flavor === 'CUSTOM_FLAVOR' && <Input label={t('Kaunsa flavour')} value={f.customFlavorDesc} onChangeText={(v) => set('customFlavorDesc', v)} />}
          <Text size="sm" weight="semibold" tone="secondary">{t('Parhez aur allergy')}</Text>
          <Row gap={2} wrap>
            <Chip label={t('Anday ke bagair')} selected={f.isEggless} onPress={() => set('isEggless', !f.isEggless)} />
            <Chip label={t('Cheeni ke bagair')} selected={f.isSugarFree} onPress={() => set('isSugarFree', !f.isSugarFree)} />
            <Chip label={t('Vegan')} selected={f.isVegan} onPress={() => set('isVegan', !f.isVegan)} />
            {ALLERGIES.map((a) => <Chip key={a} label={t('Allergy: {{a}}', { a: t(a) })} selected={f.allergies.includes(a)} onPress={() => set('allergies', toggle(f.allergies, a))} />)}
          </Row>
          <Input value={f.dietaryNotes} onChangeText={(v) => set('dietaryNotes', v)} placeholder={t('Koi aur baat — maslan kam meetha')} />
        </FormSection>

        <FormSection title={t('Design')} description={t('Kitchen parchi par yahi chhapta hai')}>
          <Input label={t('Cake par kya likhna hai')} value={f.messageOnCake} onChangeText={(v) => set('messageOnCake', v.slice(0, 100))} placeholder={t('Happy Birthday Ali')}
            hint={t('{{count}}/100 — spelling customer se dobara poochein', { count: f.messageOnCake.length })} />
          <Input label={t('Likhai ka rang')} value={f.messageColor} onChangeText={(v) => set('messageColor', v)} placeholder={t('Sunehri, safaid…')} />
          <Switch value={f.hasPhotoOnCake} onChange={(v) => set('hasPhotoOnCake', v)} label={t('Photo cake')} description={t('Customer ki photo cake par chhapni hai')} />
          {f.hasPhotoOnCake && (
            <>
              <PhotoField max={1} value={f.photoUrl ? [{ url: f.photoUrl }] : []} onChange={(v) => set('photoUrl', v[0]?.url ?? '')} />
              <Switch value={f.hasEdibleImage} onChange={(v) => set('hasEdibleImage', v)} label={t('Edible print (khane wala kaghaz)')} />
            </>
          )}
          <Text size="sm" weight="semibold" tone="secondary">{t('Design ki misaal (photos)')}</Text>
          <PhotoField max={6} value={f.designReferenceUrls.map((url) => ({ url }))} onChange={(v) => set('designReferenceUrls', v.map((x) => x.url))} />
          <Input label={t('Theme')} value={f.colorTheme} onChangeText={(v) => set('colorTheme', v)} placeholder={t('Frozen, cricket…')} />
          <Row gap={2}>
            <Input containerStyle={{ flex: 1 }} label={t('Pehla rang')} value={f.primaryColor} onChangeText={(v) => set('primaryColor', v)} placeholder={t('Gulabi')} />
            <Input containerStyle={{ flex: 1 }} label={t('Doosra rang')} value={f.secondaryColor} onChangeText={(v) => set('secondaryColor', v)} placeholder={t('Safaid')} />
          </Row>
          <Text size="sm" weight="semibold" tone="secondary">{t('Sajawat')}</Text>
          <Row gap={2} wrap>{[...DECORATIONS, ...f.decorativeItems.filter((d) => !DECORATIONS.includes(d))].map((d) => <Chip key={d} label={t(d)} selected={f.decorativeItems.includes(d)} onPress={() => set('decorativeItems', toggle(f.decorativeItems, d))} />)}</Row>
          <TextArea label={t('Design ki details')} value={f.designInstructions} onChangeText={(v) => set('designInstructions', v)} maxLength={2000} placeholder={t('Upar 3 gulab, side par sunehri moti, neeche naam…')} hint={t('Jitna saaf likhenge, utni kam ghalti')} />
          <Row gap={2}>
            <NumberInput integer containerStyle={{ flex: 1 }} label={t('Mombatti')} value={f.candlesRequired} onChangeValue={(v) => set('candlesRequired', v)} placeholder="0" />
            <Input containerStyle={{ flex: 2 }} label={t('Kaisi mombatti')} value={f.candleType} onChangeText={(v) => set('candleType', v)} placeholder={t('Number, sparkler')} />
          </Row>
          <Row gap={2} wrap>
            <Chip label={t('Cake stand')} selected={f.cakeStand} onPress={() => set('cakeStand', !f.cakeStand)} />
            <Chip label={t('Chhuri')} selected={f.cakeKnife} onPress={() => set('cakeKnife', !f.cakeKnife)} />
          </Row>
        </FormSection>

        <FormSection title={t('Mauqa')} description={t('Kis ke liye aur kab ka function')}>
          <ChipGroup wrap value={f.occasion} onChange={(v) => set('occasion', v)} options={OCCASIONS.map((o) => ({ value: o.value, label: `${o.emoji} ${t(o.label)}` }))} />
          <Row gap={2}>
            <Input containerStyle={{ flex: 2 }} label={t('Kis ke liye')} value={f.celebrantName} onChangeText={(v) => set('celebrantName', v)} placeholder={t('Ali')} />
            <NumberInput integer containerStyle={{ flex: 1 }} label={t('Umar')} value={f.celebrantAge} onChangeValue={(v) => set('celebrantAge', v)} placeholder="5" />
          </Row>
          <Row gap={2}>
            <View style={{ flex: 1 }}><DatePicker label={t('Function ki date')} value={f.eventDate} onChange={(d) => set('eventDate', d)} hint={t('Marzi hai')} /></View>
            <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Function ka waqt')} value={f.eventTime ? new Date(`2000-01-01T${f.eventTime}:00`) : null} onChange={(d) => set('eventTime', hhmm(d))} hint={t('Marzi hai')} /></View>
          </Row>
          <Input label={t('Jagah')} value={f.eventVenue} onChangeText={(v) => set('eventVenue', v)} placeholder={t('Ghar, hall ka naam')} hint={t('Marzi hai')} />
        </FormSection>

        <FormSection title={t('Kab aur kaise')} description={t('Isi waqt ke hisaab se list me Aaj / Late aata hai')}>
          <View style={{ gap: th.space(2) }}>
            {DELIVERY.map((d) => (
              <ListRow key={d.id} icon={d.icon} iconTone={f.deliveryType === d.id ? 'brand' : 'neutral'} title={t(d.label)} subtitle={t(d.hint)} selected={f.deliveryType === d.id} onPress={() => set('deliveryType', d.id)} />
            ))}
          </View>
          <Row gap={2}>
            <View style={{ flex: 1 }}>
              <DatePicker label={delivers ? t('Kab pahunchana hai') : t('Customer kab lega')} value={f.neededBy} minimumDate={editing ? undefined : new Date()}
                onChange={(d) => { const x = new Date(d); const old = f.neededBy ?? new Date(new Date().setHours(19, 0, 0, 0)); x.setHours(old.getHours(), old.getMinutes(), 0, 0); set('neededBy', x); }} />
            </View>
            <View style={{ flex: 1 }}>
              <DatePicker mode="time" label={t('Waqt')} value={f.neededBy} onChange={(d) => { const x = new Date(f.neededBy ?? new Date()); x.setHours(d.getHours(), d.getMinutes(), 0, 0); set('neededBy', x); }} />
            </View>
          </Row>
          <Row gap={2} wrap>{quickTimes().map((q) => <Chip key={q.label} label={q.label} selected={!!f.neededBy && Math.abs(f.neededBy.getTime() - q.d.getTime()) < 60_000} onPress={() => set('neededBy', q.d)} />)}</Row>
          {f.neededBy && <Text size="xs" tone="muted">{dateTime(f.neededBy.toISOString())}</Text>}
          {delivers && (
            <>
              <TextArea label={t('Pata')} value={f.deliveryAddress} onChangeText={(v) => set('deliveryAddress', v)} placeholder={t('Ghar #, gali, mohalla')} />
              <Input label={t('Nishani')} value={f.deliveryLandmark} onChangeText={(v) => set('deliveryLandmark', v)} placeholder={t('Masjid ke saamne')} />
              <MoneyInput label={t('Delivery charges')} value={f.deliveryCharges} onChangeValue={(v) => set('deliveryCharges', v)} />
            </>
          )}
        </FormSection>

        <FormSection title={t('Qeemat aur advance')} description={t('Kul rakam khud jurti hai')}>
          <MoneyInput label={t('Cake ki qeemat')} value={f.basePrice} onChangeValue={(v) => set('basePrice', v)} size="lg" />
          <Row gap={2}>
            <MoneyInput containerStyle={{ flex: 1 }} label={t('Design / sajawat')} value={f.customizationCharges} onChangeValue={(v) => set('customizationCharges', v)} />
            <MoneyInput containerStyle={{ flex: 1 }} label={t('Photo cake')} value={f.photoCakeCharges} onChangeValue={(v) => set('photoCakeCharges', v)} />
          </Row>
          <Row gap={2}>
            <MoneyInput containerStyle={{ flex: 1 }} label={t('Tax')} value={f.taxAmount} onChangeValue={(v) => set('taxAmount', v)} />
            <MoneyInput containerStyle={{ flex: 1 }} label={t('Discount')} value={f.discount} onChangeValue={(v) => set('discount', v)} />
          </Row>
          <Card tone="muted"><Row justify="between"><Text weight="semibold">{t('Kul')}</Text><Amount value={total} weight="bold" size="lg" /></Row></Card>
          <MoneyInput label={t('Kitna advance chahiye')} value={f.advanceRequired} onChangeValue={(v) => set('advanceRequired', v)} placeholder={String(Math.round(total * 0.5))} hint={t('Khali chhorein to aadha')} />
          <Row gap={2} wrap>{[0, 25, 50, 100].map((p) => <Chip key={p} label={`${p}%`} selected={f.advanceRequired !== null && n(f.advanceRequired) === Math.round((total * p) / 100)} onPress={() => set('advanceRequired', Math.round((total * p) / 100))} />)}</Row>
          {editing ? (
            <Text size="sm" tone="secondary">{t('Ab tak mila: {{paid}}. Naya paisa order ke safhe par "Paisa mila" se likhein.', { paid: formatMoney(alreadyPaid) })}</Text>
          ) : (
            <>
              <MoneyInput label={t('Abhi advance mila')} value={f.advancePaid} onChangeValue={(v) => set('advancePaid', v)}
                hint={advanceNow > 0 && advanceNow < ask ? t('{{formatPKR}} advance abhi kam hai', { formatPKR: formatMoney(ask - advanceNow) }) : t('Customer ne abhi kitna diya')} />
              <Row gap={2} wrap>{[ask, total].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => <Chip key={v} label={`${v === total ? t('Poora') : t('Advance')} ${formatMoney(v)}`} selected={n(f.advancePaid) === v} onPress={() => set('advancePaid', v)} />)}</Row>
              {advanceNow > 0 && <ChipGroup wrap value={f.payMethod} onChange={(v) => set('payMethod', v)} options={PAY_METHODS.map((m) => ({ value: m.id, label: t(m.label) }))} />}
              {advanceNow <= 0 && <Switch value={f.confirmed} onChange={(v) => set('confirmed', v)} label={t('Order pakka hai')} description={f.confirmed ? t('Bina advance ke bhi pakka') : t('Sirf rate bataya — abhi pakka nahi')} />}
            </>
          )}
          <Card tone="brand"><Row justify="between"><Text weight="semibold">{t('Lete waqt baqi')}</Text><Amount value={balance} weight="bold" size="lg" /></Row></Card>
        </FormSection>

        <FormSection title={t('Note')}>
          <TextArea label={t('Customer ke liye')} value={f.specialInstructions} onChangeText={(v) => set('specialInstructions', v)} maxLength={1000} placeholder={t('Delivery se pehle call karein')} hint={t('Parchi par chhapta hai')} />
          <TextArea label={t('Sirf andar ke liye')} value={f.internalNotes} onChangeText={(v) => set('internalNotes', v)} maxLength={1000} placeholder={t('Purana customer — achi sajawat')} hint={t('Kahin nahi chhapta')} />
        </FormSection>
        {problems.length > 0 && (f.customerName || f.basePrice || editing) ? <Text size="sm" tone="warning">{problems[0]}</Text> : null}
      </FormTemplate>

      <CustomerPickerSheet open={pickCustomer} title={t('Customer chunein')} onClose={() => setPickCustomer(false)}
        onPick={(c) => { setPickCustomer(false); setDirty(true); setF((x) => ({ ...x, customerId: c.id, customerName: c.name, customerPhone: c.phone ?? '' })); }} />
      <ProductPicker open={pickProduct} onClose={() => setPickProduct(false)} title={t('Maal se jorein')} includeRaw={false} variants={false}
        onPick={(p) => { setPickProduct(false); setDirty(true); setF((x) => ({ ...x, productId: p.product.id, productName: p.product.name, basePrice: x.basePrice || p.product.price || null })); }} />
      {saved && <SavedSheet o={saved} shop={shop} lang={lang} onAnother={() => { setSaved(null); setF(EMPTY); }} />}
    </>
  );
}

function SavedSheet({ o, shop, lang, onAnother }: { o: CakeOrder; shop: string; lang: ReturnType<typeof useBillLanguage>; onAnother: () => void }) {
  const th = useTheme();
  const view = () => router.replace(`/bakery/cake-orders/${o.id}` as never);
  return (
    <Sheet open onClose={view} title={t('Order {{orderNumber}} ban gaya', { orderNumber: o.orderNumber })} description={`${o.customerName} · ${dateTime(o.neededBy)}`}
      footer={<Row gap={2}><Button style={{ flex: 1 }} variant="ghost" onPress={onAnother}>{t('Aur naya order')}</Button><Button style={{ flex: 1 }} onPress={view}>{t('Order dekhein')}</Button></Row>}>
      <View style={{ gap: th.space(3) }}>
        <Card tone="success"><Row gap={2}><CheckCircle2 size={18} color={th.colors.success.text} />
          <Text size="sm" style={{ flex: 1 }}>{t('Kul {{total}} · advance {{paidAmount}} · baqi {{formatPKR}}', { total: formatMoney(o.total), paidAmount: formatMoney(o.paidAmount), formatPKR: formatMoney(Math.max(o.total - o.paidAmount, 0)) })}</Text>
        </Row></Card>
        <Button fullWidth variant="success" icon={MessageCircle} onPress={() => openWhatsApp(o.customerPhone, cakeText(o, shop, lang))}>{t('Customer ko WhatsApp par tasdeeq bhejein')}</Button>
        <Row gap={2}>
          <Button style={{ flex: 1 }} variant="secondary" icon={Printer} onPress={() => void sendSlip(cakeSlip(o, shop, false, lang), shop, lang)}>{t('Customer parchi')}</Button>
          <Button style={{ flex: 1 }} variant="secondary" icon={ChefHat} onPress={() => void sendSlip(cakeSlip(o, shop, true, lang), shop, lang)}>{t('Kitchen parchi')}</Button>
        </Row>
        <Text size="xs" tone="muted" align="center">{t('Us din ke baking plan me khud aa jayega')}</Text>
      </View>
    </Sheet>
  );
}

