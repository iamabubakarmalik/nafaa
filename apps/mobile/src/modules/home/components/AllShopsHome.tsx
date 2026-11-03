/**
 * The owner's All shops view (web components/AllShopsDashboard): not the
 * single-shop dashboard with bigger numbers, but which branch needs attention
 * and how the branches compare this month. Tapping a branch opens its Home.
 */

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, Crown, Layers, LockOpen, TrendingUp, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { formatMoney, formatNumber } from '@/core/format';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { Badge, Card, ErrorState, HeroText, Icon, PageHero, PressableScale, SavedDataNote, Skeleton, StatTile, Text, toast, useHero, useLayout, useTheme, withAlpha } from '@/design';
import { shopsApi, type ShopAnalyticsRow } from '@/modules/organization/api/organization';
import { MASK, useMasked } from '../lib/privacy';

export function AllShopsHome() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const { salesHidden, costHidden } = useMasked();
  const q = useQuery({ queryKey: ['dashboard', 'shops-analytics'], queryFn: shopsApi.analytics, retry: false });
  const d = q.data;
  const totals = d?.totals;
  const sale = (n: number | undefined) => (salesHidden ? `Rs ${MASK}` : formatMoney(n ?? 0));
  const cost = (n: number | undefined) => (costHidden ? `Rs ${MASK}` : formatMoney(n ?? 0));

  if (q.isError && !d) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <View style={{ gap: th.space(4) }}>
      <SavedDataNote query={q} />
      <PageHero>
        <HeroHead tenantName={tenantName} loading={!d} profit={cost(totals?.todayNetProfit)}
          line={t('{{count}} branches · Sales {{sales}} · Expenses {{expenses}}', { count: totals?.shopCount ?? 0, sales: sale(totals?.todaySales), expenses: cost(totals?.todayExpenses) })} />
      </PageHero>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2.5) }}>
        {[
          { key: 'm', label: t('Is mahine ki sale'), icon: TrendingUp, tone: 'success' as const, value: sale(totals?.monthSales), hint: t('Net {{value}}', { value: cost(totals?.monthNetProfit) }) },
          { key: 'u', label: t('Kul udhaar baqi'), icon: Wallet, tone: 'warning' as const, value: cost(totals?.outstandingCredit), hint: t('Sab branches milakar') },
          { key: 'l', label: t('Low stock items'), icon: Boxes, tone: 'danger' as const, value: String(totals?.lowStockCount ?? 0), hint: t('{{value}} pcs total stock', { value: Math.round(totals?.totalStock ?? 0) }) },
          { key: 'r', label: t('Registers khule'), icon: LockOpen, tone: 'brand' as const, value: `${totals?.registersOpen ?? 0} / ${totals?.shopCount ?? 0}`, hint: t('{{value}} active staff', { value: totals?.staffCount ?? 0 }) },
        ].map((x) => (
          <View key={x.key} style={{ flexBasis: isTablet ? '23%' : '47%', flexGrow: 1, minWidth: 0, flexDirection: 'row' }}>
            <StatTile label={x.label} icon={x.icon} tone={x.tone} loading={!d} value={<Text size="lg" weight="bold" ltr tabular numberOfLines={1} adjustsFontSizeToFit>{x.value}</Text>} hint={x.hint} />
          </View>
        ))}
      </View>

      {(d?.needsAttention.length ?? 0) > 0 && (
        <Card tone="warning" title={t('Inhe dekhna zaroori hai')}>
          <View style={{ gap: th.space(2) }}>
            {d!.needsAttention.map((n) => (
              <View key={n.shopId} style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surface, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon icon={AlertTriangle} size={14} color={th.colors.warning.text} />
                  <Text size="sm" weight="bold">{n.name}</Text>
                </View>
                {n.reasons.map((r) => <Text key={r} size="xs" tone="warning">• {r}</Text>)}
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card title={t('Branch Comparison')} description={t('Is mahine ki sale ke hisab se — sab se upar wali sab se acha chal rahi hai')} flush>
        {!d ? <View style={{ padding: th.space(4), gap: th.space(2) }}><Skeleton height={64} /><Skeleton height={64} /></View>
          : d.shops.length === 0 ? <Text tone="muted" size="sm" style={{ padding: th.space(4) }}>{t('Abhi koi active shop nahi hai.')}</Text>
          : d.shops.map((s, i) => <BranchRow key={s.id} shop={s} last={i === d.shops.length - 1} sale={sale} cost={cost} />)}
      </Card>
      <Text size="xs" tone="muted" align="center">{t('Kisi ek branch ka poora hisab dekhne ke liye us par tap karein.')}</Text>
    </View>
  );
}

function HeroHead({ tenantName, loading, profit, line }: { tenantName?: string; loading: boolean; profit: string; line: string }) {
  const th = useTheme();
  const h = useHero()!;
  return (
    <View style={{ gap: th.space(1.5) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: h.chipBg }}>
        <Icon icon={Layers} size={13} color={h.chipFg} />
        <Text size="2xs" weight="bold" color={h.chipFg}>{t('All Shops')}</Text>
      </View>
      <HeroText size="md" weight="semibold" tone="soft">{t('Aaj ka mila hua profit')}</HeroText>
      {loading ? <Skeleton width={160} height={34} style={{ backgroundColor: h.skeleton }} /> : <HeroText size="3xl" weight="heavy" ltr tabular numberOfLines={1} adjustsFontSizeToFit>{profit}</HeroText>}
      <HeroText size="xs" tone="muted">{tenantName ? `${tenantName} — ${line}` : line}</HeroText>
    </View>
  );
}

function BranchRow({ shop, last, sale, cost }: { shop: ShopAnalyticsRow; last: boolean; sale: (n?: number) => string; cost: (n?: number) => string }) {
  const th = useTheme();
  const setShop = useAuthStore((s) => s.setCurrentShop);
  const up = shop.growthVsYesterday >= 0;
  const first = shop.rank === 1;
  const metric = (label: string, value: string) => (
    <View style={{ flexBasis: '30%', flexGrow: 1, minWidth: 0 }}>
      <Text size="2xs" tone="muted" numberOfLines={1}>{label}</Text>
      <Text size="sm" weight="semibold" ltr tabular numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
  return (
    <PressableScale onPress={() => { setShop(shop.id); toast.success(t('{{name}} khul gayi', { name: shop.name })); }} haptic="tap" accessibilityLabel={shop.name}
      style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), gap: th.space(2.5), borderBottomWidth: last ? 0 : 1, borderBottomColor: th.colors.divider }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <View style={{ width: 40, height: 40, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', backgroundColor: first ? withAlpha(th.colors.warning.solid, 0.2) : th.colors.surfaceMuted }}>
          {first ? <Icon icon={Crown} size={20} color={th.colors.warning.text} /> : <Text weight="bold" tone="muted" ltr>{`#${shop.rank}`}</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{shop.name}</Text>
            {shop.isMain && <Badge tone="success">{t('MAIN')}</Badge>}
            <Badge tone={shop.registerOpen ? 'success' : 'neutral'}>{shop.registerOpen ? t('Register khula') : t('Register band')}</Badge>
          </View>
          <Text size="2xs" tone="muted">{t('{{value}}% share', { value: formatNumber(shop.monthShare, { maxDecimals: 0 }) })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text weight="bold" ltr tabular>{sale(shop.todaySales)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Icon icon={up ? ArrowUpRight : ArrowDownRight} size={12} color={up ? th.colors.success.text : th.colors.danger.text} />
            <Text size="2xs" weight="semibold" ltr color={up ? th.colors.success.text : th.colors.danger.text}>{`${Math.abs(shop.growthVsYesterday).toFixed(0)}%`}</Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: th.space(2), columnGap: th.space(3) }}>
        {metric(t('Aaj net'), cost(shop.todayNetProfit))}
        {metric(t('7 din'), sale(shop.weekSales))}
        {metric(t('Is mahine'), sale(shop.monthSales))}
        {metric(t('Udhaar baqi'), cost(shop.outstandingCredit))}
        {metric(t('Low stock'), String(shop.lowStockCount))}
        {metric(t('Avg bill'), sale(shop.avgOrderValue))}
      </View>
    </PressableScale>
  );
}
