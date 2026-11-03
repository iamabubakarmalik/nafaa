/** Installment plans (web EmiPlansPage): who owes how much, what is late and what falls due soon. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, CalendarClock, CreditCard, HandCoins, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { planProgress } from '@nafaa/core/industries/mobile';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, ChipGroup, EmptyState, ListRow, ListTemplate, ProgressBar, Row, StatTile, Text, useDebouncedValue, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { emiApi, type EmiListParams, type EmiPlan, type EmiView } from '../api';
import { CreateEmiPlanSheet } from '../components/EmiSheets';
import { MetaPill } from '../components/kit';
import { EMI_KEY, planStatusOf } from '../meta';

const VIEWS: Array<{ value: EmiView; label: string }> = [
  { value: 'active', label: t('Chal rahe') }, { value: 'overdue', label: t('Late') }, { value: 'upcoming', label: t('Aane wali') }, { value: 'done', label: t('Mukammal') }, { value: 'all', label: t('Sab') },
];

export function EmiPlansScreen() {
  const th = useTheme();
  const canManage = usePermission()(P.KHATA_MANAGE);
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('mobileDesk');
  const [view, setView] = useState<EmiView>('active');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const query = useDebouncedValue(search.trim(), 250);
  const params: EmiListParams = { view, page: 1, limit: 60, sort: view === 'overdue' || view === 'upcoming' ? 'due' : 'new', search: query || undefined };
  const list = useQuery({ queryKey: [EMI_KEY, 'page', params], queryFn: () => emiApi.list(params), placeholderData: (p) => p });
  const stats = useQuery({ queryKey: ['emi-stats'], queryFn: () => emiApi.stats(), refetchInterval: 60_000 });
  const s = stats.data;
  const counts = list.data?.counts;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={CreditCard} tone="info" label={t('Baqi (chal rahe)')} loading={stats.isLoading} value={cost(s?.activeRemaining ?? 0)} />
        <StatTile style={{ flex: 1 }} icon={HandCoins} tone="success" label={t('Is mahine mila')} loading={stats.isLoading} value={cost(s?.collectedThisMonth ?? 0)} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone={s?.overdueCount ? 'danger' : 'neutral'} label={t('Late')} hint={s?.overdueCount ? t('{{count}} customer', { count: s.overdueCount }) : undefined} loading={stats.isLoading} value={cost(s?.overdueAmount ?? 0)} onPress={() => setView('overdue')} />
        <StatTile style={{ flex: 1 }} icon={CalendarClock} tone="warning" label={t('Aane wali (7 din)')} loading={stats.isLoading} value={cost(s?.upcomingAmount ?? 0)} onPress={() => setView('upcoming')} />
      </Row>
      <ChipGroup value={view} onChange={setView} options={VIEWS.map((v) => ({ value: v.value, label: `${v.label}${counts?.[v.value] != null ? ` ${counts[v.value]}` : ''}` }))} />
      <OfflineNote feature="mobileDesk" />
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate<EmiPlan>
        title={t('Instalment plans')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Customer, phone ya plan number…') }}
        summary={header}
        data={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.data ? null : list.error}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={CreditCard} iconTone={p.overdueCount ? 'danger' : planStatusOf(p.status).tone}
              title={<Text weight="semibold" numberOfLines={1}>{p.customerName}</Text>}
              subtitle={<View style={{ gap: 4 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{p.planNumber}{p.customerPhone ? ` · ${p.customerPhone}` : ''}</Text>
                <ProgressBar value={planProgress(p)} />
                <Row gap={1} wrap>
                  <MetaPill m={planStatusOf(p.status)} />
                  <Text size="2xs" tone="muted">{t('{{a}}/{{b}} qist', { a: p.paidInstallmentCount, b: p.installmentCount })}</Text>
                  {p.overdueAmount > 0 ? <Text size="2xs" tone="danger">{t('Late')} {formatMoney(p.overdueAmount)}</Text> : p.nextDueDate && p.status === 'ACTIVE' ? <Text size="2xs" tone="muted">{t('Agli qist')} {formatDate(p.nextDueDate)}</Text> : null}
                </Row>
              </View>}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={p.remainingAmount} size="sm" weight="semibold" /><Text size="2xs" tone="muted">{t('baqi')}</Text></View>}
              onPress={() => router.push(`/mobile/emi/${p.id}` as never)} />
          </View>
        )}
        empty={<EmptyState icon={CreditCard} title={t('Koi qist plan nahi')} message={t('POS par phone udhaar bechein, phir uski qistein banayein.')} />}
        fab={canManage ? { icon: Plus, label: t('Naya plan'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      <CreateEmiPlanSheet open={adding} onClose={() => setAdding(false)} onCreated={(id) => router.push(`/mobile/emi/${id}` as never)} />
    </>
  );
}
