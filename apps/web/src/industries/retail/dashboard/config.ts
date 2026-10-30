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
import { t } from '@core/i18n';

const productPath = (id: string) => `/retail-products/${id}`;

function useRetailActions(): QuickAction[] {
  const { data } = useOverview();
  const { data: alerts = {} } = useRetailAlerts();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS counter'), hint: t('Sale karein') },
    { to: '/retail-products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein') },
    { to: '/products', icon: Package, label: t('Products'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sales history'), hint: t('Purani receipts') },
    { to: '/purchases', icon: ShoppingBag, label: t('Purchase'), hint: t('Maal mangwayein') },
    { to: '/suppliers', icon: Building2, label: t('Suppliers'), hint: t('{{value}} parties', { value: s?.totalSuppliers ?? 0 }) },
    { to: '/expenses', icon: Wallet, label: t('Expenses'), hint: t('Bijli, kiraya') },
    { to: '/cash-register', icon: Banknote, label: t('Cash register'), hint: t('Galle ka hisaab') },
    { to: '/low-stock', icon: RefreshCw, label: t('Smart reorder'), hint: alerts.pendingReorders ? t('{{pendingReorders}} tayyar', { pendingReorders: alerts.pendingReorders }) : t('Kya mangwana hai') },
    { to: '/damage', icon: AlertTriangle, label: t('Damage log'), hint: t('{{value}} aaj', { value: alerts.damagesToday ?? 0 }) },
    { to: '/combos', icon: Sparkles, label: t('Combos'), hint: t('Bundle deals') },
    { to: '/product-units', icon: Layers, label: t('Multi-units'), hint: t('Piece / dozen') },
    { to: '/quick-keys', icon: Zap, label: t('Quick keys'), hint: t('POS shortcuts') },
    { to: '/barcode-labels', icon: Tag, label: t('Barcode labels'), hint: t('Print karein') },
    { to: '/products/bulk-import', icon: Upload, label: t('Bulk import'), hint: t('Excel / CSV') },
    { to: '/profit-report', icon: PiggyBank, label: t('Profit report'), hint: t('Profit-loss') },
  ];
}

export const retailDashboard = createDashboard({
  label: t('Retail'),
  productPath,
  useAttention: useRetailAttention,
  useQuickActions: useRetailActions,
  moneyMap: { productsPath: '/products' },
});
