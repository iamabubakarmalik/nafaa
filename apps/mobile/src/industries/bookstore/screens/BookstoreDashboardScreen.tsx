/**
 * Bookstore dashboard (web bookstore/dashboard): late rentals, active school
 * lists, textbooks by class, catalog counts and quick actions. Last loaded
 * numbers show offline.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertCircle, BookMarked, BookOpen, Building2, ClipboardList, GraduationCap, Palette, Pencil, Plus, Receipt, School, ShoppingCart, Users, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { lateDays } from '@nafaa/core/industries/bookstore';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, HeroText, ListRow, PageHero, PressableScale, Screen, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote } from '../../_shared/deskKit';
import { bookstoreDashboardApi, type BookstoreOverview } from '../api';
import { KEYS } from '../meta';

function useOps() {
  const q = useQuery({ queryKey: [KEYS.dashboard], queryFn: () => bookstoreDashboardApi.overview().catch(() => ({} as BookstoreOverview)), refetchInterval: 60_000 });
  const d = q.data ?? {};
  return useMemo(() => {
    const totals = d.totals ?? { publishers: 0, authors: 0, books: 0, stationery: 0, artSupplies: 0, schools: 0 };
    const ops = d.operations ?? { activeSchoolLists: 0, activeRentals: 0, overdueRentals: 0 };
    const overdue = (d.overdueDetail ?? []).map((r) => {
      const days = lateDays(r.dueDate);
      return { ...r, days, fine: Number(r.fineAmount || 0) || days * Number(r.finePerDay || 0) * Number(r.quantity || 1) };
    });
    const grades = (d.textbooksByGrade ?? []).filter((g) => g.grade).map((g) => ({ grade: g.grade as string, count: Number((g._count ?? {})._all ?? Object.values(g._count ?? {})[0] ?? 0) })).sort((a, b) => b.count - a.count);
    return { q, totals, ops, overdue, weekLate: overdue.filter((r) => r.days >= 7).length, fine: overdue.reduce((s, r) => s + r.fine, 0), grades, catalog: d.catalog ?? { bestSellers: 0, newArrivals: 0, featuredBooks: 0 }, publishers: (d.booksByPublisher ?? []).filter((p) => p.publisher) };
  }, [d, q]);
}

export function BookstoreDashboardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const o = useOps();

  const attention: Array<{ icon: LucideIcon; tone: StatusTone; text: string; href: string }> = [];
  if (o.weekLate) attention.push({ icon: AlertCircle, tone: 'danger', text: t('{{weekLate}} kitaben ek hafte se zyada late hain — customer ko call karein', { weekLate: o.weekLate }), href: '/bookstore/rentals' });
  else if (o.ops.overdueRentals) attention.push({ icon: BookMarked, tone: 'warning', text: t('{{overdue}} kiraye ki kitaben wapas nahi aayin', { overdue: o.ops.overdueRentals }), href: '/bookstore/rentals' });
  if (o.ops.activeSchoolLists) attention.push({ icon: ClipboardList, tone: 'info', text: t('{{lists}} school list chaalu hain — set ke liye stock check kar lein', { lists: o.ops.activeSchoolLists }), href: '/bookstore/school-lists' });
  else if (o.totals.schools) attention.push({ icon: School, tone: 'neutral', text: t('Koi school list chaalu nahi — season se pehle list bana lein, set jaldi bikte hain'), href: '/bookstore/school-lists' });

  const actions: Array<{ href: string; icon: LucideIcon; label: string; hint: string; show: boolean }> = [
    { href: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein'), show: can(P.POS_USE) },
    { href: '/products/new', icon: Plus, label: t('Nayi kitab'), hint: t('Kitab / item'), show: can(P.PRODUCTS_CREATE) },
    { href: '/bookstore/books', icon: BookOpen, label: t('Kitaben'), hint: t('{{count}} titles', { count: o.totals.books }), show: can(P.PRODUCTS_VIEW) },
    { href: '/bookstore/school-lists', icon: ClipboardList, label: t('School lists'), hint: t('{{count}} chalu', { count: o.ops.activeSchoolLists }), show: can(P.PRODUCTS_VIEW) },
    { href: '/bookstore/schools', icon: School, label: t('Schools'), hint: t('{{count}} school', { count: o.totals.schools }), show: can(P.CUSTOMERS_VIEW) },
    { href: '/bookstore/rentals', icon: BookMarked, label: t('Book rentals'), hint: t('{{count}} bahar', { count: o.ops.activeRentals }), show: can(P.POS_USE) },
    { href: '/bookstore/stationery', icon: Pencil, label: t('Stationery'), hint: t('{{count}} items', { count: o.totals.stationery }), show: can(P.PRODUCTS_VIEW) },
    { href: '/bookstore/art-supplies', icon: Palette, label: t('Art supplies'), hint: t('{{count}} items', { count: o.totals.artSupplies }), show: can(P.PRODUCTS_VIEW) },
    { href: '/bookstore/publishers', icon: Building2, label: t('Publishers'), hint: t('{{count}} publisher', { count: o.totals.publishers }), show: can(P.PRODUCTS_VIEW) },
    { href: '/bookstore/authors', icon: Users, label: t('Authors'), hint: t('{{count}} author', { count: o.totals.authors }), show: can(P.PRODUCTS_VIEW) },
    { href: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill'), show: can(P.SALES_VIEW) },
  ].filter((a) => a.show);
  const cols = isTablet ? 5 : 3;

  return (
    <Screen title={t('Bookstore dashboard')} onRefresh={() => void o.q.refetch()} refreshing={false}>
      <View style={{ gap: th.space(3) }}>
        <PageHero title={t('Bookstore')} chip={t('Aaj')} stats={[
          { label: t('Kiraye ki kitaben'), value: <HeroText size="2xl" weight="bold" ltr>{String(o.ops.activeRentals)}</HeroText> },
          { label: t('Late'), value: <HeroText size="2xl" weight="bold" ltr>{String(o.ops.overdueRentals)}</HeroText> },
          { label: t('School lists'), value: <HeroText size="2xl" weight="bold" ltr>{String(o.ops.activeSchoolLists)}</HeroText> },
        ]} />
        <OfflineNote feature="bookstoreDesk" />
        <CachedNote query={o.q} />
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
        {can(P.POS_USE) && o.overdue.length > 0 && (
          <Card flush title={t('Late kitaben')} description={o.fine > 0 ? t('Jurmana ban raha: {{fine}}', { fine: formatMoney(o.fine) }) : undefined}>
            {o.overdue.slice(0, 6).map((r, i) => (
              <ListRow key={r.id} divider={i < Math.min(o.overdue.length, 6) - 1} icon={BookMarked} iconTone="danger" title={r.customerName || t('Customer')} subtitle={`${r.rentalNumber}${r.customerPhone ? ` · ${r.customerPhone}` : ''}`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Badge tone="danger">{t('{{count}} din late', { count: r.days })}</Badge>{r.fine > 0 && <Amount value={r.fine} size="sm" />}</View>} onPress={() => router.push('/bookstore/rentals' as never)} />
            ))}
          </Card>
        )}
        {o.grades.length > 0 && (
          <Card flush title={t('School aur textbooks')} description={t('{{lists}} list chaalu · {{schools}} schools', { lists: o.ops.activeSchoolLists, schools: o.totals.schools })}>
            {o.grades.slice(0, 6).map((g, i) => <ListRow key={g.grade} divider={i < Math.min(o.grades.length, 6) - 1} icon={GraduationCap} iconTone="accent" title={g.grade} trailing={<Text weight="bold" ltr>{g.count}</Text>} />)}
          </Card>
        )}
        {o.publishers.length > 0 && (
          <Card flush title={t('Maal ki details')} description={t('Kitaben, stationery, art aur publishers')}>
            {o.publishers.slice(0, 5).map((p, i) => <ListRow key={p.publisher!.id} divider={i < Math.min(o.publishers.length, 5) - 1} icon={Building2} iconTone="info" title={p.publisher!.name} trailing={<Text weight="bold" ltr>{p.count}</Text>} onPress={() => router.push('/bookstore/publishers' as never)} />)}
          </Card>
        )}
      </View>
    </Screen>
  );
}
