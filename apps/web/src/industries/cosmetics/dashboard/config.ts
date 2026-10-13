/**
 * Cosmetics dashboard: the standard dashboard plus batch expiry and loyalty
 * birthdays.
 */

import { Award, BarChart3, BookOpen, CalendarClock, Gift, Heart, Package, Plus, Receipt, ShoppingCart, Users } from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useCosmeticsOps } from './useCosmeticsOps';
import { CosmeticsBirthdays, CosmeticsExpiry, cosmeticsKpis, useCosmeticsAttention } from './widgets';

const productPath = (id: string) => `/cosmetics-products/${id}`;

function useCosmeticsActions(): QuickAction[] {
  const { data } = useOverview();
  const { expiry, loyalty, totals } = useCosmeticsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Sale karein' },
    { to: '/cosmetics-products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/cosmetics-products', icon: Package, label: 'Products', hint: `${totals.products || s?.totalProducts || 0} items` },
    { to: '/cosmetics/batches', icon: CalendarClock, label: 'Batches', hint: expiry.soon ? `${expiry.soon} expiry qareeb` : 'Expiry dekhein' },
    { to: '/cosmetics/brands', icon: Award, label: 'Brands', hint: `${totals.brands} brands` },
    { to: '/cosmetics/bundles', icon: Gift, label: 'Gift bundles', hint: `${totals.bundles} chaalu` },
    { to: '/cosmetics/loyalty', icon: Heart, label: 'Loyalty', hint: `${loyalty.members} members` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const cosmeticsDashboard = createDashboard({
  label: 'Cosmetics',
  productPath,
  openFrom: 10,
  kpis: cosmeticsKpis,
  defaultKpis: ['cosmetics-expiry', 'profit', 'month', 'cash', 'low-stock', 'customers'],
  useAttention: useCosmeticsAttention,
  widgets: [
    { id: 'cosmetics-expiry', title: 'Expiry qareeb', description: '30 din me expire hone wale batch', size: 'half', sizes: ANY_SIZE, Component: CosmeticsExpiry },
    { id: 'cosmetics-birthdays', title: 'Is mahine salgirah', description: 'Loyalty members jin ki salgirah is mahine hai', size: 'half', sizes: ANY_SIZE, Component: CosmeticsBirthdays },
  ],
  useQuickActions: useCosmeticsActions,
  moneyMap: { productsPath: '/cosmetics-products' },
  guide: [
    { icon: CalendarClock, title: 'Expiry', text: 'Make-up aur skincare expire ho kar bik nahi sakta. 7 din me expire hone wala batch "Aaj ka kaam" me aata hai — discount laga kar pehle nikaal dein.' },
    { icon: Heart, title: 'Loyalty aur salgirah', text: 'Is mahine jin members ki salgirah hai unhein birthday offer bhejein — yeh customer wapas aane ka sab se aasaan tareeqa hai.' },
  ],
});
