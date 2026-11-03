/**
 * Toy store dashboard (web toystore/dashboard): birthdays coming up, age-group
 * sales, top gift packs and safety checks, with what needs attention and quick
 * actions. The last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Baby, Battery, Cake, Gift, Package, PartyPopper, Plus, Receipt, ShieldAlert, ShoppingCart, Sparkles, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { Amount, Badge, Card, HBarList, ListRow, Text, useTheme } from '@/design';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { toystoreDashboardApi } from '../api';
import { AGE_GROUPS, KEYS, labelOf, whenText } from '../meta';

export function ToystoreDashboardScreen() {
  const th = useTheme();
  const can = usePermission();
  const q = useQuery({ queryKey: [KEYS.overview], queryFn: () => toystoreDashboardApi.overview().catch(() => null), refetchInterval: 60_000, enabled: can(P.DASHBOARD_VIEW) });
  const o = q.data;
  const totals = o?.totals ?? {};
  const alerts = o?.alerts ?? {};
  const upcoming = o?.upcomingBirthdays ?? [];
  const soon = upcoming.filter((b) => b.daysUntil <= 3).length;
  const week = alerts.birthdaysThisWeek ?? 0;
  const ages = useMemo(() => {
    const list = (o?.byAgeGroup ?? []).map((g) => ({ ...g, revenue: Number(g.revenue || 0) })).filter((g) => g.count > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    return list;
  }, [o?.byAgeGroup]);

  const attention: DashAttention[] = [];
  if (alerts.safetyIssues) attention.push({ icon: ShieldAlert, tone: 'warning', text: t('{{safetyIssues}} khilonon me safety ki kami — certificate ya choking warning check karein', { safetyIssues: alerts.safetyIssues }), href: '/toystore/safety-review' });
  if (soon) attention.push({ icon: Cake, tone: 'warning', text: t('{{soon}} bachon ki saalgirah 3 din me hai — parents ko gift idea bhej dein', { soon }), href: '/toystore/birthdays' });
  else if (week) attention.push({ icon: Cake, tone: 'info', text: t('Is hafte {{week}} bachon ki saalgirah hai', { week }), href: '/toystore/birthdays' });
  if (alerts.batteryUpsellOpportunities) attention.push({ icon: Battery, tone: 'neutral', text: t('{{batteryUpsell}} khilone bina battery ke bikte hain — counter par battery saath bechein', { batteryUpsell: alerts.batteryUpsellOpportunities }), href: '/products' });

  const actions: DashAction[] = [
    { href: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/toystore/gift-finder', icon: Sparkles, label: t('Gift finder'), hint: t('Umar aur budget se') },
    { href: '/toystore/birthdays', icon: Cake, label: t('Saalgirah'), hint: week ? t('{{week}} is hafte', { week }) : t('{{registered}} darj', { registered: totals.birthdaysRegistered ?? 0 }) },
    { href: '/toystore/gift-packs', icon: Gift, label: t('Gift packs'), hint: t('{{active}} chaalu', { active: totals.activeGiftPacks ?? 0 }) },
    { href: '/toystore/safety-review', icon: ShieldAlert, label: t('Safety'), hint: alerts.safetyIssues ? t('{{safetyIssues}} check karein', { safetyIssues: alerts.safetyIssues }) : t('Sab theek') },
    { href: '/products/new', icon: Plus, label: t('Naya khilona'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Package, label: t('Khilone'), hint: t('{{value}} items', { value: totals.totalProducts ?? 0 }), show: can(P.PRODUCTS_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ];

  return (
    <PackDashboard title={t('Toy store')} onRefresh={() => void q.refetch()} attention={attention} actions={actions}
      stats={[
        { label: t('Is hafte saalgirah'), value: String(week) },
        { label: t('Safety check'), value: String(alerts.safetyIssues ?? 0) },
        { label: t('Gift packs'), value: String(totals.activeGiftPacks ?? 0) },
      ]}>
      <Card flush title={t('Aane wali saalgirah')} description={t('{{month}} agle 30 din me · {{registered}} bachay darj', { month: alerts.birthdaysThisMonth ?? upcoming.length, registered: totals.birthdaysRegistered ?? 0 })}>
        {upcoming.length === 0 ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Agle 30 din koi saalgirah nahi')}</Text> : upcoming.slice(0, 6).map((b, i) => (
          <ListRow key={b.id} dense divider={i < Math.min(upcoming.length, 6) - 1} icon={b.daysUntil === 0 ? PartyPopper : Cake} iconTone={b.daysUntil <= 3 ? 'danger' : b.daysUntil <= 7 ? 'warning' : 'brand'}
            title={`${b.childName} · ${t('{{count}} saal', { count: b.turningAge })}`} subtitle={[b.customerName, b.customerPhone, b.budgetRange ? t('Budget {{budgetRange}}', { budgetRange: b.budgetRange }) : null].filter(Boolean).join(' · ')}
            trailing={<Badge tone={b.daysUntil <= 3 ? 'danger' : b.daysUntil <= 7 ? 'warning' : 'neutral'}>{whenText(b.daysUntil)}</Badge>} onPress={() => router.push(`/toystore/birthdays/${b.id}` as never)} />
        ))}
      </Card>
      <Card title={t('Umar ke hisaab se')} description={t('{{totalProducts}} khilone · {{educational}} educational', { totalProducts: totals.totalProducts ?? 0, educational: totals.educationalCount ?? 0 })}>
        {ages.length === 0 ? <Text tone="muted">{t('Khilonon par umar (age group) likhein — yahan pata chalega kis umar ka maal zyada bikta hai')}</Text>
          : <HBarList colorful rows={ages.map((g) => ({ key: g.ageGroup, label: `${labelOf(AGE_GROUPS, g.ageGroup)} · ${t('{{count}} items', { count: g.count })}`, value: g.revenue, display: <Amount value={g.revenue} size="sm" weight="semibold" compact /> }))} />}
      </Card>
      <Card flush title={t('Top gift packs')} description={t('{{active}} chaalu · {{sold}} bik chuke', { active: totals.activeGiftPacks ?? 0, sold: totals.giftPacksSold ?? 0 })}>
        {(o?.topGiftPacks ?? []).length === 0 ? <Text tone="muted" style={{ padding: th.space(4) }}>{t('Abhi koi gift pack nahi — bana kar saalgirah par bechein')}</Text> : o!.topGiftPacks!.slice(0, 5).map((g, i, a) => (
          <ListRow key={g.id} dense divider={i < a.length - 1} icon={Gift} title={g.name}
            subtitle={t('{{value}} cheezein · {{value2}} bike{{value3}}', { value: g.itemCount ?? 0, value2: g.totalSold ?? 0, value3: Number(g.savingsPct) > 0 ? t(' · {{value}}% bachat', { value: Number(g.savingsPct).toFixed(0) }) : '' })}
            trailing={<Amount value={g.giftPackPrice ?? 0} weight="semibold" />} onPress={() => router.push(`/toystore/gift-packs/${g.id}/edit` as never)} />
        ))}
      </Card>
    </PackDashboard>
  );
}
