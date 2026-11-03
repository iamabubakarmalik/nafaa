/**
 * Pet shop dashboard (web petshop/dashboard): today's grooming, pets ready for
 * pickup, animals with vaccine or deworming due, medicines near expiry,
 * what needs attention and quick actions. Last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Activity, CalendarCheck, CheckCircle2, Clock, PawPrint, Pill, Plus, Receipt, Scissors, ShoppingCart, Users, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { groomingDue } from '@nafaa/core/industries/petshop';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, HeroText, ListRow, PageHero, PressableScale, Row, Screen, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote } from '../../_shared/deskKit';
import { petshopDashboardApi, type PetOverview } from '../api';
import { GROOM_STATUS, PET_KEYS, speciesEmoji } from '../meta';

const n = (v: unknown) => Number(v || 0);
const DAY = 86_400_000;

function useOps() {
  const q = useQuery({ queryKey: [PET_KEYS.overview], queryFn: () => petshopDashboardApi.overview().catch(() => ({} as PetOverview)), refetchInterval: 60_000 });
  const o = q.data ?? {};
  return useMemo(() => {
    const schedule = o.todaySchedule ?? [];
    const pickup = (o.pickupList ?? []).map((a) => ({ ...a, balance: groomingDue(a) }));
    const list = (o.expiringList ?? []).map((p) => ({ ...p, days: p.expiryDate ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / DAY) : null }));
    return {
      q, schedule, pickup, list,
      today: n(o.pending?.todayAppointments) || schedule.length,
      waiting: schedule.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length,
      inProgress: schedule.filter((a) => a.status === 'IN_PROGRESS').length,
      pickupCount: n(o.pending?.readyForPickup) || pickup.length,
      pickupDue: pickup.reduce((s, a) => s + a.balance, 0),
      available: n(o.totals?.animalsAvailable), reserved: n(o.totals?.animalsReserved), animalValue: n(o.totals?.animalInventoryValue),
      health: o.healthAlerts ?? [], expired: n(o.pending?.expiredMedicines), expiring: n(o.pending?.expiringMedicines),
      within30: list.filter((p) => p.days !== null && p.days <= 30).length,
      revenueToday: n(o.today?.groomingRevenue), monthSold: n(o.monthly?.liveAnimals?.count), monthProfit: n(o.monthly?.liveAnimals?.profit),
    };
  }, [o, q]);
}

export function PetshopDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const { cost } = useCostMask();
  const ops = useOps();

  const attention: Array<{ icon: LucideIcon; tone: StatusTone; text: string; href: string }> = [];
  if (ops.expired) attention.push({ icon: Pill, tone: 'danger', text: t('{{expired}} dawai expire ho chuki — shelf se foran hatayein', { expired: ops.expired }), href: '/products' });
  if (ops.pickupCount) attention.push({ icon: CheckCircle2, tone: 'warning', text: t('{{pickupCount}} pet tayyar hain — maalik ko call karein', { pickupCount: ops.pickupCount }), href: '/petshop/grooming' });
  if (ops.health.length) attention.push({ icon: Activity, tone: 'warning', text: t('{{count}} janwar ki vaccine ya deworming baqi hai', { count: ops.health.length }), href: '/petshop/live-animals' });
  if (ops.within30) attention.push({ icon: Clock, tone: 'info', text: t('{{within30}} dawai 30 din me expire hogi — discount ya wapas karein', { within30: ops.within30 }), href: '/products' });
  if (ops.waiting) attention.push({ icon: Scissors, tone: 'info', text: t('Aaj {{waiting}} grooming appointment baqi hain', { waiting: ops.waiting }), href: '/petshop/grooming' });

  const actions: Array<{ href: string; icon: LucideIcon; label: string; hint: string; show: boolean }> = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/petshop/grooming/new', icon: Scissors, label: t('Nayi booking'), hint: t('Grooming'), show: can(P.POS_USE) },
    { href: '/petshop/grooming', icon: CalendarCheck, label: t('Grooming'), hint: ops.today ? t('{{count}} aaj', { count: ops.today }) : t('Aaj koi nahi'), show: can(P.POS_USE) },
    { href: '/petshop/live-animals', icon: PawPrint, label: t('Janwar'), hint: t('{{count}} bikne ko', { count: ops.available + ops.reserved }), show: can(P.PRODUCTS_VIEW) },
    { href: '/petshop/live-animals/new', icon: Plus, label: t('Naya janwar'), hint: t('Darj karein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/petshop/groomers', icon: Users, label: t('Groomers'), hint: t('Kaun kab'), show: can(P.POS_USE) },
    { href: '/products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ].filter((a) => a.show);
  const cols = isTablet ? 5 : 3;

  return (
    <Screen title={t('Pet shop')} onRefresh={() => void ops.q.refetch()} refreshing={false}>
      <View style={{ gap: th.space(3) }}>
        <PageHero title={t('Pet shop')} chip={t('Aaj')} stats={[
          { label: t('Aaj grooming'), value: <HeroText size="2xl" weight="bold" ltr>{String(ops.today)}</HeroText> },
          { label: t('Pet lene aana hai'), value: <HeroText size="2xl" weight="bold" ltr>{String(ops.pickupCount)}</HeroText> },
          { label: t('Bikne wale janwar'), value: <HeroText size="2xl" weight="bold" ltr>{String(ops.available)}</HeroText> },
        ]} />
        <OfflineNote feature="petshopAnimals" />
        <CachedNote query={ops.q} />

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

        {can(P.POS_USE) && (
          <Card flush title={t('Aaj ki grooming')} description={ops.today ? t('{{today}} appointment · {{revenueToday}}', { today: ops.today, revenueToday: formatMoney(ops.revenueToday) }) : undefined}>
            {ops.schedule.length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Aaj koi grooming book nahi')}</Text></View> : ops.schedule.slice(0, 6).map((a, i) => (
              <ListRow key={a.id} divider={i < Math.min(ops.schedule.length, 6) - 1} leading={<Text style={{ fontSize: 22 }}>{speciesEmoji(a.petSpecies)}</Text>}
                title={a.petName} subtitle={`${a.customerName} · ${a.scheduledSlot || ''}`.trim()}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Amount value={a.totalFee} size="sm" weight="semibold" /><Badge tone={GROOM_STATUS[a.status].tone}>{t(GROOM_STATUS[a.status].label)}</Badge></View>}
                onPress={() => router.push('/petshop/grooming' as never)} />
            ))}
          </Card>
        )}

        {can(P.POS_USE) && ops.pickup.length > 0 && (
          <Card flush title={t('Pet lene aana hai')} description={ops.pickupDue > 0 ? t('{{pickupCount}} tayyar · {{pickupDue}} baqi', { pickupCount: ops.pickupCount, pickupDue: formatMoney(ops.pickupDue) }) : undefined}>
            {ops.pickup.slice(0, 6).map((a, i) => (
              <ListRow key={a.id} divider={i < Math.min(ops.pickup.length, 6) - 1} icon={CheckCircle2} iconTone="success" title={a.petName}
                subtitle={`${a.customerName}${a.customerPhone ? ` · ${a.customerPhone}` : ''}`}
                trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={a.totalFee} size="sm" weight="semibold" />{a.balance > 0 && <Text size="2xs" tone="danger">{t('baqi {{balance}}', { balance: formatMoney(a.balance) })}</Text>}</View>}
                onPress={() => router.push('/petshop/grooming' as never)} />
            ))}
          </Card>
        )}

        {ops.health.length > 0 && can(P.PRODUCTS_VIEW) && (
          <Card flush title={t('Vaccine baqi')}>
            {ops.health.slice(0, 5).map((a, i) => (
              <ListRow key={a.id} divider={i < Math.min(ops.health.length, 5) - 1} leading={<Text style={{ fontSize: 22 }}>{speciesEmoji(a.species)}</Text>}
                title={a.name || a.breed || a.animalNumber} subtitle={t('vaccine ya deworm')} chevron onPress={() => router.push(`/petshop/live-animals/${a.id}` as never)} />
            ))}
          </Card>
        )}

        {ops.list.length > 0 && (
          <Card flush title={t('Dawai expiry')}>
            {ops.list.slice(0, 5).map((p, i) => (
              <ListRow key={p.id} divider={i < Math.min(ops.list.length, 5) - 1} icon={Pill} iconTone={p.days !== null && p.days < 0 ? 'danger' : 'warning'} title={p.product?.name ?? p.brand ?? '—'}
                subtitle={p.batchNumber ? `#${p.batchNumber}` : undefined}
                trailing={<Text size="xs" tone={p.days !== null && p.days < 0 ? 'danger' : 'warning'}>{p.days === null ? '' : p.days < 0 ? t('{{value}} din pehle', { value: -p.days }) : t('{{value}} din me', { value: p.days })}</Text>} />
            ))}
          </Card>
        )}
        {can(P.COST_VIEW) && ops.monthSold > 0 && <Text size="xs" tone="muted">{t('is mahine {{monthSold}} bike', { monthSold: ops.monthSold })} · {t('Janwaron ka profit')} {cost(ops.monthProfit)}</Text>}
      </View>
    </Screen>
  );
}
