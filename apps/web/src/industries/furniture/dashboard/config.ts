/**
 * Furniture dashboard: the standard dashboard plus custom orders,
 * deliveries and carpenters.
 */

import {
  BarChart3, BookOpen, ClipboardList, Hammer, Plus, Receipt, ShoppingCart, Sofa, Truck, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useFurnitureOps } from './useFurnitureOps';
import {
  FurnitureCarpenters, FurnitureDeliveries, FurnitureLateOrders, FurniturePipeline, furnitureKpis,
  useFurnitureAttention, useFurnitureMoneyTiles,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/furniture-products/${id}`;

function useFurnitureActions(): QuickAction[] {
  const { data } = useOverview();
  const f = useFurnitureOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein') },
    { to: '/furniture/custom-orders/new', icon: ClipboardList, label: t('Custom order'), hint: t('Naya order') },
    { to: '/furniture/custom-orders', icon: ClipboardList, label: t('Orders'), hint: t('{{activeOrders}} chaalu', { activeOrders: f.activeOrders }) },
    { to: '/furniture/deliveries', icon: Truck, label: t('Deliveries'), hint: f.todayDeliveries ? t('{{todayDeliveries}} aaj', { todayDeliveries: f.todayDeliveries }) : t('{{pendingDeliveries}} baqi', { pendingDeliveries: f.pendingDeliveries }) },
    { to: '/furniture/carpenters', icon: Hammer, label: t('Karigar'), hint: t('{{activeCarpenters}} kaam par', { activeCarpenters: f.activeCarpenters }) },
    { to: '/furniture-products/new', icon: Plus, label: t('Naya furniture'), hint: t('Maal me daalein') },
    { to: '/furniture-products', icon: Sofa, label: t('Maal'), hint: t('{{value}} cheezein', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const furnitureDashboard = createDashboard({
  label: t('Furniture'),
  productPath,
  openFrom: 10,
  kpis: furnitureKpis,
  defaultKpis: ['furniture-orders', 'furniture-late', 'furniture-deliveries', 'profit', 'cash', 'month'],
  useAttention: useFurnitureAttention,
  widgets: [
    { id: 'furniture-pipeline', title: t('Custom orders'), description: t('Quotation se tayyar tak, aur baqi amount'), size: 'third', sizes: ['third', 'half', 'wide'], Component: FurniturePipeline },
    { id: 'furniture-late', title: t('Late orders'), description: t('Jin ki delivery ki date guzar gayi'), size: 'third', sizes: ANY_SIZE, Component: FurnitureLateOrders },
    { id: 'furniture-deliveries', title: t('Aaj ki deliveries'), description: t('Aaj kahan aur kis waqt maal jana hai'), size: 'third', sizes: ANY_SIZE, Component: FurnitureDeliveries },
  ],
  lateWidgets: [
    { id: 'furniture-carpenters', title: t('Karigar'), description: t('Sab se zyada kaam karne wale karigar'), size: 'third', sizes: ANY_SIZE, Component: FurnitureCarpenters },
  ],
  useQuickActions: useFurnitureActions,
  moneyMap: { useExtraTiles: useFurnitureMoneyTiles, productsPath: '/furniture-products' },
  guide: [
    { icon: ClipboardList, title: t('Custom orders'), text: t('Har order quotation → advance → ban raha → tayyar se guzarta hai. Late orders upar laal me aate hain taa ke customer ko pehle hi bata sakein.') },
    { icon: Truck, title: t('Delivery aur karigar'), text: t('Aaj ki deliveries waqt ke saath, aur kaunsa karigar kitna kaam kar raha hai — sab ek jagah.') },
  ],
});
