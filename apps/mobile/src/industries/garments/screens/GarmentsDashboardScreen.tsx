/**
 * Garments dashboard (web garments/dashboard): stitching and alterations due
 * this week, what needs attention now (late, urgent, ready, instalments, holds
 * ending), size reorder for sizes that sold and ran out, the catalogue mix by
 * season and gender, and quick actions. The last loaded numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookmarkPlus, CheckCircle2, CreditCard, Palette, Plus, Receipt, Ruler, Scissors, Shirt, ShoppingCart, Table2, Users, ArrowLeftRight, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { daysFrom } from '@nafaa/core/industries/garments';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Card, HBarList, HeroText, ListRow, PageHero, PressableScale, Screen, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { garmentProductsApi } from '../api';
import { DASH_KEY, genderLabel, seasonLabel, whenText } from '../meta';

export function GarmentsDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const q = useQuery({ queryKey: [DASH_KEY, 'overview'], queryFn: () => garmentProductsApi.overview().catch(() => null), refetchInterval: 60_000 });
  const reorder = useQuery({ queryKey: [DASH_KEY, 'reorder'], queryFn: () => garmentProductsApi.reorder(8).catch(() => null), refetchInterval: 5 * 60_000, enabled: can(P.PRODUCTS_VIEW) });
  const g = q.data;
  const today = g?.today;
  const pending = g?.pending ?? { tailoring: 0, alterations: 0, reservations: 0, layaway: 0 };
  const totals = g?.totals;
  const tailoring = (g?.upcomingDeliveries ?? []).map((o) => ({ ...o, days: daysFrom(o.promisedDate) }));
  const alterations = (g?.upcomingAlterations ?? []).map((a) => ({ ...a, days: daysFrom(a.promisedDate) }));
  const urgent = tailoring.filter((o) => o.priority === 'URGENT');

  const attention: Array<{ icon: LucideIcon; tone: StatusTone; text: string; href: string }> = [];
  if (today?.tailoringLate) attention.push({ icon: Scissors, tone: 'danger', text: t('{{tailoringLate}} silai order late hain — customer ko batayein', { tailoringLate: today.tailoringLate }), href: '/garments/tailoring' });
  if (urgent.length) attention.push({ icon: Scissors, tone: 'danger', text: t('{{count}} bohat jaldi wale silai order — karigar ko pehle ye dein', { count: urgent.length }), href: '/garments/tailoring' });
  if (today?.tailoringDue) attention.push({ icon: Scissors, tone: 'warning', text: t('{{tailoringDue}} silai order aaj dena hai', { tailoringDue: today.tailoringDue }), href: '/garments/tailoring' });
  if (today && today.tailoringReady + today.alterationsReady) attention.push({ icon: CheckCircle2, tone: 'info', text: t('{{value}} kapre tayyar rakhe hain — customers ko WhatsApp karein', { value: today.tailoringReady + today.alterationsReady }), href: '/garments/tailoring' });
  if (today?.alterationsDue || today?.alterationsLate) attention.push({ icon: Ruler, tone: 'warning', text: t('{{alterationsDue}} alteration aaj deni hai', { alterationsDue: (today?.alterationsDue ?? 0) + (today?.alterationsLate ?? 0) }), href: '/garments/alterations' });
  if (today?.layawayOverdue) attention.push({ icon: CreditCard, tone: 'warning', text: t('{{layawayOverdue}} qist plan ki qist late hai — phone karein', { layawayOverdue: today.layawayOverdue }), href: '/garments/layaway' });
  if (today?.holdsEndingToday) attention.push({ icon: BookmarkPlus, tone: 'neutral', text: t('{{holdsEndingToday}} hold aaj khatam ho rahe hain — customer ko yaad dilayein', { holdsEndingToday: today.holdsEndingToday }), href: '/garments/reservations' });

  const actions: Array<{ href: string; icon: LucideIcon; label: string; hint: string; show: boolean }> = [
    { href: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/garments/tailoring/new', icon: Scissors, label: t('Silai order'), hint: t('Naya order'), show: can(P.POS_USE) },
    { href: '/garments/tailoring', icon: Scissors, label: t('Silai'), hint: t('{{tailoring}} chal rahi', { tailoring: pending.tailoring }), show: can(P.POS_USE) },
    { href: '/garments/alterations', icon: Ruler, label: t('Alterations'), hint: t('{{alterations}} baqi', { alterations: pending.alterations }), show: can(P.POS_USE) },
    { href: '/garments/measurements', icon: Ruler, label: t('Measurement'), hint: t('{{totalMeasurements}} customers', { totalMeasurements: totals?.totalMeasurements ?? 0 }), show: can(P.POS_USE) },
    { href: '/garments/reservations', icon: BookmarkPlus, label: t('Hold'), hint: t('{{reservations}} chaalu', { reservations: pending.reservations }), show: can(P.POS_USE) },
    { href: '/garments/layaway', icon: CreditCard, label: t('Qist plan'), hint: t('{{layaway}} chaalu', { layaway: pending.layaway }), show: can(P.POS_USE) },
    { href: '/garments/exchange', icon: ArrowLeftRight, label: t('Exchange'), hint: t('Badalna'), show: can(P.POS_USE) && can(P.RETURNS_CREATE) },
    { href: '/garments/collections', icon: Palette, label: t('Collections'), hint: t('{{activeCollections}} chaalu', { activeCollections: totals?.activeCollections ?? 0 }), show: can(P.PRODUCTS_VIEW) },
    { href: '/garments/size-charts', icon: Table2, label: t('Size charts'), hint: t('Size ka hisaab'), show: can(P.PRODUCTS_VIEW) },
    { href: '/products/new', icon: Plus, label: t('Naya kapra'), hint: t('Maal me daalein'), show: can(P.PRODUCTS_CREATE) },
    { href: '/products', icon: Shirt, label: t('Maal'), hint: t('Products'), show: can(P.PRODUCTS_VIEW) },
    { href: '/customers', icon: Users, label: t('Customers'), hint: t('Khata'), show: can(P.CUSTOMERS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ].filter((a) => a.show);
  const cols = isTablet ? 5 : 3;
  const toneOf = (d: number | null): StatusTone => (d === null ? 'neutral' : d <= 0 ? 'danger' : d <= 2 ? 'warning' : 'neutral');
  const mix = (rows: Array<{ label: string; count: number }>) => rows.sort((a, b) => b.count - a.count).map((r) => ({ key: r.label, label: r.label, value: r.count }));

  return (
    <Screen title={t('Garments')} onRefresh={() => { void q.refetch(); void reorder.refetch(); }} refreshing={false}>
      <View style={{ gap: th.space(3) }}>
        <PageHero title={t('Garments')} chip={t('Aaj')} stats={[
          { label: t('Silai chal rahi'), value: <HeroText size="2xl" weight="bold" ltr>{String(pending.tailoring)}</HeroText> },
          { label: t('Alteration'), value: <HeroText size="2xl" weight="bold" ltr>{String(pending.alterations)}</HeroText> },
          { label: t('Hold aur qist'), value: <HeroText size="2xl" weight="bold" ltr>{String(pending.reservations + pending.layaway)}</HeroText> },
        ]} />

        {attention.length > 0 && (
          <Card flush title={t('Abhi dhyan dein')}>
            {attention.map((a, i) => <ListRow key={i} divider={i < attention.length - 1} icon={a.icon} iconTone={a.tone} title={a.text} chevron onPress={() => router.push(a.href as never)} />)}
          </Card>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {actions.map((a) => (
            <PressableScale key={a.href + a.label} onPress={() => router.push(a.href as never)} style={{ width: `${100 / cols - 2}%` as `${number}%`, minHeight: 84, padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border, gap: 4 }}>
              <a.icon size={22} color={th.colors.brand.solid} />
              <Text size="sm" weight="semibold" numberOfLines={1}>{a.label}</Text>
              <Text size="2xs" tone="muted" numberOfLines={1}>{a.hint}</Text>
            </PressableScale>
          ))}
        </View>

        {can(P.POS_USE) && (
          <Card flush title={t('Silai — agle 7 din')} description={t('{{count}} order dene hain', { count: tailoring.length })}>
            {tailoring.length === 0 ? <ListRow title={t('Is hafte koi silai order nahi')} icon={CheckCircle2} iconTone="success" /> : tailoring.slice(0, 6).map((o, i, a) => (
              <ListRow key={o.id} dense divider={i < a.length - 1} icon={Scissors} iconTone={toneOf(o.days)} title={o.customerName || t('Walk-in')}
                subtitle={`${o.orderNumber}${o.total ? ` · ${formatMoney(Number(o.total))}` : ''}`} trailing={<Badge tone={toneOf(o.days)}>{whenText(o.promisedDate)}</Badge>}
                chevron onPress={() => router.push(`/garments/tailoring/${o.id}` as never)} />
            ))}
          </Card>
        )}
        {can(P.POS_USE) && (
          <Card flush title={t('Alterations — agle 7 din')} description={t('{{count}} ticket', { count: alterations.length })}>
            {alterations.length === 0 ? <ListRow title={t('Is hafte koi alteration nahi')} icon={CheckCircle2} iconTone="success" /> : alterations.slice(0, 6).map((o, i, a) => (
              <ListRow key={o.id} dense divider={i < a.length - 1} icon={Ruler} iconTone={toneOf(o.days)} title={o.customerName || t('Walk-in')} subtitle={`${o.ticketNumber} · ${o.garmentDescription ?? ''}`}
                trailing={<Badge tone={toneOf(o.days)}>{whenText(o.promisedDate)}</Badge>} chevron onPress={() => router.push('/garments/alterations' as never)} />
            ))}
          </Card>
        )}
        {!!reorder.data?.items.length && (
          <Card flush title={t('Size reorder')} description={t('Bikne wale size aur rang jo khatam ho rahe')}>
            {reorder.data.items.slice(0, 5).map((r, i, a) => (
              <ListRow key={r.productId} dense divider={i < a.length - 1} icon={Shirt} iconTone="warning" title={r.name}
                subtitle={r.sizes.slice(0, 4).map((s) => `${s.name} (${s.stock})`).join(', ')} trailing={<Badge tone="warning">{t('{{n}} mangwayein', { n: r.sizes.reduce((x, s) => x + s.suggest, 0) })}</Badge>}
                chevron onPress={() => router.push(`/products/${r.productId}` as never)} />
            ))}
          </Card>
        )}
        {!!g?.bySeason?.length && <Card title={t('Season ke hisaab se')}><HBarList rows={mix(g.bySeason.map((s) => ({ label: seasonLabel(s.season), count: s._count._all })))} /></Card>}
        {!!g?.byGender?.length && <Card title={t('Kis ke liye')}><HBarList rows={mix(g.byGender.map((s) => ({ label: genderLabel(s.gender), count: s._count._all })))} /></Card>}
      </View>
    </Screen>
  );
}
