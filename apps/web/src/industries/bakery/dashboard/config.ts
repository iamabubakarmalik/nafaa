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
import { t } from '@core/i18n';

const productPath = (id: string) => `/bakery-products/${id}`;

function useBakeryActions(): QuickAction[] {
  const { data } = useOverview();
  const { production, fresh, raw } = useBakeryOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/bakery/cake-orders/new', icon: Cake, label: t('Cake order'), hint: t('Naya order') },
    { to: '/bakery/production', icon: ChefHat, label: t('Baking'), hint: production.total ? t('{{done}}/{{total}} hua', { done: production.done, total: production.total }) : t('Plan banayein') },
    { to: '/bakery/freshness', icon: Timer, label: t('Freshness'), hint: fresh.expired.length ? t('{{count}} guzar gaya', { count: fresh.expired.length }) : t('Sab theek') },
    { to: '/bakery/ingredients', icon: Wheat, label: t('Saamaan'), hint: raw.low ? t('{{low}} kam', { low: raw.low }) : t('{{total}} cheezein', { total: raw.total }) },
    { to: '/bakery-products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein') },
    { to: '/bakery/products', icon: Package, label: t('Maal'), hint: t('{{value}} cheezein', { value: s?.totalProducts ?? 0 }) },
    { to: '/bakery/bulk-orders', icon: ShoppingBag, label: t('Bare order'), hint: t('Shadi, daftar') },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const bakeryDashboard = createDashboard({
  label: t('Bakery'),
  productPath,
  openFrom: 6,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: bakeryKpis,
  defaultKpis: ['bakery-baking', 'bakery-orders', 'bakery-fresh', 'profit', 'cash', 'month'],
  useAttention: useBakeryAttention,
  widgets: [
    { id: 'bakery-production', title: t('Aaj ki baking'), description: t('Plan, oven aur tayyar maal'), size: 'third', sizes: ['third', 'half'], Component: BakeryProduction },
    { id: 'bakery-orders', title: t('Aane wale order'), description: t('Cake aur bare order, delivery ke waqt se'), size: 'third', sizes: ANY_SIZE, Component: BakeryOrders },
    { id: 'bakery-freshness', title: t('Jald kharab hone wala'), description: t('24 ghante me expire hone wala maal'), size: 'third', sizes: ANY_SIZE, Component: BakeryFreshness },
  ],
  lateWidgets: [
    { id: 'bakery-ingredients', title: t('Saamaan kam ho gaya'), description: t('Reorder level se neeche ka raw material'), size: 'third', sizes: ANY_SIZE, Component: BakeryIngredients },
  ],
  useQuickActions: useBakeryActions,
  moneyMap: { useExtraTiles: useBakeryMoneyTiles, useNotes: useBakeryMoneyNotes, productsPath: '/bakery/products' },
  guide: [
    { icon: Timer, title: t('Freshness'), text: t('Jo maal aaj nahi nikla wo kal kachra hai. Is liye "jald kharab" ki qeemat bhi likhi hai — "3 batch" chhota lagta hai, "Rs 4,500" foran samajh aata hai.') },
    { icon: ChefHat, title: t('Baking aur orders'), text: t('Aaj ki baking ka plan, oven me kya hai, kaunse cake order aaj dene hain aur kaunsa saamaan kam hai — sab upar.') },
  ],
});
