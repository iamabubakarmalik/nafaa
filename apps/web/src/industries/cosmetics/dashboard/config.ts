/**
 * Cosmetics dashboard: the standard dashboard plus batch expiry and this
 * month's customer birthdays.
 */

import { Award, BarChart3, BookOpen, CalendarClock, Gift, Heart, Package, Plus, Receipt, ShoppingCart, TestTube2, Users } from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useCosmeticsOps } from './useCosmeticsOps';
import { CosmeticsBirthdays, CosmeticsExpiry, cosmeticsKpis, useCosmeticsAttention } from './widgets';

const productPath = (id: string) => `/cosmetics-products/${id}`;

function useCosmeticsActions(): QuickAction[] {
  const { data } = useOverview();
  const { expiry } = useCosmeticsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Sale karein' },
    { to: '/cosmetics-products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/products', icon: Package, label: 'Products', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/cosmetics/expiry', icon: CalendarClock, label: 'Expiry', hint: expiry.soon ? `${expiry.soon} qareeb` : 'Batch dekhein' },
    { to: '/cosmetics/testers', icon: TestTube2, label: 'Testers', hint: 'Try wale piece' },
    { to: '/brands', icon: Award, label: 'Brands', hint: 'Maybelline, Rivaj…' },
    { to: '/combos', icon: Gift, label: 'Deals', hint: 'Gift set, bundle' },
    { to: '/loyalty', icon: Heart, label: 'Loyalty', hint: 'Points' },
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
  defaultKpis: ['cosmetics-expiry', 'sales', 'profit', 'cash', 'low-stock', 'cosmetics-birthdays'],
  useAttention: useCosmeticsAttention,
  widgets: [
    { id: 'cosmetics-expiry', title: 'Expiry qareeb', description: '30 din me expire hone wale batch', size: 'half', sizes: ANY_SIZE, Component: CosmeticsExpiry },
    { id: 'cosmetics-birthdays', title: 'Is mahine salgirah', description: 'Customers jin ki salgirah is mahine hai', size: 'half', sizes: ANY_SIZE, Component: CosmeticsBirthdays },
  ],
  useQuickActions: useCosmeticsActions,
  moneyMap: { productsPath: '/products' },
  guide: [
    { icon: CalendarClock, title: 'Expiry', text: 'Make-up aur skincare expire ho kar bik nahi sakta. 7 din me expire hone wala batch "Aaj ka kaam" me aata hai — discount laga kar pehle nikaal dein.' },
    { icon: Heart, title: 'Salgirah', text: 'Is mahine jin customers ki salgirah hai unhein offer bhejein — customer wapas aane ka sab se aasaan tareeqa. Salgirah customer ke record me likhein.' },
  ],
});
