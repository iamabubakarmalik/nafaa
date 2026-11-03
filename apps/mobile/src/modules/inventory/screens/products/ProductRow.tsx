/**
 * One product in the list: picture, name, industry line and chips, price
 * (cost and margin when allowed), a stock pill that opens the stock sheet,
 * and how it is selling. Swipe for Stock / Price / Edit / Delete; long-press
 * to start selecting.
 */

import { CalendarClock, Check, CloudUpload, Pencil, Plus, Star, Tag, Trash2, TrendingUp } from 'lucide-react-native';
import { memo } from 'react';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Icon, PressableScale, Row, SwipeRow, Text, useTheme, type SwipeAction } from '@/design';
import type { CatalogItem, CatalogPage } from '../../api/catalog';
import { ProductThumb } from '../../components/ProductThumb';
import type { ProductExtras } from '../../industry/types';
import { qty } from '../../lib/shared';

export interface RowCan { edit: boolean; delete: boolean; stock: boolean; price: boolean }

export const ProductListRow = memo(function ProductListRow({ item, extras, tagNames, costHidden, days, offline, selected, selecting, can, onOpen, onToggle, onStock, onPrice, onEdit, onDelete }: {
  item: CatalogItem;
  extras: ProductExtras;
  tagNames: CatalogPage['tagNames'];
  costHidden: boolean;
  days: number;
  /** Offline answers have no sales figures. */
  offline: boolean;
  selected: boolean;
  selecting: boolean;
  can: RowCan;
  onOpen: (item: CatalogItem) => void;
  onToggle: (id: string) => void;
  onStock: (item: CatalogItem) => void;
  onPrice: (item: CatalogItem) => void;
  onEdit: (item: CatalogItem) => void;
  onDelete: (item: CatalogItem) => void;
}) {
  const th = useTheme();
  const margin = item.price > 0 && item.costPrice > 0 ? ((item.price - item.costPrice) / item.price) * 100 : null;
  const ribbon = extras.ribbon !== undefined ? extras.ribbon
    : item.status === 'out' ? { text: t('Stock khatam'), tone: 'danger' as const }
      : item.status === 'low' ? { text: t('Kam'), tone: 'warning' as const } : null;
  const tags = item.tagIds.map((id) => tagNames[id]?.name).filter(Boolean).slice(0, 2);
  const expiryDays = item.expiry ? Math.ceil((new Date(item.expiry).getTime() - Date.now()) / 86_400_000) : null;
  const end: SwipeAction[] = [
    ...(can.stock ? [{ icon: Plus, label: t('Stock'), tone: 'brand' as const, onPress: () => onStock(item) }] : []),
    ...(can.price ? [{ icon: Tag, label: t('Rate'), tone: 'info' as const, onPress: () => onPrice(item) }] : []),
    ...(extras.actions ?? []),
  ];
  const start: SwipeAction[] = [
    ...(can.edit ? [{ icon: Pencil, label: t('Edit'), tone: 'neutral' as const, onPress: () => onEdit(item) }] : []),
    ...(can.delete ? [{ icon: Trash2, label: t('Hatayein'), tone: 'danger' as const, onPress: () => onDelete(item) }] : []),
  ];
  const stockTone = item.status === 'out' ? th.colors.danger : item.status === 'low' ? th.colors.warning : th.colors.neutral;

  return (
    <SwipeRow start={start} end={end} enabled={!selecting}>
      <PressableScale
        onPress={() => (selecting ? onToggle(item.id) : onOpen(item))}
        onLongPress={() => onToggle(item.id)}
        scaleTo={0.99}
        accessibilityLabel={item.name}
        style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5),
          backgroundColor: selected ? th.colors.brand.soft : th.colors.surface, opacity: item.isActive ? 1 : 0.65 }}>
        <View>
          <ProductThumb name={item.name} category={item.category?.name} url={item.image} size={52} />
          {selecting && (
            <View style={{ position: 'absolute', top: -4, start: -4, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
              borderColor: selected ? th.colors.brand.solid : th.colors.borderStrong, backgroundColor: selected ? th.colors.brand.solid : th.colors.surface }}>
              {selected && <Icon icon={Check} size={13} color={th.colors.brand.onSolid} strokeWidth={3} />}
            </View>
          )}
          {item.isFeatured && !selecting && (
            <View style={{ position: 'absolute', top: -4, start: -4, backgroundColor: th.colors.warning.solid, borderRadius: 8, padding: 2 }}>
              <Icon icon={Star} size={11} color={th.colors.warning.onSolid} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Row gap={1.5}>
            <Text size="sm" weight="semibold" numberOfLines={2} style={{ flexShrink: 1 }}>{item.name}</Text>
            {item.pending && <Icon icon={CloudUpload} size={14} tone="muted" />}
          </Row>
          {extras.line ? <Text size="xs" tone="muted" numberOfLines={1}>{extras.line}</Text> : null}
          <Row gap={1} wrap>
            {!item.isActive && <Badge tone="neutral">{t('Band')}</Badge>}
            {extras.badges?.map((b) => <Badge key={b.label} tone={b.tone ?? 'info'}>{b.label}</Badge>)}
            {item.category && <Badge tone="accent">{item.category.name}</Badge>}
            {extras.chips?.map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}
            {tags.map((g) => <Badge key={g} tone="neutral">{`#${g}`}</Badge>)}
            {expiryDays !== null && expiryDays <= 30 && (
              <Badge tone={expiryDays <= 0 ? 'danger' : 'warning'} icon={CalendarClock}>{expiryDays <= 0 ? t('Expire ho gaya') : t('{{days}} din mein expire', { days: expiryDays })}</Badge>
            )}
          </Row>
          <Row gap={1}>
            {item.sold30 > 0 ? (
              <>
                <Icon icon={TrendingUp} size={12} tone="success" />
                <Text size="2xs" tone="muted">{t('{{sold30}} bika', { sold30: qty(item.sold30) })}</Text>
                {item.daysLeft !== null && (
                  <Text size="2xs" weight="semibold" tone={item.daysLeft <= 3 ? 'danger' : item.daysLeft <= 7 ? 'warning' : 'muted'}>
                    {`· ${item.daysLeft === 0 ? t('aaj khatam') : t('{{daysLeft}} din ka', { daysLeft: item.daysLeft })}`}
                  </Text>
                )}
              </>
            ) : offline ? null : (
              <Text size="2xs" tone="subtle">{item.stock > 0 ? t('{{days}} din se nahi bika', { days }) : t('Abhi koi sale nahi')}</Text>
            )}
          </Row>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text size="sm" weight="bold" ltr>{formatPKR(item.price)}</Text>
          {!costHidden && item.costPrice > 0 && margin !== null && (
            <Text size="2xs" weight="semibold" tone={margin < 0 ? 'danger' : 'success'} ltr>{`${margin.toFixed(0)}%`}</Text>
          )}
          <PressableScale onPress={() => (can.stock ? onStock(item) : onOpen(item))} haptic="tap" accessibilityLabel={t('Stock badlein')}
            style={{ minWidth: 56, paddingHorizontal: 8, paddingVertical: 4, borderRadius: th.radius('md'), backgroundColor: stockTone.soft, alignItems: 'center' }}>
            <Text size="sm" weight="bold" color={stockTone.text} ltr>{qty(item.stock)}</Text>
            <Text size="2xs" color={stockTone.text} numberOfLines={1}>{ribbon?.text ?? item.unit}</Text>
          </PressableScale>
        </View>
      </PressableScale>
    </SwipeRow>
  );
});
