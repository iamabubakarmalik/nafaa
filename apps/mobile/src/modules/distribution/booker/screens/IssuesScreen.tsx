/**
 * Sync status and issues: what is waiting to be sent, whether the phone is
 * online, and the entries the server refused. A refused entry is never sent
 * again as it is; an order can be opened, fixed and saved as a new one, and
 * anything else can be removed from the list.
 */

import { useRouter } from 'expo-router';
import { CheckCircle2, CloudOff, Pencil, RefreshCw, Trash2, Wifi } from 'lucide-react-native';
import { View } from 'react-native';
import { formatDateTime, formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { Button, Card, confirm, DetailSection, DetailTemplate, EmptyState, ListRow, Row, StatusPill, Text, useTheme } from '@/design';
import { dismissIssue, openIssues, pendingItems } from '../core/repo';
import { useBookerStore, useDbQuery } from '../store';

const KIND: Record<string, string> = { order: 'Order', visit: 'Visit', collection: 'Recovery', return: 'Market return' };

export function BookerIssuesScreen() {
  const th = useTheme();
  const router = useRouter();
  const online = useOnlineStatus();
  const { db, bump, refreshCounts, sync, syncing, pending, lastSyncAt, syncError } = useBookerStore();
  const { data: issues = [] } = useDbQuery((d) => openIssues(d), []);
  const { data: waiting = [] } = useDbQuery((d) => pendingItems(d), []);

  const remove = async (id: number) => {
    if (!db) return;
    const ok = await confirm({ title: t('List se hatayein?'), message: t('Ye entry office nahi jayegi.'), tone: 'danger', confirmLabel: t('Hatayein') });
    if (!ok) return;
    await dismissIssue(db, id);
    bump();
    refreshCounts();
  };

  return (
    <DetailTemplate
      title={t('Sync status')}
      subtitle={t('Ye entries server ne nahi li')}
      refreshing={syncing}
      onRefresh={() => sync()}
      bottomActions={<Button size="xl" style={{ flex: 1 }} icon={RefreshCw} loading={syncing} onPress={() => sync()}>{t('Sync now')}</Button>}
    >
      <Card>
        <Row gap={3}>
          <View style={{ flex: 1, gap: 2 }}>
            <Row gap={2}>
              {online ? <Wifi size={16} color={th.colors.success.text} /> : <CloudOff size={16} color={th.colors.danger.text} />}
              <Text weight="semibold">{online ? t('Internet chal raha hai') : t('Internet nahi hai')}</Text>
            </Row>
            <Text size="xs" tone="muted">
              {lastSyncAt ? t('Last updated {{time}}', { time: formatRelative(lastSyncAt) }) : t('Abhi tak sync nahi hua')}
            </Text>
          </View>
          <StatusPill tone={pending ? 'warning' : 'success'}>{pending ? t('{{count}} baqi', { count: pending }) : t('Sab bhej diya')}</StatusPill>
        </Row>
        {!!syncError && <Text size="sm" tone="danger" style={{ marginTop: th.space(2) }}>{t(syncError)}</Text>}
      </Card>

      {issues.length > 0 && (
        <DetailSection title={t('Sync issues')}>
          {issues.map((item) => (
            <View key={item.id} style={{ padding: th.space(4), gap: th.space(2), borderBottomWidth: 1, borderBottomColor: th.colors.divider }}>
              <Row gap={2}>
                <StatusPill tone="danger">{t(KIND[item.kind] ?? item.kind)}</StatusPill>
                <Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{item.customerName ?? t('Customer')}</Text>
              </Row>
              <Text size="xs" tone="muted">{item.title} · {formatDateTime(item.createdAt)}</Text>
              <Text size="sm" tone="danger">{t(item.reason)}</Text>
              <Row gap={2}>
                {item.kind === 'order' && item.customerId && (
                  <Button size="md" icon={Pencil} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/booker/order/[customerId]', params: { customerId: item.customerId!, redo: item.clientRef } })}>{t('Theek karke dobara')}</Button>
                )}
                <Button size="md" variant="secondary" icon={Trash2} style={{ flex: 1 }} onPress={() => remove(item.id)}>{t('Hatayein')}</Button>
              </Row>
            </View>
          ))}
        </DetailSection>
      )}

      {waiting.length > 0 && (
        <DetailSection title={t('Bhejne ke liye baqi')}>
          {waiting.map((w) => (
            <ListRow
              key={`${w.kind}-${w.clientRef}`}
              title={w.customerName || t('Customer')}
              subtitle={`${t(KIND[w.kind])} · ${formatRelative(w.createdAt)}${w.attempts ? ` · ${t('{{count}} koshish', { count: w.attempts })}` : ''}`}
              trailing={w.amount != null ? <Text weight="semibold" ltr>{formatMoney(w.amount)}</Text> : undefined}
              divider
            />
          ))}
        </DetailSection>
      )}

      {issues.length === 0 && waiting.length === 0 && (
        <EmptyState icon={CheckCircle2} tone="brand" title={t('Koi masla nahi')} message={t('Sab entries office pohanch gayi hain')} />
      )}
    </DetailTemplate>
  );
}
