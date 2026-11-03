/** AMC contracts (web AmcContractsPage): running, ending soon, ended, money still to collect and closed; what customers saved. Needs the server. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BellRing, CalendarClock, FileSignature, Plus, ShieldCheck, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/trade/desk';
import { amcContractsApi, type AmcContract } from '../api';
import { AMC_PLANS, KEYS, amcPlanLabel, amcStatus, dayOnly, daysPhrase, daysTo } from '../meta';

type View_ = 'active' | 'expiring' | 'expired' | 'unpaid' | 'closed' | 'all';
const VIEWS: Array<{ value: View_; label: string }> = [
  { value: 'active', label: t('Chal rahe') }, { value: 'expiring', label: t('30 din me khatam') }, { value: 'expired', label: t('Khatam') },
  { value: 'unpaid', label: t('Paisa baqi') }, { value: 'closed', label: t('Renew / cancel') }, { value: 'all', label: t('Sab') },
];
export const amcDue = (c: AmcContract) => (c.status === 'CANCELLED' ? 0 : Math.max(Number(c.contractValue) - Number(c.paidAmount), 0));
const viewParams = (v: View_) => (v === 'active' ? { status: 'ACTIVE' } : v === 'expiring' ? { expiringSoon: true } : v === 'expired' ? { expired: true } : {});

export function AmcScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('appliancesDesk');
  const [view, setView] = useState<View_>('active');
  const [plan, setPlan] = useState('');
  const [search, setSearch] = useState('');
  const q = search.trim();
  const list = useQuery({ queryKey: [KEYS.amc, 'list', view, plan, q], queryFn: () => amcContractsApi.list({ ...viewParams(view), amcType: plan || undefined, search: q || undefined }), placeholderData: (p) => p });
  const sum = useQuery({ queryKey: [KEYS.amc, 'summary'], queryFn: () => amcContractsApi.summary() });
  const s = sum.data;
  const rows = useMemo(() => {
    const all = list.data ?? [];
    if (view === 'unpaid') return all.filter((c) => amcDue(c) > 0);
    if (view === 'closed') return all.filter((c) => c.status === 'RENEWED' || c.status === 'CANCELLED');
    return all;
  }, [list.data, view]);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={ShieldCheck} tone="success" label={t('Chal rahe')} loading={sum.isLoading} value={String(s?.active ?? 0)} hint={s?.customerSaved ? t('Customers ne bachaya {{amount}}', { amount: formatMoney(s.customerSaved) }) : undefined} onPress={() => setView('active')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CalendarClock} tone={s?.expiringSoon ? 'warning' : 'neutral'} label={t('30 din me khatam')} loading={sum.isLoading} value={String(s?.expiringSoon ?? 0)} hint={t('Renew ka phone karein')} onPress={() => setView('expiring')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={BellRing} tone={s?.expired ? 'danger' : 'neutral'} label={t('Khatam')} loading={sum.isLoading} value={String(s?.expired ?? 0)} onPress={() => setView('expired')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone={s?.pendingAmount ? 'warning' : 'neutral'} label={t('Paisa baqi')} loading={sum.isLoading} value={formatMoney(s?.pendingAmount ?? 0)} onPress={() => setView('unpaid')} />
      </Row>
      <ChipGroup value={view} onChange={(v) => setView(v as View_)} style={{ marginHorizontal: -th.space(4) }} options={VIEWS} />
      <ChipGroup value={plan} onChange={setPlan} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab plan') }, ...Object.keys(AMC_PLANS).map((k) => ({ value: k, label: amcPlanLabel(k) }))]} />
      <OfflineNote feature="appliancesDesk" />
      <CachedNote query={sum} />
    </View>
  );
  return (
    <ListTemplate<AmcContract>
      title={t('AMC contracts')} grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Customer, phone, product ya number…') }}
      summary={header} data={rows} loading={list.isLoading} error={list.data ? null : list.error} onRetry={() => void list.refetch()}
      refreshing={list.isRefetching} onRefresh={() => { void list.refetch(); void sum.refetch(); }} keyExtractor={(c) => c.id}
      renderItem={({ item: c }) => {
        const st = amcStatus(c.status);
        const due = amcDue(c);
        const days = c.computed?.daysRemaining ?? daysTo(c.expiryDate);
        return (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={FileSignature} iconTone={c.computed?.isExpiringSoon ? 'warning' : 'accent'} chevron onPress={() => router.push(`/appliances/amc-contracts/${c.id}` as never)}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{c.customerName}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[c.contractNumber, c.productName, amcPlanLabel(c.amcType)].filter(Boolean).join(' · ')}</Text>
                <Row gap={1} wrap>
                  <Badge tone={c.computed?.isExpiringSoon ? 'warning' : 'neutral'}>{`${dayOnly(c.expiryDate)} · ${daysPhrase(days)}`}</Badge>
                  <Badge tone="info">{t('{{used}}/{{all}} visit', { used: c.freeVisitsUsed, all: c.freeVisitsAllowed })}</Badge>
                </Row>
              </View>}
              trailing={due > 0 ? <Text size="sm" weight="bold" tone="warning">{formatMoney(due)}</Text> : undefined} />
          </View>
        );
      }}
      empty={<EmptyState icon={FileSignature} title={q ? t('Koi contract nahi mila') : t('Abhi koi AMC contract nahi')} message={t('Saal bhar ki service contract bechein — free visits aur mazdoori ke saath.')} />}
      fab={can(P.SERVICE_JOBS_MANAGE) ? { icon: Plus, label: t('Naya AMC'), onPress: () => guard(() => router.push('/appliances/amc-contracts/new' as never)) } : undefined}
    />
  );
}
