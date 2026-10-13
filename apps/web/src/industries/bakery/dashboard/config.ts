/**
 * Bakery dashboard: the standard dashboard plus baking, orders, freshness
 * and raw materials.
 */

import {
  BarChart3, BookOpen, Cake, ChefHat, Package, Plus, Receipt, ShoppingBag, ShoppingCart, Timer, Users, Wheat,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useBakeryOps } from './useBakeryOps';
import {
  BakeryFreshness, useBakeryAttention, BakeryIngredients, BakeryOrders, BakeryProduction, bakeryKpis,
  useBakeryMoneyNotes, useBakeryMoneyTiles,
} from './widgets';

const productPath = (id: string) => `/bakery-products/${id}`;

function useBakeryActions(): QuickAction[] {
  const { data } = useOverview();
  const { production, fresh, raw } = useBakeryOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Sale karein' },
    { to: '/bakery/cake-orders/new', icon: Cake, label: 'Cake order', hint: 'Naya order' },
    { to: '/bakery/production', icon: ChefHat, label: 'Baking', hint: production.total ? `${production.done}/${production.total} hua` : 'Plan banayein' },
    { to: '/bakery/freshness', icon: Timer, label: 'Freshness', hint: fresh.expired.length ? `${fresh.expired.length} guzar gaya` : 'Sab theek' },
    { to: '/bakery/ingredients', icon: Wheat, label: 'Saamaan', hint: raw.low ? `${raw.low} kam` : `${raw.total} cheezein` },
    { to: '/bakery-products/new', icon: Plus, label: 'Nayi cheez', hint: 'Maal me daalein' },
    { to: '/bakery/products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/bakery/bulk-orders', icon: ShoppingBag, label: 'Bare order', hint: 'Shadi, daftar' },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const bakeryDashboard = createDashboard({
  label: 'Bakery',
  productPath,
  openFrom: 6,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: bakeryKpis,
  defaultKpis: ['bakery-baking', 'bakery-orders', 'bakery-fresh', 'profit', 'cash', 'month'],
  useAttention: useBakeryAttention,
  widgets: [
    { id: 'bakery-production', title: 'Aaj ki baking', description: 'Plan, oven aur tayyar maal', size: 'third', sizes: ['third', 'half'], Component: BakeryProduction },
    { id: 'bakery-orders', title: 'Aane wale order', description: 'Cake aur bare order, delivery ke waqt se', size: 'third', sizes: ANY_SIZE, Component: BakeryOrders },
    { id: 'bakery-freshness', title: 'Jald kharab hone wala', description: '24 ghante me expire hone wala maal', size: 'third', sizes: ANY_SIZE, Component: BakeryFreshness },
  ],
  lateWidgets: [
    { id: 'bakery-ingredients', title: 'Saamaan kam ho gaya', description: 'Reorder level se neeche ka raw material', size: 'third', sizes: ANY_SIZE, Component: BakeryIngredients },
  ],
  useQuickActions: useBakeryActions,
  moneyMap: { useExtraTiles: useBakeryMoneyTiles, useNotes: useBakeryMoneyNotes, productsPath: '/bakery/products' },
  guide: [
    { icon: Timer, title: 'Freshness', text: 'Jo maal aaj nahi nikla wo kal kachra hai. Is liye "jald kharab" ki qeemat bhi likhi hai — "3 batch" chhota lagta hai, "Rs 4,500" foran samajh aata hai.' },
    { icon: ChefHat, title: 'Baking aur orders', text: 'Aaj ki baking ka plan, oven me kya hai, kaunse cake order aaj dene hain aur kaunsa saamaan kam hai — sab upar.' },
  ],
});
