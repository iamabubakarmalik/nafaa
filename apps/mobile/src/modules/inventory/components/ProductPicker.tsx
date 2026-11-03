/**
 * Pick a product from the phone's mirror: instant search (name, SKU,
 * barcode, Roman Urdu spellings) or a camera scan, then a variant when the
 * product has them. Used by stock adjustments, counts, damage, transfers,
 * purchases, labels and combos. `keepOpen` keeps the sheet open for adding
 * many lines in a row. Works offline.
 */

import { Check, Layers, PackagePlus, ScanLine } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { cleanCode } from '@nafaa/core/inventory';
import { t } from '@/core/i18n';
import { offline, useProductSearch, type PackRow, type ProductDetail, type ProductRow } from '@/core/offline';
import { Amount, Badge, Button, EmptyState, IconButton, List, ListRow, Row, SearchBar, Sheet, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { Scanner } from '@/core/hardware/scanner';
import { qtyUnit } from '../lib/shared';
import { ProductThumb } from './ProductThumb';

export interface PickedProduct {
  product: ProductRow;
  variantId: string | null;
  variantName: string | null;
  /** Pack matched by a scanned pack barcode (carton, dozen). */
  pack: PackRow | null;
  /** Stock of the chosen variant (or the product) in the active branch. */
  stock: number | null;
}

export function ProductPicker({ open, onClose, onPick, title, keepOpen, includeRaw = true, variants = true, pickedIds, onScanMiss, onCreate }: {
  open: boolean;
  onClose: () => void;
  onPick: (p: PickedProduct) => void;
  title?: string;
  keepOpen?: boolean;
  includeRaw?: boolean;
  /** Ask for the variant of products that have them. */
  variants?: boolean;
  /** Already added lines get a tick. */
  pickedIds?: ReadonlySet<string>;
  /** A scanned code that matches nothing; return true when handled. */
  onScanMiss?: (code: string) => boolean | void;
  /** Shows "New product" under an empty search. */
  onCreate?: (name: string) => void;
}) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q, 120);
  const [scan, setScan] = useState(false);
  const [variantOf, setVariantOf] = useState<ProductDetail | null>(null);
  const list = useProductSearch({ query: query.trim() || undefined, includeRaw, limit: 80 }, { enabled: open });

  const finish = (p: PickedProduct) => {
    onPick(p);
    setVariantOf(null);
    if (keepOpen) { setQ(''); toast.success(t('{{name}} add ho gaya', { name: p.variantName ? `${p.product.name} · ${p.variantName}` : p.product.name })); }
    else onClose();
  };

  const choose = async (row: ProductRow) => {
    if (variants && row.hasVariants) {
      const detail = await offline.products.get(row.id);
      const live = detail?.variants.filter((v) => v.name) ?? [];
      if (detail && live.length) { setVariantOf(detail); return; }
    }
    finish({ product: row, variantId: null, variantName: null, pack: null, stock: row.stock });
  };

  const onCode = async (raw: string) => {
    const code = cleanCode(raw);
    const hit = await offline.products.byBarcode(code);
    if (!hit) {
      if (onScanMiss?.(code)) { setScan(false); return true; }
      toast.error(t('"{{term}}" kisi cheez par nahi mila', { term: code }));
      return false;
    }
    const v = hit.variantId ? hit.product.variants.find((x) => x.id === hit.variantId) : null;
    if (!hit.variantId && variants && hit.product.hasVariants && hit.product.variants.length) {
      setScan(false);
      setVariantOf(hit.product);
      return true;
    }
    finish({ product: hit.product, variantId: hit.variantId, variantName: v?.name ?? null, pack: hit.pack, stock: v ? v.stock : hit.product.stock });
    if (!keepOpen) setScan(false);
    return true;
  };

  const rows = list.data ?? [];
  return (
    <>
      <Sheet open={open && !scan} onClose={() => { setVariantOf(null); onClose(); }} title={variantOf ? variantOf.name : title ?? t('Cheez chunein')}
        description={variantOf ? t('Variant chunein') : undefined} height={0.86} scrollable={false}>
        {variantOf ? (
          <View style={{ flex: 1, paddingHorizontal: th.space(4), gap: th.space(2) }}>
            {variantOf.variants.map((v) => (
              <ListRow key={v.id} icon={Layers} title={v.name} subtitle={[v.sku, v.barcode].filter(Boolean).join(' · ') || undefined}
                trailing={<Text size="sm" tone={v.stock !== null && v.stock <= 0 ? 'danger' : 'muted'} ltr>{qtyUnit(v.stock ?? 0, variantOf.unit)}</Text>}
                onPress={() => finish({ product: variantOf, variantId: v.id, variantName: v.name, pack: null, stock: v.stock })} />
            ))}
            <Button variant="ghost" onPress={() => setVariantOf(null)}>{t('Wapas')}</Button>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Row gap={2} style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(2) }}>
              <SearchBar value={q} onChangeText={setQ} placeholder={t('Naam, SKU ya barcode…')} autoFocus style={{ flex: 1 }} />
              <IconButton icon={ScanLine} label={t('Scan')} variant="soft" size="lg" onPress={() => setScan(true)} />
            </Row>
            <List
              data={rows}
              loading={list.isLoading}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: th.space(6) }}
              empty={(
                <EmptyState compact icon={PackagePlus} title={query ? t('"{{term}}" kisi cheez par nahi mila', { term: query }) : t('Abhi koi maal nahi')}
                  action={onCreate ? <Button icon={PackagePlus} onPress={() => onCreate(query)}>{t('Nayi cheez')}</Button> : undefined} />
              )}
              renderItem={({ item: p }) => (
                <ListRow
                  leading={<ProductThumb name={p.name} category={p.categoryName} url={p.imageUrl} size={40} />}
                  title={p.name}
                  subtitle={[p.sku || p.barcode, p.categoryName].filter(Boolean).join(' · ') || undefined}
                  trailing={(
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      {pickedIds?.has(p.id) ? <Badge tone="success" icon={Check}>{t('Add hai')}</Badge> : <Amount value={p.price} size="sm" />}
                      <Text size="xs" tone={p.stock !== null && p.stock <= 0 ? 'danger' : 'muted'} ltr>{qtyUnit(p.stock ?? 0, p.unit)}</Text>
                    </View>
                  )}
                  onPress={() => void choose(p)}
                />
              )}
            />
          </View>
        )}
      </Sheet>
      {scan && <Scanner title={title ?? t('Scan')} continuous={keepOpen} onClose={() => setScan(false)} onCode={onCode} />}
    </>
  );
}
