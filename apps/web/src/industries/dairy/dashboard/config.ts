/**
 * Dairy dashboard: the standard dashboard plus deliveries, milk collected
 * from farmers and the milk khata.
 */

import {
  BarChart3, Beaker, BookOpen, Factory, FileText, Milk, Package, Plus, Receipt, Route as RouteIcon, ShoppingCart, Truck, Users, Warehouse,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useDairyOps } from './useDairyOps';
import { DairyCollection, DairyDebtors, DairyDeliveries, dairyKpis, useDairyAttention, useDairyMoneyTiles } from './widgets';

const productPath = (id: string) => `/dairy-products/${id}`;

function useDairyActions(): QuickAction[] {
  const { data } = useOverview();
  const { today, subscribers, money, totals } = useDairyOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Sale karein' },
    { to: '/dairy/deliveries', icon: Truck, label: 'Delivery', hint: today.scheduled ? `${today.delivered}/${today.scheduled} hui` : 'Aaj ki list' },
    { to: '/dairy/supplies', icon: Warehouse, label: 'Doodh aaya', hint: 'Gawale se entry' },
    { to: '/dairy/customers', icon: Users, label: 'Customers', hint: `${subscribers.active} pakke` },
    { to: '/dairy/farmers', icon: Milk, label: 'Gawale', hint: `${totals.farmers} gawale` },
    { to: '/dairy/routes', icon: RouteIcon, label: 'Routes', hint: `${totals.routes} chaalu` },
    { to: '/dairy/bills', icon: FileText, label: 'Mahine ka bill', hint: cost(money.receivable) },
    { to: '/dairy/production', icon: Factory, label: 'Dahi / makhan', hint: 'Doodh se banaya, kharab maal' },
    { to: '/dairy/quality-tests', icon: Beaker, label: 'Quality', hint: 'Fat / SNF' },
    { to: '/dairy-products/new', icon: Plus, label: 'Nayi cheez', hint: 'Maal me daalein' },
    { to: '/dairy/products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const dairyDashboard = createDashboard({
  label: 'Dairy',
  productPath,
  openFrom: 5,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: dairyKpis,
  defaultKpis: ['dairy-deliveries', 'dairy-milk-in', 'dairy-volume', 'dairy-receivable', 'sales', 'profit', 'cash', 'month'],
  useAttention: useDairyAttention,
  widgets: [
    { id: 'dairy-deliveries', title: 'Aaj ki delivery', description: 'Kitni delivery hui, subah aur shaam ka doodh', size: 'half', sizes: ['third', 'half'], Component: DairyDeliveries },
    { id: 'dairy-collection', title: 'Gawalon se doodh', description: 'Aaj kitna doodh aaya aur sab se zyada dene wale gawale', size: 'half', sizes: ANY_SIZE, Component: DairyCollection },
  ],
  lateWidgets: [
    { id: 'dairy-debtors', title: 'Doodh ka khata baqi', description: 'Jin customers ka sab se zyada paisa baqi hai', size: 'third', sizes: ANY_SIZE, sensitive: true, Component: DairyDebtors },
  ],
  useQuickActions: useDairyActions,
  moneyMap: { useExtraTiles: useDairyMoneyTiles, productsPath: '/dairy/products' },
  guide: [
    { icon: Truck, title: 'Delivery aur doodh', text: 'Aaj kitni delivery hui, kitni baqi hai, aur subah-shaam kitna doodh jata hai — upar hi nazar aata hai. Gawalon se aaya doodh bhi saath hai.' },
    { icon: BookOpen, title: 'Doodh ka khata', text: 'Customers se kitna lena hai aur gawalon ko kitna dena hai — dono alag dikhte hain. Mahine ke aakhir me bill bana kar bhejein.' },
  ],
});
