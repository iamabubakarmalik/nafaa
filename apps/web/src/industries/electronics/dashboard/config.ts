/**
 * Electronics dashboard: the standard dashboard plus serial stock, warranty
 * claims and brand sales.
 */

import {
  Award, BarChart3, Barcode, BookOpen, Layers, Package, PiggyBank, Plus, Receipt, Shield, ShoppingCart, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useElectronicsOps } from './useElectronicsOps';
import { ElectronicsBrands, ElectronicsSerials, ElectronicsWarranty, electronicsKpis, useElectronicsAttention } from './widgets';

const productPath = (id: string) => `/electronics-products/${id}`;

function useElectronicsActions(): QuickAction[] {
  const { data } = useOverview();
  const { serials, claims, brands } = useElectronicsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS counter', hint: 'Sale karein' },
    { to: '/electronics-products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/electronics/serials', icon: Barcode, label: 'Serial / IMEI', hint: `${serials.inStock} stock me` },
    { to: '/electronics/warranty-claims', icon: Shield, label: 'Warranty', hint: `${claims.pending} khule` },
    { to: '/brands', icon: Award, label: 'Brands', hint: brands.length ? `${brands.length} bik rahe` : 'Brand list' },
    { to: '/electronics/bundles', icon: Layers, label: 'Bundles', hint: 'Combo deals' },
    { to: '/electronics-products', icon: Package, label: 'Products', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sales history', hint: 'Purani receipts' },
    { to: '/profit-report', icon: PiggyBank, label: 'Profit report', hint: 'Nafa-nuqsan' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const electronicsDashboard = createDashboard({
  label: 'Electronics',
  productPath,
  openFrom: 10,
  kpis: electronicsKpis,
  defaultKpis: ['electronics-claims', 'electronics-serials', 'profit', 'cash', 'month', 'low-stock'],
  useAttention: useElectronicsAttention,
  widgets: [
    { id: 'electronics-warranty', title: 'Warranty claims', description: 'Khule claim, sab se purane upar', size: 'third', sizes: ANY_SIZE, Component: ElectronicsWarranty },
    { id: 'electronics-serials', title: 'Serial stock', description: 'Stock, bike, kharab aur warranty khatam hone wale units', size: 'third', sizes: ANY_SIZE, Component: ElectronicsSerials },
    { id: 'electronics-brands', title: 'Top brands', description: 'Kis brand ki bikri sab se zyada', size: 'third', sizes: ANY_SIZE, Component: ElectronicsBrands },
  ],
  useQuickActions: useElectronicsActions,
  moneyMap: { productsPath: '/electronics-products' },
  guide: [
    { icon: Shield, title: 'Warranty claims', text: 'Khule claim sab se purane pehle dikhte hain. Ek hafte se purana claim laal ho jata hai — customer ka bharosa isi se banta hai.' },
    { icon: Barcode, title: 'Serial stock', text: 'Har unit apne serial se ginti hota hai. Kharab units aur jin ki warranty jald khatam ho rahi hai wo alag nazar aate hain.' },
  ],
});
