/**
 * Optical dashboard (web optical/dashboard): today's eye tests, orders at the
 * lab and late, glasses ready for pickup, prescriptions about to run out,
 * what needs attention now, and quick actions. Each block needs its own
 * permission; the last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Building2, CalendarClock, CheckCircle2, Clock, Eye, FilePlus, FileText, FlaskConical, Glasses, Package, PhoneCall, Plus, Receipt, ShoppingCart, UserCog, Users, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, HeroText, ListRow, PageHero, PressableScale, Screen, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { opticalDashboardApi } from '../api';
import { OPTICAL_KEYS, testStatusOf } from '../meta';

const MINUTE = 60_000;
const DAY = 86_400_000;
const EMPTY = { todayAppointments: 0, pendingTests: 0, lensOrdersAtLab: 0, lensOrdersReady: 0, overdueLensOrders: 0, expiringPrescriptions: 0 };

function useOpticalOps() {
  const can = usePermission();
  const q = useQuery({ queryKey: [OPTICAL_KEYS.overview], queryFn: () => opticalDashboardApi.overview().catch(() => null), refetchInterval: MINUTE, enabled: can(P.DASHBOARD_VIEW) });
  const o = q.data;
  const lists = useMemo(() => {
    const now = Date.now();
    const ready = o?.readyForPickup ?? [];
    return {
      schedule: (o?.todaySchedule ?? []).filter((x) => x.status !== 'CANCELLED').slice(0, 8),
      testsLeft: (o?.todaySchedule ?? []).filter((x) => ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(x.status)).length,
      ready: ready.slice(0, 6),
      readyDue: ready.reduce((s, r) => s + Number(r.remainingAmount || 0), 0),
      overdue: (o?.overdueList ?? []).map((r) => ({ ...r, daysLate: r.expectedDate ? Math.max(Math.ceil((now - new Date(r.expectedDate).getTime()) / DAY), 1) : 0 })).slice(0, 6),
      expiring: (o?.expiringList ?? []).map((r) => ({ ...r, daysLeft: Math.ceil((new Date(r.expiryDate).getTime() - now) / DAY) })).slice(0, 6),
    };
  }, [o]);
  return { ...lists, pending: o?.pending ?? EMPTY, receivable: o?.monthly?.totalReceivable ?? 0, activeRx: o?.totals?.activePrescriptions ?? 0, loading: q.isLoading, refetch: () => void q.refetch() };
}

export function OpticalDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const { cost } = useCostMask();
  const ops = useOpticalOps();
  const { pending, schedule, ready, overdue, expiring, readyDue, testsLeft } = ops;

  const attention: Array<{ icon: LucideIcon; tone: StatusTone; text: string; href: string }> = [];
  if (pending.overdueLensOrders) attention.push({ icon: Clock, tone: 'danger', text: t('{{overdueLensOrders}} lens order lab se late hai — lab ko call karein', { overdueLensOrders: pending.overdueLensOrders }), href: '/optical/lens-orders?view=late' });
  if (pending.lensOrdersReady) attention.push({ icon: PhoneCall, tone: 'warning', text: t('{{lensOrdersReady}} chashme tayyar pare hain — customer ko bulayein{{value}}', { lensOrdersReady: pending.lensOrdersReady, value: readyDue > 0 ? t(' ({{readyDue}} lena hai)', { readyDue: cost(readyDue) }) : '' }), href: '/optical/lens-orders?view=ready' });
  if (testsLeft) attention.push({ icon: Eye, tone: 'info', text: t('Aaj {{testsLeft}} eye test abhi baqi hain', { testsLeft }), href: '/optical/eye-tests' });
  if (pending.expiringPrescriptions) attention.push({ icon: FileText, tone: 'info', text: t('{{expiringPrescriptions}} customers ka nuskha 60 din me purana ho jayega — naye test ke liye bulayein', { expiringPrescriptions: pending.expiringPrescriptions }), href: '/optical/prescriptions?view=expiring' });

  const actions: Array<{ href: string; icon: LucideIcon; label: string; hint: string; show: boolean }> = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/optical/eye-tests', icon: Eye, label: t('Eye tests'), hint: testsLeft ? t('{{testsLeft}} aaj baqi', { testsLeft }) : t('Appointment'), show: true },
    { href: '/optical/prescriptions/new', icon: FilePlus, label: t('Naya nuskha'), hint: t('Number likhein'), show: true },
    { href: '/optical/lens-orders/new', icon: FlaskConical, label: t('Lens order'), hint: t('Lab ko bhejein'), show: can(P.POS_USE) },
    { href: '/optical/lens-orders', icon: Glasses, label: t('Orders'), hint: pending.lensOrdersReady ? t('{{lensOrdersReady}} tayyar', { lensOrdersReady: pending.lensOrdersReady }) : t('{{lensOrdersAtLab}} lab me', { lensOrdersAtLab: pending.lensOrdersAtLab }), show: true },
    { href: '/optical/prescriptions', icon: FileText, label: t('Nuskhe'), hint: t('{{count}} chalu', { count: ops.activeRx }), show: true },
    { href: '/optical/optometrists', icon: UserCog, label: t('Doctors'), hint: t('Optometrists'), show: true },
    { href: '/products/new', icon: Plus, label: t('Naya product'), hint: t('Frame / lens'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Maal'), hint: t('Products'), show: can(P.PRODUCTS_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
    { href: '/suppliers', icon: Building2, label: t('Suppliers'), hint: t('Maal mangwayein'), show: can(P.PRODUCTS_VIEW) },
  ].filter((a) => a.show);
  const cols = isTablet ? 5 : 3;

  return (
    <Screen title={t('Optical')} onRefresh={ops.refetch} refreshing={false}>
      <View style={{ gap: th.space(3) }}>
        <PageHero title={t('Optical')} chip={t('Aaj')} stats={[
          { label: t('Aaj ke eye test'), value: <HeroText size="2xl" weight="bold" ltr>{String(pending.todayAppointments)}</HeroText> },
          { label: t('Lab me order'), value: <HeroText size="2xl" weight="bold" ltr>{String(pending.lensOrdersAtLab)}</HeroText> },
          { label: t('Chashma tayyar'), value: <HeroText size="2xl" weight="bold" ltr>{String(pending.lensOrdersReady)}</HeroText> },
        ]} />

        {attention.length > 0 && (
          <Card flush title={t('Abhi dhyan dein')}>
            {attention.map((a, i) => <ListRow key={i} divider={i < attention.length - 1} icon={a.icon} iconTone={a.tone} title={a.text} chevron onPress={() => router.push(a.href as never)} />)}
          </Card>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {actions.map((a) => (
            <PressableScale key={a.href} onPress={() => router.push(a.href as never)} style={{ width: `${100 / cols - 2}%` as `${number}%`, minHeight: 84, padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, gap: 4 }}>
              <a.icon size={22} color={th.colors.brand.solid} />
              <Text size="sm" weight="semibold" numberOfLines={1}>{a.label}</Text>
              <Text size="2xs" tone="muted" numberOfLines={1}>{a.hint}</Text>
            </PressableScale>
          ))}
        </View>

        <View style={{ gap: th.space(3), flexDirection: isTablet ? 'row' : 'column', alignItems: 'flex-start' }}>
          <Card flush style={{ flex: isTablet ? 1 : undefined, alignSelf: 'stretch' }} title={t('Aaj ke eye test')} description={pending.todayAppointments ? t('{{todayAppointments}} appointment · {{testsLeft}} baqi', { todayAppointments: pending.todayAppointments, testsLeft }) : t('Aaj koi appointment nahi')}
            action={<Text size="sm" weight="semibold" tone="brand" onPress={() => router.push('/optical/eye-tests' as never)}>{t('Sab dekhein')}</Text>}>
            {schedule.length === 0 ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Aaj koi eye test booked nahi')}</Text> : schedule.map((x, i) => (
              <ListRow key={x.id} dense divider={i < schedule.length - 1} title={x.customerName} subtitle={[x.customerPhone, x.optometristName].filter(Boolean).join(' · ')}
                leading={<Text size="xs" weight="bold" tone="brand" ltr style={{ minWidth: 44 }}>{x.scheduledSlot || '—'}</Text>}
                trailing={<Badge tone={testStatusOf(x.status).tone}>{t(testStatusOf(x.status).label)}</Badge>} onPress={() => router.push(`/optical/eye-tests/${x.id}` as never)} />
            ))}
          </Card>

          <Card flush style={{ flex: isTablet ? 1 : undefined, alignSelf: 'stretch' }} title={t('Chashma tayyar')} description={readyDue > 0 ? t('{{readyDue}} lena baqi', { readyDue: cost(readyDue) }) : t('{{lensOrdersReady}} customer ko bulana hai', { lensOrdersReady: pending.lensOrdersReady })}>
            {ready.length === 0 ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Koi chashma pickup ke liye nahi para')}</Text> : ready.map((o, i) => (
              <ListRow key={o.id} dense divider={i < ready.length - 1} icon={CheckCircle2} iconTone="success" title={o.customerName} subtitle={[o.frameName, o.customerPhone].filter(Boolean).join(' · ')}
                trailing={o.remainingAmount && o.remainingAmount > 0 ? <Amount value={o.remainingAmount} size="sm" tone="danger" /> : <Badge tone="success">{t('Paid')}</Badge>} onPress={() => router.push(`/optical/lens-orders/${o.id}` as never)} />
            ))}
          </Card>
        </View>

        <Card flush title={t('Lab se late')} description={t('{{lensOrdersAtLab}} lab me · {{overdueLensOrders}} late', { lensOrdersAtLab: pending.lensOrdersAtLab, overdueLensOrders: pending.overdueLensOrders })}>
          {overdue.length === 0 ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Lab ke saare order waqt par hain')}</Text> : overdue.map((o, i) => (
            <ListRow key={o.id} dense divider={i < overdue.length - 1} icon={Clock} iconTone="danger" title={o.customerName} subtitle={`${o.orderNumber} · ${o.labName || t('Lab nahi likhi')}`}
              trailing={<Badge tone="danger">{t('{{daysLate}} din late', { daysLate: o.daysLate })}</Badge>} onPress={() => router.push(`/optical/lens-orders/${o.id}` as never)} />
          ))}
        </Card>

        <Card flush title={t('Nuskha purana ho raha')} description={t('{{expiringPrescriptions}} nuskhe 60 din me', { expiringPrescriptions: pending.expiringPrescriptions })}>
          {expiring.length === 0 ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Koi nuskha jald purana nahi ho raha')}</Text> : expiring.map((rx, i) => (
            <ListRow key={rx.id} dense divider={i < expiring.length - 1} icon={CalendarClock} iconTone={rx.daysLeft <= 7 ? 'danger' : 'warning'} title={rx.customerName} subtitle={`${rx.prescriptionNumber}${rx.customerPhone ? ` · ${rx.customerPhone}` : ''}`}
              trailing={<Badge tone={rx.daysLeft <= 7 ? 'danger' : rx.daysLeft <= 30 ? 'warning' : 'neutral'}>{t('{{daysLeft}} din', { daysLeft: rx.daysLeft })}</Badge>} onPress={() => router.push(`/optical/prescriptions/${rx.id}` as never)} />
          ))}
        </Card>
      </View>
    </Screen>
  );
}
