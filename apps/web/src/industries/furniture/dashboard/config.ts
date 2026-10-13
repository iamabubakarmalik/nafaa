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

const productPath = (id: string) => `/furniture-products/${id}`;

function useFurnitureActions(): QuickAction[] {
  const { data } = useOverview();
  const f = useFurnitureOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Sale karein' },
    { to: '/furniture/custom-orders/new', icon: ClipboardList, label: 'Custom order', hint: 'Naya order' },
    { to: '/furniture/custom-orders', icon: ClipboardList, label: 'Orders', hint: `${f.activeOrders} chaalu` },
    { to: '/furniture/deliveries', icon: Truck, label: 'Deliveries', hint: f.todayDeliveries ? `${f.todayDeliveries} aaj` : `${f.pendingDeliveries} baqi` },
    { to: '/furniture/carpenters', icon: Hammer, label: 'Karigar', hint: `${f.activeCarpenters} kaam par` },
    { to: '/furniture-products/new', icon: Plus, label: 'Naya furniture', hint: 'Maal me daalein' },
    { to: '/furniture-products', icon: Sofa, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const furnitureDashboard = createDashboard({
  label: 'Furniture',
  productPath,
  openFrom: 10,
  kpis: furnitureKpis,
  defaultKpis: ['furniture-orders', 'furniture-late', 'furniture-deliveries', 'profit', 'cash', 'month'],
  useAttention: useFurnitureAttention,
  widgets: [
    { id: 'furniture-pipeline', title: 'Custom orders', description: 'Quotation se tayyar tak, aur baqi amount', size: 'third', sizes: ['third', 'half', 'wide'], Component: FurniturePipeline },
    { id: 'furniture-late', title: 'Late orders', description: 'Jin ki delivery ki date guzar gayi', size: 'third', sizes: ANY_SIZE, Component: FurnitureLateOrders },
    { id: 'furniture-deliveries', title: 'Aaj ki deliveries', description: 'Aaj kahan aur kis waqt maal jana hai', size: 'third', sizes: ANY_SIZE, Component: FurnitureDeliveries },
  ],
  lateWidgets: [
    { id: 'furniture-carpenters', title: 'Karigar', description: 'Sab se zyada kaam karne wale karigar', size: 'third', sizes: ANY_SIZE, Component: FurnitureCarpenters },
  ],
  useQuickActions: useFurnitureActions,
  moneyMap: { useExtraTiles: useFurnitureMoneyTiles, productsPath: '/furniture-products' },
  guide: [
    { icon: ClipboardList, title: 'Custom orders', text: 'Har order quotation → advance → ban raha → tayyar se guzarta hai. Late orders upar laal me aate hain taa ke customer ko pehle hi bata sakein.' },
    { icon: Truck, title: 'Delivery aur karigar', text: 'Aaj ki deliveries waqt ke saath, aur kaunsa karigar kitna kaam kar raha hai — sab ek jagah.' },
  ],
});
