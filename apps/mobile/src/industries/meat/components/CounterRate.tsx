/**
 * Bill panel block (web meat/pos/CounterRate): normal or restaurant rate for the
 * bill (a customer with a wholesale account switches to it on its own), the
 * account's udhaar and limit, and a link to orders ready for hand-over. With
 * shop-wide price tiers on, the bill's own tier bar replaces the switch.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Building2, Package } from 'lucide-react-native';
import { View } from 'react-native';
import { useEffect, useRef } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { Card, PressableScale, Row, Segmented, Text, useTheme } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { useCounter } from '@/modules/pos/engine/counter';
import { weightOrdersApi, wholesaleApi } from '../api';
import { MEAT_KEYS } from '../meta';

export function CounterRate() {
  const th = useTheme();
  const online = useOnlineStatus();
  const customerId = useBill((s) => s.customer?.id ?? null);
  const tier = useBill((s) => s.tier);
  const setTier = useBill((s) => s.setTier);
  const tiersOn = useCounter().parts.priceTiers;
  const account = useQuery({ queryKey: [MEAT_KEYS.wholesale, 'by-customer', customerId], queryFn: () => wholesaleApi.byCustomer(customerId!).catch(() => null), enabled: !!customerId && online, staleTime: 60_000 });
  const ready = useQuery({ queryKey: [MEAT_KEYS.orders, 'ready-count'], queryFn: () => weightOrdersApi.page({ tab: 'ready', limit: 1 }).then((r) => r.counts.ready).catch(() => 0), enabled: online, staleTime: 60_000 });
  const acc = account.data?.isActive ? account.data : null;

  // A restaurant account picks its rate once when chosen; the cashier can still switch back.
  const seen = useRef<string | null>(null);
  useEffect(() => {
    const id = acc?.id ?? null;
    if (!tiersOn) {
      if (id && seen.current !== id) setTier('WHOLESALE');
      if (!customerId && seen.current) setTier('RETAIL');
    }
    seen.current = id;
  }, [acc?.id, customerId, tiersOn, setTier]);

  return (
    <View style={{ gap: th.space(2) }}>
      {!tiersOn && (
        <Segmented size="sm" value={tier === 'WHOLESALE' ? 'wholesale' : 'retail'} onChange={(v) => setTier(v === 'wholesale' ? 'WHOLESALE' : 'RETAIL')}
          options={[{ value: 'retail', label: t('Aam rate') }, { value: 'wholesale', label: t('Restaurant rate') }]} />
      )}
      {!tiersOn && tier === 'WHOLESALE' && <Card tone="warning"><Text size="xs">{t('Bill ki lines par wholesale rate lag gaya (jis item par likha hai). Bill ke baad wapas aam rate.')}</Text></Card>}
      {acc && (
        <Card tone="muted"><Row gap={2}><Building2 size={14} color={th.colors.textMuted} /><Text size="xs" style={{ flex: 1 }}>{t('{{businessName}} · {{accountNumber}} — udhaar {{totalOutstanding}}{{value}}', { businessName: acc.businessName, accountNumber: acc.accountNumber, totalOutstanding: formatMoney(acc.totalOutstanding), value: acc.creditLimit > 0 ? t(' / had {{creditLimit}}', { creditLimit: formatMoney(acc.creditLimit) }) : '' })}</Text></Row></Card>
      )}
      {!!ready.data && (
        <PressableScale onPress={() => router.push('/meat/weight-orders?tab=ready' as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.accent.soft }}>
          <Package size={14} color={th.colors.accent.text} />
          <Text size="xs" weight="semibold" style={{ color: th.colors.accent.text }}>{t('{{data}} order tayyar — bill bana kar dein', { data: ready.data })}</Text>
        </PressableScale>
      )}
    </View>
  );
}
