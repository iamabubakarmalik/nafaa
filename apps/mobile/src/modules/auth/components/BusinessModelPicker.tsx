/**
 * "Aap kaise bechte hain?" — multi-select cards (same as the web). One card
 * always stays selected, so the question never blocks anyone.
 */

import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { BUSINESS_MODEL_OPTIONS, cleanModels, type BusinessModel } from '@/core/business-models';
import { Icon, PressableScale, Text, useLayout, useTheme, withAlpha } from '@/design';

export function BusinessModelPicker({ value, onChange, label, hint }: { value: readonly BusinessModel[]; onChange: (m: BusinessModel[]) => void; label?: string; hint?: string }) {
  const th = useTheme();
  const c = th.colors;
  const { isTablet } = useLayout();
  const toggle = (id: BusinessModel) => {
    const on = value.includes(id);
    if (on && value.length === 1) return;
    onChange(cleanModels(on ? value.filter((m) => m !== id) : [...value, id]));
  };
  return (
    <View style={{ gap: th.space(2) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: th.space(2), flexWrap: 'wrap' }}>
        <Text size="sm" weight="semibold" tone="secondary">{label ?? t('Aap kaise bechte hain?')}</Text>
        <Text size="xs" tone="muted">{hint ?? t('Ek se zyada chun sakte hain')}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {BUSINESS_MODEL_OPTIONS.map((o) => {
          const active = value.includes(o.id);
          return (
            <PressableScale
              key={o.id}
              onPress={() => toggle(o.id)}
              haptic="select"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={t(o.title)}
              style={{
                width: isTablet ? '23.8%' : '48.6%', minHeight: 112, padding: th.space(3), gap: th.space(1.5), borderRadius: th.radius('xl'),
                borderWidth: active ? 1.5 : 1, borderColor: active ? c.brand.solid : c.border, backgroundColor: active ? c.brand.soft : c.surface,
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: th.radius('md'), backgroundColor: withAlpha(o.color, th.isDark ? 0.22 : 0.1), alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon={o.icon} size={18} color={o.color} />
              </View>
              <Text size="sm" weight="bold">{t(o.title)}</Text>
              <Text size="xs" tone="muted">{t(o.hint)}</Text>
              <View style={{ position: 'absolute', top: th.space(2.5), end: th.space(2.5), width: 22, height: 22, borderRadius: th.radius('xs'), borderWidth: 1.5, borderColor: active ? c.brand.solid : c.borderStrong, backgroundColor: active ? c.brand.solid : c.surface, alignItems: 'center', justifyContent: 'center' }}>
                {active && <Icon icon={Check} size={14} color={c.brand.onSolid} strokeWidth={3} />}
              </View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
