/**
 * Testers (web CosmeticsTestersPage): a shop opens one piece (a shade of
 * lipstick, a perfume) for customers to try. Opening it takes that piece out of
 * sellable stock through the shared damage record, so stock, cost and the loss
 * report stay right. Lists every tester opened, with its status and cost. The
 * list needs the server; opening a tester is queued when offline.
 */

import { useQuery } from '@tanstack/react-query';
import { Plus, TestTube2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { enqueueDamage, useProductSearch } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, EmptyState, ListRow, ListTemplate, Row, SearchBar, Sheet, StatTile, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { damageApi, type DamageLog } from '@/modules/inventory/stock/api';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { COSMETICS_KEYS, TESTER_REASON, TESTER_STATUS, dayOnly, refreshCosmetics } from '../meta';

function OpenTesterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const shopId = useAuthStore((s) => s.currentShopId);
  const [q, setQ] = useState('');
  const needle = useDebouncedValue(q.trim(), 250);
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState<number | null>(1);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setQ(''); setProduct(null); setVariantId(''); setQty(1); } }, [open]);
  const found = useProductSearch({ query: needle, limit: 8 }, { enabled: open && needle.length >= 2 && !product });
  const options = useQuery({ queryKey: ['cosmetics-tester-options', product?.id], queryFn: () => damageApi.options(product!.id), enabled: !!product });
  const variants = options.data?.variants ?? [];
  const n = qty ?? 0;
  const needsVariant = variants.length > 0 && !variantId;

  const save = async () => {
    if (!product) return;
    setBusy(true);
    try {
      await enqueueDamage({ productId: product.id, variantId: variantId || undefined, shopId: shopId && shopId !== 'all' ? shopId : undefined, quantity: n, reason: TESTER_REASON, reasonCode: 'OTHER', notes: 'Tester' });
      toast.success(t('Tester likh diya'));
      refreshCosmetics([COSMETICS_KEYS.testers, COSMETICS_KEYS.expiry]);
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} height={0.85} title={t('Tester kholein')} description={t('Ye piece bechne wale stock se nikal kar tester ban jayega')}
      footer={<Button fullWidth loading={busy} disabled={!product || n <= 0 || needsVariant} onPress={() => void save()}>{t('Tester likhein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {product ? (
          <Card><Row justify="between"><Text weight="semibold" style={{ flex: 1 }}>{product.name}</Text><Button size="sm" variant="ghost" onPress={() => { setProduct(null); setVariantId(''); }}>{t('Badlein')}</Button></Row></Card>
        ) : (
          <>
            <SearchBar value={q} onChangeText={setQ} placeholder={t('Product ya shade…')} />
            {(found.data ?? []).length > 0 && needle.length >= 2 && (
              <Card flush>{(found.data ?? []).map((p, i, a) => <ListRow key={p.id} dense divider={i < a.length - 1} icon={TestTube2} title={p.name} subtitle={p.brandName ?? undefined} onPress={() => setProduct({ id: p.id, name: p.name })} />)}</Card>
            )}
          </>
        )}
        {product && variants.length > 0 ? (
          <View style={{ gap: th.space(1.5) }}>
            <Text size="sm" weight="medium">{t('Shade')}</Text>
            <ChipGroup wrap value={variantId} onChange={setVariantId} options={variants.map((v) => ({ value: v.id, label: `${v.name} (${v.branchStock ?? v.stock})` }))} />
          </View>
        ) : null}
        <NumberInput label={t('Kitne piece')} integer value={qty} onChangeValue={setQty} />
      </View>
    </Sheet>
  );
}

export function CosmeticsTestersScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const list = useQuery({ queryKey: [COSMETICS_KEYS.testers], queryFn: () => damageApi.list({ search: TESTER_REASON, reasonCode: 'OTHER', limit: 100 }) });
  const needle = search.trim().toLowerCase();
  const rows = (list.data?.items ?? []).filter((d) => d.reason.startsWith(TESTER_REASON) && (!needle || [d.product.name, d.variant?.name].some((v) => v?.toLowerCase().includes(needle))));
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const thisMonth = rows.filter((d) => new Date(d.createdAt) >= monthStart);
  const canAdd = can(P.PRODUCTS_VIEW);

  return (
    <>
      <ListTemplate<DamageLog>
        title={t('Testers')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Product ya shade…') }}
        summary={
          <View style={{ gap: th.space(2) }}>
            <Row gap={2}>
              <StatTile style={{ flex: 1 }} icon={TestTube2} tone="accent" label={t('Is mahine testers ki cost')} loading={list.isLoading} value={cost(thisMonth.reduce((a, d) => a + d.costImpact, 0))} hint={t('{{count}} piece', { count: thisMonth.length })} />
              <StatTile style={{ flex: 1 }} label={t('Manzoori baqi')} loading={list.isLoading} tone="warning" value={String(rows.filter((d) => d.status === 'REPORTED').length)} hint={t('Damage screen se manzoor')} />
            </Row>
            <OfflineNote feature="cosmeticsDesk" />
            <CachedNote query={list} />
          </View>
        }
        data={rows}
        loading={list.isLoading}
        error={!list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        keyExtractor={(d) => d.id}
        renderItem={({ item: d }) => (
          <ListRow icon={TestTube2} iconTone="accent" title={[d.product.name, d.variant?.name].filter(Boolean).join(' · ')} subtitle={`${dayOnly(d.createdAt)} · ${d.damageNumber}`}
            trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Text weight="bold" ltr>{String(d.quantity)}</Text><Text size="2xs" tone="muted">{cost(d.costImpact)}</Text><Badge tone={TESTER_STATUS[d.status].tone}>{t(TESTER_STATUS[d.status].label)}</Badge></View>} />
        )}
        empty={<EmptyState icon={TestTube2} title={t('Abhi koi tester nahi')} message={t('Tester khola ho to yahan likhein — stock aur nuksan sahi rehte hain.')} />}
        fab={canAdd ? { icon: Plus, label: t('Tester kholein'), onPress: () => setAdding(true) } : undefined}
      />
      <OpenTesterSheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
