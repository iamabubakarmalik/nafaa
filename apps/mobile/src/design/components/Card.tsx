/**
 * Card: grouped content on a surface.
 *
 *   <Card title={t('Low stock')} action={<Button variant="link">{t('See all')}</Button>}>…</Card>
 *   <Card flush>{rows}</Card>            // no padding, for ListRow groups
 *   <Card onPress={open} tone="brand">…</Card>
 */

import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './Pressable';
import { Text } from './Text';

export interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Right side of the header (a link button, a badge). */
  action?: ReactNode;
  footer?: ReactNode;
  /** No inner padding (lists inside). */
  flush?: boolean;
  /** Tinted variants for callouts. */
  tone?: 'default' | 'brand' | 'muted' | 'warning' | 'danger' | 'success' | 'info';
  onPress?: () => void;
  accessibilityLabel?: string;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Card({ title, description, action, footer, flush, tone = 'default', onPress, accessibilityLabel, elevated, style, children }: CardProps) {
  const t = useTheme();
  const c = t.colors;
  const bg = tone === 'default' ? c.surface : tone === 'muted' ? c.surfaceMuted : c[tone].soft;
  const border = tone === 'default' ? c.border : tone === 'muted' ? c.border : c[tone].border;
  const pad = t.space(4);
  const hasHeader = title != null || action != null || description != null;

  const body = (
    <>
      {hasHeader && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.space(3), paddingHorizontal: pad, paddingTop: pad, paddingBottom: flush ? t.space(3) : 0 }}>
          <View style={{ flex: 1, gap: 2 }}>
            {typeof title === 'string' ? <Text size="md" weight="semibold">{title}</Text> : title}
            {typeof description === 'string' ? <Text size="sm" tone="muted">{description}</Text> : description}
          </View>
          {action}
        </View>
      )}
      <View style={flush ? undefined : { padding: pad, paddingTop: hasHeader ? t.space(3) : pad }}>{children}</View>
      {footer && <View style={{ borderTopWidth: 1, borderTopColor: c.divider, paddingHorizontal: pad, paddingVertical: t.space(3) }}>{footer}</View>}
    </>
  );

  const frame: StyleProp<ViewStyle> = [
    {
      backgroundColor: bg,
      borderRadius: t.radius('xl'),
      borderWidth: t.isDark || tone !== 'default' ? 1 : 0.5,
      borderColor: border,
      overflow: 'hidden',
    },
    (elevated || !t.isDark) && tone === 'default' && {
      shadowColor: c.shadow, shadowOpacity: elevated ? 0.1 : 0.04, shadowRadius: elevated ? 16 : 6, shadowOffset: { width: 0, height: elevated ? 6 : 2 }, elevation: elevated ? 4 : 1,
    },
    style,
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityLabel={accessibilityLabel} scaleTo={0.985} style={frame}>
        {body}
      </PressableScale>
    );
  }
  return <View style={frame}>{body}</View>;
}

/** Small uppercase heading above a group of cards or rows. */
export function SectionHeader({ title, action, style }: { title: string; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.space(1), marginBottom: t.space(2) }, style]}>
      <Text size="sm" weight="semibold" tone="muted">{title}</Text>
      {action}
    </View>
  );
}
