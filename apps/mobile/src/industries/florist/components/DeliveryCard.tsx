/** The "Delivery / order" card at the top of the bill: recipient, address, card, day and slot (web florist DeliveryCard). */

import { Gift, RotateCw, Truck, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { blankDraft, type DeliverySlot, type OrderType } from '@nafaa/core/industries/florist';
import { t } from '@/core/i18n';
import { Button, ChipGroup, DatePicker, IconButton, Input, PressableScale, Row, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { dateToKey, keyToDate, todayKey } from '../../_shared/deskKit';
import { floristOrdersApi } from '../api';
import { FLORIST_KEYS, ORDER_TYPE, SLOT, refreshFlorist } from '../meta';
import { deliveryStore, draftProblemTexts, useDeliveryState, type DeliveryDraft } from '../deliveryDraft';
import { toOrderBody } from '@nafaa/core/industries/florist';

const TYPES: OrderType[] = ['DELIVERY', 'EVENT', 'CORPORATE', 'WALK_IN'];

export function DeliveryCard() {
  const th = useTheme();
  const { draft, failed } = useDeliveryState();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    if (!failed) return;
    setBusy(true);
    try {
      await floristOrdersApi.fromSale(toOrderBody(failed.saleId, failed.draft));
      deliveryStore.set({ failed: null });
      refreshFlorist([FLORIST_KEYS.orders]);
      toast.success(t('Delivery order ban gaya'));
    } catch { toast.error(t('Delivery order abhi nahi bana')); } finally { setBusy(false); }
  };
  const problems = draft ? draftProblemTexts(draft) : [];
  return (
    <>
      {failed && (
        <Row gap={2} style={{ padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors.danger.soft }}>
          <Text size="xs" tone="danger" style={{ flex: 1 }}>{t('Bill {{saleNumber}}: delivery order nahi bana', { saleNumber: failed.saleNumber })}</Text>
          <IconButton icon={RotateCw} label={t('Dobara')} size="sm" disabled={busy} onPress={() => void retry()} />
          <IconButton icon={X} label={t('Chhor dein')} size="sm" onPress={() => deliveryStore.set({ failed: null })} />
        </Row>
      )}
      <PressableScale onPress={() => { if (!draft) deliveryStore.set({ draft: blankDraft(todayKey()) }); setOpen(true); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(2.5), borderRadius: th.radius('lg'), backgroundColor: draft ? th.colors.brand.soft : th.colors.surface, borderWidth: 1, borderColor: draft ? th.colors.brand.solid : th.colors.border }}>
        <Truck size={18} color={th.colors.brand.solid} />
        <View style={{ flex: 1 }}>
          <Text size="sm" weight="semibold">{draft ? t(ORDER_TYPE[draft.orderType]) : t('Delivery / order')}</Text>
          <Text size="xs" tone={problems.length ? 'danger' : 'muted'} numberOfLines={1}>
            {draft ? (problems[0] ?? [draft.recipientName, draft.area || draft.deliveryAddress, draft.scheduledDeliveryDate].filter(Boolean).join(' · ')) : t('Pata, card ka message, din aur waqt')}
          </Text>
        </View>
        {draft && <IconButton icon={X} label={t('Hatayein')} size="sm" onPress={() => deliveryStore.set({ draft: null })} />}
      </PressableScale>
      <DeliverySheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function DeliverySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const { draft } = useDeliveryState();
  if (!draft) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  const set = (patch: Partial<DeliveryDraft>) => deliveryStore.set({ draft: { ...draft, ...patch } });
  const delivery = draft.orderType === 'DELIVERY' || draft.orderType === 'CORPORATE';
  return (
    <Sheet open={open} onClose={onClose} height={0.9} title={t('Delivery / order')} description={t('Bill ke saath order ban jayega')}
      footer={<Button fullWidth size="lg" icon={Gift} onPress={onClose}>{t('Theek hai')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup value={draft.orderType} onChange={(v) => set({ orderType: v as OrderType })} options={TYPES.map((k) => ({ value: k, label: t(ORDER_TYPE[k]) }))} />
        {draft.orderType !== 'WALK_IN' && (
          <>
            <DatePicker label={t('Delivery ki date')} value={keyToDate(draft.scheduledDeliveryDate)} minimumDate={new Date()} onChange={(x) => set({ scheduledDeliveryDate: dateToKey(x) })} />
            <ChipGroup wrap value={draft.deliveryTimeSlot} onChange={(v) => set({ deliveryTimeSlot: v as DeliverySlot })} options={(Object.keys(SLOT) as DeliverySlot[]).map((k) => ({ value: k, label: t(SLOT[k]) }))} />
          </>
        )}
        {delivery && (
          <>
            <Input label={t('Lene wale ka naam')} value={draft.recipientName} onChangeText={(v) => set({ recipientName: v })} />
            <Input label={t('Lene wale ka phone')} keyboardType="phone-pad" ltr value={draft.recipientPhone} onChangeText={(v) => set({ recipientPhone: v })} placeholder="0300 1234567" />
            <TextArea label={t('Delivery ka pata')} value={draft.deliveryAddress} onChangeText={(v) => set({ deliveryAddress: v })} />
            <Input label={t('Area')} value={draft.area} onChangeText={(v) => set({ area: v })} />
            <Input label={t('Landmark (marzi)')} value={draft.landmark} onChangeText={(v) => set({ landmark: v })} />
          </>
        )}
        {draft.orderType === 'EVENT' && (
          <>
            <Input label={t('Event ka naam (marzi)')} value={draft.eventName} onChangeText={(v) => set({ eventName: v })} />
            <Input label={t('Event ki jagah')} value={draft.eventVenue} onChangeText={(v) => set({ eventVenue: v })} />
          </>
        )}
        {draft.orderType !== 'WALK_IN' && (
          <>
            <TextArea label={t('Card ka message (marzi)')} value={draft.messageCard} onChangeText={(v) => set({ messageCard: v })} placeholder={t('Janamdin mubarak…')} hint={`${draft.messageCard.length}/500`} />
            <Switch value={draft.isAnonymous} onChange={(v) => set({ isAnonymous: v })} label={t('Naam nahi batana')} />
            {!draft.isAnonymous && <Input label={t('Bhejne wale ka naam (marzi)')} value={draft.senderName} onChangeText={(v) => set({ senderName: v })} />}
            <TextArea label={t('Khaas hidayat (marzi)')} value={draft.specialInstructions} onChangeText={(v) => set({ specialInstructions: v })} />
          </>
        )}
      </View>
    </Sheet>
  );
}
