/** Small form parts used across the inventory forms: a number field, unit tiles and a margin card. */

import { forwardRef, useEffect, useState } from 'react';
import type { TextInput } from 'react-native';
import { View } from 'react-native';
import { marginLevel } from '@nafaa/core/inventory';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, Input, PressableScale, ProgressBar, Row, Text, useTheme, type InputProps } from '@/design';

/** Decimal number field; empty is null. */
export const NumberInput = forwardRef<TextInput, Omit<InputProps, 'value' | 'onChangeText'> & {
  value: number | null | undefined;
  onChangeValue: (v: number | null) => void;
  integer?: boolean;
}>(function NumberInput({ value, onChangeValue, integer, ...rest }, ref) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    const typed = text === '' ? null : Number(text);
    if (value !== typed && !(value == null && text === '')) setText(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <Input ref={ref} value={text} keyboardType={integer ? 'number-pad' : 'decimal-pad'} ltr
      onChangeText={(raw) => {
        let clean = raw.replace(integer ? /[^\d]/g : /[^\d.]/g, '');
        const [i, ...d] = clean.split('.');
        if (d.length) clean = `${i}.${d.join('').slice(0, 3)}`;
        setText(clean);
        onChangeValue(clean === '' || clean === '.' ? null : Number(clean));
      }}
      {...rest} />
  );
});

/** Grid of choice tiles (units, kinds). Labels are translated by the caller. */
export function Tiles<V extends string>({ value, onChange, options, columns = 3 }: {
  value: V; onChange: (v: V) => void; options: Array<{ value: V; label: string }>; columns?: number;
}) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale key={o.value} onPress={() => onChange(o.value)} haptic="select" accessibilityState={{ selected: on }}
            style={{
              width: `${100 / columns - 2.5}%` as `${number}%`, minHeight: 46, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
              backgroundColor: on ? th.colors.brand.soft : th.colors.surface, borderWidth: on ? 1.5 : 1, borderColor: on ? th.colors.brand.solid : th.colors.border,
            }}>
            <Text size="sm" weight={on ? 'bold' : 'medium'} tone={on ? 'brand' : 'default'} align="center" numberOfLines={1}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Live profit for a cost and a sale price (same thresholds as the web margin card). */
export function MarginCard({ cost, price, hidden }: { cost: number; price: number; hidden?: boolean }) {
  if (hidden) return null;
  const level = marginLevel(price, cost);
  const profit = price - cost;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const tone = level === 'none' ? 'muted' : level === 'loss' ? 'danger' : level === 'good' ? 'success' : 'warning';
  const advice = !price ? t('Bechne ki qeemat likhein') : !cost ? t('Cost likhein to profit dikhega')
    : level === 'loss' ? t('Cost se sasta bik raha hai — ghata hoga') : level === 'thin' ? t('Profit kam hai — rate dobara dekh lein')
      : level === 'good' ? t('Acha profit') : t('Theek profit');
  return (
    <Card tone={tone}>
      <Row justify="between" align="end">
        <View>
          <Text size="xs" tone="muted">{t('Har ek par profit')}</Text>
          <Text size="xl" weight="bold" ltr>{price && cost ? formatPKR(profit) : '—'}</Text>
        </View>
        {price > 0 && cost > 0 && <Text size="2xl" weight="bold" ltr>{`${margin.toFixed(1)}%`}</Text>}
      </Row>
      <View style={{ marginTop: 8 }}>
        <ProgressBar value={Math.max(0, Math.min(1, margin / 50))} tone={tone === 'muted' ? 'neutral' : tone} />
      </View>
      <Text size="xs" weight="medium" style={{ marginTop: 6 }}>{advice}</Text>
    </Card>
  );
}
