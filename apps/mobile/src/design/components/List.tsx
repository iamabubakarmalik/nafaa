/**
 * Fast virtualized list (FlashList) with the kit's loading, empty, error and
 * pull-to-refresh behaviour built in.
 *
 *   <List
 *     data={query.data?.items}
 *     loading={query.isLoading}
 *     error={query.error}
 *     onRetry={query.refetch}
 *     refreshing={query.isRefetching}
 *     onRefresh={query.refetch}
 *     onEndReached={query.fetchNextPage}
 *     keyExtractor={(p) => p.id}
 *     renderItem={({ item }) => <ListRow title={item.name} … />}
 *     empty={<EmptyState icon={Package} title={t('No products yet')} />}
 *     ListHeaderComponent={<PageHero … />}
 *   />
 */

import { FlashList, type FlashListProps } from '@shopify/flash-list';
import type { ReactElement } from 'react';
import { RefreshControl, View, type RefreshControlProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SkeletonRows } from './Skeleton';
import { ErrorState } from './States';

export interface ListProps<T> extends Omit<FlashListProps<T>, 'data' | 'refreshControl' | 'ListEmptyComponent'> {
  data: readonly T[] | null | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  empty?: ReactElement;
  /** Divider between rows (inset to the text). */
  dividers?: boolean;
}

export function List<T>({ data, loading, error, onRetry, refreshing = false, onRefresh, empty, dividers, ...rest }: ListProps<T>) {
  const th = useTheme();
  const showError = !!error && !data?.length;
  return (
    <FlashList
      data={loading || showError ? [] : (data as T[] | undefined) ?? []}
      refreshControl={onRefresh ? <PullToRefresh refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      ItemSeparatorComponent={dividers ? () => <View style={{ height: 1, backgroundColor: th.colors.divider, marginStart: th.space(4) }} /> : undefined}
      ListEmptyComponent={loading ? <SkeletonRows count={6} /> : showError ? <ErrorState error={error} onRetry={onRetry} /> : empty}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...rest}
    />
  );
}

/**
 * Pull-to-refresh control in the brand color. Pass to ScrollView/List `refreshControl`.
 *
 * On Android the ScrollView clones this element and passes the native scroll
 * view in as `children` plus the frame `style`; both must reach RefreshControl,
 * or the whole scroll body is never drawn (blank screen).
 */
export function PullToRefresh({ refreshing, onRefresh, onDark, ...rest }: Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> & { refreshing: boolean; onRefresh: () => void; onDark?: boolean }) {
  const th = useTheme();
  const color = onDark ? '#ffffff' : th.colors.brand.solid;
  return <RefreshControl {...rest} refreshing={refreshing} onRefresh={onRefresh} tintColor={color} colors={[th.colors.brand.solid]} progressBackgroundColor={th.colors.surfaceRaised} />;
}
