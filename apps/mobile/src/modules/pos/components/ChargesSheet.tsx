/**
 * Charges on top of the items: home delivery (the shop's rider, whose cost
 * is kept out of profit, or an outside rider who collects it directly and
 * is only printed), tax and service charge from the shop's settings, and any
 * other charge. Labels are saved as written and translated where shown.
 */

import { Plus, Receipt, Trash2, Truck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { taxCharge, type ServiceChargeItem } from '@nafaa/core/pos';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Icon, Input, MoneyInput, PressableScale, Row, Segmented, Sheet, Switch, Text, useTheme } from '@/design';
import { useBill } from '../engine/bill';
import { useCounter } from '../engine/counter';
import { useBillTotals } from '../engine/totals';
import { closeSheet, usePosUi } from '../engine/usePos';

const QUICK = [100, 200, 300, 500];

export function ChargesSheet() {
  const th = useTheme();
  const open = usePosUi((s) => s.sheet === 'charges');
  const counter = useCounter();
  const delivery = useBill((s) => s.delivery);
  const setDelivery = useBill((s) => s.setDelivery);
  const charges = useBill((s) => s.charges);
  const setCharges = useBill((s) => s.setCharges);
  const totals = useBillTotals();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState<number | null>(null);

  const base = Math.max(totals.subtotal - totals.discount - totals.codeDiscount - totals.loyaltyDiscount, 0);
  const has = (type: string) => charges.some((c) => c.type === type);
  const toggle = (item: ServiceChargeItem | null, type: string) => {
    if (has(type)) setCharges(charges.filter((c) => c.type !== type));
    else if (item) setCharges([...charges, item]);
  };
  const service = counter.serviceChargePct > 0
    ? { type: 'SERVICE', label: `Service charge ${counter.serviceChargePct}%`, amount: Math.round(base * counter.serviceChargePct) / 100 }
    : null;
  const tax = counter.tax.rate > 0 && !counter.tax.inclusive ? taxCharge(base, counter.tax.rate, counter.tax.label) : null;
  const profit = (Number(delivery.charge) || 0) - (Number(delivery.riderCost) || 0);

  const addOther = () => {
    if (!label.trim() || !(amount && amount > 0)) return;
    setCharges([...charges, { type: 'OTHER', label: label.trim(), amount }]);
    setLabel('');
    setAmount(null);
  };

  return (
    <Sheet open={open} onClose={closeSheet} title={t('Charges')} footer={<Button size="lg" fullWidth onPress={closeSheet}>{t('Done')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        <View style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('xl'), borderWidth: 1, borderColor: delivery.on ? th.colors.brand.border : th.colors.border, backgroundColor: delivery.on ? th.colors.brand.soft : th.colors.surface }}>
          <Row gap={2}>
            <Icon icon={Truck} tone="brand" />
            <View style={{ flex: 1 }}><Switch value={delivery.on} onChange={(on) => setDelivery({ ...delivery, on })} label={t('Home delivery')} /></View>
          </Row>
          {delivery.on && (
            <>
              <Segmented size="sm" value={delivery.byRider ? 'rider' : 'own'} onChange={(v) => setDelivery({ ...delivery, byRider: v === 'rider', riderCost: v === 'rider' ? 0 : delivery.riderCost })}
                options={[{ value: 'own', label: t('Our rider') }, { value: 'rider', label: t('Outside rider collects') }]} />
              <Row gap={2} align="start">
                <View style={{ flex: 1 }}><MoneyInput label={t('From customer')} value={delivery.charge || null} onChangeValue={(v) => setDelivery({ ...delivery, charge: v ?? 0 })} /></View>
                {!delivery.byRider && <View style={{ flex: 1 }}><MoneyInput label={t('Paid to rider')} value={delivery.riderCost || null} onChangeValue={(v) => setDelivery({ ...delivery, riderCost: v ?? 0 })} /></View>}
              </Row>
              <Row gap={1.5}>
                {QUICK.map((v) => (
                  <PressableScale key={v} onPress={() => setDelivery({ ...delivery, charge: v })} haptic="tap"
                    style={{ flex: 1, minHeight: 40, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: delivery.charge === v ? th.colors.brand.solid : th.colors.surface, borderWidth: 1, borderColor: th.colors.brand.border }}>
                    <Text size="sm" weight="semibold" ltr color={delivery.charge === v ? th.colors.brand.onSolid : th.colors.brand.text}>{v}</Text>
                  </PressableScale>
                ))}
              </Row>
              <Input value={delivery.address} onChangeText={(address) => setDelivery({ ...delivery, address })} placeholder={t('Address or landmark (printed on the bill)')} />
              {delivery.charge > 0 && (delivery.byRider
                ? <Text size="xs" tone="muted">{t('The customer pays {{amount}} to the rider directly. It is printed on the bill but not added to the sale or drawer.', { amount: formatMoney(delivery.charge) })}</Text>
                : <Row justify="between"><Text size="xs" tone="muted">{t('Delivery profit')}</Text><Amount value={profit} size="sm" colorize /></Row>)}
            </>
          )}
        </View>

        {(tax || service) && (
          <View style={{ gap: th.space(2) }}>
            {tax && <ChargeToggle on={has('TAX')} label={tax.label} amount={tax.amount} onPress={() => toggle(tax, 'TAX')} />}
            {service && <ChargeToggle on={has('SERVICE')} label={service.label} amount={service.amount} onPress={() => toggle(service, 'SERVICE')} />}
          </View>
        )}

        {charges.filter((c) => c.type === 'OTHER').map((c, i) => (
          <Row key={`${c.label}-${i}`} gap={2} style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
            <Icon icon={Receipt} tone="muted" />
            <Text style={{ flex: 1 }}>{c.label}</Text>
            <Amount value={c.amount} weight="semibold" />
            <PressableScale onPress={() => setCharges(charges.filter((x) => x !== c))} accessibilityLabel={t('Remove')} style={{ padding: 6 }}><Icon icon={Trash2} size={18} tone="danger" /></PressableScale>
          </Row>
        ))}

        <View style={{ gap: th.space(2) }}>
          <Text size="xs" weight="semibold" tone="muted">{t('Other charge')}</Text>
          <Row gap={2} align="end">
            <View style={{ flex: 1.4 }}><Input value={label} onChangeText={setLabel} placeholder={t('Fitting, packing…')} /></View>
            <View style={{ flex: 1 }}><MoneyInput value={amount} onChangeValue={setAmount} /></View>
            <Button icon={Plus} variant="soft" disabled={!label.trim() || !(amount && amount > 0)} onPress={addOther} accessibilityLabel={t('Add')} />
          </Row>
        </View>
      </View>
    </Sheet>
  );
}

function ChargeToggle({ on, label, amount, onPress }: { on: boolean; label: string; amount: number; onPress: () => void }) {
  const th = useTheme();
  return (
    <PressableScale onPress={onPress} haptic="select"
      style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), borderWidth: 1, borderColor: on ? th.colors.brand.solid : th.colors.border, backgroundColor: on ? th.colors.brand.soft : th.colors.surface }}>
      <Text weight="semibold" style={{ flex: 1 }}>{label}</Text>
      <Amount value={amount} weight="bold" />
      <Text size="xs" weight="bold" color={on ? th.colors.brand.text : th.colors.textMuted}>{on ? t('Added') : t('Add')}</Text>
    </PressableScale>
  );
}

/** Keeps tax and service charge in step with the bill as it changes. */
export function useChargesSync() {
  const counter = useCounter();
  const charges = useBill((s) => s.charges);
  const totals = useBillTotals();
  const base = Math.max(totals.subtotal - totals.discount - totals.codeDiscount - totals.loyaltyDiscount, 0);
  useEffect(() => {
    if (!charges.some((c) => c.type === 'TAX' || c.type === 'SERVICE')) return;
    const next = charges.map((c) => {
      if (c.type === 'TAX') { const x = taxCharge(base, counter.tax.rate, counter.tax.label); return x ?? c; }
      if (c.type === 'SERVICE') return { ...c, amount: Math.round(base * counter.serviceChargePct) / 100 };
      return c;
    });
    if (next.some((c, i) => c.amount !== charges[i].amount)) useBill.getState().setCharges(next);
  }, [base, charges, counter.tax.rate, counter.tax.label, counter.serviceChargePct]);
}

