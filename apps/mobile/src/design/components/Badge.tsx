/**
 * Badge: short status label by meaning.
 *
 *   <Badge tone="success">{t('Paid')}</Badge>
 *   <StatusPill tone="warning" dot>{t('Pending')}</StatusPill>   // with a dot, for list rows
 */

import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { StatusTone } from '../theme/palette';
import { Text } from './Text';
import { Icon } from './Icon';

export interface BadgeProps {
  tone?: StatusTone;
  /** Solid fill instead of the soft tint. */
  solid?: boolean;
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  dot?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ tone = 'neutral', solid, size = 'sm', icon, dot, children, style }: BadgeProps) {
  const t = useTheme();
  const tc = t.colors[tone];
  const fg = solid ? tc.onSolid : tc.text;
  return (
    <View style={[{
      flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4,
      paddingHorizontal: size === 'sm' ? 8 : 10, paddingVertical: size === 'sm' ? 2 : 4,
      borderRadius: t.radius('full'), backgroundColor: solid ? tc.solid : tc.soft,
      borderWidth: solid ? 0 : 1, borderColor: solid ? undefined : tc.border,
    }, style]}>
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: solid ? fg : tc.solid }} />}
      {icon && <Icon icon={icon} size={size === 'sm' ? 12 : 14} color={fg} />}
      <Text size={size === 'sm' ? 'xs' : 'sm'} weight="semibold" color={fg} numberOfLines={1}>{children}</Text>
    </View>
  );
}

export const StatusPill = (props: BadgeProps) => <Badge dot size="sm" {...props} />;
