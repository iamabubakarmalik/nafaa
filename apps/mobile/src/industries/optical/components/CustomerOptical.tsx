/**
 * Bill panel block for the chosen customer: their latest prescription and
 * any glasses ready to hand over, with a way to make an order or deliver.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CheckCircle2, Eye, Glasses } from 'lucide-react-native';
import { powerSummary, rxState } from '@nafaa/core/industries/optical';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, PressableScale, Row, Text, useTheme } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { lensOrdersApi, prescriptionsApi } from '../api';
import { OPTICAL_KEYS } from '../meta';

export function CustomerOptical() {
  const th = useTheme();
  const customerId = useBill((s) => s.customer?.id);
  const rx = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'customer', customerId], queryFn: () => prescriptionsApi.byCustomer(customerId!), enabled: !!customerId, staleTime: 60_000 });
  const ready = useQuery({ queryKey: [OPTICAL_KEYS.orders, 'customer-ready', customerId], queryFn: () => lensOrdersApi.page({ view: 'ready', customerId: customerId!, limit: 5 }), enabled: !!customerId, staleTime: 60_000 });
  if (!customerId) return null;
  const latest = (rx.data ?? []).find((r) => r.isActive && rxState(r).state !== 'expired');
  const orders = ready.data?.items ?? [];
  if (!latest && !orders.length) return null;
  return (
    <>
      {orders.map((o) => (
        <PressableScale key={o.id} onPress={() => router.push(`/optical/lens-orders/${o.id}` as never)}>
          <Card tone="success" style={{ padding: th.space(2.5) }}>
            <Row gap={2}>
              <CheckCircle2 size={16} color={th.colors.success.text} />
              <Text size="sm" weight="semibold" style={{ flex: 1 }}>{t('Chashma tayyar: {{orderNumber}}{{value}}', { orderNumber: o.orderNumber, value: o.remainingAmount > 0 ? t(' · Rs {{remainingAmount}} baqi', { remainingAmount: formatMoney(o.remainingAmount).replace(/^Rs\s?/, '') }) : '' })}</Text>
            </Row>
          </Card>
        </PressableScale>
      ))}
      {latest && (
        <Card tone="muted" style={{ padding: th.space(2.5) }}>
          <Row gap={2}>
            <Eye size={16} color={th.colors.textMuted} />
            <Text size="xs" ltr numberOfLines={2} style={{ flex: 1 }}>{powerSummary(latest, t('Plano')) || latest.prescriptionNumber}</Text>
            <Button size="sm" variant="soft" icon={Glasses} onPress={() => router.push(`/optical/lens-orders/new?rx=${latest.id}` as never)}>{t('Order')}</Button>
          </Row>
        </Card>
      )}
    </>
  );
}
