/**
 * Price lists: each list is a set of rates for a group of customers
 * (retailers, key accounts, wholesalers). An item the list does not name is
 * priced by the list's rule: its base (retail, wholesale or cost) plus or
 * minus a percent.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus, Star, Tags, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, Text, toast } from '@/design';
import { DIST_KEY, distSetupApi, type PriceList, type SavePriceList } from '../../api/distribution.api';
import { DistributionGate } from '../../components/DistributionGate';
import { PriceListFormSheet } from '../../components/PriceListFormSheet';
import { CachedNote } from '../../components/parts';
import { PRICE_LISTS_KEY, ruleText } from '../../lib/setup';

export function PriceListsScreen() {
  return <DistributionGate title={t('Price lists')}><Body /></DistributionGate>;
}

function Body() {
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_PRICELISTS_MANAGE);
  const q = useQuery({ queryKey: PRICE_LISTS_KEY, queryFn: distSetupApi.priceLists });
  const lists = useMemo(() => [...(q.data ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)), [q.data]);
  const [form, setForm] = useState<boolean>(false);

  const create = useMutation({
    mutationFn: (body: SavePriceList) => distSetupApi.createPriceList(body),
    onSuccess: (l) => { void qc.invalidateQueries({ queryKey: [DIST_KEY] }); setForm(false); toast.success(t('{{name}} ban gayi', { name: l.name })); router.push(`/distribution/price-lists/${l.id}` as never); },
  });

  const customers = lists.reduce((s, l) => s + (l.customerCount ?? 0), 0);
  const items = lists.reduce((s, l) => s + (l.itemCount ?? 0), 0);

  return (
    <>
      <ListTemplate<PriceList>
        title={t('Price lists')}
        summary={(
          <View style={{ gap: 8 }}>
            <Row gap={2}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Users} label={t('Customers list par')} value={String(customers)} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Tags} label={t('Apne rates')} value={String(items)} hint={t('baqi rule se')} />
            </Row>
            <CachedNote query={q} />
          </View>
        )}
        data={lists}
        loading={q.isLoading}
        error={q.error}
        onRetry={q.refetch}
        refreshing={q.isRefetching}
        onRefresh={q.refetch}
        keyExtractor={(l) => l.id}
        renderItem={({ item: l }) => (
          <ListRow
            icon={Tags} iconTone={l.isActive ? 'brand' : 'neutral'}
            title={l.code ? `${l.name} · ${l.code}` : l.name}
            subtitle={<View><Text size="sm" tone="muted" numberOfLines={1}>{ruleText(l)}</Text><Text size="xs" tone="muted">{t('{{value}} rates', { value: l.itemCount ?? 0 })} · {l.customerCount ?? 0} {t('Customers')}</Text></View>}
            trailing={<Row gap={1.5}>{l.isDefault && <Star size={16} color="#f59e0b" fill="#f59e0b" />}{!l.isActive && <StatusPill tone="danger">{t('Band')}</StatusPill>}</Row>}
            chevron divider onPress={() => router.push(`/distribution/price-lists/${l.id}` as never)}
          />
        )}
        empty={<EmptyState icon={Tags} title={t('Abhi koi price list nahi')}
          message={t('Misal: \'Retailers\' list Wholesale par, \'Key accounts\' list Wholesale −3% par. Customer ko list do — POS aur booker app wohi rate lagayenge.')}
          action={canManage ? <Button icon={Plus} onPress={() => setForm(true)}>{t('Nayi list')}</Button> : undefined} />}
        fab={canManage ? { icon: Plus, label: t('Nayi list'), onPress: () => setForm(true) } : undefined}
      />
      {form && <PriceListFormSheet list={null} saving={create.isPending} onClose={() => setForm(false)} onSave={(b) => create.mutate(b)} />}
    </>
  );
}
