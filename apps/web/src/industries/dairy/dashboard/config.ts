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
import { t } from '@core/i18n';

const productPath = (id: string) => `/dairy-products/${id}`;

function useDairyActions(): QuickAction[] {
  const { data } = useOverview();
  const { today, subscribers, money, totals } = useDairyOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/dairy/deliveries', icon: Truck, label: t('Delivery'), hint: today.scheduled ? t('{{delivered}}/{{scheduled}} hui', { delivered: today.delivered, scheduled: today.scheduled }) : t('Aaj ki list') },
    { to: '/dairy/supplies', icon: Warehouse, label: t('Doodh aaya'), hint: t('Gawale se entry') },
    { to: '/dairy/customers', icon: Users, label: t('Customers'), hint: t('{{active}} pakke', { active: subscribers.active }) },
    { to: '/dairy/farmers', icon: Milk, label: t('Gawale'), hint: t('{{farmers}} gawale', { farmers: totals.farmers }) },
    { to: '/dairy/routes', icon: RouteIcon, label: t('Routes'), hint: t('{{routes}} chaalu', { routes: totals.routes }) },
    { to: '/dairy/bills', icon: FileText, label: t('Mahine ka bill'), hint: cost(money.receivable) },
    { to: '/dairy/production', icon: Factory, label: t('Dahi / makhan'), hint: t('Doodh se banaya, kharab maal') },
    { to: '/dairy/quality-tests', icon: Beaker, label: t('Quality'), hint: t('Fat / SNF') },
    { to: '/dairy-products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein') },
    { to: '/dairy/products', icon: Package, label: t('Maal'), hint: t('{{value}} cheezein', { value: s?.totalProducts ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const dairyDashboard = createDashboard({
  label: t('Dairy'),
  productPath,
  openFrom: 5,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: dairyKpis,
  defaultKpis: ['dairy-deliveries', 'dairy-milk-in', 'dairy-volume', 'dairy-receivable', 'sales', 'profit', 'cash', 'month'],
  useAttention: useDairyAttention,
  widgets: [
    { id: 'dairy-deliveries', title: t('Aaj ki delivery'), description: t('Kitni delivery hui, subah aur shaam ka doodh'), size: 'half', sizes: ['third', 'half'], Component: DairyDeliveries },
    { id: 'dairy-collection', title: t('Gawalon se doodh'), description: t('Aaj kitna doodh aaya aur sab se zyada dene wale gawale'), size: 'half', sizes: ANY_SIZE, Component: DairyCollection },
  ],
  lateWidgets: [
    { id: 'dairy-debtors', title: t('Doodh ka khata baqi'), description: t('Jin customers ka sab se zyada paisa baqi hai'), size: 'third', sizes: ANY_SIZE, sensitive: true, Component: DairyDebtors },
  ],
  useQuickActions: useDairyActions,
  moneyMap: { useExtraTiles: useDairyMoneyTiles, productsPath: '/dairy/products' },
  guide: [
    { icon: Truck, title: t('Delivery aur doodh'), text: t('Aaj kitni delivery hui, kitni baqi hai, aur subah-shaam kitna doodh jata hai — upar hi nazar aata hai. Gawalon se aaya doodh bhi saath hai.') },
    { icon: BookOpen, title: t('Doodh ka khata'), text: t('Customers se kitna lena hai aur gawalon ko kitna dena hai — dono alag dikhte hain. Mahine ke aakhir me bill bana kar bhejein.') },
  ],
});
