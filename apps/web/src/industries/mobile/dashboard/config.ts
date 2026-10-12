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

const productPath = (id: string) => `/mobile-products/${id}`;

function useMobileActions(): QuickAction[] {
  const { data } = useOverview();
  const { stock, repairs, emi, used } = useMobileOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS counter', hint: 'Sale karein' },
    { to: '/mobile-products/new', icon: Plus, label: 'Naya phone', hint: 'Maal me daalein' },
    { to: '/imei-inventory', icon: ShieldCheck, label: 'IMEI stock', hint: `${stock.inStock} phone` },
    { to: '/repair-tickets', icon: Wrench, label: 'Repairs', hint: repairs.ready ? `${repairs.ready} tayyar` : `${repairs.open} khule` },
    { to: '/emi-plans', icon: CreditCard, label: 'Kist (EMI)', hint: emi.overdueCount ? `${emi.overdueCount} late` : `${emi.active} chal rahe` },
    { to: '/used-phones', icon: RotateCcw, label: 'Used phone', hint: `${used.inStock} stock me` },
    { to: '/products', icon: Package, label: 'Products', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sales history', hint: 'Purani receipts' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Mobile hisaab' },
    { to: '/products/bulk-import', icon: Upload, label: 'Bulk import', hint: 'Excel / CSV' },
  ];
}

export const mobileDashboard = createDashboard({
  label: 'Mobile shop',
  productPath,
  openFrom: 10,
  kpis: mobileKpis,
  defaultKpis: ['mobile-imei', 'mobile-repairs', 'mobile-emi', 'profit', 'cash', 'month'],
  useAttention: useMobileAttention,
  widgets: [
    { id: 'mobile-repairs', title: 'Repair desk', description: 'Khule repair har marhale par, aur pickup ke liye tayyar phone', size: 'third', sizes: ANY_SIZE, Component: MobileRepairs },
    { id: 'mobile-emi', title: 'Kist (EMI)', description: 'Late kiston wale customer aur is mahine ki wusooli', size: 'third', sizes: ANY_SIZE, Component: MobileEmi },
    { id: 'mobile-stock', title: 'Phone stock', description: 'IMEI stock, aaj ki bikri, used phone aur PTA status', size: 'third', sizes: ['third', 'half'], Component: MobileStock },
  ],
  lateWidgets: [
    { id: 'mobile-profit-sources', title: 'Kamai ka rasta', description: 'Naye phone, used phone, accessories aur repair ka 30 din ka munafa', size: 'third', sizes: ['third', 'half', 'wide'], sensitive: true, Component: MobileProfitSources },
  ],
  useQuickActions: useMobileActions,
  moneyMap: { useExtraTiles: useMobileMoneyTiles, productsPath: '/products' },
  guide: [
    { icon: Smartphone, title: 'Phone stock aur PTA', text: 'Har phone IMEI se ginti hota hai. Non-PTA ya PTA pending phone alag nazar aate hain — bechte waqt customer ko zaroor batayein.' },
    { icon: CreditCard, title: 'Repair aur kist', text: 'Tayyar repair ka customer ko foran call karein, aur late kist wale customer upar list me hain — "Aaj ka kaam" me sab se zaroori pehle.' },
  ],
});
