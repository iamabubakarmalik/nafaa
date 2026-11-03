/**
 * Detail screen template (a product, a sale, a customer): slim header with
 * actions, an optional summary box, sections, and a sticky action bar.
 *
 *   <DetailTemplate
 *     title={sale.number}
 *     subtitle={formatDateTime(sale.soldAt)}
 *     actions={<IconButton icon={Share2} label={t('Share')} onPress={share} />}
 *     summary={<PageHero title={customerName} stats={[{ label: t('Total'), value: <HeroAmount value={sale.total} /> }]} />}
 *     loading={q.isLoading} error={q.error} onRetry={q.refetch} onRefresh={q.refetch}
 *     bottomActions={<><Button variant="secondary" icon={Printer}>{t('Print')}</Button><Button icon={RotateCcw}>{t('Return')}</Button></>}
 *   >
 *     <DetailSection title={t('Items')}>…ListRows…</DetailSection>
 *     <DetailSection title={t('Payment')}><DetailRow label={t('Cash')} value={<Amount value={…} />} /></DetailSection>
 *   </DetailTemplate>
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { SkeletonRows } from '../components/Skeleton';
import { ErrorState } from '../components/States';

export interface DetailTemplateProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  summary?: ReactNode;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Sticky buttons at the bottom (one or two). */
  bottomActions?: ReactNode;
  children?: ReactNode;
}

export function DetailTemplate({ title, subtitle, actions, summary, loading, error, onRetry, onRefresh, refreshing, bottomActions, children }: DetailTemplateProps) {
  const th = useTheme();
  return (
    <Screen
      title={title}
      subtitle={subtitle}
      actions={actions}
      onRefresh={onRefresh}
      refreshing={refreshing}
      narrow
      footer={bottomActions ? <View style={{ flexDirection: 'row', gap: th.space(2) }}>{bottomActions}</View> : undefined}
    >
      {loading ? <SkeletonRows count={5} /> : error ? <ErrorState error={error} onRetry={onRetry} /> : (
        <>
          {summary}
          {children}
        </>
      )}
    </Screen>
  );
}

/** A titled group on a detail screen. */
export function DetailSection({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(2) }}>
      {(title || action) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: th.space(1) }}>
          {title ? <Text size="sm" weight="semibold" tone="muted">{title}</Text> : <View />}
          {action}
        </View>
      )}
      <View style={{ backgroundColor: th.colors.surface, borderRadius: th.radius('xl'), borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

/** Label on the start side, value on the end side. */
export function DetailRow({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), minHeight: 46, paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), borderBottomWidth: last ? 0 : 1, borderBottomColor: th.colors.divider }}>
      <Text size="sm" tone="secondary" style={{ flex: 1 }}>{label}</Text>
      {typeof value === 'string' ? <Text size="sm" weight="semibold">{value}</Text> : value}
    </View>
  );
}
