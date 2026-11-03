/**
 * Quick Setup (same catalog and API as the web): a ready list of 2000+ common
 * products (atta, cheeni, sabun…). Pick by category, brand or search, check
 * the picked ones (sale, cost and opening stock can be changed per line),
 * then import: brands, categories, tags and products are made in one go.
 * Needs internet.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Check, CheckCircle2, Package, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { apiClient } from '@/core/api/client';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import {
  Badge, Button, Card, ChipGroup, EmptyState, ListRow, ListTemplate, MoneyInput, Row, Select, Sheet, StatTile, Switch, Text, toast, useTheme,
} from '@/design';
import { NumberInput } from '../../components/fields';
import { ProductThumb } from '../../components/ProductThumb';
import { INV, useOnline, useRefreshInventory } from '../../lib/shared';

interface SeedProduct {
  id: string; name: string; brand: string; category: string; tags: string[]; unit: string; price: number; costPrice: number;
  wholesalePrice?: number; barcode?: string; imageUrl?: string; emoji?: string; alreadyExists: boolean;
}
interface QuickSetupCatalog { catalog: SeedProduct[]; categories: Array<{ name: string; color: string; count: number }>; brands: Array<{ name: string; count: number }>; total: number; alreadyImported: number }
interface ImportResult { imported: number; skipped: number; brandsCreated: number; categoriesCreated: number; tagsCreated: number; errorCount: number; errors: Array<{ name: string; error: string }> }
interface Override { price?: number; costPrice?: number; stock?: number }

const quickSetupApi = {
  catalog: () => apiClient.get<QuickSetupCatalog>('/products/quick-setup/catalog').then((r) => r.data),
  import: (catalogIds: string[], priceOverrides: Record<string, Override>, shopId?: string) =>
    apiClient.post<ImportResult>('/products/quick-setup/import', { catalogIds, priceOverrides, shopId }, { timeout: 180_000 }).then((r) => r.data),
};

export function QuickSetupScreen() {
  const th = useTheme();
  const online = useOnline();
  const refreshInv = useRefreshInventory();
  const shopId = useAuthStore((s) => s.currentShopId);
  const q = useQuery({ queryKey: [INV, 'quick-setup'], queryFn: quickSetupApi.catalog, staleTime: 10 * 60_000 });
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [brand, setBrand] = useState('all');
  const [hideExisting, setHideExisting] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [review, setReview] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const data = q.data;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (data?.catalog ?? []).filter((p) => (cat === 'all' || p.category === cat) && (brand === 'all' || p.brand === brand) && (!hideExisting || !p.alreadyExists)
      && (!s || `${p.name} ${p.brand} ${p.tags.join(' ')}`.toLowerCase().includes(s)));
  }, [data, search, cat, brand, hideExisting]);
  const picked = useMemo(() => (data?.catalog ?? []).filter((p) => selected.has(p.id)), [data, selected]);
  const stats = picked.reduce((s, p) => ({ price: s.price + (overrides[p.id]?.price ?? p.price), cost: s.cost + (overrides[p.id]?.costPrice ?? p.costPrice) }), { price: 0, cost: 0 });
  const toggle = (id: string) => setSelected((x) => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selectable = filtered.filter((p) => !p.alreadyExists);

  const run = useMutation({
    mutationFn: () => quickSetupApi.import([...selected], overrides, shopId ?? undefined),
    onSuccess: (r) => { setReview(false); setResult(r); setSelected(new Set()); void refreshInv(); void q.refetch(); },
  });

  const header = (
    <View style={{ gap: th.space(3) }}>
      {data && (
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Mojood')} value={<Text size="xl" weight="bold">{data.total - data.alreadyImported}</Text>} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Select kiye')} value={<Text size="xl" weight="bold">{selected.size}</Text>} hint={selected.size ? t('Sale: {{totalPrice}}', { totalPrice: formatPKR(stats.price) }) : undefined} />
        </Row>
      )}
      <ChipGroup value={cat} onChange={setCat} style={{ marginHorizontal: -th.space(4) }}
        options={[{ value: 'all', label: t('Sab ({{value}})', { value: data?.total ?? 0 }) }, ...(data?.categories ?? []).map((c) => ({ value: c.name, label: c.name, count: c.count }))]} />
      {(data?.brands.length ?? 0) > 0 && (
        <Select label={t('Brand')} value={brand} onChange={setBrand} searchable options={[{ value: 'all', label: t('Sab Brands') }, ...(data?.brands ?? []).map((b) => ({ value: b.name, label: `${b.name} (${b.count})` }))]} />
      )}
      <Switch label={t('Pehle se import shuda chhupayein')} value={hideExisting} onChange={setHideExisting} />
      <Row gap={2} wrap>
        <Button size="sm" variant="secondary" disabled={!selectable.length} onPress={() => { setSelected((x) => new Set([...x, ...selectable.map((p) => p.id)])); toast.success(t('{{count}} products select ho gaye', { count: selectable.length })); }}>
          {t('Nazar aane wale sab select ({{selectableCount}})', { selectableCount: selectable.length })}
        </Button>
        {selected.size > 0 && <Button size="sm" variant="ghost" onPress={() => setSelected(new Set())}>{t('Selection hatayein ({{size}})', { size: selected.size })}</Button>}
      </Row>
      <Text size="xs" tone="muted">{t('{{count}} products nazar aa rahe hain', { count: filtered.length })}</Text>
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Quick Setup')}
        subtitle={t('Bani banayi products ki list — select karein aur import kar dein')}
        search={{ value: search, onChange: setSearch, placeholder: t('Product, brand ya tag talaash karein...') }}
        summary={header}
        data={filtered}
        loading={q.isLoading}
        error={q.data ? undefined : q.error}
        onRetry={q.refetch}
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => {
          const on = selected.has(p.id);
          return (
            <ListRow leading={<ProductThumb name={p.name} category={p.category} url={p.imageUrl} size={40} />} title={p.name} selected={on} disabled={p.alreadyExists}
              subtitle={[p.brand, p.category, p.unit].filter(Boolean).join(' · ')}
              trailing={p.alreadyExists ? <Badge>{t('Pehle se hai')}</Badge> : (
                <Row gap={2}>
                  <Text size="sm" weight="semibold" ltr>{formatPKR(p.price)}</Text>
                  {on ? <CheckCircle2 size={20} color={th.colors.brand.solid} /> : <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: th.colors.borderStrong }} />}
                </Row>
              )}
              onPress={() => !p.alreadyExists && toggle(p.id)} />
          );
        }}
        empty={<EmptyState icon={Search} title={t('Kuch nahi mila')} message={t('Filter badal kar dekhein')} />}
        fab={selected.size ? { icon: Check, label: t('Check kar ke import ({{size}})', { size: selected.size }), onPress: () => setReview(true) } : undefined}
      />

      <Sheet open={review} onClose={() => setReview(false)} title={t('{{size}} products import ke liye tayyar', { size: selected.size })} description={t('Qadam 2/2 — check kar ke pakka karein')}
        footer={<Row gap={2}>
          <Button variant="secondary" icon={ArrowLeft} iconFlip onPress={() => setReview(false)}>{t('Wapas select karein')}</Button>
          <Button style={{ flex: 1 }} loading={run.isPending} onPress={() => { if (!online) { toast.warning(onlineNeededText('settings')); return; } run.mutate(); }}>{t('{{size}} Products import karein', { size: selected.size })}</Button>
        </Row>}>
        <View style={{ gap: th.space(3) }}>
          {run.isPending && <Card tone="info"><Text size="sm">{t('Brands, categories, tags aur products ban rahe hain. 1-2 minute lag sakte hain.')}</Text></Card>}
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Andazan Sale')} value={<Text weight="bold" ltr>{formatPKR(stats.price)}</Text>} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Andazan Cost')} value={<Text weight="bold" ltr>{formatPKR(stats.cost)}</Text>} />
          </Row>
          <Text size="sm" weight="semibold">{t('Price / Stock badlein (zaroori nahi)')}</Text>
          {picked.slice(0, 200).map((p) => {
            const o = overrides[p.id] ?? {};
            const set = (patch: Override) => setOverrides((x) => ({ ...x, [p.id]: { ...x[p.id], ...patch } }));
            return (
              <Card key={p.id}>
                <Text size="sm" weight="semibold" numberOfLines={1}>{p.name}</Text>
                <Row gap={2} style={{ marginTop: 6 }}>
                  <MoneyInput containerStyle={{ flex: 1 }} label={t('Sale')} value={o.price ?? p.price} onChangeValue={(v) => set({ price: v ?? undefined })} />
                  <MoneyInput containerStyle={{ flex: 1 }} label={t('Cost')} value={o.costPrice ?? p.costPrice} onChangeValue={(v) => set({ costPrice: v ?? undefined })} />
                  <NumberInput containerStyle={{ flex: 1 }} label={t('Stock')} value={o.stock ?? null} onChangeValue={(v) => set({ stock: v ?? undefined })} />
                </Row>
              </Card>
            );
          })}
        </View>
      </Sheet>

      <Sheet open={!!result} onClose={() => setResult(null)} title={t('Import mukammal ho gaya')}
        footer={<Button fullWidth icon={Package} onPress={() => { setResult(null); router.replace('/products' as never); }}>{t('Theek hai — Products dekhein')}</Button>}>
        {result && (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2} wrap>
              <StatTile style={{ flex: 1, minWidth: 120 }} tone="success" label={t('Products')} value={<Text size="xl" weight="bold">{result.imported}</Text>} />
              <StatTile style={{ flex: 1, minWidth: 120 }} tone="info" label={t('Brands')} value={<Text size="xl" weight="bold">{result.brandsCreated}</Text>} />
              <StatTile style={{ flex: 1, minWidth: 120 }} tone="accent" label={t('Categories')} value={<Text size="xl" weight="bold">{result.categoriesCreated}</Text>} />
              <StatTile style={{ flex: 1, minWidth: 120 }} tone="warning" label={t('Tags')} value={<Text size="xl" weight="bold">{result.tagsCreated}</Text>} />
            </Row>
            {result.skipped > 0 && <Text size="sm" tone="muted">{t('{{skipped}} products pehle se maujood the, unhein chhor diya', { skipped: result.skipped })}</Text>}
            {result.errorCount > 0 && (
              <Card tone="danger" title={t('{{errorCount}} products me masla aaya', { errorCount: result.errorCount })}>
                {result.errors.slice(0, 10).map((e) => <Text key={e.name} size="xs">{`${e.name}: ${e.error}`}</Text>)}
              </Card>
            )}
          </View>
        )}
      </Sheet>
    </>
  );
}
