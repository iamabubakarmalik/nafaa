/**
 * Small pieces the counter screens share: the number keypad, the quantity
 * stepper, payment method tiles and money rows. Built from the kit.
 */

import { Banknote, Building2, CreditCard, Delete, Minus, Plus, Smartphone, Zap, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { PaymentMethod, TenderMethod } from '@nafaa/core/pos';
import { msg, t } from '@/core/i18n';
import { Amount, Icon, PressableScale, Row, Text, useTheme, type StatusTone } from '@/design';

export const METHODS: Array<{ id: PaymentMethod; label: string; icon: LucideIcon; tone: StatusTone }> = [
  { id: 'CASH', label: msg('Cash'), icon: Banknote, tone: 'success' },
  { id: 'JAZZCASH', label: msg('JazzCash'), icon: Smartphone, tone: 'warning' },
  { id: 'EASYPAISA', label: msg('Easypaisa'), icon: Zap, tone: 'success' },
  { id: 'CARD', label: msg('Card'), icon: CreditCard, tone: 'info' },
  { id: 'BANK_TRANSFER', label: msg('Bank'), icon: Building2, tone: 'accent' },
];

export const methodLabel = (m: TenderMethod | string) => (m === 'TRADE_IN' ? t('Trade-in') : t(METHODS.find((x) => x.id === m)?.label ?? m));

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];

/** Number keypad (always left-to-right, big keys for one thumb). */
export function Keypad({ onKey, keyHeight = 52, decimal }: { onKey: (k: string) => void; keyHeight?: number; decimal?: boolean }) {
  const th = useTheme();
  const keys = decimal ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] : PAD;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5), direction: 'ltr' }}>
      {keys.map((k) => (
        <PressableScale key={k} onPress={() => onKey(k)} haptic="tap" accessibilityLabel={k === '⌫' ? t('Mitayein') : k}
          style={{ width: '31.8%', height: keyHeight, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.surfaceMuted, borderWidth: 1, borderColor: th.colors.border }}>
          {k === '⌫' ? <Icon icon={Delete} tone="default" size={22} /> : <Text size="xl" weight="semibold" ltr tabular>{k}</Text>}
        </PressableScale>
      ))}
    </View>
  );
}

/** − qty + with 44pt targets. */
export function Stepper({ value, unit, onMinus, onPlus, onPressValue, compact }: { value: number; unit?: string; onMinus: () => void; onPlus: () => void; onPressValue?: () => void; compact?: boolean }) {
  const th = useTheme();
  const size = compact ? 36 : 44;
  const btn = { width: size, height: size, borderRadius: th.radius('md'), alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: th.colors.surfaceMuted };
  return (
    <Row gap={1} style={{ direction: 'ltr' }}>
      <PressableScale onPress={onMinus} style={btn} accessibilityLabel={t('Less')} hitSlop={4}><Icon icon={Minus} size={18} tone="default" /></PressableScale>
      <PressableScale onPress={onPressValue} disabled={!onPressValue} style={{ minWidth: compact ? 40 : 52, alignItems: 'center', paddingHorizontal: 4 }} accessibilityLabel={t('Quantity')}>
        <Text weight="bold" ltr tabular size={compact ? 'sm' : 'base'}>{Number(value.toFixed(3))}</Text>
        {!!unit && <Text size="2xs" tone="muted" numberOfLines={1}>{unit}</Text>}
      </PressableScale>
      <PressableScale onPress={onPlus} style={{ ...btn, backgroundColor: th.colors.brand.soft }} accessibilityLabel={t('More')} hitSlop={4}><Icon icon={Plus} size={18} color={th.colors.brand.text} /></PressableScale>
    </Row>
  );
}

/** Label … amount row for summaries. */
export function MoneyRow({ label, value, strong, tone, onPress, sign, style }: { label: ReactNode; value: number; strong?: boolean; tone?: 'success' | 'warning' | 'danger' | 'brand'; onPress?: () => void; sign?: '+' | '−'; style?: StyleProp<ViewStyle> }) {
  const th = useTheme();
  const color = tone ? th.colors[tone].text : undefined;
  const body = (
    <Row justify="between" gap={3} style={[{ minHeight: 28 }, style]}>
      {typeof label === 'string' ? <Text size={strong ? 'base' : 'sm'} weight={strong ? 'bold' : 'regular'} tone={strong ? 'default' : 'secondary'} color={color} style={{ flex: 1 }}>{label}</Text> : label}
      <Row gap={0.5}>
        {sign && <Text size={strong ? 'base' : 'sm'} color={color} ltr>{sign}</Text>}
        <Amount value={value} size={strong ? 'lg' : 'sm'} weight={strong ? 'bold' : 'semibold'} color={color} />
      </Row>
    </Row>
  );
  return onPress ? <PressableScale onPress={onPress} scaleTo={0.99}>{body}</PressableScale> : body;
}

/** Payment method tiles (3 per row). */
export function MethodGrid({ value, onChange, methods = METHODS }: { value: string; onChange: (m: PaymentMethod) => void; methods?: typeof METHODS }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }} accessibilityRole="radiogroup">
      {methods.map((m) => {
        const on = value === m.id;
        const tone = th.colors[m.tone];
        return (
          <PressableScale key={m.id} onPress={() => onChange(m.id)} haptic="select" accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={{ width: '31.5%', minHeight: 52, borderRadius: th.radius('lg'), paddingHorizontal: th.space(2), flexDirection: 'row', alignItems: 'center', gap: th.space(1.5),
              backgroundColor: on ? tone.solid : th.colors.surface, borderWidth: 1, borderColor: on ? tone.solid : th.colors.border }}>
            <Icon icon={m.icon} size={18} color={on ? tone.onSolid : tone.text} />
            <Text size="sm" weight="semibold" numberOfLines={1} color={on ? tone.onSolid : undefined} style={{ flexShrink: 1 }}>{t(m.label)}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
