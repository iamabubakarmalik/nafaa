/**
 * Dashboard for businesses without an industry pack (or before one is
 * picked): the full standard dashboard with general shortcuts.
 */

import {
  Banknote, BarChart3, BookOpen, Building2, Package, Plus, Receipt, ShoppingBag, Users, Wallet,
} from 'lucide-react';
import { createDashboard } from '../createDashboard';
import { useOverview } from '../data/queries';
import { useMasked } from '../engine/useMasked';
import type { QuickAction } from '../widgets';
import { t } from '@core/i18n';

function useGeneralActions(): QuickAction[] {
  const { data } = useOverview();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: Receipt, label: t('POS counter'), hint: t('Sale karein') },
    { to: '/products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein') },
    { to: '/products', icon: Package, label: t('Products'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sales history'), hint: t('Purane bill') },
    { to: '/purchases', icon: ShoppingBag, label: t('Purchase'), hint: t('Maal mangwayein') },
    { to: '/suppliers', icon: Building2, label: t('Suppliers'), hint: t('{{value}} parties', { value: s?.totalSuppliers ?? 0 }) },
    { to: '/expenses', icon: Wallet, label: t('Expenses'), hint: t('Bijli, kiraya') },
    { to: '/cash-register', icon: Banknote, label: t('Cash register'), hint: t('Galle ka hisaab') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const generalDashboard = createDashboard({
  label: t('Dashboard'),
  productPath: (id) => `/products/${id}`,
  useQuickActions: useGeneralActions,
});
