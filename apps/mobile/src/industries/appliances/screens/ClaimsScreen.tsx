/** Warranty claims to the brand (web ApplianceWarrantyClaimsPage): open, with the company, approved and waiting for money, settled, rejected; repairs never claimed. Needs the server. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Clock, Plus, Send, ShieldCheck, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/trade/desk';
import { asPages, warrantyClaimsApi, type WarrantyClaim } from '../api';
import { KEYS, claimStatus, dayOnly } from '../meta';

type View_ = 'open' | 'waiting' | 'APPROVED' | 'SETTLED' | 'REJECTED' | 'all';
const VIEWS: Array<{ value: View_; label: string }> = [
  { value: 'open', label: t('Khule') }, { value: 'waiting', label: t('Company ke paas') }, { value: 'APPROVED', label: t('Approve — paisa baqi') },
  { value: 'SETTLED', label: t('Paisa mil gaya') }, { value: 'REJECTED', label: t('Mana') }, { value: 'all', label: t('Sab') },
];
const viewParams = (v: View_) => (v === 'open' ? { open: true } : v === 'waiting' ? { status: 'SUBMITTED' } : v === 'all' ? {} : { status: v });
export const claimPending = (c: WarrantyClaim) => c.pendingAmount ?? Math.max(Number(c.approvedAmount || c.claimedAmount) - Number(c.receivedAmount), 0);
const LIMIT = 20;

export function ClaimsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('appliancesDesk');
  const [view, setView] = useState<View_>('open');
  const [search, setSearch] = useState('');
  const q = search.trim();
  const params = { ...viewParams(view), search: q || undefined, limit: LIMIT };
  const list = usePaged([KEYS.claim, 'paged', params], (page) => warrantyClaimsApi.list({ ...params, page }).then(asPages));
  const sum = useQuery({ queryKey: [KEYS.claim, 'summary'], queryFn: () => warrantyClaimsApi.summary() });
  const s = sum.data;
  const manage = can(P.ELECTRONICS_WARRANTY_MANAGE);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={ShieldCheck} tone="info" label={t('Khule')} loading={sum.isLoading} value={String(s?.open ?? 0)} onPress={() => setView('open')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone={s?.money.pending ? 'warning' : 'neutral'} label={t('Company ke paas atka')} loading={sum.isLoading} value={formatMoney(s?.money.pending ?? 0)} hint={s ? t('Recovery {{n}}%', { n: Math.round(s.money.recoveryRate) }) : undefined} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Clock} tone={s?.stale ? 'danger' : 'neutral'} label={t('30 din se latke')} loading={sum.isLoading} value={String(s?.stale ?? 0)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone={s?.missing.count ? 'warning' : 'neutral'} label={t('Claim nahi bana')} loading={sum.isLoading} value={String(s?.missing.count ?? 0)} hint={s?.missing.recoverable ? formatMoney(s.missing.recoverable) : undefined} onPress={() => router.push('/appliances/warranty-claims/missing' as never)} />
      </Row>
      <ChipGroup value={view} onChange={(v) => setView(v as View_)} style={{ marginHorizontal: -th.space(4) }} options={VIEWS} />
      <OfflineNote feature="appliancesDesk" />
      <CachedNote query={sum} />
    </View>
  );
  return (
    <ListTemplate<WarrantyClaim>
      title={t('Warranty claims')} grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Claim, customer, serial ya brand…') }}
      summary={header} data={list.items} loading={list.loading} error={list.error} onRetry={list.refetch} refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void sum.refetch(); }} onEndReached={list.loadMore} keyExtractor={(c) => c.id}
      renderItem={({ item: c }) => {
        const st = claimStatus(c.status);
        const pending = claimPending(c);
        return (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={Send} iconTone={st.tone} chevron onPress={() => router.push(`/appliances/warranty-claims/${c.id}` as never)}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{`${c.brandName ?? ''} ${c.productName}`.trim()}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[c.claimNumber, c.customerName, c.serialNumber].filter(Boolean).join(' · ')}</Text>
                <Row gap={1} wrap><Badge>{dayOnly(c.claimDate)}</Badge>{(c.ageDays ?? 0) > 30 && !['SETTLED', 'REJECTED'].includes(c.status) && <Badge tone="danger">{t('{{n}} din', { n: c.ageDays ?? 0 })}</Badge>}</Row>
              </View>}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="bold" ltr>{formatMoney(c.claimedAmount)}</Text>{pending > 0 && c.status !== 'REJECTED' && <Text size="2xs" tone="warning">{t('Baqi {{amount}}', { amount: formatMoney(pending) })}</Text>}</View>} />
          </View>
        );
      }}
      empty={<EmptyState icon={ShieldCheck} title={q ? t('Koi claim nahi mila') : t('Abhi koi claim nahi')} message={t('Warranty repair ka kharcha company se wapas lene ke liye claim banayein.')} />}
      fab={manage ? { icon: Plus, label: t('Naya claim'), onPress: () => guard(() => router.push('/appliances/warranty-claims/new' as never)) } : undefined}
    />
  );
}

/** Warranty repairs that were never claimed: money the shop paid and can still ask the company for. */
export function MissingClaimsScreen() {
  const th = useTheme();
  const q = useQuery({ queryKey: [KEYS.claim, 'missing'], queryFn: () => warrantyClaimsApi.missing() });
  return (
    <ListTemplate<NonNullable<typeof q.data>['items'][number]>
      title={t('Claim nahi bana')} grouped={false}
      summary={q.data ? <Card tone="warning"><Text size="sm">{t('{{amount}} company se wapas liya ja sakta hai', { amount: formatMoney(q.data.totalRecoverable) })}</Text></Card> : undefined}
      data={q.data?.items} loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} refreshing={q.isRefetching} onRefresh={() => void q.refetch()} keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => (
        <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
          <ListRow chevron onPress={() => router.push(`/appliances/service-requests/${r.id}` as never)} title={`${r.requestNumber} · ${r.productName}`} subtitle={`${r.customerName} · ${r.reportedIssue}`}
            trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="bold" ltr>{formatMoney(r.recoverable)}</Text><Text size="2xs" tone="muted">{t('{{n}} din', { n: r.ageDays })}</Text></View>} />
        </View>
      )}
      empty={<EmptyState icon={ShieldCheck} title={t('Sab claims ban chuke hain')} />}
    />
  );
}
