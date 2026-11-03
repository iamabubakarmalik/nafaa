/**
 * The counter's catalog, like the web POS tiles: the product photo (or an
 * emoji on a tint), a stock pill, the name, the price "per unit" and a round
 * + button; once on the bill the tile gets a green border and an inline
 * − qty + stepper. Sizes follow Appearance → POS grid (list, small, medium,
 * large). The pickers take over when the item has packs, variants, a weight
 * or no price.
 */

import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Minus, Package, Plus, Search } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState, type ReactElement } from 'react';
import { Text as RNText, View, type LayoutChangeEvent } from 'react-native';
import { isWeightUnit } from '@nafaa/core/pos';
import { productEmoji, productTintIndex } from '@nafaa/core/inventory';
import type { PosGridSize, StatusTone } from '@/design';
import { API_URL } from '@/core/api/client';
import { t } from '@/core/i18n';
import type { ProductRow } from '@/core/offline';
import { Amount, Badge, EmptyState, Icon, PressableScale, Skeleton, Text, useTheme } from '@/design';

const MIN_TILE: Record<Exclude<PosGridSize, 'list'>, number> = { small: 104, medium: 150, large: 190 };
const TINTS: StatusTone[] = ['info', 'success', 'warning', 'danger', 'accent', 'brand'];
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export interface TileInfo {
  inCart: number;
  showStock: boolean;
  showImages: boolean;
  /** Industry line under the name (PosIndustryConfig.useShelf). */
  subline?: string | null;
}

/** Product image address the phone can load: full URLs and data images as they are, server paths (/uploads/…) on the API host. */
export function productImageUri(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (/^(https?:|data:|file:|content:)/i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return `${API_ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`;
}

const qtyText = (n: number) => String(Number(n.toFixed(3)));

/** Photo, or the product's emoji on its tint when there is none or it fails to load. */
export const PosThumb = memo(function PosThumb({ name, category, url, size, radius = 0, emojiSize }: {
  name: string; category?: string | null; url?: string | null; size?: number; radius?: number; emojiSize?: number;
}) {
  const th = useTheme();
  const uri = productImageUri(url);
  const [failed, setFailed] = useState<string | null>(null);
  const box = size ? { width: size, height: size } : { width: '100%' as const, height: '100%' as const };
  if (uri && failed !== uri) {
    return <Image source={{ uri }} style={{ ...box, borderRadius: radius, backgroundColor: th.colors.surfaceMuted }} contentFit="cover" transition={120}
      recyclingKey={uri} cachePolicy="memory-disk" onError={() => setFailed(uri)} />;
  }
  const tone = th.colors[TINTS[productTintIndex(name, TINTS.length)]!];
  return (
    <View style={{ ...box, borderRadius: radius, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center' }}>
      <RNText style={{ fontSize: emojiSize ?? Math.round((size ?? 64) * 0.5) }} allowFontScaling={false}>{productEmoji(name, category)}</RNText>
    </View>
  );
});

function StockPill({ stock, low, unit }: { stock: number; low: boolean; unit: string }) {
  const th = useTheme();
  const out = stock <= 0;
  const bg = out ? 'rgba(15,23,42,0.82)' : low ? th.colors.warning.solid : 'rgba(255,255,255,0.9)';
  const fg = out ? '#fff' : low ? th.colors.warning.onSolid : '#334155';
  const dot = out ? '#fb7185' : low ? '#fff' : th.colors.success.solid;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      <Text size="2xs" weight="semibold" color={fg} numberOfLines={1}>
        {out ? t('Out of stock') : isWeightUnit(unit) ? `${qtyText(stock)} ${unit}` : t('{{stock}} left', { stock: qtyText(stock) })}
      </Text>
    </View>
  );
}

/** Round + (not on the bill) or − qty + (on the bill). */
function TileStepper({ qty, onAdd, onMinus, compact }: { qty: number; onAdd: () => void; onMinus?: () => void; compact?: boolean }) {
  const th = useTheme();
  const s = compact ? 30 : 34;
  if (qty <= 0 || !onMinus) {
    return (
      <PressableScale onPress={onAdd} haptic="tap" accessibilityLabel={t('Add')} hitSlop={6}
        style={{ width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: qty > 0 ? th.colors.brand.solid : th.colors.surfaceMuted }}>
        {qty > 0 ? <Text size="xs" weight="bold" color={th.colors.brand.onSolid} ltr>{qtyText(qty)}</Text> : <Icon icon={Plus} size={16} tone="default" />}
      </PressableScale>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: s, borderRadius: s / 2, backgroundColor: th.colors.surfaceMuted, direction: 'ltr' }}>
      <PressableScale onPress={onMinus} haptic="tap" accessibilityLabel={t('Less')} hitSlop={4} style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
        <Icon icon={Minus} size={14} tone="default" />
      </PressableScale>
      <Text size="sm" weight="bold" ltr tabular style={{ minWidth: 18, textAlign: 'center' }}>{qtyText(qty)}</Text>
      <PressableScale onPress={onAdd} haptic="tap" accessibilityLabel={t('More')} hitSlop={4}
        style={{ width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.brand.solid }}>
        <Icon icon={Plus} size={14} color={th.colors.brand.onSolid} />
      </PressableScale>
    </View>
  );
}

const Tile = memo(function Tile({ p, size, info, onPress, onMinus, onLongPress }: {
  p: ProductRow; size: Exclude<PosGridSize, 'list'>; info: TileInfo; onPress: (p: ProductRow) => void; onMinus?: (p: ProductRow) => void; onLongPress?: (p: ProductRow) => void;
}) {
  const th = useTheme();
  const out = p.stock != null && p.stock <= 0 && !p.hasVariants;
  const low = p.stock != null && p.lowStockAlert > 0 && p.stock <= p.lowStockAlert && !out;
  const small = size === 'small';
  const inCart = info.inCart > 0;
  return (
    <PressableScale onPress={() => onPress(p)} onLongPress={onLongPress ? () => onLongPress(p) : undefined} scaleTo={0.97}
      accessibilityLabel={`${p.name}, ${p.price}`}
      style={{
        flex: 1, margin: th.space(1), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface,
        borderWidth: inCart ? 2 : 1, borderColor: inCart ? th.colors.brand.solid : th.colors.border, opacity: out ? 0.6 : 1,
      }}>
      {info.showImages && (
        <View style={{ aspectRatio: small ? 1.25 : 1.25, width: '100%' }}>
          <PosThumb name={p.name} category={p.categoryName} url={p.imageUrl} emojiSize={small ? 30 : size === 'medium' ? 44 : 56} />
          {info.showStock && p.stock != null && !p.hasVariants && !small && (
            <View style={{ position: 'absolute', top: 6, end: 6 }}><StockPill stock={p.stock} low={low} unit={p.unit} /></View>
          )}
          {(p.pendingCreate || p.pendingEdit) && (
            <View style={{ position: 'absolute', top: 8, start: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: th.colors.warning.solid }} />
          )}
        </View>
      )}
      <View style={{ padding: th.space(small ? 1.5 : 2.5), gap: 4, flexGrow: 1 }}>
        <Text size={small ? 'xs' : 'sm'} weight="semibold" numberOfLines={2} style={{ minHeight: small ? undefined : 36 }}>{p.name}</Text>
        {!info.showImages && info.showStock && p.stock != null && !p.hasVariants && <View style={{ alignSelf: 'flex-start' }}><StockPill stock={p.stock} low={low} unit={p.unit} /></View>}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, marginTop: 'auto' }}>
          <View style={{ flexShrink: 1 }}>
            <Amount value={p.price} size={small ? 'xs' : 'base'} weight="bold" color={th.colors.brand.text} decimals={0} />
            {!small && <Text size="2xs" tone="muted" numberOfLines={1}>{info.subline ?? t('per {{unit}}', { unit: p.unit })}</Text>}
          </View>
          {!small && <TileStepper qty={info.inCart} onAdd={() => onPress(p)} onMinus={onMinus ? () => onMinus(p) : undefined} compact={size === 'medium'} />}
        </View>
      </View>
      {small && inCart && (
        <View style={{ position: 'absolute', top: 6, end: 6 }}><Badge tone="brand" solid size="sm">{qtyText(info.inCart)}</Badge></View>
      )}
    </PressableScale>
  );
});

const Row1 = memo(function Row1({ p, info, onPress, onMinus }: { p: ProductRow; info: TileInfo; onPress: (p: ProductRow) => void; onMinus?: (p: ProductRow) => void }) {
  const th = useTheme();
  const out = p.stock != null && p.stock <= 0 && !p.hasVariants;
  return (
    <PressableScale onPress={() => onPress(p)} scaleTo={0.99} pressedStyle={{ backgroundColor: th.colors.surfaceMuted }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(3), minHeight: 60, opacity: out ? 0.6 : 1 }}>
      {info.showImages && <PosThumb name={p.name} category={p.categoryName} url={p.imageUrl} size={44} radius={th.radius('md')} />}
      <View style={{ flex: 1, gap: 1 }}>
        <Text size="base" weight="medium" numberOfLines={1}>{p.name}</Text>
        {!!info.subline && <Text size="xs" tone="muted" numberOfLines={1}>{info.subline}</Text>}
        {info.showStock && p.stock != null && <Text size="xs" tone={out ? 'danger' : 'muted'}>{out ? t('Out of stock') : t('{{qty}} {{unit}} in stock', { qty: Number(p.stock.toFixed(2)), unit: p.unit })}</Text>}
      </View>
      <Amount value={p.price} weight="bold" />
      <TileStepper qty={info.inCart} onAdd={() => onPress(p)} onMinus={onMinus ? () => onMinus(p) : undefined} compact />
    </PressableScale>
  );
});

export function ProductGrid({ data, loading, size, inCart, showStock, showImages, subline, onPress, onMinus, onLongPress, header, query, padBottom = 0 }: {
  data: ProductRow[] | undefined;
  loading?: boolean;
  size: PosGridSize;
  inCart: Map<string, number>;
  showStock: boolean;
  showImages: boolean;
  subline?: (p: ProductRow) => string | null | undefined;
  onPress: (p: ProductRow) => void;
  /** One less of this product on the bill (tile stepper). */
  onMinus?: (p: ProductRow) => void;
  onLongPress?: (p: ProductRow) => void;
  header?: ReactElement;
  query?: string;
  padBottom?: number;
}) {
  const th = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);
  const columns = size === 'list' ? 1 : Math.max(2, Math.floor((width - th.space(2)) / (MIN_TILE[size] + th.space(2))) || 2);
  const rows = useMemo(() => data ?? [], [data]);
  const info = (p: ProductRow): TileInfo => ({ inCart: inCart.get(p.id) ?? 0, showStock, showImages, subline: subline?.(p) ?? null });

  if (loading && !rows.length) {
    return (
      <View onLayout={onLayout} style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: th.space(1) }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={{ width: `${100 / Math.max(columns, 1)}%`, padding: th.space(1) }}><Skeleton height={size === 'list' ? 52 : 200} radius={th.radius('xl')} /></View>
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
            ? <Row1 p={item} info={info(item)} onPress={onPress} onMinus={onMinus} />
            : <Tile p={item} size={size} info={info(item)} onPress={onPress} onMinus={onMinus} onLongPress={onLongPress} />)}
          ListEmptyComponent={
            <EmptyState compact icon={query ? Search : Package} title={query ? t('Nothing found for "{{q}}"', { q: query }) : t('No products yet')}
              message={query ? t('Try another name, or scan the barcode.') : t('Add products to start selling.')} />
          }
        />
      )}
    </View>
  );
}
