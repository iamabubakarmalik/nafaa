/**
 * Stock forecast (web /inventory/forecast), read-only: when each product
 * runs out at its daily sales, what to order and the money tied up in dead
 * or extra stock. "Purchase order" groups the lines by supplier and opens
 * the purchase editor with them; nothing is saved until the editor saves.
 */

import { router } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ListRow, ListTemplate, Row, Sheet, Text, toast, useDebouncedValue, useTheme } from '@/design';
import type { StatusTone } from '@/design/theme/palette';
import { ProductThumb } from '../components/ProductThumb';
import { INV, qty, useCostMask } from '../lib/shared';
import { StatStrip } from '../stock/components/parts';
import { usePaged } from '../stock/usePaged';
import { forecastApi, type ForecastClass, type ForecastFilter, type ForecastRow, type OrderGroup } from './api';

const CLASS: Record<ForecastClass, { label: string; tone: StatusTone }> = {
  fast: { label: msg('Tez bikta'), tone: 'success' },
  normal: { label: msg('Theek'), tone: 'neutral' },
  slow: { label: msg('Aahista'), tone: 'warning' },
  dead: { label: msg('Dead stock'), tone: 'danger' },
  overstock: { label: msg('Zyada stock'), tone: 'accent' },
  new: { label: msg('Naya'), tone: 'info' },
  none: { label: msg('Bikri nahi'), tone: 'neutral' },
};
const day = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '');

function coverText(r: ForecastRow) {
  if (r.cover === null) return r.stock > 0 ? t('Bik nahi raha') : t('Stock nahi');
  if (r.stock <= 0) return t('Khatam');
  if (r.cover < 1) return t('Aaj khatam');
  return t('{{days}} din · {{date}}', { days: Math.floor(r.cover), date: day(r.stockOut) });
}

export function ForecastScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const currentShop = useAuthStore((s) => s.currentShopId);
  const [filter, setFilter] = useState<ForecastFilter>('all');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [groups, setGroups] = useState<OrderGroup[] | null>(null);
  const [busy, setBusy] = useState(false);

  const f = { filter, search: query || undefined };
  const list = usePaged([INV, 'forecast', currentShop, f], (page) => forecastApi.list({ ...f, page, limit: 40 }));
  const s = list.first?.summary;

  const openOrders = async () => {
    setBusy(true);
    try {
      const r = await forecastApi.orderGroups();
      if (!r.groups.length) toast.error(t('Abhi kuch mangwane ki zaroorat nahi'));
      else setGroups(r.groups);
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const order = (g: OrderGroup) => {
    setGroups(null);
    const lines = g.lines.map((l) => ({ productId: l.productId, qty: l.qty, cost: l.cost }));
    const params = new URLSearchParams({ from: 'forecast', order: '1', lines: JSON.stringify(lines), ...(g.supplier ? { supplierId: g.supplier.id } : {}) });
    router.push(`/purchases/new?${params.toString()}` as never);
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatStrip items={[
        { label: t('7 din me khatam'), value: s ? String(s.stockOut7) : '—', tone: 'danger', onPress: () => setFilter('stockout7') },
        { label: t('Mangwane ka maal'), value: s ? cost(s.reorderValue) : '—', hint: s ? t('{{count}} cheezein', { count: s.reorderCount }) : undefined, tone: 'brand', onPress: () => setFilter('reorder') },
        { label: t('Dead stock'), value: s ? cost(s.deadValue) : '—', tone: 'danger', onPress: () => setFilter('dead') },
        { label: t('Zyada stock'), value: s ? cost(s.overValue) : '—', tone: 'accent', onPress: () => setFilter('overstock') },
      ]} />
      {can(P.PURCHASES_CREATE) && (
        <Button icon={ShoppingCart} loading={busy} onPress={() => void openOrders()}>{t('Purchase order banayein')}</Button>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<ForecastRow>
        title={t('Stock forecast')}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam ya SKU…') }}
        filters={{
          value: filter, onChange: (v) => setFilter(v as ForecastFilter), options: [
            { value: 'all', label: t('Sab') }, { value: 'stockout7', label: t('7 din me khatam') }, { value: 'reorder', label: t('Ab mangwayein') },
            { value: 'fast', label: t('Tez bikta') }, { value: 'slow', label: t('Aahista') }, { value: 'dead', label: t('Dead stock') }, { value: 'overstock', label: t('Zyada stock') },
          ],
        }}
        summary={summary}
        data={list.items}
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={list.refetch}
        onEndReached={list.loadMore}
        footer={list.loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : undefined}
        keyExtractor={(r) => r.productId}
        renderItem={({ item: r }) => {
          const c = CLASS[r.cls];
          const urgent = r.cover !== null && r.cover <= 7;
          return (
            <ListRow
              leading={<ProductThumb name={r.name} url={r.image} />}
              title={r.name}
              subtitle={`${t('{{qty}} / din', { qty: qty(r.demand) })} · ${t('Stock {{stock}} {{unit}}', { stock: qty(r.stock), unit: r.unit })}${r.supplier ? ` · ${r.supplier.name}` : ''}`}
              trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text weight="bold" tone={urgent ? 'danger' : undefined}>{coverText(r)}</Text>
                <Badge tone={c.tone}>{t(c.label)}</Badge>
                {r.suggestQty > 0
                  ? <Text size="2xs" tone="muted">{t('Mangwana')}: {qty(r.suggestQty)}{r.pack ? ` (${qty(r.suggestQty / r.pack.size)} ${r.pack.name})` : ''}</Text>
                  : r.tiedValue > 0 ? <Text size="2xs" tone="danger">{t('{{value}} phansa hua', { value: cost(r.tiedValue) })}</Text> : null}
              </View>}
              onPress={() => router.push(`/products/${r.productId}` as never)}
            />
          );
        }}
      />
      <Sheet open={!!groups} onClose={() => setGroups(null)} title={t('Purchase order banayein')}
        description={t('{{count}} supplier — har ek ka alag order banega. Save karne tak order kachcha rehta hai.', { count: groups?.length ?? 0 })}>
        <View style={{ gap: th.space(3) }}>
          {(groups ?? []).map((g) => (
            <Card key={g.supplier?.id ?? 'none'}>
              <Row gap={2} style={{ alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text weight="bold">{g.supplier?.name ?? t('Supplier chunna hai')}</Text>
                  <Text size="xs" tone="muted">{t('{{count}} cheezein · {{total}}', { count: g.lines.length, total: cost(g.value) })}</Text>
                </View>
                <Button size="sm" onPress={() => order(g)}>{t('Order banayein')}</Button>
              </Row>
              <Text size="xs" tone="muted" numberOfLines={2} style={{ marginTop: th.space(2) }}>{g.lines.map((l) => `${l.name} ${qty(l.qty)} ${l.unit}`).join(' · ')}</Text>
            </Card>
          ))}
        </View>
      </Sheet>
    </>
  );
}
