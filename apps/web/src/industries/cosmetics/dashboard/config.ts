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
import { t } from '@core/i18n';

const productPath = (id: string) => `/cosmetics-products/${id}`;

function useCosmeticsActions(): QuickAction[] {
  const { data } = useOverview();
  const { expiry } = useCosmeticsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein') },
    { to: '/cosmetics-products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein') },
    { to: '/products', icon: Package, label: t('Products'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/cosmetics/expiry', icon: CalendarClock, label: t('Expiry'), hint: expiry.soon ? t('{{soon}} qareeb', { soon: expiry.soon }) : t('Batch dekhein') },
    { to: '/cosmetics/testers', icon: TestTube2, label: t('Testers'), hint: t('Try wale piece') },
    { to: '/brands', icon: Award, label: t('Brands'), hint: t('Maybelline, Rivaj…') },
    { to: '/combos', icon: Gift, label: t('Deals'), hint: t('Gift set, bundle') },
    { to: '/loyalty', icon: Heart, label: t('Loyalty'), hint: t('Points') },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const cosmeticsDashboard = createDashboard({
  label: t('Cosmetics'),
  productPath,
  openFrom: 10,
  kpis: cosmeticsKpis,
  defaultKpis: ['cosmetics-expiry', 'sales', 'profit', 'cash', 'low-stock', 'cosmetics-birthdays'],
  useAttention: useCosmeticsAttention,
  widgets: [
    { id: 'cosmetics-expiry', title: t('Expiry qareeb'), description: t('30 din me expire hone wale batch'), size: 'half', sizes: ANY_SIZE, Component: CosmeticsExpiry },
    { id: 'cosmetics-birthdays', title: t('Is mahine salgirah'), description: t('Customers jin ki salgirah is mahine hai'), size: 'half', sizes: ANY_SIZE, Component: CosmeticsBirthdays },
  ],
  useQuickActions: useCosmeticsActions,
  moneyMap: { productsPath: '/products' },
  guide: [
    { icon: CalendarClock, title: t('Expiry'), text: t('Make-up aur skincare expire ho kar bik nahi sakta. 7 din me expire hone wala batch "Aaj ka kaam" me aata hai — discount laga kar pehle nikaal dein.') },
    { icon: Heart, title: t('Salgirah'), text: t('Is mahine jin customers ki salgirah hai unhein offer bhejein — customer wapas aane ka sab se aasaan tareeqa. Salgirah customer ke record me likhein.') },
  ],
});
