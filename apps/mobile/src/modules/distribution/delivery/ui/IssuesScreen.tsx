/**
 * Delivery sync status and issues: what waits on the phone, the last sync,
 * and the reports or recoveries the server refused. A report can be opened,
 * fixed and saved again; anything can be removed from the list.
 */

import { router } from 'expo-router';
import { CheckCircle2, Pencil, RefreshCw, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';
import { formatDateTime, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, EmptyState, Row, Screen, SectionHeader, StatTile, StatusPill, Text, confirm, useTheme } from '@/design';
import { dismissIssue, openIssues } from '../core/repo';
import { useDeliveryQuery, useDeliveryStore } from '../store';

export function IssuesScreen() {
  const th = useTheme();
  const { db, bump, refreshCounts, pending, lastSyncAt, offline, syncing, loading, refresh } = useDeliveryStore();
  const { data: issues = [] } = useDeliveryQuery((d) => openIssues(d), []);

  const remove = async (id: number) => {
    if (!db) return;
    if (!(await confirm({ title: t('List se hatayein?'), message: t('Ye entry office nahi jayegi.'), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    await dismissIssue(db, id);
    bump();
    refreshCounts();
  };

  return (
    <Screen title={t('Sync issues')} subtitle={t('Ye entries server ne nahi li')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/delivery'))} onRefresh={() => refresh()} refreshing={loading || syncing} narrow>
      <Row gap={3}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={pending ? 'warning' : 'success'} label={t('Bhejna baqi')} value={String(pending)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={offline ? 'danger' : 'neutral'} label={t('Aakhri sync')} value={lastSyncAt ? formatRelative(lastSyncAt) : '—'} hint={offline ? t('Internet nahi hai') : undefined} />
      </Row>
      <Button variant="secondary" size="lg" icon={RefreshCw} loading={syncing || loading} onPress={() => refresh()}>{t('Abhi sync karein')}</Button>

      <SectionHeader title={t('Sync issues')} />
      {!issues.length && <EmptyState icon={CheckCircle2} title={t('Koi masla nahi')} message={t('Sab entries office pohanch gayi hain')} compact />}
      {issues.map((item) => (
        <Card key={item.id}>
          <Row gap={2}><StatusPill tone="danger">{item.kind === 'report' ? t('Delivery report') : t('Recovery')}</StatusPill><Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{item.title}</Text></Row>
          <Text size="xs" tone="muted">{formatDateTime(item.createdAt)}</Text>
          <Text size="sm" tone="danger">{item.reason}</Text>
          <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(2) }}>
            {item.kind === 'report' && item.orderId && <Button icon={Pencil} style={{ flex: 1 }} onPress={() => router.push(`/delivery/invoice/${item.orderId}`)}>{t('Theek karke dobara')}</Button>}
            <Button variant="secondary" icon={Trash2} style={{ flex: 1 }} onPress={() => remove(item.id)}>{t('Hatayein')}</Button>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
