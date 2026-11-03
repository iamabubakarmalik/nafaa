/**
 * One list screen for the desk jobs of the pack (stitching, alterations,
 * holds, instalment plans): summary tiles, view chips with counts, search,
 * paged rows, pull to refresh and the last saved data offline.
 */

import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react-native';
import { Plus } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { OnlineFeature } from '@/core/offline';
import { ChipGroup, EmptyState, ListTemplate, Text, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote } from '../../_shared/deskKit';
import { usePaged } from './kit';

interface PageLike<T> { items: T[]; page: number; pages: number; total: number; counts: Record<string, number>; totals?: unknown }

export function JobList<T extends { id: string }, V extends string, P extends PageLike<T>>({
  title, queryKey, views, defaultView, fetch, renderRow, tiles, line, onNew, newLabel, actions, searchPlaceholder, emptyIcon, emptyTitle, feature = 'garmentsDesk',
}: {
  title: string; queryKey: string; views: Array<{ value: V; label: string }>; defaultView: V;
  fetch: (q: { view: V; search?: string; page: number }) => Promise<P>;
  renderRow: (item: T, refresh: () => void) => ReactNode;
  tiles?: (setView: (v: V) => void) => ReactNode;
  line?: (first: P) => string | null;
  onNew?: () => void; newLabel?: string; actions?: ReactNode; searchPlaceholder: string; emptyIcon: LucideIcon; emptyTitle: string; feature?: OnlineFeature;
}) {
  const th = useTheme();
  const [view, setView] = useState<V>(defaultView);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 250);
  const list = usePaged<P>([queryKey, 'page', view, q], (page) => fetch({ view, search: q || undefined, page }));
  const rows = (list.data as InfiniteData<P> | undefined)?.pages.flatMap((p) => p.items) ?? [];
  const first = (list.data as InfiniteData<P> | undefined)?.pages[0];
  const refresh = () => void list.refetch();
  const lineText = first && first.total > 0 ? line?.(first) : null;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <OfflineNote feature={feature} />
      {tiles?.(setView)}
      <ChipGroup value={view} onChange={setView} style={{ marginHorizontal: -th.space(4) }}
        options={views.map((v) => ({ value: v.value, label: v.label, count: first?.counts?.[v.value] }))} />
      {lineText ? <Text size="sm" tone="secondary">{lineText}</Text> : null}
      <CachedNote query={list as unknown as UseInfiniteQueryResult} />
    </View>
  );

  return (
    <ListTemplate<T>
      title={title} grouped={false} actions={actions}
      search={{ value: search, onChange: setSearch, placeholder: searchPlaceholder }}
      summary={header} data={rows} loading={list.isLoading} error={!list.data ? list.error : undefined} onRetry={() => void list.refetch()}
      refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={refresh}
      onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
      keyExtractor={(o) => o.id} renderItem={({ item }) => <>{renderRow(item, refresh)}</>}
      empty={<EmptyState icon={emptyIcon} title={emptyTitle} />}
      fab={onNew ? { icon: Plus, label: newLabel, onPress: onNew } : undefined}
    />
  );
}
