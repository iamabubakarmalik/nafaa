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
import { t } from '@core/i18n';

const productPath = (id: string) => `/meat-products/${id}`;

function useMeatActions(): QuickAction[] {
  const { data } = useOverview();
  const { orders, livestock, cutting, subs, totals } = useMeatOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/meat/rates', icon: Gauge, label: t('Aaj ka rate'), hint: t('Rate aur bacha maal') },
    { to: '/meat/weight-orders/new', icon: Weight, label: t('Naya order'), hint: t('Wazan se order') },
    { to: '/meat/weight-orders', icon: Package, label: t('Orders'), hint: orders.late.length ? t('{{count}} late', { count: orders.late.length }) : t('{{count}} chaalu', { count: orders.open.length }) },
    { to: '/meat/live-animals', icon: Heart, label: t('Zinda janwar'), hint: t('{{alive}} janwar', { alive: livestock.alive }) },
    { to: '/meat/slaughter', icon: ShieldCheck, label: t('Zabiha log'), hint: t('Halal record') },
    { to: '/meat/cutting', icon: Scissors, label: t('Cutting'), hint: cutting.open ? t('{{open}} chal rahi', { open: cutting.open }) : t('Naya kaam') },
    { to: '/meat/subscriptions', icon: CalendarClock, label: t('Subscriptions'), hint: t('{{active}} chaalu', { active: subs.active }) },
    { to: '/meat/qurbani', icon: Beef, label: t('Qurbani'), hint: t('{{qurbani}} booking', { qurbani: totals.qurbani }) },
    { to: '/meat/wholesale', icon: Building2, label: t('Wholesale'), hint: t('{{wholesale}} accounts', { wholesale: totals.wholesale }) },
    { to: '/meat-products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein') },
    { to: '/meat/products', icon: Package, label: t('Maal'), hint: t('{{value}} cheezein', { value: s?.totalProducts ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const meatDashboard = createDashboard({
  label: t('Meat'),
  productPath,
  openFrom: 6,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: meatKpis,
  defaultKpis: ['meat-orders', 'meat-animals', 'meat-halal', 'sales', 'profit', 'cash', 'month', 'low-stock'],
  useAttention: useMeatAttention,
  widgets: [
    { id: 'meat-orders', title: t('Wazan wale order'), description: t('Chaalu order, dene ke waqt ke hisaab se'), size: 'half', sizes: ANY_SIZE, Component: MeatOrders },
    { id: 'meat-livestock', title: t('Zinda janwar'), description: t('Baara me janwar, type aur un par cost'), size: 'half', sizes: ANY_SIZE, sensitive: true, Component: MeatLivestock },
  ],
  lateWidgets: [
    { id: 'meat-halal', title: t('Halal record'), description: t('30 din me halal zabiha, certificate aur vet check'), size: 'third', sizes: ['third', 'half'], Component: MeatHalal },
    { id: 'meat-subscriptions', title: t('Subscription delivery'), description: t('Agle 3 din ki pakki delivery'), size: 'third', sizes: ANY_SIZE, Component: MeatSubscriptions },
  ],
  useQuickActions: useMeatActions,
  moneyMap: { useExtraTiles: useMeatMoneyTiles, productsPath: '/meat/products' },
  guide: [
    { icon: Weight, title: t('Wazan wale order'), text: t('Har order kab dena hai, kitne kilo hai aur kitna paisa baqi hai — late order laal me upar aata hai.') },
    { icon: ShieldCheck, title: t('Janwar aur halal record'), text: t('Baara me kitne janwar hain, un par kitna expense hua, aur har zabiha ka halal record — sab ek jagah.') },
  ],
});
