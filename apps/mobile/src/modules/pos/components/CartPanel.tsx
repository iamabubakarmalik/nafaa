/**
 * The bill, in the web POS order: header (items, held bills, Hold, Clear,
 * more), customer with "new customer", sale type (Retail / Wholesale /
 * Credit), the lines (− qty +, × rate, total, remove, note, price type),
 * then Discount (quick % chips), Charges, the total, "Cash" with the amount
 * and Card / JazzCash / Easypaisa / Khata / Checkout. Full-height sheet on
 * phones; beside the catalog on tablets.
 */

import { BookOpen, ChevronDown, CreditCard, MoreHorizontal, PauseCircle, ShoppingCart, Smartphone, StickyNote, Tag, Trash2, Truck, UserPlus, Wallet, X, Zap, type LucideIcon } from 'lucide-react-native';
import { memo, useRef } from 'react';
import { FlatList, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { creditStatus, type PaymentMethod, type PosCartLine } from '@nafaa/core/pos';
import { t } from '@/core/i18n';
import { formatMoney } from '@/core/format';
import { Amount, Badge, Button, confirm, EmptyState, Icon, IconButton, PressableScale, Row, Text, toast, useTheme, withAlpha, type StatusTone } from '@/design';
import { useBill } from '../engine/bill';
import { useCounter } from '../engine/counter';
import { useBillTotals } from '../engine/totals';
import { openCheckoutSheet, openNewCustomer, openSheet, usePos, type LineField } from '../engine/usePos';
import { CustomerChip, HeldButton, TIER_LABEL, TierBar } from './BillCustomer';
import { MoneyRow, Stepper } from './parts';
import { PosThumb } from './ProductGrid';

export { TIER_LABEL, TierBar } from './BillCustomer';

const qtyText = (n: number) => String(Number(n.toFixed(3)));

const LineRow = memo(function LineRow({ line, canRate, tierChip, showImages, onStep, onOpen, onRemove, last }: {
  line: PosCartLine; canRate: boolean; tierChip: boolean; showImages: boolean; onStep: (id: string, d: number) => void; onOpen: (id: string, f: LineField) => void; onRemove: (id: string) => void; last: boolean;
}) {
  const th = useTheme();
  const ref = useRef<SwipeableMethods>(null);
  const lowered = line.priceEdited && line.basePrice > line.unitPrice;
  const off = lowered ? (line.basePrice - line.unitPrice) * line.quantity : 0;
  const rateTappable = canRate && !line.fixedPrice && !line.dist?.free && line.type === 'product';
  const note = line.customNote || line.note;
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
      <View style={{ flexDirection: 'row', gap: th.space(2.5), paddingHorizontal: th.space(3), paddingVertical: th.space(2.5), backgroundColor: th.colors.surface, borderBottomWidth: last ? 0 : 1, borderBottomColor: th.colors.divider }}>
        {showImages && <PosThumb name={line.name} url={line.image} size={40} radius={th.radius('md')} emojiSize={20} />}
        <View style={{ flex: 1, gap: th.space(1.5) }}>
          <Row gap={2} align="start">
            <PressableScale onPress={() => onOpen(line.id, 'qty')} scaleTo={0.99} style={{ flex: 1, gap: 2 }}>
              <Text size="sm" weight="semibold" numberOfLines={2}>{line.variantName ? `${line.name} · ${line.variantName}` : line.name}</Text>
              {(line.dist?.free || lowered) && (
                <Row gap={1.5} wrap>
                  {line.dist?.free && <Badge tone="success" size="sm">{t('Free')}</Badge>}
                  {lowered && <Badge tone="warning" size="sm">{t('Rate changed')}</Badge>}
                </Row>
              )}
              {!!note && <Text size="2xs" tone="muted" numberOfLines={1} style={{ fontStyle: 'italic' }}>“{note}”</Text>}
            </PressableScale>
            <IconButton icon={StickyNote} size="sm" label={t('Note')} color={note ? th.colors.brand.text : th.colors.textSubtle} onPress={() => onOpen(line.id, 'qty')} />
            <IconButton icon={Trash2} size="sm" label={t('Remove')} color={th.colors.danger.text} onPress={() => onRemove(line.id)} />
          </Row>
          <Row gap={2}>
            {line.lockQty
              ? <Text size="xs" tone="muted">{t('Qty fixed')}</Text>
              : <Stepper compact value={line.quantity} onMinus={() => onStep(line.id, -1)} onPlus={() => onStep(line.id, 1)} onPressValue={() => onOpen(line.id, 'qty')} />}
            <PressableScale onPress={() => onOpen(line.id, rateTappable ? 'rate' : 'qty')} haptic="tap" accessibilityLabel={t('Rate')} hitSlop={6} style={{ flexShrink: 1 }}>
              <Text size="sm" tone="secondary" ltr numberOfLines={1} style={rateTappable ? { textDecorationLine: 'underline', textDecorationStyle: 'dotted' } : undefined}>× {formatMoney(line.unitPrice)}</Text>
            </PressableScale>
            <View style={{ flex: 1 }} />
            <View style={{ alignItems: 'flex-end' }}>
              <Amount value={line.lineTotal} weight="bold" size="base" />
              {lowered && <Text size="2xs" color={th.colors.success.text} ltr>−{formatMoney(off)}</Text>}
            </View>
          </Row>
          {tierChip && line.type === 'product' && !line.fixedPrice && !line.dist && (
            <PressableScale onPress={() => onOpen(line.id, 'qty')} haptic="tap" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: th.space(2), borderRadius: 13, backgroundColor: th.colors.surfaceMuted }}>
              <Text size="2xs" weight="semibold" tone="secondary">{t('{{tier}} price', { tier: t(TIER_LABEL[line.priceTier ?? 'RETAIL']) })}</Text>
              <Icon icon={ChevronDown} size={12} tone="muted" />
            </PressableScale>
          )}
        </View>
      </View>
    </ReanimatedSwipeable>
  );
});

const QUICK_PAY: Array<{ id: PaymentMethod; label: string; icon: LucideIcon; tone: StatusTone }> = [
  { id: 'CARD', label: 'Card', icon: CreditCard, tone: 'info' },
  { id: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, tone: 'warning' },
  { id: 'EASYPAISA', label: 'Easypaisa', icon: Zap, tone: 'success' },
];

/** Card, JazzCash, Easypaisa, Khata and Checkout under the Cash button, like the web. */
function QuickPay({ disabled }: { disabled: boolean }) {
  const th = useTheme();
  const counter = useCounter();
  const customer = useBill((s) => s.customer);
  const tile = (key: string, label: string, icon: LucideIcon | null, color: string, onPress: () => void, off = false) => (
    <PressableScale key={key} onPress={onPress} disabled={disabled} haptic="tap" accessibilityLabel={label}
      style={{ flex: 1, minHeight: 50, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: th.colors.border,
        backgroundColor: th.colors.surface, opacity: disabled || off ? 0.4 : 1, paddingHorizontal: 2 }}>
      {icon ? <Icon icon={icon} size={16} color={color} /> : <Text size="2xs" weight="bold" tone="muted">•••</Text>}
      <Text size="2xs" weight="semibold" numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
  return (
    <Row gap={1.5}>
      {QUICK_PAY.map((q) => tile(q.id, t(q.label), q.icon, th.colors[q.tone].text, () => openCheckoutSheet('full', false, q.id)))}
      {tile('khata', t('Khata'), BookOpen, th.colors.warning.text, () => {
        if (!counter.rules.allowCredit) { toast.error(t('Khata is turned off in this shop')); return; }
        if (!customer) { toast.error(t('Choose a customer for khata')); openSheet('customer'); return; }
        openCheckoutSheet('credit');
      }, !counter.rules.allowCredit || !customer)}
      {tile('checkout', t('Checkout'), null, th.colors.text, () => openCheckoutSheet('full'))}
    </Row>
  );
}

/** Discount (applied chip or quick % chips) and charges / delivery, like the web bill footer. */
function DiscountRow({ empty }: { empty: boolean }) {
  const th = useTheme();
  const counter = useCounter();
  const bill = useBill();
  const totals = useBillTotals();
  const parts = counter.parts;
  const limit = counter.rules.discountTrusted ? 100 : counter.rules.maxDiscountPercent;
  const quick = counter.rules.allowDiscount ? parts.quickDiscounts.filter((p) => p <= limit) : [];
  const hasDiscount = totals.discount > 0;
  const chip = { height: 34, paddingHorizontal: th.space(3), borderRadius: 17, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 };
  const charges = totals.charges > 0 || bill.delivery.on;
  return (
    <Row gap={1.5} wrap style={{ opacity: empty ? 0.45 : 1 }}>
      {parts.showDiscount && (hasDiscount ? (
        <PressableScale onPress={() => openSheet('discount')} disabled={empty} haptic="tap" style={{ ...chip, paddingEnd: 4, backgroundColor: th.colors.warning.soft }}>
          <Icon icon={Tag} size={14} color={th.colors.warning.text} />
          <Text size="xs" weight="semibold" color={th.colors.warning.text} ltr>
            {bill.discountMode === 'pct' ? `${bill.discountPct}%` : t('Discount')} −{formatMoney(totals.discount)}
          </Text>
          <PressableScale onPress={() => bill.setDiscount('pct', 0, 0)} accessibilityLabel={t('Remove discount')} hitSlop={6}
            style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={X} size={13} color={th.colors.warning.text} />
          </PressableScale>
        </PressableScale>
      ) : (
        <>
          <PressableScale onPress={() => openSheet('discount')} disabled={empty} haptic="tap" style={{ ...chip, borderWidth: 1, borderColor: th.colors.border }}>
            <Icon icon={Tag} size={14} tone="default" />
            <Text size="xs" weight="semibold">{t('Discount')}</Text>
          </PressableScale>
          {quick.map((pct) => (
            <PressableScale key={pct} onPress={() => bill.setDiscount('pct', pct, 0)} disabled={empty} haptic="tap" accessibilityLabel={t('{{pct}}% Discount', { pct })}
              style={{ ...chip, paddingHorizontal: th.space(2.5), backgroundColor: th.colors.surfaceMuted }}>
              <Text size="xs" weight="semibold" ltr>{pct}%</Text>
            </PressableScale>
          ))}
        </>
      ))}
      <PressableScale onPress={() => openSheet('charges')} disabled={empty} haptic="tap"
        style={{ ...chip, borderWidth: 1, borderColor: charges ? withAlpha(th.colors.brand.solid, 0.4) : th.colors.border, backgroundColor: charges ? th.colors.brand.soft : undefined }}>
        <Icon icon={Truck} size={14} color={charges ? th.colors.brand.text : th.colors.text} />
        <Text size="xs" weight="semibold" color={charges ? th.colors.brand.text : undefined}>{t('Delivery / charges')}</Text>
      </PressableScale>
    </Row>
  );
}

export function CartPanel({ onCash, onHeld, onClose, heldCount = 0 }: { onCash: () => void; onHeld?: () => void; onClose?: () => void; heldCount?: number }) {
  const th = useTheme();
  const api = usePos();
  const parts = api.counter.parts;
  const lines = useBill((s) => s.lines);
  const customer = useBill((s) => s.customer);
  const totals = useBillTotals();
  const credit = creditStatus(customer, 0);
  const discountAll = totals.discount + totals.codeDiscount + totals.loyaltyDiscount;
  const empty = !lines.length;
  const canRate = api.counter.canEditPrice;
  const tierChip = parts.priceTiers && parts.tierLineOverride && parts.priceTierList.length > 1;
  const openLine = (id: string, f: LineField) => openSheet('line', id, f);

  const clear = async () => {
    const ok = await confirm({ title: t('Clear this bill?'), message: t('All items come off the bill. Hold it instead if the customer will come back.'), tone: 'danger', confirmLabel: t('Clear'), icon: Trash2 });
    if (!ok) return;
    useBill.getState().clear(parts.priceTiers ? parts.defaultPriceTier : 'RETAIL');
    toast.info(t('Bill cleared'));
  };

  return (
    <View style={{ flex: 1 }}>
      <Row gap={1} style={{ paddingHorizontal: th.space(3), paddingBottom: th.space(2) }}>
        <Text size="lg" weight="bold">{t('Bill')}</Text>
        {!empty && <Badge tone="neutral" size="sm">{t('{{count}} items · qty {{q}}', { count: lines.length, q: qtyText(totals.quantity) })}</Badge>}
        <View style={{ flex: 1 }} />
        <HeldButton count={heldCount} />
        {!empty && (
          <PressableScale onPress={() => { void api.hold().then(() => onHeld?.()); }} haptic="tap" accessibilityLabel={t('Hold')}
            style={{ height: 34, paddingHorizontal: th.space(1.5), borderRadius: th.radius('md'), flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon icon={PauseCircle} size={16} tone="secondary" />
            <Text size="sm" weight="semibold" tone="secondary">{t('Hold')}</Text>
          </PressableScale>
        )}
        {!empty && <IconButton icon={Trash2} size="sm" label={t('Clear')} onPress={() => void clear()} />}
        <IconButton icon={MoreHorizontal} size="sm" label={t('More')} onPress={() => openSheet('more')} />
        {onClose && <IconButton icon={X} size="sm" variant="secondary" label={t('Close')} onPress={onClose} />}
      </Row>

      <View style={{ gap: th.space(2), paddingHorizontal: th.space(3), paddingBottom: th.space(2) }}>
        <Row gap={2}>
          <CustomerChip />
          <IconButton icon={UserPlus} size="lg" variant="secondary" label={t('New customer')} onPress={openNewCustomer} />
        </Row>
        {customer && credit.limit > 0 && credit.room != null && credit.room <= 0 && (
          <Text size="xs" color={th.colors.danger.text}>{t('{{name}} is at the credit limit. More khata needs the owner\'s PIN.', { name: customer.name })}</Text>
        )}
        <TierBar />
        {api.config.CartExtra && <api.config.CartExtra />}
      </View>

      {empty ? (
        <View style={{ flex: 1, justifyContent: 'center', borderTopWidth: 1, borderTopColor: th.colors.divider }}>
          <EmptyState compact icon={ShoppingCart} title={t('The bill is empty')} message={t('Tap a product or scan a barcode.')} />
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(l) => l.id}
          style={{ flex: 1, borderTopWidth: 1, borderTopColor: th.colors.divider }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <LineRow line={item} canRate={canRate} tierChip={tierChip} showImages={parts.showImages} last={index === lines.length - 1} onStep={api.step} onRemove={api.remove} onOpen={openLine} />
          )}
        />
      )}

      <View style={{ borderTopWidth: 1, borderTopColor: th.colors.divider, paddingHorizontal: th.space(3), paddingTop: th.space(2.5), paddingBottom: th.space(3), gap: th.space(2), backgroundColor: th.colors.surface }}>
        <DiscountRow empty={empty} />
        <View style={{ paddingHorizontal: th.space(3), paddingVertical: th.space(1.5), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
          {(discountAll > 0 || totals.charges > 0) && <MoneyRow label={t('Subtotal')} value={totals.subtotal} />}
          {discountAll > 0 && <MoneyRow label={t('Discount')} value={discountAll} sign="−" tone="success" onPress={() => openSheet('discount')} />}
          {totals.charges > 0 && <MoneyRow label={t('Charges')} value={totals.charges} sign="+" onPress={() => openSheet('charges')} />}
          <Row justify="between">
            <Text size="sm" weight="medium" tone="muted">{t('Total')}</Text>
            <Amount value={totals.total} size="2xl" weight="bold" />
          </Row>
        </View>
        <Button size="xl" variant="success" icon={Wallet} onPress={onCash} disabled={empty} fullWidth>
          {`${t('Cash')}  ·  ${formatMoney(totals.total)}`}
        </Button>
        <QuickPay disabled={empty} />
      </View>
    </View>
  );
}

/** Bill size for the phone's "View bill" bar. */
export function useCartSummary() {
  const lines = useBill((s) => s.lines);
  const totals = useBillTotals();
  return { count: lines.length, qty: totals.quantity, total: totals.total };
}

