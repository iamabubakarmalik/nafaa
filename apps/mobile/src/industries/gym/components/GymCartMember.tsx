/** Above the bill on the gym counter: when the customer is a member, their plan, days left and fee due. */

import { useQuery } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react-native';
import { View } from 'react-native';
import { daysRemaining } from '@nafaa/core/industries/gym';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Row, Text, useTheme } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { todayKey } from '../../_shared/deskKit';
import { gymApi } from '../api';
import { GYM_KEYS, MEMBER_STATE, dateOf } from '../meta';

export function GymCartMember() {
  const th = useTheme();
  const customerId = useBill((s) => s.customer?.id);
  const q = useQuery({ queryKey: [GYM_KEYS.members, 'by-customer', customerId], queryFn: () => gymApi.members.list({ customerId: customerId! }), enabled: !!customerId && !String(customerId).startsWith('tmp_'), staleTime: 30_000 });
  const m = q.data?.[0];
  if (!m) return null;
  const st = MEMBER_STATE[m.state ?? 'NONE'];
  const left = m.current ? daysRemaining(m.current.endDate.slice(0, 10), todayKey()) : null;
  return (
    <Row gap={2} style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted, margin: th.space(2) }}>
      <Dumbbell size={18} color={th.colors.brand.solid} />
      <View style={{ flex: 1 }}>
        <Text size="sm" weight="semibold" numberOfLines={1}>{`${m.memberNumber} · ${m.current?.plan?.name ?? t('Plan nahi')}${m.current ? ` · ${dateOf(m.current.endDate)}` : ''}`}</Text>
        {(m.due ?? 0) > 0 && <Text size="xs" tone="warning" ltr>{t('Fee baqi')} {formatMoney(m.due)}</Text>}
      </View>
      <Badge tone={st.tone}>{left != null && left > 0 && (m.state === 'ACTIVE' || m.state === 'EXPIRING') ? t('{{n}} din', { n: left }) : t(st.label)}</Badge>
    </Row>
  );
}
