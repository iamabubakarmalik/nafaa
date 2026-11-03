/** Feet and inches side by side (a roll or piece measure). Values are numbers; empty is null. */

import { View } from 'react-native';
import { NumberInput } from '@/modules/inventory/components/fields';
import { t } from '@/core/i18n';
import { Text, useTheme } from '@/design';

export function SizeInput({ label, ft, inch, onChange, error, disabled, hint }: {
  label: string; ft: number | null; inch: number | null; onChange: (ft: number | null, inch: number | null) => void; error?: string; disabled?: boolean; hint?: string;
}) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(1) }}>
      <Text size="sm" weight="medium" tone="secondary">{label}</Text>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <View style={{ flex: 1 }}><NumberInput placeholder={t('ft')} value={ft} disabled={disabled} onChangeValue={(v) => onChange(v, inch)} error={error} /></View>
        <View style={{ flex: 1 }}><NumberInput placeholder={t('inch')} value={inch} disabled={disabled} onChangeValue={(v) => onChange(ft, v)} /></View>
      </View>
      {hint ? <Text size="xs" tone="muted">{hint}</Text> : null}
    </View>
  );
}
