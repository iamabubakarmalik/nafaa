/**
 * Pharmacy dashboard (web pharmacy/dashboard): expiry (with its cost value),
 * the prescription flow, cold chain and register numbers, what needs
 * attention now, and quick actions. Needs the server; the last loaded numbers
 * show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, Beaker, CalendarX, ClipboardCheck, Clock, FilePlus, FileText, Pill, Plus, Receipt, ShieldAlert, ShoppingCart, Snowflake, Stethoscope, Thermometer, Users, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { expirySummary } from '@nafaa/core/industries/pharmacy';
import { formatQty } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, ListRow, Row, StatTile, Text, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { pharmacyDashboardApi } from '../api';
import { DASH_KEY, EXPIRY_KEY, daysText, expiryTone } from '../meta';

const MINUTE = 60_000;

export function usePharmacyOps() {
  const can = usePermission();
  const overview = useQuery({ queryKey: [DASH_KEY], queryFn: () => pharmacyDashboardApi.overview(), refetchInterval: MINUTE });
  const seeStock = can(P.PRODUCTS_VIEW);
  const expiring = useQuery({ queryKey: [EXPIRY_KEY, 'dash', 90], queryFn: () => pharmacyDashboardApi.expiring(90), refetchInterval: 5 * MINUTE, enabled: seeStock });
  const expiry = useMemo(() => {
    const s = expirySummary(expiring.data ?? []);
    return { ...s, list: s.rows.slice(0, 8) };
  }, [expiring.data]);
  const o = overview.data;
  return {
    expiry,
    rx: o?.prescriptions ?? { pending: 0, verified: 0, dispensedToday: 0 },
    refillsDue: o?.alerts?.refillsDueToday ?? 0,
    tempBreaches: o?.alerts?.recentTempBreaches ?? 0,
    medicines: o?.totals?.medicines ?? 0,
    controlled: o?.totals?.controlledCount ?? 0,
    coldChain: o?.totals?.coldChainCount ?? 0,
    loading: overview.isLoading,
    refetch: () => { void overview.refetch(); void expiring.refetch(); },
  };
}

export function PharmacyDashboardScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost, costHidden } = useCostMask();
  const ops = usePharmacyOps();
  const { expiry, rx } = ops;
  const seeStock = can(P.PRODUCTS_VIEW);
  const seeRx = can(P.POS_USE);

  const attention: DashAttention[] = [];
  if (seeStock && expiry.expired.length) attention.push({ icon: CalendarX, tone: 'danger', text: t('{{count}} batch expire ho chuke ({{expiredValue}}) — shelf se hata dein, bechna mana hai', { count: expiry.expired.length, expiredValue: costHidden ? '••••' : cost(expiry.expiredValue) }), href: '/pharmacy/expiring' });
  if (seeStock && ops.tempBreaches) attention.push({ icon: Thermometer, tone: 'danger', text: t('Pichle 7 din me {{tempBreaches}} baar fridge ka temperature hadd se bahar gaya', { tempBreaches: ops.tempBreaches }), href: '/pharmacy/temperature-log' });
  if (seeStock && expiry.week.length) attention.push({ icon: Clock, tone: 'warning', text: t('{{count}} batch agle 7 din me expire hoga — pehle bechein ya supplier ko wapas karein', { count: expiry.week.length }), href: '/pharmacy/expiring' });
  if (seeRx && rx.pending) attention.push({ icon: FileText, tone: 'warning', text: t('{{pending}} nuskhe pharmacist ke check ka intezar kar rahe hain', { pending: rx.pending }), href: '/pharmacy/prescriptions' });
  if (seeRx && rx.verified) attention.push({ icon: ClipboardCheck, tone: 'info', text: t('{{verified}} nuskhe check ho gaye — dawai deni hai', { verified: rx.verified }), href: '/pharmacy/prescriptions' });
  if (seeRx && ops.refillsDue) attention.push({ icon: Bell, tone: 'info', text: t('{{refillsDue}} customers ki dawai khatam hone wali hai — refill ki yaad dila dein', { refillsDue: ops.refillsDue }), href: '/pharmacy/prescriptions' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Dawai bechein'), show: can(P.POS_USE) },
    { href: '/pharmacy/prescriptions/new', icon: FilePlus, label: t('Naya nuskha'), hint: t('Prescription likhein'), show: seeRx },
    { href: '/pharmacy/prescriptions', icon: FileText, label: t('Nuskhe'), hint: rx.pending ? t('{{pending}} check baqi', { pending: rx.pending }) : t('Sab check'), show: seeRx },
    { href: '/pharmacy/expiring', icon: CalendarX, label: t('Expiry'), hint: expiry.expired.length ? t('{{count}} expired', { count: expiry.expired.length }) : t('{{count}} 30 din me', { count: expiry.month.length }), show: seeStock },
    { href: '/products', icon: Pill, label: t('Dawaiyan'), hint: t('{{medicines}} medicines', { medicines: ops.medicines }), show: seeStock },
    { href: '/products/new', icon: Plus, label: t('Nayi dawai'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/pharmacy/salts', icon: Beaker, label: t('Salts'), hint: t('Formula se search'), show: seeStock },
    { href: '/pharmacy/doctors', icon: Stethoscope, label: t('Doctors'), hint: t('Directory') },
    { href: '/pharmacy/controlled-log', icon: ShieldAlert, label: t('Controlled register'), hint: t('Narcotic log'), show: seeStock },
    { href: '/pharmacy/temperature-log', icon: Thermometer, label: t('Temp log'), hint: ops.tempBreaches ? t('{{tempBreaches}} masle', { tempBreaches: ops.tempBreaches }) : t('Fridge theek') },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ];

  return (
    <PackDashboard title={t('Pharmacy')} onRefresh={ops.refetch}
      stats={[
        ...(seeStock ? [{ label: t('Expiry qareeb'), value: String(expiry.month.length + expiry.expired.length) }] : []),
        ...(seeRx ? [{ label: t('Nuskhe baqi'), value: String(rx.pending) }, { label: t('Aaj diye'), value: String(rx.dispensedToday) }] : []),
      ]}
      attention={attention} actions={actions}>
      {seeStock && (
        <Card flush title={t('Expiry ki fehrist')} onPress={() => router.push('/pharmacy/expiring' as never)}
          description={expiry.atRiskValue > 0 && !costHidden ? t('{{atRiskValue}} ka maal 30 din me', { atRiskValue: cost(expiry.atRiskValue) }) : t('{{watch}} batch 90 din me', { watch: expiry.watch })}>
          {expiry.list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Koi dawai expire hone ke qareeb nahi')}</Text> : expiry.list.map((b, i) => (
            <ListRow key={b.id} divider={i < expiry.list.length - 1} icon={Pill} iconTone={expiryTone(b.daysLeft)} title={b.product?.name ?? t('Dawai')}
              subtitle={`${b.batchNumber} · ${t('{{quantity}} baqi', { quantity: formatQty(b.quantity) })}`}
              trailing={<Badge tone={expiryTone(b.daysLeft)}>{b.daysLeft <= 0 ? t('Expired') : t('{{daysLeft}} din', { daysLeft: b.daysLeft })}</Badge>}
              onPress={() => router.push(`/products/${b.productId}` as never)} />
          ))}
        </Card>
      )}
      {seeRx && (
        <Card title={t('Nuskhe')} description={t('Check → dawai dena → mukammal')} onPress={() => router.push('/pharmacy/prescriptions' as never)}>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Check baqi')} value={String(rx.pending)} tone={rx.pending ? 'warning' : 'neutral'} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Dene ko tayyar')} value={String(rx.verified)} tone="info" />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Aaj diye')} value={String(rx.dispensedToday)} tone="success" />
          </Row>
        </Card>
      )}
      <Card title={t('Hifazat aur register')} description={t('Fridge, controlled dawai aur refill')}>
        <View style={{ gap: th.space(2) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Thermometer} label={t('Temp masla')} value={String(ops.tempBreaches)} tone={ops.tempBreaches ? 'danger' : 'success'} hint={t('Pichle 7 din')} onPress={() => router.push('/pharmacy/temperature-log' as never)} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Snowflake} label={t('Thandi dawai')} value={String(ops.coldChain)} tone="info" hint={t('Fridge wali')} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={ShieldAlert} label={t('Controlled')} value={String(ops.controlled)} tone="danger" hint={t('Register zaroori')} onPress={() => router.push('/pharmacy/controlled-log' as never)} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Bell} label={t('Refill')} value={String(ops.refillsDue)} tone="warning" hint={t('Aaj aur kal')} />
          </Row>
        </View>
      </Card>
      {expiry.atRiskValue > 0 && !costHidden && (
        <Card tone="danger" onPress={() => router.push('/pharmacy/expiring' as never)}>
          <Text size="sm" weight="semibold">{t('{{atRiskValue}} ki dawai 30 din me expire ho jayegi', { atRiskValue: cost(expiry.atRiskValue) })}</Text>
          <Text size="xs" tone="muted">{expiry.expiredValue > 0 ? t('Is me {{expiredValue}} ki pehle hi expire ho chuki — supplier ko wapas karein ya likh dein', { expiredValue: cost(expiry.expiredValue) }) : t('Pehle bechein ya supplier ko wapas karein')}</Text>
        </Card>
      )}
    </PackDashboard>
  );
}
