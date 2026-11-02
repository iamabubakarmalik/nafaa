/**
 * Mobile shop dashboard: the standard dashboard plus IMEI stock, repairs,
 * EMI plans, used phones and profit by source.
 */

import {
  BarChart3, BookOpen, CreditCard, Package, Plus, Receipt, RotateCcw, ShieldCheck, ShoppingCart, Smartphone, Upload,
  Users, Wrench,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useMobileOps } from './useMobileOps';
import {
  MobileEmi, MobileProfitSources, MobileRepairs, MobileStock, mobileKpis, useMobileAttention, useMobileMoneyTiles,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/mobile-products/${id}`;

function useMobileActions(): QuickAction[] {
  const { data } = useOverview();
  const { stock, repairs, emi, used } = useMobileOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS counter'), hint: t('Sale karein') },
    { to: '/mobile-products/new', icon: Plus, label: t('Naya phone'), hint: t('Maal me daalein') },
    { to: '/imei-inventory', icon: ShieldCheck, label: t('IMEI stock'), hint: t('{{inStock}} phone', { inStock: stock.inStock }) },
    { to: '/repair-tickets', icon: Wrench, label: t('Repairs'), hint: repairs.ready ? t('{{ready}} tayyar', { ready: repairs.ready }) : t('{{open}} khule', { open: repairs.open }) },
    { to: '/emi-plans', icon: CreditCard, label: t('Kist (EMI)'), hint: emi.overdueCount ? t('{{overdueCount}} late', { overdueCount: emi.overdueCount }) : t('{{active}} chal rahe', { active: emi.active }) },
    { to: '/used-phones', icon: RotateCcw, label: t('Used phone'), hint: t('{{inStock}} stock me', { inStock: used.inStock }) },
    { to: '/products', icon: Package, label: t('Products'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sales history'), hint: t('Purani receipts') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Mobile hisaab') },
    { to: '/products/bulk-import', icon: Upload, label: t('Bulk import'), hint: t('Excel / CSV') },
  ];
}

export const mobileDashboard = createDashboard({
  label: t('Mobile shop'),
  productPath,
  openFrom: 10,
  kpis: mobileKpis,
  defaultKpis: ['mobile-imei', 'mobile-repairs', 'mobile-emi', 'profit', 'cash', 'month'],
  useAttention: useMobileAttention,
  widgets: [
    { id: 'mobile-repairs', title: t('Repair desk'), description: t('Khule repair har marhale par, aur pickup ke liye tayyar phone'), size: 'third', sizes: ANY_SIZE, Component: MobileRepairs },
    { id: 'mobile-emi', title: t('Kist (EMI)'), description: t('Late kiston wale customer aur is mahine ki receiving'), size: 'third', sizes: ANY_SIZE, Component: MobileEmi },
    { id: 'mobile-stock', title: t('Phone stock'), description: t('IMEI stock, aaj ki sale, used phone aur PTA status'), size: 'third', sizes: ['third', 'half'], Component: MobileStock },
  ],
  lateWidgets: [
    { id: 'mobile-profit-sources', title: t('Kamai ka rasta'), description: t('Naye phone, used phone, accessories aur repair ka 30 din ka profit'), size: 'third', sizes: ['third', 'half', 'wide'], sensitive: true, Component: MobileProfitSources },
  ],
  useQuickActions: useMobileActions,
  moneyMap: { useExtraTiles: useMobileMoneyTiles, productsPath: '/products' },
  guide: [
    { icon: Smartphone, title: t('Phone stock aur PTA'), text: t('Har phone IMEI se ginti hota hai. Non-PTA ya PTA pending phone alag nazar aate hain — bechte waqt customer ko zaroor batayein.') },
    { icon: CreditCard, title: t('Repair aur kist'), text: t('Tayyar repair ka customer ko foran call karein, aur late kist wale customer upar list me hain — "Aaj ka kaam" me sab se zaroori pehle.') },
  ],
});
