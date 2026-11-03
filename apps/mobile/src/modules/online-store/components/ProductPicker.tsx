/**
 * Pick a Nafaa product (and its size) from the phone's own product list:
 * instant, offline, with stock of the active branch. Used to link channel
 * items to products and to tag ads with products.
 */

import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Package } from 'lucide-react-native';
import { t } from '@/core/i18n';
import { useProduct, useProductSearch, type ProductRow } from '@/core/offline';
import { Amount, Chip, EmptyState, ListRow, PressableScale, SearchBar, Text, useDebouncedValue, useTheme } from '@/design';

export interface PickedProduct { productId: string; variantId: string | null; label: string; price: number }

export function ProductPicker({ initial = '', onPick }: { initial?: string; onPick: (p: PickedProduct) => void }) {
  const th = useTheme();
  // Start with the first two words: "Lipton Tea 200g" → "Lipton Tea".
  const [q, setQ] = useState(() => initial.split(/\s+/).slice(0, 2).join(' '));
  const query = useDebouncedValue(q.trim(), 150);
  const { data = [], isLoading } = useProductSearch({ query, limit: 25 });
  const [open, setOpen] = useState<string | null>(null);

  return (
    <View style={{ gap: th.space(2) }}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('Product ka naam, SKU ya barcode…')} />
      {isLoading ? <ActivityIndicator color={th.colors.brand.solid} /> : !data.length ? (
        <EmptyState compact icon={Package} title={t('Koi product nahi mila — naam badal kar dekhein')} />
      ) : (
        <View style={{ borderRadius: th.radius('lg'), borderWidth: 1, borderColor: th.colors.border, overflow: 'hidden' }}>
          {data.map((p, i) => (
            <View key={p.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
              <ListRow dense
                title={p.name}
                subtitle={[p.sku, stockLine(p.stock)].filter(Boolean).join(' · ')}
                trailing={p.hasVariants ? <Text size="xs" weight="semibold" tone="brand">{t('Size chunein')}</Text> : <Amount value={p.price} size="sm" />}
                onPress={() => (p.hasVariants ? setOpen(open === p.id ? null : p.id) : onPick({ productId: p.id, variantId: null, label: p.name, price: p.price }))} />
              {open === p.id && <Variants product={p} onPick={onPick} />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const stockLine = (n: number | null) => (n == null ? '' : t('Stock {{stock}}', { stock: n }));

function Variants({ product, onPick }: { product: ProductRow; onPick: (p: PickedProduct) => void }) {
  const th = useTheme();
  const { data, isLoading } = useProduct(product.id);
  const variants = (data?.variants ?? []).filter((v) => (v as { isActive?: boolean }).isActive !== false);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), paddingHorizontal: th.space(4), paddingBottom: th.space(3) }}>
      {isLoading && <ActivityIndicator color={th.colors.brand.solid} />}
      {variants.map((v) => (
        <PressableScale key={v.id} onPress={() => onPick({ productId: product.id, variantId: v.id, label: `${product.name} (${v.name})`, price: v.price })}
          style={{ borderWidth: 1, borderColor: th.colors.border, borderRadius: th.radius('md'), paddingHorizontal: th.space(3), paddingVertical: th.space(2) }}>
          <Text size="sm" weight="semibold">{v.name}</Text>
          <Text size="xs" tone={(v.stock ?? 0) > 0 ? 'muted' : 'danger'}>{t('Stock {{stock}}', { stock: v.stock ?? 0 })}</Text>
        </PressableScale>
      ))}
      {!isLoading && !variants.length && <Chip label={t('Koi size nahi')} disabled />}
    </View>
  );
}
