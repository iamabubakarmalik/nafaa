/**
 * Jewelry dashboard (web jewelry/dashboard): today's metal rates, raw metal in
 * the safe at today's rate, custom orders by promised day, weight sold and
 * karigar balances, what needs attention now, and quick actions. Each block
 * needs its own permission; the last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, BarChart3, Coins, Gem, Hammer, Palette, Plus, Receipt, Repeat, Scale, ShoppingCart, Users, Wrench, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { TOLA, r3, type Purity } from '@nafaa/core/industries/jewelry';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Card, HeroText, ListRow, PageHero, PressableScale, Row, Screen, StatTile, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { daysFromToday } from '@/industries/_shared/deskKit';
import { useCostMask } from '@/modules/sales/lib/mask';
import { jewelryDashboardApi, metalStockApi } from '../api';
import { KEYS, categoryLabel, grams, purityLabel, useMetalRates } from '../meta';

const MINUTE = 60_000;
const short = (g: number) => `${Number.isInteger(g) ? g : g.toFixed(g >= 100 ? 0 : 2)}g`;
const left = (d: number | null) => (d === null ? t('Date nahi') : d < 0 ? t('{{d}} din late', { d: -d }) : d === 0 ? t('Aaj') : d === 1 ? t('Kal') : t('{{d}} din baad', { d }));

function useJewelryOps() {
  const can = usePermission();
  const seeOrders = can(P.POS_USE);
  const seeMetal = can(P.STOCK_MOVEMENTS_VIEW);
  const seeKarigars = can(P.SUPPLIERS_VIEW);
  const overview = useQuery({ queryKey: [KEYS.dashboard], queryFn: () => jewelryDashboardApi.overview(), refetchInterval: MINUTE });
  const balances = useQuery({ queryKey: ['metal-stock-balance'], queryFn: () => metalStockApi.balance(), staleTime: 5 * MINUTE, enabled: seeMetal });
  const { list: rateList, rates } = useMetalRates();
  const o = overview.data ?? {};
  const rateInfo = useMemo(() => {
    const active = rateList.filter((r) => r.isActive !== false);
    const gold = active.find((r) => r.purity === 'KARAT_24') ?? active.find((r) => r.purity === 'KARAT_22') ?? active.find((r) => r.metalType === 'GOLD');
    const newest = active.reduce((a, r) => Math.max(a, new Date(r.updatedAt || r.effectiveDate).getTime() || 0), 0);
    const ageDays = newest ? Math.floor((Date.now() - newest) / 86_400_000) : null;
    return { list: active, gold, ageDays, stale: ageDays !== null && ageDays > 0 };
  }, [rateList]);
  const metal = useMemo(() => {
    const list = (balances.data ?? []).filter((b) => Number(b.balanceGrams) > 0).map((b) => {
      const r = rates.get(`${b.metalType}_${b.purity}`);
      return { ...b, value: Number(b.balanceGrams) * (r?.ratePerGram ?? 0) };
    }).sort((a, b) => b.value - a.value);
    const sum = (m: string) => list.filter((b) => b.metalType === m).reduce((s, b) => s + Number(b.balanceGrams), 0);
    return { list, value: list.reduce((s, b) => s + b.value, 0), gold: sum('GOLD'), silver: sum('SILVER') };
  }, [balances.data, rates]);
  const orders = useMemo(() => {
    const list = (o.upcomingOrders ?? []).map((x) => ({ ...x, left: daysFromToday(x.promisedDate), due: Math.max(Number(x.estimatedPrice || 0) - Number(x.paidAmount ?? x.advancePayment ?? 0), 0) }));
    return { list, pending: o.pendingCustomOrders ?? 0, late: list.filter((x) => x.left !== null && x.left < 0), soon: list.filter((x) => x.left !== null && x.left >= 0 && x.left <= 2) };
  }, [o.upcomingOrders, o.pendingCustomOrders]);
  const karigars = useMemo(() => {
    const list = o.topKarigars ?? [];
    return { list, gramsOut: list.reduce((s, k) => s + Number(k.outstandingGrams || 0), 0), active: o.totals?.activeKarigars ?? list.length };
  }, [o.topKarigars, o.totals]);
  const today = o.today ?? { sales: 0, revenue: 0, weightSold: 0, customOrders: 0, exchanges: 0 };
  const monthly = o.monthly ?? { sales: 0, revenue: 0, collected: 0, outstanding: 0, goldSold: 0, silverSold: 0, exchangesCount: 0, exchangesValue: 0, exchangesGold: 0 };
  return {
    today, monthly, rateInfo, metal, orders, karigars, seeOrders, seeMetal, seeKarigars, totals: o.totals,
    refetch: () => { void overview.refetch(); void balances.refetch(); },
  };
}

export function JewelryDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const { cost } = useCostMask();
  const ops = useJewelryOps();
  const { rateInfo, orders, metal, karigars, today, monthly } = ops;

  const attention: Array<{ icon: LucideIcon; tone: 'danger' | 'warning' | 'info' | 'neutral'; text: string; href: string }> = [];
  if (rateInfo.list.length === 0) attention.push({ icon: Coins, tone: 'danger', text: t('Aaj ka rate set nahi — bill aur zewar ki qeemat rate ke bagair nahi banti'), href: '/jewelry/metal-rates' });
  else if (rateInfo.stale) attention.push({ icon: Coins, tone: 'warning', text: t('Rate {{d}} din purana hai — subah update karein', { d: rateInfo.ageDays ?? 0 }), href: '/jewelry/metal-rates' });
  if (ops.seeOrders && orders.late.length) attention.push({ icon: AlertTriangle, tone: 'danger', text: t('{{count}} order late hai — customer ko batana zaroori hai', { count: orders.late.length }), href: '/jewelry/custom-orders' });
  if (ops.seeOrders && orders.soon.length) attention.push({ icon: Palette, tone: 'info', text: t('{{count}} order agle 2 din me dena hai', { count: orders.soon.length }), href: '/jewelry/custom-orders' });
  if (ops.seeKarigars && karigars.gramsOut > 0) attention.push({ icon: Hammer, tone: 'neutral', text: t('Karigaron ke paas {{g}} sona abhi wapas nahi aaya', { g: short(karigars.gramsOut) }), href: '/jewelry/karigars' });

  const actions: Array<{ href: string; icon: LucideIcon; label: string; hint: string; show: boolean }> = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/jewelry/metal-rates', icon: Coins, label: t('Aaj ka rate'), hint: rateInfo.stale ? t('{{d}} din purana', { d: rateInfo.ageDays ?? 0 }) : rateInfo.list.length ? t('Update hai') : t('Lagayein'), show: true },
    { href: '/products/new', icon: Plus, label: t('Naya zewar'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/jewelry/custom-orders', icon: Palette, label: t('Custom order'), hint: orders.late.length ? t('{{count}} late', { count: orders.late.length }) : t('{{pending}} chaalu', { pending: orders.pending }), show: can(P.POS_USE) },
    { href: '/jewelry/exchanges', icon: Repeat, label: t('Purana sona'), hint: t('Exchange / buyback'), show: can(P.PURCHASES_VIEW) },
    { href: '/jewelry/repairs', icon: Wrench, label: t('Repair'), hint: t('Zewar ki marammat'), show: can(P.POS_USE) },
    { href: '/jewelry/karigars', icon: Hammer, label: t('Karigar'), hint: karigars.gramsOut > 0 ? t('{{g}} baqi', { g: short(karigars.gramsOut) }) : t('{{n}} log', { n: karigars.active }), show: ops.seeKarigars },
    { href: '/jewelry/metal-stock', icon: Scale, label: t('Metal stock'), hint: t('{{g}} sona', { g: short(metal.gold) }), show: ops.seeMetal },
    { href: '/products', icon: Gem, label: t('Zewar'), hint: t('{{n}} items', { n: ops.totals?.totalProducts ?? 0 }), show: can(P.PRODUCTS_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
    { href: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab'), show: can(P.REPORTS_VIEW) },
  ].filter((a) => a.show);
  const cols = isTablet ? 5 : 3;
  const tone = (x: 'danger' | 'warning' | 'info' | 'neutral'): StatusTone => x;

  return (
    <Screen title={t('Jewelry')} onRefresh={ops.refetch} refreshing={false}>
      <View style={{ gap: th.space(3) }}>
        <PageHero title={t('Jewelry')} chip={t('Aaj')} stats={[
          { label: t('24K fi tola'), value: <HeroText size="xl" weight="bold" ltr>{rateInfo.gold ? formatMoney(rateInfo.gold.ratePerGram * TOLA, { compact: true }) : '—'}</HeroText> },
          { label: t('Aaj wazan bika'), value: <HeroText size="xl" weight="bold" ltr>{short(r3(today.weightSold))}</HeroText> },
          { label: t('Custom order'), value: <HeroText size="xl" weight="bold" ltr>{String(orders.pending)}</HeroText> },
        ]} />

        {attention.length > 0 && (
          <Card flush title={t('Abhi dhyan dein')}>
            {attention.map((a, i) => <ListRow key={i} divider={i < attention.length - 1} icon={a.icon} iconTone={tone(a.tone)} title={a.text} chevron onPress={() => router.push(a.href as never)} />)}
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

        <Card flush title={t('Aaj ke rate')} description={t('Sona, chandi aur platinum ka fi gram rate')} action={<Text size="sm" tone="brand" onPress={() => router.push('/jewelry/metal-rates' as never)}>{t('Rate badlein')}</Text>}>
          {rateInfo.list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Abhi koi rate nahi')}</Text> : rateInfo.list.map((r, i) => (
            <ListRow key={r.id} dense divider={i < rateInfo.list.length - 1} icon={Coins} iconTone={r.metalType === 'GOLD' ? 'warning' : 'neutral'} title={`${t(r.metalType === 'GOLD' ? 'Sona' : r.metalType === 'SILVER' ? 'Chandi' : 'Platinum')} ${purityLabel(r.purity)}`}
              subtitle={`${t('Tola')} ${formatMoney(r.ratePerGram * TOLA)}`} trailing={<Amount value={r.ratePerGram} weight="bold" />} />
          ))}
        </Card>

        {ops.seeOrders && (
          <Card flush title={t('Custom order')} description={t('Banwaye ja rahe zewar, waade ki date se')} action={<Text size="sm" tone="warning">{t('Lena baqi')} <Amount value={orders.list.reduce((s, o) => s + o.due, 0)} size="sm" tone="warning" /></Text>}>
            {orders.list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Koi order nahi')}</Text> : orders.list.slice(0, 5).map((o, i) => (
              <ListRow key={o.id} dense divider={i < Math.min(orders.list.length, 5) - 1} icon={Palette} iconTone={o.left !== null && o.left < 0 ? 'danger' : 'brand'} title={o.customerName || t('Customer')}
                subtitle={`${o.orderNumber} · ${categoryLabel(o.category)} · ${left(o.left)}`} trailing={<Amount value={o.estimatedPrice ?? 0} weight="semibold" />} onPress={() => router.push('/jewelry/custom-orders' as never)} />
            ))}
          </Card>
        )}

        <Card title={t('Wazan ka hisaab')} description={t('Pichle 30 din, gram me')} onPress={() => router.push('/sales' as never)}>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Sona bika')} value={short(r3(monthly.goldSold))} tone="warning" />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Chandi bika')} value={short(r3(monthly.silverSold))} tone="neutral" />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Purana sona aaya')} value={short(r3(monthly.exchangesGold))} tone="info" />
          </Row>
        </Card>

        {ops.seeMetal && (
          <Card flush title={t('Kachcha metal')} description={t('Tijori ka sona-chandi, aaj ke rate par')} action={metal.value > 0 ? <Text size="sm" weight="semibold">{cost(metal.value)}</Text> : undefined}>
            {metal.list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Tijori me abhi kuch nahi')}</Text> : metal.list.slice(0, 5).map((b, i) => (
              <ListRow key={`${b.metalType}_${b.purity}`} dense divider={i < Math.min(metal.list.length, 5) - 1} icon={Coins} iconTone={b.metalType === 'SILVER' ? 'neutral' : 'warning'} title={`${t(b.metalType === 'GOLD' ? 'Sona' : 'Chandi')} ${purityLabel(b.purity)}`}
                trailing={<Text weight="semibold" ltr>{grams(b.balanceGrams)}</Text>} onPress={() => router.push('/jewelry/metal-stock' as never)} />
            ))}
          </Card>
        )}

        {ops.seeKarigars && (
          <Card flush title={t('Karigar')} description={t('Kis karigar ke paas kitna metal baqi hai')}>
            {karigars.list.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Abhi koi karigar nahi')}</Text> : karigars.list.slice(0, 5).map((k, i) => (
              <ListRow key={k.id} dense divider={i < Math.min(karigars.list.length, 5) - 1} icon={Hammer} iconTone={k.outstandingGrams > 0 ? 'warning' : 'neutral'} title={k.fullName}
                subtitle={t('{{n}} order mukammal', { n: k.completedOrders })} trailing={<Text weight="semibold" ltr>{grams(k.outstandingGrams)}</Text>} onPress={() => router.push('/jewelry/karigars' as never)} />
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}
