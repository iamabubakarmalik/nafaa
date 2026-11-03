/** Bundles (web ElectronicsBundlesPage): deals of several products with one price, what can be made from stock, switch on / off. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Layers, Plus, Power, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, SwipeRow, Text, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { electronicsBundlesApi, type ElectronicsBundle } from '../api';
import { BUNDLE_KEY, refreshElectronics } from '../meta';

type Tab = 'all' | 'active' | 'off';

export function BundlesScreen() {
  const th = useTheme();
  const canManage = usePermission()(P.PRODUCTS_CREATE);
  const { cost } = useCostMask();
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const list = useQuery({ queryKey: [BUNDLE_KEY, 'list', query], queryFn: () => electronicsBundlesApi.list({ search: query || undefined }) });
  const rows = (list.data ?? []).filter((b) => (tab === 'all' ? true : tab === 'active' ? b.isActive : !b.isActive));
  const toggle = useMutation({
    mutationFn: (b: ElectronicsBundle) => electronicsBundlesApi.update(b.id, { isActive: !b.isActive }),
    onSuccess: () => { refreshElectronics([BUNDLE_KEY, 'electronics-pos-catalog']); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const remove = async (b: ElectronicsBundle) => {
    if (!(await confirm({ title: t('{{name}} hata dein?', { name: b.name }), message: t('Jo bundle bik chuka ho wo band kar diya jata hai.'), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    try { const r = await electronicsBundlesApi.remove(b.id); toast.success(r.archived ? t('Bundle band kar diya') : t('Bundle hata diya')); refreshElectronics([BUNDLE_KEY, 'electronics-pos-catalog']); } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hata'))); }
  };
  return (
    <ListTemplate<ElectronicsBundle>
      title={t('Bundles')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Bundle ka naam…') }}
      summary={<View style={{ gap: th.space(3) }}><ChipGroup value={tab} onChange={setTab} options={[{ value: 'active', label: t('Chalu') }, { value: 'off', label: t('Band') }, { value: 'all', label: t('Sab') }]} /><OfflineNote feature="electronicsDesk" /><CachedNote query={list} /></View>}
      data={rows}
      loading={list.isLoading}
      error={list.data ? null : list.error}
      onRetry={() => void list.refetch()}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      keyExtractor={(b) => b.id}
      renderItem={({ item: b }) => (
        <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, opacity: b.isActive ? 1 : 0.65 }}>
          <SwipeRow end={canManage ? [{ icon: Power, label: b.isActive ? t('Band') : t('Chalu'), tone: 'brand', onPress: () => toggle.mutate(b) }, { icon: Trash2, label: t('Hatayein'), tone: 'danger', onPress: () => void remove(b) }] : []}>
            <ListRow icon={Layers} iconTone={b.broken ? 'danger' : 'brand'}
              title={<Text weight="semibold" numberOfLines={1}>{b.name}</Text>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{b.items.map((i) => `${i.quantity} × ${i.product?.name ?? '—'}`).join(', ')}</Text>
                <Row gap={1} wrap>
                  {b.savings > 0 ? <Badge tone="success">{t('Bachat {{n}}', { n: formatMoney(b.savings) })}</Badge> : null}
                  {b.canMake != null ? <Badge tone={b.canMake > 0 ? 'info' : 'danger'}>{t('{{n}} ban sakte', { n: b.canMake })}</Badge> : null}
                  {b.expired ? <Badge tone="neutral">{t('Muddat khatam')}</Badge> : null}
                  {b.upcoming ? <Badge tone="warning">{t('Abhi shuru nahi')}</Badge> : null}
                  {b.broken ? <Badge tone="danger">{t('Product hata hua')}</Badge> : null}
                  {b.validUntil ? <Text size="2xs" tone="muted">{t('Tak')} {formatDate(b.validUntil)}</Text> : null}
                </Row>
              </View>}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={b.bundlePrice} weight="bold" size="sm" />{b.profit != null ? <Text size="2xs" tone="success" ltr>{cost(b.profit)}</Text> : null}</View>}
              onPress={canManage ? () => router.push(`/electronics/bundles/${b.id}` as never) : undefined} />
          </SwipeRow>
        </View>
      )}
      empty={<EmptyState icon={Layers} title={t('Abhi koi bundle nahi')} message={t('Charger + cable + cover jaisi deal banayein.')} />}
      fab={canManage ? { icon: Plus, label: t('Naya bundle'), onPress: () => router.push('/electronics/bundles/new' as never) } : undefined}
    />
  );
}
