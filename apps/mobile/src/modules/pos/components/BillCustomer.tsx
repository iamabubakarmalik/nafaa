/**
 * Top of the bill: who the bill is for (walk-in or a customer with khata,
 * credit limit and points), the held bills button and the sale type
 * (Retail / Wholesale / Credit).
 */

import { ChevronDown, PauseCircle, UserRound, X } from 'lucide-react-native';
import { forwardRef } from 'react';
import { View } from 'react-native';
import { creditStatus, type PriceTier } from '@nafaa/core/pos';
import { t } from '@/core/i18n';
import { formatMoney } from '@/core/format';
import { Avatar, Badge, Icon, IconButton, PressableScale, Row, Segmented, Text, toast, useTheme, withAlpha } from '@/design';
import { useBill } from '../engine/bill';
import { useCounter } from '../engine/counter';
import { openSheet } from '../engine/usePos';

export const TIER_LABEL: Record<PriceTier, string> = { RETAIL: 'Retail', WHOLESALE: 'Wholesale', CREDIT: 'Credit' };

/** Retail / Wholesale / Credit for the whole bill (when the shop uses price tiers). */
export function TierBar() {
  const counter = useCounter();
  const tier = useBill((s) => s.tier);
  const setTier = useBill((s) => s.setTier);
  const { parts, tierTrusted } = counter;
  if (!parts.priceTiers || parts.priceTierList.length < 2) return null;
  const options = parts.priceTierList.map((x) => ({ value: x, label: t(TIER_LABEL[x]) }));
  return (
    <Segmented size="sm" options={options} value={tier} onChange={(v) => {
      if (v !== parts.defaultPriceTier && !tierTrusted) { toast.error(t('You may not change the price tier')); return; }
      setTier(v);
    }} />
  );
}

/** Walk-in or the picked customer; tap opens search and "new customer". */
export const CustomerChip = forwardRef<View, { flex?: boolean }>(function CustomerChip({ flex = true }, ref) {
  const th = useTheme();
  const counter = useCounter();
  const customer = useBill((s) => s.customer);
  const setCustomer = useBill((s) => s.setCustomer);
  const setTier = useBill((s) => s.setTier);

  const clear = () => {
    setCustomer(null);
    if (counter.parts.priceTiers) setTier(counter.parts.defaultPriceTier);
  };

  const base = {
    minHeight: 48, flexDirection: 'row' as const, alignItems: 'center' as const, gap: th.space(2.5),
    paddingStart: th.space(2), paddingEnd: th.space(1.5), borderRadius: th.radius('lg'), borderWidth: 1,
  };
  const wrap = { flex: flex ? 1 : undefined };

  if (!customer) {
    return (
      <View ref={ref} collapsable={false} style={wrap}>
        <PressableScale onPress={() => openSheet('customer')} haptic="tap" accessibilityLabel={t('Choose customer')}
          style={{ ...base, backgroundColor: th.colors.surface, borderColor: th.colors.border, borderStyle: 'dashed' }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(th.colors.brand.solid, 0.12) }}>
            <Icon icon={UserRound} size={18} color={th.colors.brand.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text size="sm" weight="bold" numberOfLines={1}>{t('Walk-in customer')}</Text>
            <Text size="xs" tone="muted" numberOfLines={1}>{t('Tap to choose or add a customer')}</Text>
          </View>
          <Icon icon={ChevronDown} size={18} tone="muted" />
        </PressableScale>
      </View>
    );
  }

  const credit = creditStatus(customer);
  const bal = customer.balance ?? 0;
  const facts = [
    bal > 0 ? { text: t('Khata {{amount}}', { amount: formatMoney(bal) }), color: th.colors.warning.text }
      : bal < 0 ? { text: t('Advance {{amount}}', { amount: formatMoney(-bal) }), color: th.colors.success.text } : null,
    credit.limit > 0 ? { text: t('Limit {{amount}}', { amount: formatMoney(credit.limit) }), color: credit.near || credit.over ? th.colors.danger.text : th.colors.textMuted } : null,
    customer.loyaltyPoints > 0 ? { text: t('{{n}} points', { n: customer.loyaltyPoints }), color: th.colors.textMuted } : null,
  ].filter(Boolean) as Array<{ text: string; color: string }>;

  return (
    <View ref={ref} collapsable={false} style={wrap}>
      <PressableScale onPress={() => openSheet('customer')} haptic="tap" accessibilityLabel={t('Customer: {{name}}', { name: customer.name })}
        style={{ ...base, backgroundColor: th.colors.brand.soft, borderColor: th.colors.brand.border }}>
        <Avatar name={customer.name} size={36} />
        <View style={{ flex: 1, gap: 1 }}>
          <Row gap={1.5}>
            <Text size="sm" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{customer.name}</Text>
            {customer.pendingCreate && <Badge tone="warning" size="sm">{t('Not synced')}</Badge>}
          </Row>
          {facts.length ? (
            <Text size="xs" numberOfLines={2}>
              {facts.map((f, i) => <Text key={f.text} size="xs" weight="semibold" color={f.color}>{i ? ' · ' : ''}{f.text}</Text>)}
            </Text>
          ) : customer.phone ? <Text size="xs" tone="muted" ltr numberOfLines={1}>{customer.phone}</Text> : null}
        </View>
        <IconButton icon={X} size="sm" label={t('Walk-in')} onPress={clear} />
      </PressableScale>
    </View>
  );
});

/** Held bills with the count (amber); nothing when no bill is waiting. */
export function HeldButton({ count }: { count: number }) {
  const th = useTheme();
  if (!count) return null;
  return (
    <PressableScale onPress={() => openSheet('held')} haptic="tap" accessibilityLabel={t('{{count}} held bills', { count })}
      style={{ height: 34, minWidth: 34, paddingHorizontal: th.space(2), borderRadius: th.radius('md'), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
        backgroundColor: th.colors.warning.soft, borderWidth: 1, borderColor: withAlpha(th.colors.warning.solid, 0.4) }}>
      <Icon icon={PauseCircle} size={15} color={th.colors.warning.text} />
      <Text size="sm" weight="bold" color={th.colors.warning.text} ltr tabular>{count}</Text>
    </PressableScale>
  );
}
