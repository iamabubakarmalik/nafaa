/**
 * Florist dashboard: the standard dashboard plus today's deliveries,
 * weddings, wilting stock and subscription bouquets.
 */

import { BarChart3, BookOpen, Heart, Leaf, Package, Plus, Receipt, Repeat, ShoppingCart, Truck, Users } from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useFloristOps } from './useFloristOps';
import {
  FloristDeliveries, FloristSubscriptions, FloristWeddings, FloristWilting, floristKpis, useFloristAttention,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/florist-products/${id}`;

function useFloristActions(): QuickAction[] {
  const { data } = useOverview();
  const { deliveries, weddings, wilting, subs, activeOrders } = useFloristOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/florist/orders', icon: Package, label: t('Orders'), hint: t('{{activeOrders}} chaalu', { activeOrders }) },
    { to: '/florist/deliveries', icon: Truck, label: t('Delivery'), hint: deliveries.pending ? t('{{pending}} aaj', { pending: deliveries.pending }) : t('Aaj ki list') },
    { to: '/florist/weddings', icon: Heart, label: t('Shadiyan'), hint: t('{{count}} aane wali', { count: weddings.count }) },
    { to: '/florist/subscriptions', icon: Repeat, label: t('Subscriptions'), hint: t('{{active}} chaalu', { active: subs.active }) },
    { to: '/florist/freshness', icon: Leaf, label: t('Freshness'), hint: wilting.withered.length ? t('{{count}} murjha gaye', { count: wilting.withered.length }) : t('Sab theek') },
    { to: '/florist-products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein') },
    { to: '/florist-products', icon: Package, label: t('Maal'), hint: t('{{value}} cheezein', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const floristDashboard = createDashboard({
  label: t('Florist'),
  productPath,
  openFrom: 8,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: floristKpis,
  defaultKpis: ['florist-deliveries', 'florist-weddings', 'florist-wilting', 'sales', 'profit', 'cash', 'month', 'udhaar'],
  useAttention: useFloristAttention,
  widgets: [
    { id: 'florist-deliveries', title: t('Aaj ki delivery'), description: t('Aaj pohnchane wale bouquet, waqt ke hisaab se'), size: 'third', sizes: ANY_SIZE, Component: FloristDeliveries },
    { id: 'florist-weddings', title: t('Aane wali shadiyan'), description: t('Agle 30 din ki shadiyan aur baqi paisa'), size: 'third', sizes: ANY_SIZE, Component: FloristWeddings },
    { id: 'florist-wilting', title: t('Murjhane wale phool'), description: t('3 din me murjhane wala maal'), size: 'third', sizes: ANY_SIZE, Component: FloristWilting },
  ],
  lateWidgets: [
    { id: 'florist-subscriptions', title: t('Subscription bouquet'), description: t('Is hafte dene wale pakke bouquet'), size: 'third', sizes: ANY_SIZE, Component: FloristSubscriptions },
  ],
  useQuickActions: useFloristActions,
  moneyMap: { productsPath: '/florist-products' },
  guide: [
    { icon: Leaf, title: t('Taaza phool'), text: t('Phool din ginte hain. Jo 3 din me murjhane wale hain wo upar dikhte hain — un par discount laga kar aaj hi nikal dein.') },
    { icon: Heart, title: t('Delivery aur shadiyan'), text: t('Aaj kaunse bouquet kis waqt pohnchane hain, aur agle mahine ki shadiyan kitni hain aur un ka kitna paisa baqi hai — sab ek jagah.') },
  ],
});
