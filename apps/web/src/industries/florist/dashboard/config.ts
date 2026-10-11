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

const productPath = (id: string) => `/florist-products/${id}`;

function useFloristActions(): QuickAction[] {
  const { data } = useOverview();
  const { deliveries, weddings, wilting, subs, activeOrders } = useFloristOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Bikri karein' },
    { to: '/florist/orders', icon: Package, label: 'Orders', hint: `${activeOrders} chaalu` },
    { to: '/florist/deliveries', icon: Truck, label: 'Delivery', hint: deliveries.pending ? `${deliveries.pending} aaj` : 'Aaj ki list' },
    { to: '/florist/weddings', icon: Heart, label: 'Shadiyan', hint: `${weddings.count} aane wali` },
    { to: '/florist/subscriptions', icon: Repeat, label: 'Subscriptions', hint: `${subs.active} chaalu` },
    { to: '/florist/freshness', icon: Leaf, label: 'Taazgi', hint: wilting.withered.length ? `${wilting.withered.length} murjha gaye` : 'Sab theek' },
    { to: '/florist-products/new', icon: Plus, label: 'Nayi cheez', hint: 'Maal me daalein' },
    { to: '/florist-products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Bikri record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const floristDashboard = createDashboard({
  label: 'Florist',
  productPath,
  openFrom: 8,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: floristKpis,
  defaultKpis: ['florist-deliveries', 'florist-weddings', 'florist-wilting', 'sales', 'profit', 'cash', 'month', 'udhaar'],
  useAttention: useFloristAttention,
  widgets: [
    { id: 'florist-deliveries', title: 'Aaj ki delivery', description: 'Aaj pohnchane wale bouquet, waqt ke hisaab se', size: 'third', sizes: ANY_SIZE, Component: FloristDeliveries },
    { id: 'florist-weddings', title: 'Aane wali shadiyan', description: 'Agle 30 din ki shadiyan aur baqi paisa', size: 'third', sizes: ANY_SIZE, Component: FloristWeddings },
    { id: 'florist-wilting', title: 'Murjhane wale phool', description: '3 din me murjhane wala maal', size: 'third', sizes: ANY_SIZE, Component: FloristWilting },
  ],
  lateWidgets: [
    { id: 'florist-subscriptions', title: 'Subscription bouquet', description: 'Is hafte dene wale pakke bouquet', size: 'third', sizes: ANY_SIZE, Component: FloristSubscriptions },
  ],
  useQuickActions: useFloristActions,
  moneyMap: { productsPath: '/florist-products' },
  guide: [
    { icon: Leaf, title: 'Taaza phool', text: 'Phool din ginte hain. Jo 3 din me murjhane wale hain wo upar dikhte hain — un par discount laga kar aaj hi nikal dein.' },
    { icon: Heart, title: 'Delivery aur shadiyan', text: 'Aaj kaunse bouquet kis waqt pohnchane hain, aur agle mahine ki shadiyan kitni hain aur un ka kitna paisa baqi hai — sab ek jagah.' },
  ],
});
