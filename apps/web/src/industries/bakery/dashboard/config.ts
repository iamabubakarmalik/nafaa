/**
 * Bakery dashboard: what to bake, what to deliver, what expires, then the
 * money. Order here is the default; each user can rearrange it.
 */

import {
  BarChart3, BookOpen, Cake, ChefHat, Clock, Hourglass, Package, PiggyBank, Plus, Receipt,
  ShoppingBag, ShoppingCart, Target, Timer, Users, Wallet, Wheat,
} from 'lucide-react';
import type { DashboardConfig } from '@modules/dashboard/engine';
import { commonWidgets, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useBakeryOps } from './useBakeryOps';
import {
  BakeryAttention, BakeryFreshness, BakeryIngredients, BakeryKpis, BakeryOrders, BakeryProduction,
  useBakeryMoneyNotes, useBakeryMoneyTiles,
} from './widgets';

const productPath = (id: string) => `/bakery-products/${id}`;

function useBakeryActions(): QuickAction[] {
  const { data } = useOverview();
  const { production, fresh, raw } = useBakeryOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Bikri karein' },
    { to: '/bakery/cake-orders/new', icon: Cake, label: 'Cake order', hint: 'Naya order' },
    { to: '/bakery/production', icon: ChefHat, label: 'Baking', hint: production.total ? `${production.done}/${production.total} hua` : 'Plan banayein' },
    { to: '/bakery/freshness', icon: Timer, label: 'Taazgi', hint: fresh.expired.length ? `${fresh.expired.length} guzar gaya` : 'Sab theek' },
    { to: '/bakery/ingredients', icon: Wheat, label: 'Saamaan', hint: raw.low ? `${raw.low} kam` : `${raw.total} cheezein` },
    { to: '/bakery-products/new', icon: Plus, label: 'Nayi cheez', hint: 'Maal me daalein' },
    { to: '/bakery/products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/bakery/bulk-orders', icon: ShoppingBag, label: 'Bare order', hint: 'Shadi, daftar' },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Bikri record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const bakeryDashboard: DashboardConfig = {
  label: 'Bakery',
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  widgets: [
    { id: 'kpis', title: 'Aaj ke numbers', description: 'Bikri, bill, baking, orders aur taazgi', size: 'full', Component: BakeryKpis },
    { id: 'attention', title: 'Aaj ka kaam', description: 'Jo abhi karna hai, sab se zaroori upar', size: 'full', Component: BakeryAttention },
    { id: 'bakery-production', title: 'Aaj ki baking', description: 'Plan, oven aur tayyar maal', size: 'third', Component: BakeryProduction },
    { id: 'bakery-orders', title: 'Aane wale order', description: 'Cake aur bare order, delivery ke waqt se', size: 'third', Component: BakeryOrders },
    { id: 'bakery-freshness', title: 'Jald kharab hone wala', description: '24 ghante me expire hone wala maal', size: 'third', Component: BakeryFreshness },
    commonWidgets.salesTrend(),
    commonWidgets.peakHours({ openFrom: 6, hint: 'Batch isi hisaab se lagayein' }),
    commonWidgets.moneyMap({ useExtraTiles: useBakeryMoneyTiles, useNotes: useBakeryMoneyNotes, productsPath: '/bakery/products' }),
    commonWidgets.profitLoss(),
    commonWidgets.paymentMix(),
    commonWidgets.quickActions(useBakeryActions),
    commonWidgets.topProducts(productPath, 'Is mahine — isi ka batch bara rakhein'),
    commonWidgets.slowMovers(productPath),
    { id: 'bakery-ingredients', title: 'Saamaan kam ho gaya', description: 'Reorder level se neeche ka kachcha maal', size: 'third', Component: BakeryIngredients },
    commonWidgets.recentSales(),
    commonWidgets.lowStock(productPath, { title: 'Counter par kam', hint: 'agla batch isi ka' }),
    commonWidgets.expenses(),
    commonWidgets.purchases(),
    commonWidgets.commission(),
  ],
  guide: [
    { icon: Target, title: 'Aaj ka kaam — sab se pehle', text: 'Upar wali list batati hai ke abhi kya karna hai. Sab se upar wala sab se zaroori hai, aur har line par seedha button hai.' },
    { icon: Timer, title: 'Taazgi', text: 'Jo maal aaj nahi nikla wo kal kachra hai. Is liye "jald kharab" ki qeemat bhi likhi hai — "3 batch" chhota lagta hai, "Rs 4,500" foran samajh aata hai.' },
    { icon: Clock, title: 'Rush ke hisaab se batch', text: 'Chart me gehra rang sab se masroof ghanta hai — us se pehle batch tayyar ho. "Hafta" dabayein to asli aadat nazar aati hai, ek din ka ittefaq nahi.' },
    { icon: PiggyBank, title: 'Paisa kahan hai', text: 'Counter ka maal, banane ka saamaan, mahine ka kharcha, lena-dena aur galle ka cash. Har khana apni screen par le jata hai.' },
    { icon: Wallet, title: 'Nafa-nuqsan ka silsila', text: 'Bikri → maal ki lagat → seedha munafa → kharche → haath me bacha. Is se pata chalta hai ke munafa rate se kam hua ya kharchon se.' },
    { icon: Hourglass, title: 'Atka hua maal', text: '30 din se jo nahi bika — deal bana kar nikalein, ya banana band kar dein.' },
    { icon: Users, title: 'Apni marzi ka dashboard', text: '"Customize" se hisse chhupayein ya upar-neeche karein. Ye aap ke account me save hota hai — phone aur computer dono par wahi.' },
  ],
};
