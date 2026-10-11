/**
 * Retail dashboard: the standard dashboard plus retail reorders and damage
 * alerts and retail shortcuts.
 */

import {
  AlertTriangle, Banknote, BookOpen, Building2, Layers, Package, PiggyBank, Plus, Receipt, RefreshCw, ShoppingBag,
  ShoppingCart, Sparkles, Tag, Upload, Users, Wallet, Zap,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { useMasked } from '@modules/dashboard/engine';
import type { QuickAction } from '@modules/dashboard/widgets';
import { useOverview, useRetailAlerts } from '@modules/dashboard/data/queries';
import { useRetailAttention } from './widgets';

const productPath = (id: string) => `/retail-products/${id}`;

function useRetailActions(): QuickAction[] {
  const { data } = useOverview();
  const { data: alerts = {} } = useRetailAlerts();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS counter', hint: 'Sale karein' },
    { to: '/retail-products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/products', icon: Package, label: 'Products', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sales history', hint: 'Purani receipts' },
    { to: '/purchases', icon: ShoppingBag, label: 'Kharidari', hint: 'Maal mangwayein' },
    { to: '/suppliers', icon: Building2, label: 'Suppliers', hint: `${s?.totalSuppliers ?? 0} parties` },
    { to: '/expenses', icon: Wallet, label: 'Kharche', hint: 'Bijli, kiraya' },
    { to: '/cash-register', icon: Banknote, label: 'Cash register', hint: 'Galle ka hisaab' },
    { to: '/retail/reorders', icon: RefreshCw, label: 'Smart reorder', hint: alerts.pendingReorders ? `${alerts.pendingReorders} tayyar` : 'Kya mangwana hai' },
    { to: '/retail/damage', icon: AlertTriangle, label: 'Damage log', hint: `${alerts.damagesToday ?? 0} aaj` },
    { to: '/retail/combos', icon: Sparkles, label: 'Combos', hint: 'Bundle deals' },
    { to: '/retail/product-units', icon: Layers, label: 'Multi-units', hint: 'Piece / dozen' },
    { to: '/retail/quick-keys', icon: Zap, label: 'Quick keys', hint: 'POS shortcuts' },
    { to: '/barcode-labels', icon: Tag, label: 'Barcode labels', hint: 'Print karein' },
    { to: '/retail/bulk-import', icon: Upload, label: 'Bulk import', hint: 'Excel / CSV' },
    { to: '/profit-report', icon: PiggyBank, label: 'Profit report', hint: 'Nafa-nuqsan' },
  ];
}

export const retailDashboard = createDashboard({
  label: 'Retail',
  productPath,
  useAttention: useRetailAttention,
  useQuickActions: useRetailActions,
  moneyMap: { productsPath: '/products' },
});
