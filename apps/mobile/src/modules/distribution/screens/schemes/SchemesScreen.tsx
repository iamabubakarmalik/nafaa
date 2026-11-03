/**
 * Trade schemes: free goods (10+1), percent off from a quantity, rupees off
 * per pack, and slabs. Each can be limited to items, brands, categories and
 * price lists, run between dates, and be tagged with the company (principal)
 * that pays for it. The test box shows what the schemes give on a real order.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BadgePercent, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, confirm, EmptyState, ListRow, ListTemplate, Segmented, StatusPill, SwipeRow, Text, toast, useTheme } from '@/design';
import { DIST_KEY, distSetupApi, type SchemeRow } from '../../api/distribution.api';
import { DistributionGate } from '../../components/DistributionGate';
import { SchemePreviewBox } from '../../components/SchemePreviewBox';
import { CachedNote } from '../../components/parts';
import { dayLabel } from '../../lib/meta';
import { SCHEME_TYPE, SCHEMES_KEY, schemeRuleText } from '../../lib/setup';

type Filter = 'live' | 'off' | 'all';

export function SchemesScreen() {
  return <DistributionGate title={t('Schemes')}><Body /></DistributionGate>;
}

function Body() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_SCHEMES_MANAGE);
  const q = useQuery({ queryKey: SCHEMES_KEY, queryFn: () => distSetupApi.schemes() });
  const [filter, setFilter] = useState<Filter>('live');
  const all = q.data ?? [];
  const live = all.filter((s) => s.live);
  const shown = useMemo(() => all.filter((s) => (filter === 'all' ? true : filter === 'live' ? s.live : !s.live)), [all, filter]);
  const first = live.find((s) => s.productIds.length) ?? null;
  const sample = first ? { id: first.productIds[0], name: first.productNames[0] ?? 'Item' } : null;

  const del = useMutation({
    mutationFn: (id: string) => distSetupApi.deleteScheme(id),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: [DIST_KEY] }); toast.success(r.deleted ? t('Scheme mita di') : t('Scheme band kar di (orders me lag chuki thi)')); },
  });
  const ask = async (s: SchemeRow) => {
    if (await confirm({ title: t('{{name}} mitayein?', { name: s.name }), message: t('Jin orders me lag chuki hai un ki wajah se scheme sirf band hogi.'), confirmLabel: t('Mitayein'), tone: 'danger' })) del.mutate(s.id);
  };
  const open = (id: string) => router.push(`/distribution/schemes/${id}` as never);

  return (
    <ListTemplate<SchemeRow>
      title={t('Schemes')}
      summary={(
        <View style={{ gap: th.space(3) }}>
          <Segmented value={filter} onChange={setFilter} size="sm"
            options={[{ value: 'live', label: t('Chal rahi'), count: live.length }, { value: 'off', label: t('Band'), count: all.length - live.length }, { value: 'all', label: t('Sab'), count: all.length }]} />
          <CachedNote query={q} />
        </View>
      )}
      data={shown}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      keyExtractor={(s) => s.id}
      renderItem={({ item: s }) => {
        const m = SCHEME_TYPE[s.type];
        const scope = [
          s.productIds.length ? s.productNames.filter(Boolean).slice(0, 2).join(', ') + (s.productIds.length > 2 ? ` +${s.productIds.length - 2}` : '') : '',
          s.brandIds.length ? `${s.brandIds.length} brand` : '', s.categoryIds.length ? `${s.categoryIds.length} category` : '',
        ].filter(Boolean).join(' · ') || t('Sab items');
        const row = (
          <ListRow
            leading={<View style={{ width: 38, height: 38, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: `${m.color}1f` }}><m.icon size={19} color={m.color} /></View>}
            title={s.name}
            subtitle={<View style={{ gap: 2 }}>
              <Text size="sm" weight="medium" style={{ color: m.color }}>{schemeRuleText(s, s.freeProductName)}</Text>
              <Text size="xs" tone="muted" numberOfLines={1}>{scope}</Text>
              {(s.startsAt || s.endsAt || s.supplierName) && (
                <Text size="xs" tone="muted" numberOfLines={1}>
                  {[s.startsAt || s.endsAt ? `${s.startsAt ? dayLabel(s.startsAt) : t('Shuru')} – ${s.endsAt ? dayLabel(s.endsAt) : t('Jari')}` : null, s.supplierName].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>}
            trailing={<StatusPill tone={s.live ? 'success' : 'neutral'}>{s.live ? t('Chal rahi') : s.isActive ? t('Waqt se bahar') : t('Band')}</StatusPill>}
            divider onPress={canManage ? () => open(s.id) : undefined}
          />
        );
        return canManage ? <SwipeRow end={[{ icon: Trash2, label: t('Mitayein'), tone: 'danger', onPress: () => ask(s) }]}>{row}</SwipeRow> : row;
      }}
      footer={(
        <View style={{ marginTop: th.space(4) }}>
          <SchemePreviewBox title={t('Test karein')} hint={t('Koi item aur qty likhein — dekhein kaun si chalti scheme lagti hai.')} initialProduct={sample} />
        </View>
      )}
      empty={<EmptyState icon={BadgePercent} title={all.length ? t('Is list me koi scheme nahi') : t('Abhi koi scheme nahi')}
        message={t('Misal: Banaspati Ghee par 10 Carton lein, 1 Carton free. Ya 2 Carton se 3% Discount.')}
        action={canManage ? <Button icon={Plus} onPress={() => open('new')}>{t('Nayi scheme')}</Button> : undefined} />}
      fab={canManage ? { icon: Plus, label: t('Nayi scheme'), onPress: () => open('new') } : undefined}
    />
  );
}

