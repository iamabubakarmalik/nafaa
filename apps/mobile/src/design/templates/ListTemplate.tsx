/**
 * List screen template: slim header, optional summary, search, filter chips,
 * a fast list with loading / empty / error / pull-to-refresh / paging, and a
 * floating New button. Every list in the app (products, sales, customers,
 * expenses…) uses it so they look and behave the same.
 *
 *   <ListTemplate
 *     title={t('Products')}
 *     actions={<IconButton icon={SlidersHorizontal} label={t('Filters')} onPress={…} />}
 *     search={{ value: q, onChange: setQ, placeholder: t('Search products'), onScan }}
 *     filters={{ value: filter, onChange: setFilter, options: [{ value: 'all', label: t('All') }, …] }}
 *     summary={<PageHero stats={…} />}                 // optional, keep it slim
 *     query={productsQuery}                            // or data/loading/error/onRefresh props
 *     data={products}
 *     keyExtractor={(p) => p.id}
 *     renderItem={({ item }) => <ListRow … />}
 *     empty={<EmptyState icon={Package} title={t('No products yet')} />}
 *     fab={{ icon: Plus, label: t('New'), onPress: () => router.push('/products/new') }}
 *     tabBar                                           // when shown inside the tabs
 *   />
 */

import type { LucideIcon } from 'lucide-react-native';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ListRenderItem } from '@shopify/flash-list';
import { useTheme } from '../theme/ThemeProvider';
import { ScreenHeader, LargeTitle, useTabBarSpace } from '../components/Screen';
import { useSharedValue } from 'react-native-reanimated';
import { List } from '../components/List';
import { SearchBar } from '../components/SearchBar';
import { ChipGroup, type Option } from '../components/Chips';
import { Fab } from '../components/Fab';

export interface ListTemplateProps<T> {
  title: string;
  subtitle?: string;
  onBack?: (() => void) | null;
  actions?: ReactNode;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string; onScan?: () => void };
  filters?: { value: string; onChange: (v: string) => void; options: Option[] };
  /** A slim summary above the list (PageHero, StatTiles). */
  summary?: ReactNode;
  data: readonly T[] | null | undefined;
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  /** Footer under the rows (a "Loading more" spinner). */
  footer?: ReactElement;
  empty?: ReactElement;
  fab?: { icon: LucideIcon; label?: string; onPress: () => void };
  /** Rows sit on one rounded card (default) or edge to edge. */
  grouped?: boolean;
  tabBar?: boolean;
}

export function ListTemplate<T>({
  title, subtitle, onBack, actions, search, filters, summary, data, renderItem, keyExtractor, loading, error, onRetry,
  refreshing, onRefresh, onEndReached, footer, empty, fab, grouped = true, tabBar,
}: ListTemplateProps<T>) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const barSpace = useTabBarSpace();
  const scrollY = useSharedValue(0);
  const bottom = (tabBar ? barSpace : insets.bottom) + (fab ? 88 : th.space(4));
  const count = data?.length ?? 0;

  const header = (
    <View style={{ paddingHorizontal: th.space(4), gap: th.space(3), paddingBottom: th.space(3) }}>
      <LargeTitle title={title} subtitle={subtitle} />
      {summary}
      {search && <SearchBar value={search.value} onChangeText={search.onChange} placeholder={search.placeholder} onScan={search.onScan} />}
      {filters && <ChipGroup options={filters.options} value={filters.value} onChange={filters.onChange} style={{ marginHorizontal: -th.space(4) }} />}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.canvas, paddingTop: insets.top }}>
      <ScreenHeader title={title} subtitle={subtitle} onBack={onBack} actions={actions} scrollY={scrollY} />
      <List
        data={data}
        loading={loading}
        error={error}
        onRetry={onRetry}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        empty={empty}
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottom }}
        renderItem={(info) => {
          const row = renderItem(info);
          if (!grouped) return row;
          const first = info.index === 0;
          const last = info.index === count - 1;
          return (
            <View style={{
              marginHorizontal: th.space(4), backgroundColor: th.colors.surface, overflow: 'hidden',
              borderColor: th.colors.border, borderLeftWidth: th.isDark ? 1 : 0.5, borderRightWidth: th.isDark ? 1 : 0.5,
              borderTopWidth: first ? (th.isDark ? 1 : 0.5) : 0, borderBottomWidth: last ? (th.isDark ? 1 : 0.5) : 0,
              borderTopLeftRadius: first ? th.radius('xl') : 0, borderTopRightRadius: first ? th.radius('xl') : 0,
              borderBottomLeftRadius: last ? th.radius('xl') : 0, borderBottomRightRadius: last ? th.radius('xl') : 0,
            }}>
              {row}
              {!last && <View style={{ height: 1, backgroundColor: th.colors.divider, marginStart: th.space(4) }} />}
            </View>
          );
        }}
      />
      {fab && <Fab icon={fab.icon} label={fab.label} onPress={fab.onPress} offset={tabBar ? barSpace - insets.bottom : 0} />}
    </View>
  );
}
