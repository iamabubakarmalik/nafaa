/** Pick a product for a booking: instant search of the phone's own copy (name, SKU, barcode), scan a barcode, choose a variant. */

import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { offline, useProductSearch, type ProductRow, type VariantRow } from '@/core/offline';
import { Amount, EmptyState, ListGroup, ListRow, SearchBar, Sheet, SkeletonRows, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { Scanner } from '@/core/hardware/scanner';

export interface PickedProduct { productId: string; variantId?: string; name: string; unit: string; price: number; costPrice: number; stock: number | null }

export function ProductPickerSheet({ open, onPick, onClose }: { open: boolean; onPick: (p: PickedProduct) => void; onClose: () => void }) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const [variants, setVariants] = useState<{ product: ProductRow; list: Array<VariantRow & { stock: number | null }> } | null>(null);
  const query = useDebouncedValue(q.trim(), 120);
  const list = useProductSearch({ query: query || undefined, limit: 40 }, { enabled: open });

  const choose = async (p: ProductRow) => {
    if (p.hasVariants) {
      const d = await offline.products.get(p.id);
      const active = d?.variants ?? [];
      if (!active.length) return toast.error(t('Is product ki koi chalu type nahi'));
      setVariants({ product: p, list: active });
      return;
    }
    onPick({ productId: p.id, name: p.name, unit: p.unit, price: p.price, costPrice: p.costPrice ?? 0, stock: p.stock });
  };
  const pickVariant = (v: VariantRow & { stock: number | null }) => {
    const p = variants!.product;
    setVariants(null);
    onPick({ productId: p.id, variantId: v.id, name: `${p.name} (${v.name})`, unit: v.unit ?? p.unit, price: v.price, costPrice: v.costPrice ?? p.costPrice ?? 0, stock: v.stock });
  };
  const onCode = async (code: string) => {
    const hit = await offline.products.byBarcode(code);
    if (!hit) { toast.error(t('Ye barcode nahi mila')); return false; }
    setScan(false);
    if (hit.variantId) {
      const v = hit.product.variants.find((x) => x.id === hit.variantId);
      if (v) { pickVariant({ ...v }); setVariants(null); onPick({ productId: hit.product.id, variantId: v.id, name: `${hit.product.name} (${v.name})`, unit: v.unit ?? hit.product.unit, price: v.price, costPrice: v.costPrice ?? 0, stock: v.stock }); return true; }
    }
    void choose(hit.product);
    return true;
  };

  return (
    <>
      <Sheet open={open && !variants} onClose={onClose} title={t('Cheez chunein')} height={0.85} scrollable={false}>
        <View style={{ flex: 1, gap: th.space(3) }}>
          <SearchBar value={q} onChangeText={setQ} placeholder={t('Naam, SKU ya barcode')} onScan={() => setScan(true)} autoFocus />
          {list.isLoading ? <SkeletonRows count={4} /> : (list.data?.length ?? 0) === 0 ? <EmptyState title={t('Koi cheez nahi mili')} /> : (
            <ListGroup>
              {(list.data ?? []).map((p) => (
                <ListRow key={p.id} dense title={p.name} subtitle={<Text size="xs" tone="muted">{p.stock != null ? t('{{count}} stock mein', { count: Number(p.stock.toFixed(2)) }) : p.unit}</Text>}
                  trailing={<Amount value={p.price} size="sm" />} chevron={p.hasVariants} onPress={() => void choose(p)} />
              ))}
            </ListGroup>
          )}
        </View>
      </Sheet>
      <Sheet open={open && !!variants} onClose={() => setVariants(null)} title={variants?.product.name} height={0.6}>
        <ListGroup>
          {(variants?.list ?? []).map((v) => (
            <ListRow key={v.id} dense title={v.name} subtitle={v.stock != null ? t('{{count}} stock mein', { count: Number(v.stock.toFixed(2)) }) : undefined} trailing={<Amount value={v.price} size="sm" />} onPress={() => pickVariant(v)} />
          ))}
        </ListGroup>
      </Sheet>
      {scan && <Scanner title={t('Barcode scan')} onCode={onCode} onClose={() => setScan(false)} />}
    </>
  );
}
