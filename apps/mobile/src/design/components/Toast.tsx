/**
 * Toasts: short messages at the top of the screen.
 *
 *   toast.success(t('Product save ho gaya'));
 *   toast.error(t('Save nahi hua'), { message: details });
 *   toast.info(t('…'), { action: { label: t('Undo'), onPress: undo } });
 *
 * <ToastHost> is mounted by the root layout. API errors from mutations are
 * shown automatically (core/query/client.ts).
 */

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/i18n';
import { dismissToast, showToast, useToastStore, type ToastItem, type ToastTone } from '@/core/toast';
import { haptic } from '@/core/device/haptics';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { Icon } from './Icon';
import { PressableScale } from './Pressable';

type Extra = { message?: string; action?: ToastItem['action']; duration?: number };
const make = (tone: ToastTone) => (title: string, extra: Extra = {}) => {
  haptic(tone === 'success' ? 'success' : tone === 'danger' ? 'error' : tone === 'warning' ? 'warning' : 'tap');
  return showToast({ tone, title, ...extra });
};

export const toast = {
  success: make('success'),
  error: make('danger'),
  warning: make('warning'),
  info: make('info'),
  show: make('neutral'),
  dismiss: dismissToast,
};

/** Icon colors on the dark toast surface (same in light and dark mode). */
const ICON_COLORS: Record<ToastTone, string> = { success: '#4ade80', danger: '#fb7185', warning: '#fbbf24', info: '#60a5fa', neutral: '#cbd5e1' };
const ICONS = { success: CircleCheck, danger: CircleAlert, warning: TriangleAlert, info: Info, neutral: Info };

function ToastCard({ item }: { item: ToastItem }) {
  const th = useTheme();
  useEffect(() => {
    const timer = setTimeout(() => dismissToast(item.id), item.duration);
    return () => clearTimeout(timer);
  }, [item.id, item.duration]);
  return (
    <Animated.View
      entering={th.motion ? FadeInUp.springify().damping(18) : undefined}
      exiting={th.motion ? FadeOutUp.duration(160) : undefined}
      layout={th.motion ? LinearTransition.springify() : undefined}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingVertical: th.space(3), paddingHorizontal: th.space(4),
        backgroundColor: th.isDark ? th.colors.surfaceRaised : '#0f172a', borderRadius: th.radius('xl'),
        borderWidth: th.isDark ? 1 : 0, borderColor: th.colors.border,
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
      }}
    >
      <Icon icon={ICONS[item.tone]} size={20} color={ICON_COLORS[item.tone]} />
      <View style={{ flex: 1 }}>
        <Text size="sm" weight="semibold" color="#f8fafc">{item.title}</Text>
        {item.message && <Text size="xs" color="#cbd5e1">{item.message}</Text>}
      </View>
      {item.action && (
        <PressableScale onPress={() => { item.action!.onPress(); dismissToast(item.id); }} haptic="tap" accessibilityLabel={item.action.label}>
          <Text size="sm" weight="bold" color={th.colors.brandScale[300]}>{item.action.label}</Text>
        </PressableScale>
      )}
      <PressableScale onPress={() => dismissToast(item.id)} hitSlop={10} accessibilityLabel={t('Band karein')}>
        <Icon icon={X} size={16} color="#94a3b8" />
      </PressableScale>
    </Animated.View>
  );
}

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const insets = useSafeAreaInsets();
  const th = useTheme();
  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + th.space(2), left: th.space(3), right: th.space(3), gap: th.space(2), alignItems: 'center' }}>
      {items.map((item) => (
        <View key={item.id} style={{ width: '100%', maxWidth: 520 }}>
          <ToastCard item={item} />
        </View>
      ))}
    </View>
  );
}
