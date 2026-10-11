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

function useGeneralActions(): QuickAction[] {
  const { data } = useOverview();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: Receipt, label: 'POS counter', hint: 'Sale karein' },
    { to: '/products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/products', icon: Package, label: 'Products', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sales history', hint: 'Purane bill' },
    { to: '/purchases', icon: ShoppingBag, label: 'Kharidari', hint: 'Maal mangwayein' },
    { to: '/suppliers', icon: Building2, label: 'Suppliers', hint: `${s?.totalSuppliers ?? 0} parties` },
    { to: '/expenses', icon: Wallet, label: 'Kharche', hint: 'Bijli, kiraya' },
    { to: '/cash-register', icon: Banknote, label: 'Cash register', hint: 'Galle ka hisaab' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const generalDashboard = createDashboard({
  label: 'Dashboard',
  productPath: (id) => `/products/${id}`,
  useQuickActions: useGeneralActions,
});
