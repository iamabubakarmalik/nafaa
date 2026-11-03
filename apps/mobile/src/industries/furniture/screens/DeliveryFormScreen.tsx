/** New delivery (web DeliveriesPage CreateModal): from a custom order, a counter bill (?saleId) or just goods. Charges add up live; stairs are charged by floor without a lift. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { deliveryCharges, floorCharge } from '@nafaa/core/industries/furniture';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, ChipGroup, DatePicker, FormSection, FormTemplate, Input, MoneyInput, Row, Select, Switch, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, dateToKey, keyToDate, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { customOrdersApi, deliveriesApi, type DeliveryInput } from '../api';
import { FURNITURE_KEYS, SLOTS, opt, phoneOk, refreshFurniture } from '../meta';

export function DeliveryFormScreen() {
  const th = useTheme();
  const { saleId } = useLocalSearchParams<{ saleId?: string }>();
  const { guard } = useDeskOnline('furnitureDesk');
  const orders = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'for-delivery'], queryFn: () => customOrdersApi.page({ status: 'READY_FOR_DELIVERY,IN_PRODUCTION', page: 1, limit: 100 }), enabled: !saleId });
  const [v, setV] = useState({
    customOrderId: '', customerName: '', customerPhone: '', deliveryAddress: '', city: '', area: '', landmark: '', floor: null as number | null, hasLift: false,
    date: todayKey(), slot: '', items: '', delivery: null as number | null, loading: null as number | null, unloading: null as number | null, floorCharge: null as number | null,
    assembly: null as number | null, requiresAssembly: true, notes: '',
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (p: Partial<typeof v>) => { setDirty(true); setV((x) => ({ ...x, ...p })); };
  const pickOrder = (id: string) => {
    const o = orders.data?.items.find((x) => x.id === id);
    if (!o) { set({ customOrderId: '' }); return; }
    set({ customOrderId: id, customerName: o.customerName, customerPhone: o.customerPhone, deliveryAddress: o.deliveryAddress || o.customerAddress || '', city: o.deliveryCity ?? '', area: o.deliveryArea ?? '', items: o.productType, requiresAssembly: o.requiresInstallation });
  };
  const floor = Math.round(v.floor ?? 0);
  const autoFloor = !v.hasLift && floor > 0 && v.floorCharge == null ? floorCharge(floor, false) : null;
  const total = deliveryCharges({ delivery: v.delivery, loading: v.loading, unloading: v.unloading, floorCharge: v.floorCharge, assembly: v.assembly, floor, hasLift: v.hasLift });
  const errors = {
    customerName: !v.customerName.trim() ? t('Naam likhein') : undefined,
    customerPhone: !v.customerPhone.trim() ? t('Phone likhein') : !phoneOk(v.customerPhone) ? t('10 se 15 hindse') : undefined,
    deliveryAddress: !v.deliveryAddress.trim() ? t('Pata likhein') : undefined,
  };
  const err = (k: keyof typeof errors) => (tried ? errors[k] : undefined);

  const submit = () => guard(async () => {
    setTried(true);
    const first = Object.values(errors).find(Boolean);
    if (first) { toast.error(first); return; }
    const payload: DeliveryInput = {
      saleId, customOrderId: v.customOrderId || undefined, customerName: v.customerName.trim(), customerPhone: v.customerPhone.trim(), deliveryAddress: v.deliveryAddress.trim(),
      city: opt(v.city), area: opt(v.area), landmark: opt(v.landmark), floorNumber: floor || undefined, hasLift: v.hasLift, scheduledDate: v.date || undefined, scheduledSlot: v.slot || undefined,
      deliveryCharge: v.delivery ?? 0, loadingCharge: v.loading ?? 0, unloadingCharge: v.unloading ?? 0, floorCharge: v.floorCharge == null ? undefined : v.floorCharge, assemblyCharge: v.assembly ?? 0,
      requiresAssembly: v.requiresAssembly, productNames: v.items.split(',').map((x) => x.trim()).filter(Boolean), notes: opt(v.notes),
    };
    setSaving(true);
    try {
      const d = await deliveriesApi.create(payload);
      setDirty(false);
      refreshFurniture([FURNITURE_KEYS.deliveries, FURNITURE_KEYS.orders], false);
      toast.success(t('{{deliveryNumber}} ban gayi', { deliveryNumber: d.deliveryNumber }));
      router.replace(`/furniture/deliveries/${d.id}` as never);
    } catch (e) { toast.error(apiErrorMessage(e, t('Delivery nahi bani'))); } finally { setSaving(false); }
  });

  return (
    <FormTemplate title={t('Nayi delivery')} subtitle={saleId ? t('Counter ke bill ki delivery — saman bill se khud aayega') : t('Custom order ya kisi bhi saman ki')} dirty={dirty} saving={saving} onSave={submit}>
      <View style={{ gap: th.space(4) }}>
        <OfflineNote feature="furnitureDesk" />
        <FormSection title={t('Customer')}>
          {!saleId && (
            <Select label={t('Custom order')} value={v.customOrderId} searchable onChange={pickOrder} placeholder={t('Order nahi — sirf saman')} hint={t('Order ki delivery par us ka bill banta hai')}
              options={[{ value: '', label: t('Order nahi — sirf saman') }, ...(orders.data?.items ?? []).map((o) => ({ value: o.id, label: `${o.orderNumber} · ${o.productType} · ${o.customerName}` }))]} />
          )}
          <Input label={t('Customer')} value={v.customerName} onChangeText={(x) => set({ customerName: x })} error={err('customerName')} />
          <Input label={t('Phone')} keyboardType="phone-pad" ltr value={v.customerPhone} onChangeText={(x) => set({ customerPhone: x })} error={err('customerPhone')} hint={t('Driver isi par call karega')} />
          <Input label={t('Pata')} value={v.deliveryAddress} onChangeText={(x) => set({ deliveryAddress: x })} error={err('deliveryAddress')} placeholder={t('House 12, Street 4')} />
          <Input label={t('Ilaqa')} value={v.area} onChangeText={(x) => set({ area: x })} placeholder={t('Johar Town')} />
          <Input label={t('Shehar')} value={v.city} onChangeText={(x) => set({ city: x })} placeholder={t('Lahore')} />
          <Input label={t('Nishani')} value={v.landmark} onChangeText={(x) => set({ landmark: x })} placeholder={t('Masjid ke saath')} />
        </FormSection>
        <FormSection title={t('Kab')}>
          <DatePicker label={t('Date')} value={keyToDate(v.date)} onChange={(x) => set({ date: dateToKey(x) })} />
          <ChipGroup wrap value={v.slot} onChange={(x) => set({ slot: v.slot === x ? '' : x })} options={SLOTS.map((x) => ({ value: x, label: x }))} />
          <NumberInput label={t('Kaunsi manzil')} integer value={v.floor} onChangeValue={(x) => set({ floor: x })} placeholder={t('0 = ground')} />
          {floor > 0 && <Switch value={v.hasLift} onChange={(x) => set({ hasLift: x })} label={t('Lift hai')} description={t('Lift na ho to seerhi ka charge lagta hai')} />}
          {!saleId && !v.customOrderId && <Input label={t('Saman')} value={v.items} onChangeText={(x) => set({ items: x })} placeholder={t('Sofa set, center table')} hint={t('Comma laga kar')} />}
        </FormSection>
        <FormSection title={t('Charges')}>
          <MoneyInput label={t('Kiraya gaari')} value={v.delivery} onChangeValue={(x) => set({ delivery: x })} />
          <MoneyInput label={t('Loading')} value={v.loading} onChangeValue={(x) => set({ loading: x })} />
          <MoneyInput label={t('Unloading')} value={v.unloading} onChangeValue={(x) => set({ unloading: x })} />
          <MoneyInput label={t('Seerhi')} value={v.floorCharge} onChangeValue={(x) => set({ floorCharge: x })} placeholder={autoFloor ? String(autoFloor) : undefined} hint={autoFloor ? t('500 har manzil') : undefined} />
          <MoneyInput label={t('Fitting')} value={v.assembly} onChangeValue={(x) => set({ assembly: x })} />
          <Switch value={v.requiresAssembly} onChange={(x) => set({ requiresAssembly: x })} label={t('Ghar par fitting')} />
          <Card tone="default"><Row justify="between"><Text size="sm">{t('Charges:')}</Text><Text weight="bold" ltr>{total ? formatMoney(total) : t('Free')}</Text></Row></Card>
          <Input label={t('Note (driver ke liye)')} value={v.notes} onChangeText={(x) => set({ notes: x })} multiline />
        </FormSection>
      </View>
    </FormTemplate>
  );
}
