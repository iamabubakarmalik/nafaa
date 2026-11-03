/**
 * Under the customer on the bill: the farmer's village, land and crops, the
 * udhaar by crop season with its recovery date, and the credit limit. A customer
 * who is not a farmer yet gets a link to make them one.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Ban, MapPin, Tractor, UserPlus } from 'lucide-react-native';
import { View } from 'react-native';
import { creditUse } from '@nafaa/core/industries/agri';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Card, PressableScale, ProgressBar, Row, Text, useTheme } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { farmersApi } from '../api';
import { AGRI_KEYS } from '../meta';

export function FarmerStrip() {
  const th = useTheme();
  const can = usePermission();
  const online = useOnlineStatus();
  const customerId = useBill((s) => s.customer?.id ?? null);
  const canView = can(P.AGRI_FARMERS_VIEW);
  const q = useQuery({ queryKey: [AGRI_KEYS.byCustomer, customerId], queryFn: () => farmersApi.byCustomer(customerId!).catch(() => null), enabled: !!customerId && canView && online, staleTime: 30_000 });
  if (!customerId || !canView || q.isLoading) return null;
  const f = q.data;
  if (!f) {
    return can(P.AGRI_FARMERS_MANAGE) && online ? (
      <PressableScale onPress={() => router.push(`/agri/farmers/new?customer=${customerId}` as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
        <UserPlus size={16} color={th.colors.brand.solid} />
        <Text size="xs" weight="semibold" tone="brand" style={{ flex: 1 }}>{t('Farmer banayein — gaon, zameen aur season ka udhaar')}</Text>
      </PressableScale>
    ) : null;
  }
  const owed = f.currentBalance || 0;
  const limit = f.creditLimit || 0;
  const use = creditUse(owed, limit);
  const due = f.dueNow ?? 0;
  const stopped = f.status === 'SUSPENDED' || f.status === 'CLOSED';
  const next = (f.seasons ?? []).find((s) => !s.due);
  return (
    <Card tone="success">
      <Row gap={2}>
        <Tractor size={16} color={th.colors.success.text} />
        <Text size="sm" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{f.fullName}</Text>
        <PressableScale onPress={() => router.push(`/agri/farmers/${f.id}` as never)}><Text size="xs" weight="semibold" tone="brand">{t('Khata')}</Text></PressableScale>
      </Row>
      <Row gap={1}><MapPin size={12} color={th.colors.textMuted} /><Text size="xs" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>{[[f.village, f.district].filter(Boolean).join(', ') || t('Gaon nahi likha'), f.landAreaAcres ? t('{{count}} acre', { count: f.landAreaAcres }) : '', f.primaryCrops?.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</Text></Row>
      <Row justify="between"><Text size="xs" tone="secondary">{t('Udhaar')}</Text><Text size="sm" weight="bold" ltr>{formatMoney(owed)}{(f.advance ?? 0) > 0 ? `  ${t('advance {{advance}}', { advance: formatMoney(f.advance) })}` : ''}</Text></Row>
      {limit > 0 && (
        <View style={{ gap: 2 }}>
          <ProgressBar value={use.used} tone={use.over ? 'danger' : use.used > 0.8 ? 'warning' : 'success'} />
          <Text size="2xs" tone={use.over ? 'danger' : 'muted'}>{t('Had {{limit}}{{value}}', { limit: formatMoney(limit), value: use.over ? t(' — had se upar, udhaar par manager PIN lagega') : '' })}</Text>
        </View>
      )}
      {due > 0 && <Row gap={1}><AlertTriangle size={12} color={th.colors.danger.text} /><Text size="2xs" weight="semibold" tone="danger" style={{ flex: 1 }}>{t('{{due}} pichle season ka — katai guzar gayi, wasooli karein', { due: formatMoney(due) })}</Text></Row>}
      {next && <Text size="2xs" tone="muted">{t('{{label}}: {{owed}} · wapsi {{recoveryBy}} tak', { label: next.label, owed: formatMoney(next.owed), recoveryBy: formatDate(next.recoveryBy) })}</Text>}
      {stopped && <Row gap={1}><Ban size={12} color={th.colors.danger.text} /><Text size="2xs" weight="semibold" tone="danger">{t('Udhaar roka hua — {{value}}', { value: f.suspensionReason || t('cash par dein') })}</Text></Row>}
    </Card>
  );
}
