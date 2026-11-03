/**
 * Empty, error and offline states for lists and screens.
 *
 *   <EmptyState icon={Package} title={t('No products yet')} message={t('…')} action={<Button icon={Plus}>{t('New')}</Button>} />
 *   <ErrorState error={query.error} onRetry={query.refetch} />
 */

import type { LucideIcon } from 'lucide-react-native';
import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { t } from '@/core/i18n';
import { apiErrorMessage, isNetworkError } from '@/core/api/errors';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { Icon } from './Icon';
import { Button } from './Button';

interface StateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
  tone?: 'neutral' | 'brand' | 'danger' | 'warning';
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon, title, message, action, tone = 'brand', compact, style }: StateProps) {
  const th = useTheme();
  const tc = th.colors[tone];
  return (
    <View style={[{ alignItems: 'center', paddingVertical: th.space(compact ? 6 : 12), paddingHorizontal: th.space(6), gap: th.space(3) }, style]}>
      {icon && (
        <View style={{ width: compact ? 52 : 68, height: compact ? 52 : 68, borderRadius: th.radius('2xl'), backgroundColor: tc.soft, alignItems: 'center', justifyContent: 'center', marginBottom: th.space(1) }}>
          <Icon icon={icon} size={compact ? 24 : 30} color={tc.text} strokeWidth={1.75} />
        </View>
      )}
      <Text size={compact ? 'md' : 'lg'} weight="semibold" align="center">{title}</Text>
      {message && <Text size="sm" tone="muted" align="center" style={{ maxWidth: 320 }}>{message}</Text>}
      {action && <View style={{ marginTop: th.space(2) }}>{action}</View>}
    </View>
  );
}

export function ErrorState({ error, onRetry, title, compact, style }: { error?: unknown; onRetry?: () => void; title?: string; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const offline = isNetworkError(error);
  return (
    <EmptyState
      icon={offline ? CloudOff : TriangleAlert}
      tone={offline ? 'warning' : 'danger'}
      compact={compact}
      style={style}
      title={title ?? (offline ? t('Internet nahi hai') : t('Load nahi ho saka'))}
      message={offline ? t('Connection wapas aate hi dobara koshish karein.') : apiErrorMessage(error)}
      action={onRetry ? <Button variant="secondary" icon={RefreshCw} onPress={onRetry}>{t('Dobara try karein')}</Button> : undefined}
    />
  );
}
