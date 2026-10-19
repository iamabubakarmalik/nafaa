/**
 * Meat dashboard: the standard dashboard plus weight orders, live animals,
 * halal record and subscription deliveries.
 */

import {
  BarChart3, Beef, Gauge, BookOpen, Building2, CalendarClock, Heart, Package, Plus, Receipt, Scissors, ShieldCheck, ShoppingCart, Weight,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useMeatOps } from './useMeatOps';
import {
  MeatHalal, MeatLivestock, MeatOrders, MeatSubscriptions, meatKpis, useMeatAttention, useMeatMoneyTiles,
} from './widgets';

const productPath = (id: string) => `/meat-products/${id}`;

function useMeatActions(): QuickAction[] {
  const { data } = useOverview();
  const { orders, livestock, cutting, subs, totals } = useMeatOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Sale karein' },
    { to: '/meat/rates', icon: Gauge, label: 'Aaj ka rate', hint: 'Rate aur bacha maal' },
    { to: '/meat/weight-orders/new', icon: Weight, label: 'Naya order', hint: 'Wazan se order' },
    { to: '/meat/weight-orders', icon: Package, label: 'Orders', hint: orders.late.length ? `${orders.late.length} late` : `${orders.open.length} chaalu` },
    { to: '/meat/live-animals', icon: Heart, label: 'Zinda janwar', hint: `${livestock.alive} janwar` },
    { to: '/meat/slaughter', icon: ShieldCheck, label: 'Zabiha log', hint: 'Halal record' },
    { to: '/meat/cutting', icon: Scissors, label: 'Cutting', hint: cutting.open ? `${cutting.open} chal rahi` : 'Naya kaam' },
    { to: '/meat/subscriptions', icon: CalendarClock, label: 'Subscriptions', hint: `${subs.active} chaalu` },
    { to: '/meat/qurbani', icon: Beef, label: 'Qurbani', hint: `${totals.qurbani} booking` },
    { to: '/meat/wholesale', icon: Building2, label: 'Wholesale', hint: `${totals.wholesale} accounts` },
    { to: '/meat-products/new', icon: Plus, label: 'Nayi cheez', hint: 'Maal me daalein' },
    { to: '/meat/products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const meatDashboard = createDashboard({
  label: 'Meat',
  productPath,
  openFrom: 6,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: meatKpis,
  defaultKpis: ['meat-orders', 'meat-animals', 'meat-halal', 'sales', 'profit', 'cash', 'month', 'low-stock'],
  useAttention: useMeatAttention,
  widgets: [
    { id: 'meat-orders', title: 'Wazan wale order', description: 'Chaalu order, dene ke waqt ke hisaab se', size: 'half', sizes: ANY_SIZE, Component: MeatOrders },
    { id: 'meat-livestock', title: 'Zinda janwar', description: 'Baara me janwar, type aur un par cost', size: 'half', sizes: ANY_SIZE, sensitive: true, Component: MeatLivestock },
  ],
  lateWidgets: [
    { id: 'meat-halal', title: 'Halal record', description: '30 din me halal zabiha, certificate aur vet check', size: 'third', sizes: ['third', 'half'], Component: MeatHalal },
    { id: 'meat-subscriptions', title: 'Subscription delivery', description: 'Agle 3 din ki pakki delivery', size: 'third', sizes: ANY_SIZE, Component: MeatSubscriptions },
  ],
  useQuickActions: useMeatActions,
  moneyMap: { useExtraTiles: useMeatMoneyTiles, productsPath: '/meat/products' },
  guide: [
    { icon: Weight, title: 'Wazan wale order', text: 'Har order kab dena hai, kitne kilo hai aur kitna paisa baqi hai — late order laal me upar aata hai.' },
    { icon: ShieldCheck, title: 'Janwar aur halal record', text: 'Baara me kitne janwar hain, un par kitna expense hua, aur har zabiha ka halal record — sab ek jagah.' },
  ],
});
