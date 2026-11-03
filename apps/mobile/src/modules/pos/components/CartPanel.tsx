/**
 * The bill: customer (khata balance, credit limit, points), lines with a
 * stepper (swipe to remove, tap to edit), the money summary and the pay
 * buttons. The same panel sits beside the catalog on tablets and in the
 * slide-up sheet on phones.
 */

import { BookOpen, ChevronRight, PauseCircle, Percent, ReceiptText, ShoppingCart, Trash2, Truck, UserPlus, Wallet } from 'lucide-react-native';
import { memo, useRef } from 'react';
import { FlatList, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { creditStatus, type PosCartLine, type PriceTier } from '@nafaa/core/pos';
import { t } from '@/core/i18n';
import { formatMoney } from '@/core/format';
import { Amount, Avatar, Badge, Button, EmptyState, Icon, PressableScale, Row, Segmented, Text, useTheme } from '@/design';
import { useBill } from '../engine/bill';
import { useCounter } from '../engine/counter';
import { useBillTotals } from '../engine/totals';
import { openCheckoutSheet, openSheet, usePos } from '../engine/usePos';
import { MoneyRow, Stepper } from './parts';

export const TIER_LABEL: Record<PriceTier, string> = { RETAIL: 'Retail', WHOLESALE: 'Wholesale', CREDIT: 'Credit' };

const LineRow = memo(function LineRow({ line, onStep, onOpen, onRemove, last }: { line: PosCartLine; onStep: (id: string, d: number) => void; onOpen: (id: string) => void; onRemove: (id: string) => void; last: boolean }) {
  const th = useTheme();
  const ref = useRef<SwipeableMethods>(null);
  const edited = line.priceEdited && line.basePrice > line.unitPrice;
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      rightThreshold={64}
      overshootRight={false}
      onSwipeableOpen={() => { onRemove(line.id); }}
      renderRightActions={() => (
        <View style={{ width: 96, backgroundColor: th.colors.danger.solid, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Icon icon={Trash2} color={th.colors.danger.onSolid} />
          <Text size="xs" weight="semibold" color={th.colors.danger.onSolid}>{t('Remove')}</Text>
        </View>
      )}
    >
      <PressableScale onPress={() => onOpen(line.id)} scaleTo={0.995} pressedStyle={{ backgroundColor: th.colors.surfaceMuted }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), paddingHorizontal: th.space(3), paddingVertical: th.space(2), backgroundColor: th.colors.surface,
          borderBottomWidth: last ? 0 : 1, borderBottomColor: th.colors.divider }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text size="sm" weight="semibold" numberOfLines={2}>{line.variantName ? `${line.name} · ${line.variantName}` : line.name}</Text>
          <Row gap={1.5} wrap>
            <Text size="xs" tone="muted" ltr>{`${formatMoney(line.unitPrice)} × ${Number(line.quantity.toFixed(3))} ${line.unitName}`}</Text>
            {edited && <Badge tone="warning" size="sm">{t('Rate changed')}</Badge>}
            {line.dist?.free && <Badge tone="success" size="sm">{t('Free')}</Badge>}
            {line.priceTier && line.priceTier !== 'RETAIL' && !line.dist && <Badge tone="info" size="sm">{t(TIER_LABEL[line.priceTier])}</Badge>}
          </Row>
          {!!(line.customNote || line.note) && <Text size="2xs" tone="muted" numberOfLines={1}>{line.customNote || line.note}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Amount value={line.lineTotal} weight="bold" size="sm" />
          {line.lockQty
            ? <Text size="xs" tone="muted">{t('Qty fixed')}</Text>
            : <Stepper compact value={line.quantity} onMinus={() => onStep(line.id, -1)} onPlus={() => onStep(line.id, 1)} />}
        </View>
      </PressableScale>
    </ReanimatedSwipeable>
  );
});

function CustomerBar() {
  const th = useTheme();
  const customer = useBill((s) => s.customer);
  const totals = useBillTotals();
  if (!customer) {
    return (
      <PressableScale onPress={() => openSheet('customer')} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2.5), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: th.colors.surface, alignItems: 'center', justifyContent: 'center' }}><Icon icon={UserPlus} tone="brand" /></View>
        <View style={{ flex: 1 }}>
          <Text size="sm" weight="semibold">{t('Walk-in customer')}</Text>
          <Text size="xs" tone="muted">{t('Tap to pick a customer for khata or points')}</Text>
        </View>
        <Icon icon={ChevronRight} flip tone="subtle" />
      </PressableScale>
    );
  }
  const credit = creditStatus(customer);
  const owes = (customer.balance ?? 0) > 0;
  return (
    <PressableScale onPress={() => openSheet('customer')} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2.5), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.brand.soft, borderWidth: 1, borderColor: th.colors.brand.border }}>
      <Avatar name={customer.name} size={36} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text size="sm" weight="bold" numberOfLines={1}>{customer.name}</Text>
        <Row gap={1.5} wrap>
          {owes ? <Text size="xs" color={th.colors.warning.text}>{t('Khata {{amount}}', { amount: formatMoney(customer.balance) })}</Text>
            : (customer.balance ?? 0) < 0 ? <Text size="xs" color={th.colors.success.text}>{t('Advance {{amount}}', { amount: formatMoney(-(customer.balance ?? 0)) })}</Text>
              : <Text size="xs" tone="muted" ltr>{customer.phone ?? ''}</Text>}
          {credit.limit > 0 && <Text size="xs" tone={credit.near ? 'danger' : 'muted'}>{t('Limit {{amount}}', { amount: formatMoney(credit.limit) })}</Text>}
          {totals.pointsMax > 0 || customer.loyaltyPoints > 0 ? <Text size="xs" tone="muted">{t('{{n}} points', { n: customer.loyaltyPoints })}</Text> : null}
        </Row>
      </View>
      {customer.pendingCreate && <Badge tone="warning" size="sm">{t('Not synced')}</Badge>}
      <Icon icon={ChevronRight} flip tone="subtle" />
    </PressableScale>
  );
}

function TierBar() {
  const counter = useCounter();
  const tier = useBill((s) => s.tier);
  const setTier = useBill((s) => s.setTier);
  const { parts, tierTrusted } = counter;
  if (!parts.priceTiers || parts.priceTierList.length < 2) return null;
  const options = parts.priceTierList.map((x) => ({ value: x, label: t(TIER_LABEL[x]) }));
  return (
    <Segmented size="sm" options={options} value={tier} onChange={(v) => {
      if (v !== parts.defaultPriceTier && !tierTrusted) return;
      setTier(v);
    }} />
  );
}

export function CartPanel({ onPay, onCash, onHeld, compact }: { onPay: () => void; onCash: () => void; onHeld?: () => void; compact?: boolean }) {
  const th = useTheme();
  const api = usePos();
  const counter = useCounter();
  const lines = useBill((s) => s.lines);
  const customer = useBill((s) => s.customer);
  const delivery = useBill((s) => s.delivery);
  const totals = useBillTotals();
  const credit = creditStatus(customer, 0);
  const discountAll = totals.discount + totals.codeDiscount + totals.loyaltyDiscount;
  const empty = !lines.length;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: th.space(2), paddingHorizontal: th.space(3), paddingBottom: th.space(2) }}>
        <CustomerBar />
        {customer && credit.limit > 0 && credit.room != null && credit.room <= 0 && (
          <Text size="xs" color={th.colors.danger.text}>{t('{{name}} is at the credit limit. More khata needs the owner\'s PIN.', { name: customer.name })}</Text>
        )}
        <TierBar />
        {api.config.CartExtra && <api.config.CartExtra />}
      </View>
      {empty ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState compact icon={ShoppingCart} title={t('The bill is empty')} message={t('Tap a product or scan a barcode.')} />
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(l) => l.id}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <LineRow line={item} last={index === lines.length - 1} onStep={api.step} onRemove={api.remove} onOpen={(id) => openSheet('line', id)} />
          )}
        />
      )}
      <View style={{ borderTopWidth: 1, borderTopColor: th.colors.divider, padding: th.space(3), gap: th.space(1), backgroundColor: th.colors.surface }}>
        <Row gap={2} style={{ marginBottom: th.space(1) }}>
          {counter.parts.showDiscount && (
            <Button size="sm" variant={discountAll > 0 ? 'soft' : 'secondary'} icon={Percent} onPress={() => openSheet('discount')} disabled={empty} style={{ flex: 1 }}>{t('Discount')}</Button>
          )}
          <Button size="sm" variant={totals.charges > 0 || delivery.on ? 'soft' : 'secondary'} icon={Truck} onPress={() => openSheet('charges')} disabled={empty} style={{ flex: 1 }}>{t('Charges')}</Button>
          <Button size="sm" variant="secondary" icon={PauseCircle} onPress={() => { void api.hold().then(() => onHeld?.()); }} disabled={empty} style={{ flex: 1 }}>{t('Hold')}</Button>
        </Row>
        {!compact && <MoneyRow label={t('Subtotal ({{count}} items)', { count: lines.length })} value={totals.subtotal} />}
        {discountAll > 0 && <MoneyRow label={t('Discount')} value={discountAll} sign="−" tone="success" onPress={() => openSheet('discount')} />}
        {totals.charges > 0 && <MoneyRow label={t('Charges')} value={totals.charges} sign="+" onPress={() => openSheet('charges')} />}
        <MoneyRow label={t('Total')} value={totals.total} strong />
        <Row gap={2} style={{ marginTop: th.space(1) }}>
          <Button size="xl" variant="success" icon={Wallet} onPress={onCash} disabled={empty} style={{ flex: 1.15 }}>{t('Cash')}</Button>
          <Button size="xl" icon={ReceiptText} onPress={onPay} disabled={empty} style={{ flex: 1 }}>{t('Pay')}</Button>
        </Row>
        {customer && counter.rules.allowCredit && !empty && (
          <Button size="md" variant="soft" icon={BookOpen} onPress={() => openCheckoutSheet('credit')}>{t('Put all on khata')}</Button>
        )}
      </View>
    </View>
  );
}

/** Bill total for the phone's slide-up bar. */
export function useCartSummary() {
  const lines = useBill((s) => s.lines);
  const totals = useBillTotals();
  return { count: lines.length, qty: totals.quantity, total: totals.total };
}
