/**
 * Create (+) sheet, like the web Create menu: big tiles to start a sale or a
 * booking, quick "add" actions, daily tasks and shortcuts, plus search across
 * every action, page and setting.
 */

import type { LucideIcon } from 'lucide-react-native';
import {
  AlertTriangle, ArrowRightLeft, BarChart3, BookOpen, BookmarkPlus, CheckCircle2, Layers, Package, PackagePlus,
  Scissors, ShoppingCart, Smartphone, Truck, Users, Wallet, ArrowRight, ScanLine, ShoppingBag, HandCoins, Wrench,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t, msg } from '@/core/i18n';
import { PERMISSIONS as P, usePermission, type PermissionKey } from '@/core/permissions';
import { EmptyState, Icon, ListRow, PressableScale, SearchBar, Sheet, Text, useLayout, useTheme, type StatusTone } from '@/design';
import { useModuleFlags } from '../appControl';
import { useShellUi } from '../hooks/useShellUi';
import { useIndustry } from '../hooks/useIndustry';
import { searchNav, useVisibleNav } from '../navigation/useVisibleNav';

interface Action {
  key: string;
  href: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  tone: StatusTone;
  permission?: PermissionKey;
  module?: string;
  keywords?: string;
}

const START: Action[] = [
  { key: 'sale', href: '/pos', label: msg('New sale'), sub: msg('Open the POS counter'), icon: ShoppingCart, tone: 'brand', permission: P.POS_USE, module: 'pos', keywords: 'bill checkout' },
  { key: 'booking', href: '/bookings/new', label: msg('New booking'), sub: msg('Advance or reserve'), icon: BookmarkPlus, tone: 'info', permission: P.SERVICE_BOOKINGS_MANAGE, module: 'bookings' },
];
const CREATE: Action[] = [
  { key: 'product', href: '/products/new', label: msg('Add product'), icon: Package, tone: 'brand', permission: P.PRODUCTS_CREATE, module: 'products', keywords: 'item' },
  { key: 'customer', href: '/customers/new', label: msg('Add customer'), icon: Users, tone: 'info', permission: P.CUSTOMERS_EDIT, module: 'customers' },
  { key: 'supplier', href: '/suppliers/new', label: msg('Add supplier'), icon: Truck, tone: 'warning', permission: P.SUPPLIERS_VIEW, module: 'suppliers', keywords: 'vendor' },
  { key: 'expense', href: '/expenses?new=1', label: msg('Record expense'), icon: Wallet, tone: 'warning', permission: P.EXPENSES_VIEW, module: 'expenses', keywords: 'kharcha' },
  { key: 'income', href: '/income?new=1', label: msg('Other income'), icon: HandCoins, tone: 'success', permission: P.INCOME_MANAGE, module: 'expenses', keywords: 'incentive claim commission rent' },
  { key: 'purchase', href: '/purchases/new', label: msg('New purchase'), icon: PackagePlus, tone: 'danger', permission: P.PURCHASES_CREATE, module: 'purchases', keywords: 'buy stock' },
  { key: 'transfer', href: '/transfers/new', label: msg('Stock transfer'), icon: ArrowRightLeft, tone: 'info', permission: P.STOCK_TRANSFERS_MANAGE, module: 'inventory' },
];
const DAILY: Action[] = [
  { key: 'attendance', href: '/staff/attendance', label: msg('Mark attendance'), icon: CheckCircle2, tone: 'info', permission: P.STAFF_VIEW, module: 'staff' },
  { key: 'register', href: '/cash-register', label: msg('Cash register'), icon: Wallet, tone: 'brand', permission: P.CASH_REGISTER_VIEW, module: 'cash-register', keywords: 'till close day galla' },
  { key: 'online-orders', href: '/online', label: msg('Online orders'), icon: ShoppingBag, tone: 'info', permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'website cod shopify daraz woocommerce accept' },
  { key: 'online-pack', href: '/online/pack', label: msg('Packing'), icon: ScanLine, tone: 'accent', permission: P.SALES_VIEW, module: 'onlineOrders', keywords: 'pack scan parcel label' },
];
const JUMP: Action[] = [
  { key: 'low', href: '/low-stock', label: msg('Low stock'), icon: AlertTriangle, tone: 'neutral', permission: P.LOW_STOCK_VIEW, module: 'products' },
  { key: 'khata', href: '/khata', label: msg('Khata (credit)'), icon: BookOpen, tone: 'neutral', permission: P.KHATA_VIEW, module: 'khata', keywords: 'udhaar' },
  { key: 'reports', href: '/reports', label: msg('Reports'), icon: BarChart3, tone: 'neutral', permission: P.REPORTS_VIEW, module: 'reports' },
];

function Tile({ a, onPress }: { a: Action; onPress: () => void }) {
  const th = useTheme();
  const tc = th.colors[a.tone];
  return (
    <PressableScale
      onPress={onPress}
      haptic="tap"
      accessibilityLabel={t(a.label)}
      style={{ flex: 1, gap: th.space(2.5), padding: th.space(3.5), borderRadius: th.radius('xl'), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border }}
    >
      <View style={{ width: 42, height: 42, borderRadius: th.radius('lg'), backgroundColor: tc.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon icon={a.icon} size={21} color={tc.text} />
      </View>
      <View>
        <Text size="base" weight="bold">{t(a.label)}</Text>
        {a.sub && <Text size="xs" tone="muted">{t(a.sub)}</Text>}
      </View>
    </PressableScale>
  );
}

export function CreateSheet() {
  const th = useTheme();
  const sheet = useShellUi((s) => s.sheet);
  const close = useShellUi((s) => s.close);
  const can = usePermission();
  const moduleOn = useModuleFlags();
  const { id: industry } = useIndustry();
  const { groups, settings } = useVisibleNav();
  const { isTablet } = useLayout();
  const [q, setQ] = useState('');

  const allowed = (a: Action) => (!a.permission || can(a.permission)) && (!a.module || moduleOn(a.module));
  const shop = useMemo<Action[]>(() => {
    if (industry === 'carpet') return [
      { key: 'rolls', href: '/carpet/rolls', label: msg('Carpet rolls'), sub: msg('Manage rolls'), icon: Layers, tone: 'brand' },
      { key: 'cuts', href: '/carpet/cut-pieces', label: msg('Cut pieces'), sub: msg('Leftover pieces'), icon: Scissors, tone: 'accent' },
    ];
    if (industry === 'mobile') return [
      { key: 'used', href: '/mobile/used-phones/new', label: msg('Used phone'), sub: msg('Purana phone kharidein'), icon: Smartphone, tone: 'info' },
      { key: 'repair', href: '/mobile/repairs/new', label: msg('Repair job'), sub: msg('Naya job'), icon: Wrench, tone: 'accent' },
    ];
    return [];
  }, [industry]);

  const go = (href: string) => {
    close();
    setQ('');
    setTimeout(() => router.push(href as never), 120);
  };

  const query = q.trim().toLowerCase();
  const actions = [...START, ...shop, ...CREATE, ...DAILY, ...JUMP].filter(allowed);
  const hitActions = query ? actions.filter((a) => `${t(a.label)} ${a.label} ${a.sub ? t(a.sub) : ''} ${a.keywords ?? ''}`.toLowerCase().includes(query)) : [];
  const hitPages = query ? searchNav(query, groups, settings).filter((h) => !hitActions.some((a) => a.href === h.item.href)) : [];

  const section = (title: string, list: Action[]) => list.length > 0 && (
    <View key={title} style={{ gap: th.space(1) }}>
      <Text size="xs" weight="semibold" tone="muted" style={{ paddingHorizontal: th.space(1), marginTop: th.space(2) }}>{title}</Text>
      <View style={{ marginHorizontal: -th.space(4) }}>
        {list.map((a) => <ListRow key={a.key} icon={a.icon} iconTone={a.tone} title={t(a.label)} subtitle={a.sub ? t(a.sub) : undefined} chevron onPress={() => go(a.href)} dense />)}
      </View>
    </View>
  );

  const start = START.filter(allowed);
  return (
    <Sheet open={sheet === 'create'} onClose={() => { close(); setQ(''); }} title={t('Create')} height={isTablet ? undefined : 0.88}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t('Search actions, pages, settings…')} style={{ marginBottom: th.space(3) }} />
      {query ? (
        <View>
          {section(t('Actions'), hitActions)}
          {hitPages.length > 0 && (
            <View style={{ gap: th.space(1) }}>
              <Text size="xs" weight="semibold" tone="muted" style={{ paddingHorizontal: th.space(1), marginTop: th.space(2) }}>{t('Pages')}</Text>
              <View style={{ marginHorizontal: -th.space(4) }}>
                {hitPages.map((h) => <ListRow key={h.item.to} icon={h.item.icon} title={t(h.item.label)} subtitle={h.section} trailing={<Icon icon={ArrowRight} size={16} tone="subtle" flip />} onPress={() => go(h.item.href!)} dense />)}
              </View>
            </View>
          )}
          {!hitActions.length && !hitPages.length && (
            <EmptyState compact title={t('Nothing found for “{{q}}”', { q })} message={t('Try a page name like “khata” or “products”.')} />
          )}
        </View>
      ) : (
        <View>
          {start.length > 0 && (
            <View style={{ flexDirection: 'row', gap: th.space(2.5) }}>
              {start.map((a) => <Tile key={a.key} a={a} onPress={() => go(a.href)} />)}
            </View>
          )}
          {section(industry === 'carpet' ? t('Carpet') : t('Your shop'), shop.filter(allowed))}
          {section(t('Create'), CREATE.filter(allowed))}
          {section(t('Daily'), DAILY.filter(allowed))}
          {section(t('Go to'), JUMP.filter(allowed))}
        </View>
      )}
    </Sheet>
  );
}
