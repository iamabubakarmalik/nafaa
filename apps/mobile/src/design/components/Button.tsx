/**
 * Button.
 *
 *   <Button onPress={save} loading={saving}>{t('Save')}</Button>
 *   <Button variant="secondary" icon={Plus}>{t('New')}</Button>
 *   <Button variant="danger" size="lg" fullWidth>{t('Delete')}</Button>
 *
 * Variants: primary (brand), secondary (bordered surface), soft (brand tint),
 * ghost, danger, critical (quiet red), success, inverse (on dark/hero), link.
 * Sizes: sm 36, md 44, lg 52, xl 56 (density applies). Labels are plain
 * English verbs in every language rule (Save, New, Edit, Delete).
 */

import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import type { HapticKind } from '@/core/device/haptics';
import { useTheme } from '../theme/ThemeProvider';
import type { ControlSize } from '../tokens/layout';
import { withAlpha } from '../tokens/color';
import { PressableScale } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'critical' | 'success' | 'inverse' | 'link';

export interface ButtonProps {
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ControlSize;
  icon?: LucideIcon;
  /** Mirror the leading icon in Urdu (back arrows). */
  iconFlip?: boolean;
  /** Icon after the label (arrows: pass iconEndFlip to mirror in Urdu). */
  iconEnd?: LucideIcon;
  iconEndFlip?: boolean;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: HapticKind | false;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  children, onPress, variant = 'primary', size = 'md', icon, iconFlip, iconEnd, iconEndFlip, loading, disabled,
  fullWidth, haptic = 'tap', accessibilityLabel, style, testID,
}: ButtonProps) {
  const theme = useTheme();
  const c = theme.colors;
  const height = theme.control(size);
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.brand.solid, fg: c.brand.onSolid },
    secondary: { bg: c.surface, fg: c.text, border: c.border },
    soft: { bg: c.brand.soft, fg: c.brand.text },
    ghost: { bg: 'transparent', fg: c.textSecondary },
    danger: { bg: c.danger.solid, fg: c.danger.onSolid },
    critical: { bg: c.danger.soft, fg: c.danger.text, border: c.danger.border },
    success: { bg: c.success.solid, fg: c.success.onSolid },
    inverse: { bg: withAlpha('#ffffff', 0.16), fg: '#ffffff', border: withAlpha('#ffffff', 0.25) },
    link: { bg: 'transparent', fg: c.brand.text },
  };
  const p = palette[variant];
  const off = disabled || loading;
  const textSize = size === 'sm' ? 'sm' : size === 'md' ? 'base' : 'md';
  const iconSize = size === 'sm' ? 16 : 18;
  // Screen readers and UI tests read the visible text (already in the user's language).
  const label = accessibilityLabel ?? textOf(children);

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={off}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={[
        {
          height: variant === 'link' ? undefined : height,
          minHeight: variant === 'link' ? 32 : undefined,
          paddingHorizontal: variant === 'link' ? 0 : theme.space(size === 'sm' ? 3 : 4),
          borderRadius: theme.radius(size === 'sm' ? 'md' : 'lg'),
          backgroundColor: p.bg,
          borderWidth: p.border ? 1 : 0,
          borderColor: p.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space(2),
          alignSelf: fullWidth ? 'stretch' : 'auto',
          opacity: disabled && !loading ? 0.5 : 1,
        },
        variant === 'primary' && !off && {
          shadowColor: c.brandScale[700], shadowOpacity: theme.isDark ? 0 : 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} size="small" />
      ) : (
        <>
          {icon && <Icon icon={icon} size={iconSize} color={p.fg} flip={iconFlip} />}
          {children != null && (
            <Text size={textSize} weight="semibold" color={p.fg} numberOfLines={1}>
              {children}
            </Text>
          )}
          {iconEnd && <Icon icon={iconEnd} size={iconSize} color={p.fg} flip={iconEndFlip} />}
        </>
      )}
      {loading && <View accessibilityElementsHidden />}
    </PressableScale>
  );
}

/** Plain text of a label made of strings and numbers; undefined for anything else. */
export function textOf(node: ReactNode): string | undefined {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    const parts = node.map(textOf);
    return parts.every((p) => p !== undefined) ? parts.join('') : undefined;
  }
  return undefined;
}

export interface IconButtonProps {
  icon: LucideIcon;
  /** Required: read by screen readers. */
  label: string;
  onPress?: () => void;
  variant?: 'ghost' | 'secondary' | 'soft' | 'primary' | 'inverse' | 'danger';
  size?: ControlSize;
  flip?: boolean;
  disabled?: boolean;
  /** Small dot / count on the corner (notifications). */
  badge?: number | boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, label, onPress, variant = 'ghost', size = 'md', flip, disabled, badge, color, style }: IconButtonProps) {
  const theme = useTheme();
  const c = theme.colors;
  const dim = theme.control(size === 'xl' ? 'lg' : size);
  const map = {
    ghost: { bg: 'transparent', fg: c.textSecondary, border: undefined },
    secondary: { bg: c.surface, fg: c.textSecondary, border: c.border },
    soft: { bg: c.brand.soft, fg: c.brand.text, border: undefined },
    primary: { bg: c.brand.solid, fg: c.brand.onSolid, border: undefined },
    inverse: { bg: withAlpha('#ffffff', 0.16), fg: '#ffffff', border: withAlpha('#ffffff', 0.25) },
    danger: { bg: c.danger.soft, fg: c.danger.text, border: undefined },
  }[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={dim < 44 ? (44 - dim) / 2 : 0}
      style={[{
        width: dim, height: dim, borderRadius: theme.radius('md'), alignItems: 'center', justifyContent: 'center',
        backgroundColor: map.bg, borderWidth: map.border ? 1 : 0, borderColor: map.border, opacity: disabled ? 0.45 : 1,
      }, style]}
    >
      <Icon icon={icon} size={size === 'sm' ? 18 : 21} color={color ?? map.fg} flip={flip} />
      {!!badge && (
        <View style={{
          position: 'absolute', top: 4, end: 4, minWidth: typeof badge === 'number' ? 17 : 9, height: typeof badge === 'number' ? 17 : 9,
          borderRadius: 9, backgroundColor: c.danger.solid, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
          borderWidth: 1.5, borderColor: variant === 'inverse' ? 'transparent' : c.surface,
        }}>
          {typeof badge === 'number' && <Text size="2xs" weight="bold" color="#fff" ltr>{badge > 99 ? '99+' : String(badge)}</Text>}
        </View>
      )}
    </PressableScale>
  );
}
