/**
 * One row in a list or a grouped card.
 *
 *   <ListRow icon={Package} title={p.name} subtitle={`${p.stock} left`} trailing={<Amount value={p.price} />} onPress={open} />
 *   <ListRow avatar={<Avatar name={c.name} />} title={c.name} chevron />
 *   <ListRow title={t('Log out')} icon={LogOut} destructive onPress={logout} />
 *
 * Rows are at least 56pt tall (comfortable). Chevrons mirror in Urdu.
 */

import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { StatusTone } from '../theme/palette';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';

export interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Small text above the title (category, date). */
  overline?: string;
  icon?: LucideIcon;
  iconTone?: StatusTone;
  /** Custom leading element (Avatar, image). */
  leading?: ReactNode;
  avatar?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Divider under the row, inset to the text. */
  divider?: boolean;
  dense?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  title, subtitle, overline, icon, iconTone = 'neutral', leading, avatar, trailing, chevron, selected, destructive,
  disabled, onPress, onLongPress, divider, dense, accessibilityLabel, style,
}: ListRowProps) {
  const t = useTheme();
  const c = t.colors;
  const tc = destructive ? c.danger : c[iconTone];
  const lead = leading ?? avatar ?? (icon ? (
    <View style={{ width: 38, height: 38, borderRadius: t.radius('md'), backgroundColor: tc.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Icon icon={icon} size={19} color={tc.text} />
    </View>
  ) : null);

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space(3), minHeight: dense ? 48 : 58, paddingVertical: t.space(dense ? 2 : 2.5), paddingHorizontal: t.space(4) }}>
      {lead}
      <View style={{ flex: 1, minWidth: 0 }}>
        {overline && <Text size="2xs" weight="semibold" tone="subtle" uppercase numberOfLines={1}>{overline}</Text>}
        {typeof title === 'string'
          ? <Text size="base" weight="medium" tone={destructive ? 'danger' : 'default'} numberOfLines={1}>{title}</Text>
          : title}
        {subtitle != null && (typeof subtitle === 'string' ? <Text size="sm" tone="muted" numberOfLines={2}>{subtitle}</Text> : subtitle)}
      </View>
      {trailing}
      {chevron && <Icon icon={ChevronRight} size={18} tone="subtle" flip />}
    </View>
  );

  const frame: StyleProp<ViewStyle> = [
    { backgroundColor: selected ? c.brand.soft : 'transparent', opacity: disabled ? 0.5 : 1 },
    divider && { borderBottomWidth: 1, borderBottomColor: c.divider },
    style,
  ];

  if (!onPress && !onLongPress) return <View style={frame}>{content}</View>;
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      scaleTo={1}
      haptic={false}
      accessibilityLabel={accessibilityLabel ?? (typeof title === 'string' ? title : undefined)}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      pressedStyle={{ backgroundColor: c.surfaceMuted }}
      style={frame}
    >
      {content}
    </PressableScale>
  );
}

/** Rows grouped on one rounded surface, with dividers between them. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={[{ backgroundColor: t.colors.surface, borderRadius: t.radius('xl'), borderWidth: t.isDark ? 1 : 0.5, borderColor: t.colors.border, overflow: 'hidden' }, style]}>
      {items.map((child, i) => (
        <View key={i}>
          {child}
          {i < items.length - 1 && <View style={{ height: 1, backgroundColor: t.colors.divider, marginStart: t.space(4) }} />}
        </View>
      ))}
    </View>
  );
}

export function ProgressBar({ value, tone = 'brand', height = 6 }: { value: number; tone?: StatusTone; height?: number }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: t.colors.surfaceMuted, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ now: Math.round(pct * 100), min: 0, max: 100 }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: t.colors[tone].solid }} />
    </View>
  );
}
