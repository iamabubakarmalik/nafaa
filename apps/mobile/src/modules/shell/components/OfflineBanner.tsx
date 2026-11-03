/** Thin banner while there is no internet; waiting work syncs when it returns. */

import { CloudOff } from 'lucide-react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { t } from '@/core/i18n';
import { useSyncStatus } from '@/core/net';
import { Icon, Text, useTheme } from '@/design';

export function OfflineBanner() {
  const th = useTheme();
  const { state, pending } = useSyncStatus();
  if (state !== 'offline') return null;
  return (
    <Animated.View
      entering={th.motion ? FadeInUp : undefined}
      exiting={th.motion ? FadeOutUp : undefined}
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), marginHorizontal: th.space(4), marginBottom: th.space(2), paddingHorizontal: th.space(3), paddingVertical: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors.warning.soft, borderWidth: 1, borderColor: th.colors.warning.border }}
    >
      <Icon icon={CloudOff} size={16} color={th.colors.warning.text} />
      <Text size="sm" weight="medium" color={th.colors.warning.text} style={{ flex: 1 }}>
        {pending > 0 ? t('Internet nahi hai — {{count}} kaam net aate hi sync honge', { count: pending }) : t('Internet nahi hai — app chalti rahegi, net aate hi sync hoga')}
      </Text>
    </Animated.View>
  );
}
