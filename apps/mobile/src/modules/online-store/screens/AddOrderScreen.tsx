/**
 * Add order (web AddOrderPage): an order that came on WhatsApp, Instagram,
 * Facebook, TikTok or the phone. Form tab: source, customer, items, charges,
 * COD or paid with an optional advance, where to save it (Nafaa, or Nafaa
 * and a Shopify store) and "accept right away". Paste tab: the customer's
 * message is read by the server and fills the form. Excel import stays on
 * the web (a phone has no spreadsheet to pick).
 */

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { ClipboardPaste, FileSpreadsheet, Save, Wand2 } from 'lucide-react-native';
import type { AdvanceMethod } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import {
  Button, Card, ChipGroup, HeroAmount, Input, MoneyInput, Screen, Segmented, SectionHeader, Switch, Tabs, TextArea, Text, toast, useTheme,
} from '@/design';
import { apiErrorMessage, ordersApi } from '../api/online';
import { boardApi, type OrderSource, type ParsedOrder } from '../api/board';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { Note } from '../components/bits';
import { ItemsEditor, TotalsBox, lineKey, subtotalOf, type ItemLine } from '../components/order/ItemsEditor';
import { ADVANCE_METHODS } from '../lib/labels';
import { KEYS, refreshOrders, useOnlineGuard } from '../lib/online';
import { openOnWeb } from '../lib/device';

const SOURCES: Array<{ value: OrderSource; label: string }> = [
  { value: 'WHATSAPP', label: 'WhatsApp' }, { value: 'INSTAGRAM', label: 'Instagram' }, { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'TIKTOK', label: 'TikTok' }, { value: 'PHONE', label: 'Phone' }, { value: 'MANUAL', label: 'Manual' },
];
const SAMPLE = 'Ali Raza\n0300 1234567\nHouse 12, Street 4, Gulberg\nLahore\n2 x Black shirt (M)\n1 jeans\nCOD Rs 3500';

interface Draft {
  source: OrderSource; name: string; phone: string; address: string; city: string; items: ItemLine[];
  discount: number; deliveryFee: number; isCod: boolean; advance: number; advanceMethod: AdvanceMethod; weight: string; notes: string; target: string; accept: boolean;
}
const empty = (): Draft => ({
  source: 'WHATSAPP', name: '', phone: '', address: '', city: '', items: [], discount: 0, deliveryFee: 0, isCod: true, advance: 0,
  advanceMethod: 'JAZZCASH', weight: '', notes: '', target: 'NAFAA', accept: false,
});

export function AddOrderScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { guard } = useOnlineGuard();
  const params = useLocalSearchParams<{ replacementOf?: string; replacementNo?: string }>();
  const [tab, setTab] = useState<'form' | 'paste'>('form');
  const [d, setD] = useState<Draft>(empty);
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const channelsQ = useQuery({ queryKey: KEYS.channels, queryFn: ordersApi.channels, staleTime: 5 * 60_000 });
  const shopify = (channelsQ.data ?? []).filter((c) => c.type === 'SHOPIFY');
  const subtotal = useMemo(() => subtotalOf(d.items), [d.items]);
  const total = Math.max(0, subtotal - d.discount + d.deliveryFee);

  const problems = [
    !d.name.trim() && t('Customer ka naam likhein'),
    d.phone.replace(/\D/g, '').length < 10 && t('Sahi phone number likhein'),
    !d.items.length && t('Kam se kam ek cheez jorein'),
    d.items.some((i) => !i.productId) && t('Har cheez ko Nafaa product se jorein'),
    d.isCod && d.advance > total && t('Advance total se zyada hai'),
  ].filter(Boolean) as string[];

  const parse = useMutation({
    mutationFn: () => boardApi.parse(text),
    onSuccess: (p: ParsedOrder) => {
      const items: ItemLine[] = p.items.map((it) => (it.match
        ? { key: lineKey(), productId: it.match.productId, variantId: it.match.variantId, name: it.match.name, quantity: it.quantity || 1, price: it.price ?? it.match.price }
        : { key: lineKey(), productId: null, name: it.text, quantity: it.quantity || 1, price: it.price ?? 0 }));
      setD((x) => ({
        ...x, name: p.customerName ?? x.name, phone: p.phone ?? x.phone, address: p.address ?? x.address, city: p.city ?? x.city,
        items: items.length ? items : x.items,
        notes: p.codAmount ? [x.notes, t('Message me COD: Rs {{amount}}', { amount: p.codAmount })].filter(Boolean).join('\n') : x.notes,
      }));
      toast.success(t('Message parh liya — {{matched}}/{{count}} cheezein mil gayin', { matched: p.items.filter((i) => i.match).length, count: p.items.length }));
      setTab('form');
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Message nahi parha gaya'))),
  });

  const save = useMutation({
    mutationFn: () => boardApi.createManual({
      source: d.source, target: d.target,
      customer: { name: d.name.trim(), phone: d.phone.trim(), address: d.address.trim() || undefined, city: d.city.trim() || undefined },
      items: d.items.map((i) => ({ productId: i.productId!, variantId: i.variantId ?? null, quantity: i.quantity, price: i.price })),
      discount: d.discount || undefined, deliveryFee: d.deliveryFee || undefined, isCod: d.isCod,
      advance: d.isCod && d.advance > 0 ? { amount: d.advance, method: d.advanceMethod } : undefined,
      weightKg: Number(d.weight) > 0 ? Number(d.weight) : undefined, notes: d.notes.trim() || undefined,
      replacementOf: params.replacementOf, accept: d.accept,
    }),
    onSuccess: (r) => {
      refreshOrders(qc, r.order.id);
      haptic('success');
      if (d.accept && !r.accepted) toast.error(t('Order ban gaya magar accept nahi hua: {{error}}', { error: r.acceptError ?? '' }), { duration: 10_000 });
      else toast.success(t('Order #{{no}} ban gaya', { no: String(r.order.externalOrderNumber ?? r.order.externalOrderId ?? '') }));
      if (r.advanceError) toast.error(t('Advance save nahi hua: {{error}}', { error: r.advanceError }), { duration: 10_000 });
      if (r.sync && !r.sync.ok) toast.error(t('{{channel}} par nahi bana: {{message}}', { channel: r.sync.channel, message: r.sync.message }), { duration: 10_000 });
      router.replace(`/online/orders/${r.order.id}` as never);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Order nahi bana'))),
  });
  const submit = guard(() => { setTried(true); if (!problems.length) save.mutate(); });

  return (
    <Screen title={t('Add order')} keyboard actions={<OnlineMenuButton current="/online/orders/new" />}
      footer={tab === 'form' ? <Button size="lg" fullWidth icon={Save} loading={save.isPending} onPress={submit}>{d.accept ? t('Order banayein + accept') : t('Order banayein')}</Button> : undefined}>
      <View style={{ gap: th.space(4) }}>
        <CommerceHero chip={params.replacementNo ? t('Replacement #{{no}}', { no: params.replacementNo }) : t('Naya order')}
          stats={[
            { label: t('Total'), value: <HeroAmount value={total} size="2xl" /> },
            { label: t('Cheezein'), value: String(d.items.reduce((a, i) => a + i.quantity, 0)) },
            { label: t('COD lena hai'), value: <HeroAmount value={d.isCod ? Math.max(0, total - d.advance) : 0} size="lg" /> },
            { label: t('Advance'), value: <HeroAmount value={d.isCod ? d.advance : 0} size="lg" /> },
          ]} />
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'form', label: t('Form') }, { value: 'paste', label: t('Message paste') }]} />

        {tab === 'paste' ? (
          <View style={{ gap: th.space(3) }}>
            <Text size="sm" tone="secondary">{t('Customer ka WhatsApp ya Instagram message yahan daalein. Naam, phone, address, shehar aur cheezein khud bhar jayengi — phir check kar ke save karein.')}</Text>
            <TextArea value={text} onChangeText={setText} placeholder={SAMPLE} numberOfLines={9} />
            <View style={{ flexDirection: 'row', gap: th.space(2) }}>
              <Button style={{ flex: 1 }} icon={Wand2} disabled={!text.trim()} loading={parse.isPending} onPress={guard(() => parse.mutate())}>{t('Form bharein')}</Button>
              <Button variant="secondary" icon={ClipboardPaste} onPress={async () => setText(await Clipboard.getStringAsync())}>{t('Paste')}</Button>
            </View>
            <Note tone="info" icon={FileSpreadsheet} action={<Button size="sm" variant="secondary" onPress={() => openOnWeb('/online-orders/new')}>{t('Web par kholein')}</Button>}>
              {t('Excel se bahut se orders ek saath — ye kaam web par hota hai.')}
            </Note>
          </View>
        ) : (
          <>
            {tried && problems.length > 0 && <Note tone="danger">{problems.join('\n')}</Note>}
            <View style={{ gap: th.space(2) }}>
              <SectionHeader title={t('Order kahan se aaya')} />
              <ChipGroup wrap value={d.source} onChange={(v) => set('source', v)} options={SOURCES.map((s) => ({ ...s, label: s.value === 'PHONE' ? t('Phone') : s.value === 'MANUAL' ? t('Manual') : s.label }))} />
            </View>
            <Card title={t('Customer')}>
              <View style={{ gap: th.space(3) }}>
                <Input label={t('Naam')} value={d.name} onChangeText={(v) => set('name', v)} />
                <Input label={t('Phone')} value={d.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" placeholder="03xx xxxxxxx" ltr />
                <Input label={t('Shehar')} value={d.city} onChangeText={(v) => set('city', v)} />
                <Input label={t('Address')} value={d.address} onChangeText={(v) => set('address', v)} multiline />
              </View>
            </Card>
            <View style={{ gap: th.space(2) }}>
              <SectionHeader title={t('Cheezein')} />
              <ItemsEditor items={d.items} onChange={(items) => set('items', items)} />
            </View>
            <Card title={t('Paisa')}>
              <View style={{ gap: th.space(3) }}>
                <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                  <MoneyInput containerStyle={{ flex: 1 }} label={t('Discount')} value={d.discount || null} onChangeValue={(v) => set('discount', Math.max(0, v ?? 0))} />
                  <MoneyInput containerStyle={{ flex: 1 }} label={t('Delivery charges')} value={d.deliveryFee || null} onChangeValue={(v) => set('deliveryFee', Math.max(0, v ?? 0))} />
                </View>
                <Segmented value={d.isCod ? 'COD' : 'PAID'} onChange={(v) => set('isCod', v === 'COD')} options={[{ value: 'COD', label: t('COD (delivery par)') }, { value: 'PAID', label: t('Paisa mil chuka') }]} />
                {d.isCod && (
                  <>
                    <MoneyInput label={t('Advance mila')} value={d.advance || null} onChangeValue={(v) => set('advance', Math.max(0, v ?? 0))} />
                    {d.advance > 0 && <ChipGroup wrap value={d.advanceMethod} onChange={(v) => set('advanceMethod', v)} options={ADVANCE_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />}
                  </>
                )}
                <TotalsBox subtotal={subtotal} discount={d.discount} deliveryFee={d.deliveryFee} />
              </View>
            </Card>
            <Card title={t('Aur')}>
              <View style={{ gap: th.space(3) }}>
                <Input label={t('Wazan (kg)')} value={d.weight} onChangeText={(v) => set('weight', v)} keyboardType="decimal-pad" placeholder="0.5" />
                <TextArea label={t('Note')} value={d.notes} onChangeText={(v) => set('notes', v)} placeholder={t('Order ke saath note (slip par chhapta hai)')} />
                {shopify.length > 0 && (
                  <View style={{ gap: th.space(2) }}>
                    <Text size="sm" weight="semibold" tone="secondary">{t('Kahan banana hai')}</Text>
                    <ChipGroup wrap value={d.target} onChange={(v) => set('target', v)}
                      options={[{ value: 'NAFAA', label: t('Sirf Nafaa') }, ...shopify.map((c) => ({ value: c.id, label: t('Nafaa + {{name}}', { name: c.displayName }) }))]} />
                  </View>
                )}
                <Switch value={d.accept} onChange={(v) => set('accept', v)} label={t('Abhi accept karein')} description={t('Bill ban jayega aur stock kam ho jayega')} />
                {total > 0 && <Text size="xs" tone="muted">{t('Total {{total}}', { total: formatMoney(total) })}</Text>}
              </View>
            </Card>
          </>
        )}
      </View>
    </Screen>
  );
}
