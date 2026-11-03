/**
 * The counter's catalog: product tiles in the size chosen in Appearance →
 * POS grid (list, small, medium, large), with price, stock and how many are
 * already on the bill. One tap adds; the pickers take over when the item
 * has packs, variants, a weight or no price.
 */

import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Package, Search } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState, type ReactElement } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { PosGridSize } from '@/design';
import { t } from '@/core/i18n';
import type { ProductRow } from '@/core/offline';
import { Amount, Badge, EmptyState, PressableScale, Skeleton, Text, useTheme, withAlpha } from '@/design';

const MIN_TILE: Record<Exclude<PosGridSize, 'list'>, number> = { small: 96, medium: 124, large: 168 };

export interface TileInfo {
  inCart: number;
  showStock: boolean;
  showImages: boolean;
  /** Industry line under the name (PosIndustryConfig.useShelf). */
  subline?: string | null;
}

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const Tile = memo(function Tile({ p, size, info, onPress, onLongPress }: { p: ProductRow; size: Exclude<PosGridSize, 'list'>; info: TileInfo; onPress: (p: ProductRow) => void; onLongPress?: (p: ProductRow) => void }) {
  const th = useTheme();
  const out = p.stock != null && p.stock - 0 <= 0 && !p.hasVariants;
  const low = p.stock != null && p.lowStockAlert > 0 && p.stock <= p.lowStockAlert && !out;
  const tint = p.categoryColor || th.colors.brand.solid;
  const imgH = size === 'small' ? 56 : size === 'medium' ? 76 : 108;
  return (
    <PressableScale onPress={() => onPress(p)} onLongPress={onLongPress ? () => onLongPress(p) : undefined} scaleTo={0.96}
      accessibilityLabel={`${p.name}, ${p.price}`}
      style={{
        flex: 1, margin: th.space(1), borderRadius: th.radius('lg'), overflow: 'hidden',
        backgroundColor: th.colors.surface, borderWidth: info.inCart ? 2 : 1, borderColor: info.inCart ? th.colors.brand.solid : th.colors.border,
        opacity: out ? 0.55 : 1,
      }}>
      {info.showImages && (
        <View style={{ height: imgH, backgroundColor: withAlpha(tint, th.isDark ? 0.22 : 0.12), alignItems: 'center', justifyContent: 'center' }}>
          {p.imageUrl
            ? <Image source={{ uri: p.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={120} recyclingKey={p.id} />
            : <Text size={size === 'small' ? 'lg' : '2xl'} weight="bold" color={tint}>{initials(p.name)}</Text>}
        </View>
      )}
      <View style={{ padding: th.space(size === 'small' ? 1.5 : 2), gap: 2, flexGrow: 1 }}>
        <Text size={size === 'small' ? 'xs' : 'sm'} weight="semibold" numberOfLines={2}>{p.name}</Text>
        {!!info.subline && <Text size="2xs" tone="muted" numberOfLines={1}>{info.subline}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 'auto' }}>
          <Amount value={p.price} size={size === 'small' ? 'xs' : 'sm'} weight="bold" color={th.colors.brand.text} decimals={0} />
          {info.showStock && p.stock != null && size !== 'small' && (
            <Text size="2xs" tone={out ? 'danger' : low ? 'warning' : 'muted'} ltr numberOfLines={1}>{Number(p.stock.toFixed(2))}</Text>
          )}
        </View>
      </View>
      {info.inCart > 0 && (
        <View style={{ position: 'absolute', top: 6, end: 6 }}>
          <Badge tone="brand" solid size="sm">{Number(info.inCart.toFixed(2))}</Badge>
        </View>
      )}
      {(p.pendingCreate || p.pendingEdit) && (
        <View style={{ position: 'absolute', top: 6, start: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: th.colors.warning.solid }} />
      )}
    </PressableScale>
  );
});

const Row1 = memo(function Row1({ p, info, onPress }: { p: ProductRow; info: TileInfo; onPress: (p: ProductRow) => void }) {
  const th = useTheme();
  const out = p.stock != null && p.stock <= 0 && !p.hasVariants;
  return (
    <PressableScale onPress={() => onPress(p)} scaleTo={0.99} pressedStyle={{ backgroundColor: th.colors.surfaceMuted }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(3), minHeight: 56, opacity: out ? 0.55 : 1 }}>
      {info.showImages && (
        <View style={{ width: 40, height: 40, borderRadius: th.radius('md'), overflow: 'hidden', backgroundColor: withAlpha(p.categoryColor || th.colors.brand.solid, 0.14), alignItems: 'center', justifyContent: 'center' }}>
          {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={{ width: 40, height: 40 }} contentFit="cover" recyclingKey={p.id} /> : <Text size="sm" weight="bold" color={p.categoryColor || th.colors.brand.text}>{initials(p.name)}</Text>}
        </View>
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <Text size="base" weight="medium" numberOfLines={1}>{p.name}</Text>
        {!!info.subline && <Text size="xs" tone="muted" numberOfLines={1}>{info.subline}</Text>}
        {info.showStock && p.stock != null && <Text size="xs" tone={out ? 'danger' : 'muted'}>{t('{{qty}} {{unit}} in stock', { qty: Number(p.stock.toFixed(2)), unit: p.unit })}</Text>}
      </View>
      {info.inCart > 0 && <Badge tone="brand" solid>{Number(info.inCart.toFixed(2))}</Badge>}
      <Amount value={p.price} weight="bold" />
    </PressableScale>
  );
});

export function ProductGrid({ data, loading, size, inCart, showStock, showImages, subline, onPress, onLongPress, header, query, padBottom = 0 }: {
  data: ProductRow[] | undefined;
  loading?: boolean;
  size: PosGridSize;
  inCart: Map<string, number>;
  showStock: boolean;
  showImages: boolean;
  subline?: (p: ProductRow) => string | null | undefined;
  onPress: (p: ProductRow) => void;
  onLongPress?: (p: ProductRow) => void;
  header?: ReactElement;
  query?: string;
  padBottom?: number;
}) {
  const th = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);
  const columns = size === 'list' ? 1 : Math.max(2, Math.floor((width - th.space(2)) / (MIN_TILE[size] + th.space(2))) || 3);
  const rows = useMemo(() => data ?? [], [data]);
  const info = (p: ProductRow): TileInfo => ({ inCart: inCart.get(p.id) ?? 0, showStock, showImages, subline: subline?.(p) ?? null });

  if (loading && !rows.length) {
    return (
      <View onLayout={onLayout} style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: th.space(1) }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={i} style={{ width: `${100 / Math.max(columns, 1)}%`, padding: th.space(1) }}><Skeleton height={size === 'list' ? 48 : 140} radius={th.radius('lg')} /></View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {width > 0 && (
        <FlashList
          key={`${size}-${columns}`}
          data={rows}
          numColumns={columns}
          keyExtractor={(p) => p.id}
          extraData={inCart}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingHorizontal: size === 'list' ? 0 : th.space(1), paddingBottom: padBottom + th.space(4) }}
          ItemSeparatorComponent={size === 'list' ? () => <View style={{ height: 1, backgroundColor: th.colors.divider, marginStart: th.space(3) }} /> : undefined}
          renderItem={({ item }) => (size === 'list'
            ? <Row1 p={item} info={info(item)} onPress={onPress} />
            : <Tile p={item} size={size} info={info(item)} onPress={onPress} onLongPress={onLongPress} />)}
          ListEmptyComponent={
            <EmptyState compact icon={query ? Search : Package} title={query ? t('Nothing found for "{{q}}"', { q: query }) : t('No products yet')}
              message={query ? t('Try another name, or scan the barcode.') : t('Add products to start selling.')} />
          }
        />
      )}
    </View>
  );
}
