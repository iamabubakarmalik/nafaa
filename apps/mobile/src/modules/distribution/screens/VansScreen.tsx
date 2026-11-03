/** Vans: each van has its own stock, loaded from the godown and counted back in the evening. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, EmptyState, ListRow, ListTemplate, StatusPill, toast, useTheme } from '@/design';
import { distError } from '../api/distribution.api';
import { phase2Api, type SaveVan, type VanRow } from '../api/phase2.api';
import { CachedNote, useRefreshDistribution } from '../components/parts';
import { DistributionGate } from '../components/DistributionGate';
import { VANS_KEY, VanFormSheet } from '../components/VanSheets';
import { dayKeyLabel, rs, trim } from '../lib/meta';

export function VansScreen() {
  return <DistributionGate title={t('Vans')}><Vans /></DistributionGate>;
}

function Vans() {
  const th = useTheme();
  const refresh = useRefreshDistribution();
  const canManage = usePermission()(P.DISTRIBUTION_VANS_MANAGE);
  const q = useQuery({ queryKey: [...VANS_KEY, 'list'], queryFn: phase2Api.vans });
  const [creating, setCreating] = useState(false);
  const save = useMutation({
    mutationFn: (body: SaveVan) => phase2Api.createVan(body),
    onSuccess: (v) => { toast.success(t('Van save ho gayi')); setCreating(false); void refresh(); router.push(`/distribution/vans/${v.id}` as never); },
    onError: (e) => toast.error(distError(e, t('Van save nahi hui'))),
  });
  const vans = q.data?.vans ?? [];
  return (
    <>
      <ListTemplate<VanRow>
        title={t('Vans')}
        subtitle={t('Gaari par maal aur din ka hisaab')}
        summary={<View style={{ gap: th.space(2) }}><CachedNote query={q} /></View>}
        data={vans}
        loading={q.isLoading}
        error={q.isError && !vans.length ? q.error : undefined}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        keyExtractor={(v) => v.id}
        renderItem={({ item: v }) => (
          <ListRow icon={Truck} title={v.name}
            subtitle={[v.vehicleNo, v.salesmanName, v.routeName].filter(Boolean).join(' · ') || t('Salesman abhi nahi')}
            trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Amount value={v.stock.value} weight="semibold" />
              {!v.isActive ? <StatusPill tone="neutral">{t('Band')}</StatusPill>
                : v.session ? <StatusPill tone="warning" dot>{t('Route par · {{dayKey}}', { dayKey: dayKeyLabel(v.session.dayKey) })}</StatusPill> : <StatusPill tone="neutral">{t('Khadi hai')}</StatusPill>}
            </View>}
            chevron onPress={() => router.push(`/distribution/vans/${v.id}` as never)} />
        )}
        empty={<EmptyState icon={Truck} title={t('Koi van nahi')} message={t('Van ka apna stock hota hai. Godown se load hoti hai aur shaam ko bacha maal wapas wahi jata hai.')}
          action={canManage ? <Button icon={Plus} onPress={() => setCreating(true)}>{t('New van')}</Button> : undefined} />}
        fab={canManage ? { icon: Plus, label: t('New van'), onPress: () => setCreating(true) } : undefined}
      />
      <VanFormSheet open={creating} van={null} saving={save.isPending} onClose={() => setCreating(false)} onSave={(b) => save.mutate(b)} />
    </>
  );
}
