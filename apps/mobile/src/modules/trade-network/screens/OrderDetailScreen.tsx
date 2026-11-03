/** One order sent to a supplier: the journey, the figures, the lines, undo while still booked, receive when delivered. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, PackageCheck, X } from 'lucide-react-native';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, DetailRow, DetailSection, DetailTemplate, Icon, ListRow, Row, Text, confirm, toast, useTheme } from '@/design';
import { dayTime, packText } from '@/modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type TradeOrderDetail } from '../api/trade.api';
import { ORDER_STATUS, RECEIVE_STATE, STEPS, stepIndex } from '../lib/meta';
import { CachedLine, Pill } from '../components/shared';

function Journey({ o }: { o: TradeOrderDetail }) {
  const th = useTheme();
  const at = stepIndex(o.status);
  const times = [o.createdAt, o.approvedAt, o.invoicedAt, o.loadedAt, o.deliveredAt];
  if (o.status === 'CANCELLED') {
    return <Text size="sm" tone="muted">{t('Order cancel ho gaya{{value}}', { value: o.cancelledAt ? ` · ${dayTime(o.cancelledAt)}` : '' })}</Text>;
  }
  return (
    <Row align="start" style={{ gap: 2 }}>
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <View key={s.key} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{
              width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
              backgroundColor: done ? th.colors.brand.solid : th.colors.surfaceMuted,
              borderWidth: i === at ? 3 : 0, borderColor: th.colors.brand.soft,
            }}>
              {done ? <Icon icon={Check} size={16} color="#fff" /> : <Text size="xs" weight="bold" tone="muted" ltr>{String(i + 1)}</Text>}
            </View>
            <Text size="2xs" weight="semibold" tone={done ? 'default' : 'muted'} align="center">
              {i === 4 && (o.status === 'PARTIAL' || o.status === 'RETURNED') ? ORDER_STATUS[o.status].label : s.label}
            </Text>
            {!!times[i] && <Text size="2xs" tone="muted" align="center">{dayTime(times[i])}</Text>}
          </View>
        );
      })}
    </Row>
  );
}

export function OrderDetailScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const can = usePermission();
  const q = useQuery({ queryKey: [TRADE_KEY, 'order', id], queryFn: () => tradeApi.order(id) });
  const cancel = useMutation({
    mutationFn: () => tradeApi.cancelOrder(id),
    onSuccess: () => { toast.success(t('Order wapas le liya')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const o = q.data;
  const canReceive = !!o && ['DRAFT', 'NEEDS_MAP'].includes(o.receiveState) && can(P.TRADE_RECEIVE);

  return (
    <DetailTemplate
      title={o ? `${o.seller?.name ?? t('Supplier')}` : t('Order')}
      subtitle={o?.orderNumber ?? undefined}
      loading={q.isLoading}
      error={o ? null : q.error}
      onRetry={q.refetch}
      onRefresh={q.refetch}
      refreshing={q.isRefetching}
      bottomActions={o && (o.status === 'BOOKED' || canReceive) ? (
        <>
          {o.status === 'BOOKED' && (
            <Button variant="secondary" icon={X} style={{ flex: 1 }} loading={cancel.isPending} onPress={async () => {
              if (await confirm({ title: t('Order wapas lein?'), message: t('Supplier ne abhi approve nahi kiya — Order cancel ho jayega.'), confirmLabel: t('Undo'), tone: 'danger' })) cancel.mutate();
            }}>{t('Cancel order')}</Button>
          )}
          {canReceive && <Button icon={PackageCheck} style={{ flex: 1 }} onPress={() => router.push(`/network/receiving?id=${o.id}`)}>{t('Receive')}</Button>}
        </>
      ) : undefined}
    >
      {o && (
        <View style={{ gap: th.space(4) }}>
          <CachedLine query={q} />
          <Journey o={o} />
          <DetailSection>
            <DetailRow label={t('Order')} value={<Amount value={o.total} />} />
            <DetailRow label={t('Invoice')} value={o.invoiceTotal != null ? <Text>{`Rs ${Math.round(o.invoiceTotal).toLocaleString('en-PK')}${o.invoiceNumber ? ` · ${o.invoiceNumber}` : ''}`}</Text> : '—'} />
            <DetailRow label={t('Wapsi')} value={o.returnsValue ? <Amount value={o.returnsValue} /> : '—'} />
            <DetailRow label={t('Purchase')} value={o.purchase ? o.purchase.purchaseNumber : <Pill tone={RECEIVE_STATE[o.receiveState].tone}>{RECEIVE_STATE[o.receiveState].label}</Pill>} last />
          </DetailSection>
          <DetailSection title={t('Items')}>
            {o.lines.map((l, i) => (
              <ListRow key={l.id} divider={i < o.lines.length - 1} title={l.name ?? ''}
                subtitle={(
                  <View>
                    <Text size="xs" tone="muted">
                      {`${l.qty} ${l.unitName ?? l.baseUnit} × Rs ${Math.round(l.price).toLocaleString('en-PK')}`}
                      {l.deliveredBaseQty != null && l.deliveredBaseQty < l.baseQty ? t(' · deliver {{deliveredBaseQty}}', { deliveredBaseQty: packText(l.deliveredBaseQty, l.conversionRate, l.unitName, l.baseUnit) }) : ''}
                    </Text>
                    {(!!l.schemeNote || l.freeBaseQty > 0) && (
                      <Text size="xs" weight="medium" tone="success">{l.schemeNote}{l.freeBaseQty > 0 ? t(' · {{freeBaseQty}} {{value}} free', { freeBaseQty: l.freeBaseQty, value: l.freeProductName ?? l.baseUnit }) : ''}</Text>
                    )}
                  </View>
                )}
                trailing={<Amount value={l.total} weight="semibold" />} />
            ))}
            {o.totals && (
              <View style={{ padding: th.space(3), gap: 2 }}>
                {o.totals.schemeDiscount > 0 && <Row justify="between"><Text size="sm" tone="success">{t('Scheme')}</Text><Amount value={-o.totals.schemeDiscount} size="sm" tone="success" /></Row>}
                <Row justify="between"><Text weight="bold">{t('Total')}</Text><Amount value={o.totals.total} weight="bold" /></Row>
              </View>
            )}
          </DetailSection>
          {!!o.note && <Text size="sm" tone="secondary">{t('Note: {{note}}', { note: o.note })}</Text>}
        </View>
      )}
    </DetailTemplate>
  );
}
