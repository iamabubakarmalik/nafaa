/** Headline numbers to show (web Customize → Numbers): up to 8, in the order picked. */

import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Icon, PressableScale, Sheet, Text, useLayout, useTheme, withAlpha } from '@/design';
import { useHomeContext, MAX_KPIS } from '../layout/useHomeLayout';
import { useMasked } from '../lib/privacy';
import { KPI_DEFS } from '../widgets/Kpis';

export function NumbersSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const { isTablet } = useLayout();
  const { kpis, toggleKpi, resetKpis } = useHomeContext();
  const { noCost } = useMasked();
  const selected = kpis.map((k) => k.id);
  return (
    <Sheet open={open} onClose={onClose} title={t('Numbers')}
      description={t('Upar wale cards me kya dikhe — {{MAX_KPIS}} tak chunein. Jis sort se chunenge, usi sort se nazar aayenge.', { MAX_KPIS })}
      footer={<View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={resetKpis}>{t('Default numbers')}</Button>
        <Button style={{ flex: 1 }} onPress={onClose}>{t('Ho gaya')}</Button>
      </View>}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {KPI_DEFS.map((k) => {
          const pos = selected.indexOf(k.id);
          const on = pos >= 0;
          const disabled = !on && selected.length >= MAX_KPIS;
          const color = k.tone === 'neutral' ? th.colors.textMuted : th.colors[k.tone].solid;
          return (
            <PressableScale key={k.id} onPress={() => toggleKpi(k.id)} disabled={disabled} haptic="select" accessibilityLabel={k.label} accessibilityState={{ selected: on, disabled }}
              style={{
                flexBasis: isTablet ? '31%' : '47%', flexGrow: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: th.space(2.5), padding: th.space(3),
                borderRadius: th.radius('lg'), borderWidth: on ? 1.5 : 1, borderColor: on ? th.colors.brand.solid : th.colors.border,
                backgroundColor: on ? th.colors.brand.soft : th.colors.surface, opacity: disabled ? 0.5 : 1,
              }}>
              <View style={{ width: 30, height: 30, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(color, th.isDark ? 0.22 : 0.12) }}>
                <Icon icon={k.icon} size={16} color={color} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" weight="medium" numberOfLines={2}>{k.label}</Text>
                {k.sensitive && noCost && <Text size="2xs" tone="muted">{t('Cost lock me chhupa rahega')}</Text>}
              </View>
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? th.colors.brand.solid : 'transparent', borderWidth: on ? 0 : 1, borderColor: th.colors.borderStrong }}>
                {on ? <Text size="2xs" weight="bold" color={th.colors.brand.onSolid} ltr>{pos + 1}</Text> : <Icon icon={Check} size={12} color="transparent" />}
              </View>
            </PressableScale>
          );
        })}
      </View>
    </Sheet>
  );
}
