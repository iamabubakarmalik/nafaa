/**
 * Key number tile.
 *
 *   <StatTile label={t('Cash in drawer')} value={<Amount value={x} size="xl" weight="bold" />} icon={Wallet} tone="success" hint={t('Register open')} onPress={…} />
 */

import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { StatusTone } from '../theme/palette';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: StatusTone;
  hint?: ReactNode;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function StatTile({ label, value, icon, tone = 'brand', hint, loading, onPress, style }: StatTileProps) {
  const t = useTheme();
  const tc = t.colors[tone];
  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space(2) }}>
        {icon && (
          <View style={{ width: 30, height: 30, borderRadius: t.radius('sm'), backgroundColor: tc.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={icon} size={16} color={tc.text} />
          </View>
        )}
        <Text size="xs" weight="medium" tone="muted" numberOfLines={1} style={{ flex: 1 }}>{label}</Text>
      </View>
      {loading ? <Skeleton width="70%" height={22} style={{ marginTop: t.space(2) }} /> : (
        <View style={{ marginTop: t.space(2) }}>{typeof value === 'string' ? <Text size="xl" weight="bold">{value}</Text> : value}</View>
      )}
      {hint != null && !loading && (typeof hint === 'string' ? <Text size="xs" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>{hint}</Text> : hint)}
    </>
  );
  const frame: StyleProp<ViewStyle> = [{
    flex: 1, minWidth: 140, alignSelf: "stretch", backgroundColor: t.colors.surface, borderRadius: t.radius('xl'), padding: t.space(3.5),
    borderWidth: t.isDark ? 1 : 0.5, borderColor: t.colors.border,
    shadowColor: t.colors.shadow, shadowOpacity: t.isDark ? 0 : 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  }, style];
  return onPress
    ? <PressableScale onPress={onPress} haptic="tap" accessibilityLabel={label} style={frame}>{content}</PressableScale>
    : <View style={frame}>{content}</View>;
}
