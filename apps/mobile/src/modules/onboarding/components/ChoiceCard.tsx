/** Radio-style card used by the onboarding steps. */

import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon, PressableScale, Text, useTheme } from '@/design';

export function ChoiceCard({ selected, onSelect, title, description, icon, style }: { selected: boolean; onSelect: () => void; title: string; description?: string; icon?: LucideIcon; style?: object }) {
  const th = useTheme();
  const c = th.colors;
  return (
    <PressableScale
      onPress={onSelect}
      haptic="select"
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      style={[{
        flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3.5), borderRadius: th.radius('xl'),
        borderWidth: selected ? 1.5 : 1, borderColor: selected ? c.brand.solid : c.border, backgroundColor: selected ? c.brand.soft : c.surface,
      }, style]}
    >
      {icon && (
        <View style={{ width: 38, height: 38, borderRadius: th.radius('md'), backgroundColor: selected ? c.brand.solid : c.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={icon} size={18} color={selected ? c.brand.onSolid : c.textSecondary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text size="base" weight="semibold">{title}</Text>
        {description && <Text size="sm" tone="muted">{description}</Text>}
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 6.5 : 1.5, borderColor: selected ? c.brand.solid : c.borderStrong, backgroundColor: c.surface }} />
    </PressableScale>
  );
}

export function StepSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(2.5) }}>
      <View style={{ gap: 2 }}>
        <Text size="md" weight="bold">{title}</Text>
        {hint && <Text size="sm" tone="muted">{hint}</Text>}
      </View>
      {children}
    </View>
  );
}
