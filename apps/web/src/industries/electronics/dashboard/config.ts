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
import { t } from '@core/i18n';

const productPath = (id: string) => `/electronics-products/${id}`;

function useElectronicsActions(): QuickAction[] {
  const { data } = useOverview();
  const { serials, claims, brands } = useElectronicsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS counter'), hint: t('Sale karein') },
    { to: '/electronics-products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein') },
    { to: '/electronics/serials', icon: Barcode, label: t('Serial / IMEI'), hint: t('{{inStock}} stock me', { inStock: serials.inStock }) },
    { to: '/electronics/warranty-claims', icon: Shield, label: t('Warranty'), hint: t('{{pending}} khule', { pending: claims.pending }) },
    { to: '/brands', icon: Award, label: t('Brands'), hint: brands.length ? t('{{count}} bik rahe', { count: brands.length }) : t('Brand list') },
    { to: '/electronics/bundles', icon: Layers, label: t('Bundles'), hint: t('Combo deals') },
    { to: '/electronics-products', icon: Package, label: t('Products'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sales history'), hint: t('Purani receipts') },
    { to: '/profit-report', icon: PiggyBank, label: t('Profit report'), hint: t('Profit-loss') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const electronicsDashboard = createDashboard({
  label: t('Electronics'),
  productPath,
  openFrom: 10,
  kpis: electronicsKpis,
  defaultKpis: ['electronics-claims', 'electronics-serials', 'profit', 'cash', 'month', 'low-stock'],
  useAttention: useElectronicsAttention,
  widgets: [
    { id: 'electronics-warranty', title: t('Warranty claims'), description: t('Khule claim, sab se purane upar'), size: 'third', sizes: ANY_SIZE, Component: ElectronicsWarranty },
    { id: 'electronics-serials', title: t('Serial stock'), description: t('Stock, bike, kharab aur warranty khatam hone wale units'), size: 'third', sizes: ANY_SIZE, Component: ElectronicsSerials },
    { id: 'electronics-brands', title: t('Top brands'), description: t('Kis brand ki sale sab se zyada'), size: 'third', sizes: ANY_SIZE, Component: ElectronicsBrands },
  ],
  useQuickActions: useElectronicsActions,
  moneyMap: { productsPath: '/electronics-products' },
  guide: [
    { icon: Shield, title: t('Warranty claims'), text: t('Khule claim sab se purane pehle dikhte hain. Ek hafte se purana claim laal ho jata hai — customer ka bharosa isi se banta hai.') },
    { icon: Barcode, title: t('Serial stock'), text: t('Har unit apne serial se ginti hota hai. Kharab units aur jin ki warranty jald khatam ho rahi hai wo alag nazar aate hain.') },
  ],
});
