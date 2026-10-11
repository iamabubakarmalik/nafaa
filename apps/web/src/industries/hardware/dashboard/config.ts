/**
 * Hardware dashboard: the standard dashboard plus contractor credit,
 * deliveries, construction projects and quotations.
 */

import {
  Award, BarChart3, BookOpen, Building2, CreditCard, FileText, Package, Plus, Receipt, RefreshCw, ShoppingCart, Truck, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useHardwareOps } from './useHardwareOps';
import {
  HardwareCredit, HardwareDeliveries, HardwareProjects, HardwareQuotes, hardwareKpis, useHardwareAttention,
} from './widgets';

const productPath = (id: string) => `/hardware-products/${id}`;

function useHardwareActions(): QuickAction[] {
  const { data } = useOverview();
  const { credit, delivery, projects, quotations, reorder } = useHardwareOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Bikri karein' },
    { to: '/hardware/quotations/new', icon: FileText, label: 'Nayi quotation', hint: 'Bare order ka rate' },
    { to: '/hardware/quotations', icon: FileText, label: 'Quotations', hint: quotations.pending ? `${quotations.pending} jawab baqi` : 'Sab dekhein' },
    { to: '/hardware/deliveries', icon: Truck, label: 'Delivery', hint: delivery.today ? `${delivery.today} aaj` : `${delivery.open} baqi` },
    { to: '/hardware/projects', icon: Building2, label: 'Projects', hint: `${projects.active} chal rahe` },
    { to: '/hardware/credit-accounts', icon: CreditCard, label: 'Contractor khata', hint: cost(credit.outstanding) },
    { to: '/hardware/reorder-rules', icon: RefreshCw, label: 'Reorder', hint: reorder ? `${reorder} mangwana` : 'Sab theek' },
    { to: '/hardware-products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/hardware/products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/hardware/brands', icon: Award, label: 'Brands', hint: 'Company wise' },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Bikri record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const hardwareDashboard = createDashboard({
  label: 'Hardware',
  productPath,
  openFrom: 8,
  kpis: hardwareKpis,
  defaultKpis: ['hardware-deliveries', 'hardware-credit', 'hardware-quotes', 'profit', 'cash', 'month'],
  useAttention: useHardwareAttention,
  widgets: [
    { id: 'hardware-credit', title: 'Contractor udhaar', description: 'Sab se zyada udhaar wale contractor aur purana baqaya', size: 'third', sizes: ANY_SIZE, sensitive: true, Component: HardwareCredit },
    { id: 'hardware-deliveries', title: 'Aane wali delivery', description: 'Site par jane wala maal, tareekh se', size: 'third', sizes: ANY_SIZE, Component: HardwareDeliveries },
    { id: 'hardware-projects', title: 'Chalte projects', description: 'Construction sites aur kitna maal pahuncha', size: 'third', sizes: ANY_SIZE, Component: HardwareProjects },
  ],
  lateWidgets: [
    { id: 'hardware-quotes', title: 'Quotations', description: 'Jawab baqi, mani gayin aur expire', size: 'third', sizes: ['third', 'half'], Component: HardwareQuotes },
  ],
  useQuickActions: useHardwareActions,
  moneyMap: { productsPath: '/hardware/products' },
  guide: [
    { icon: CreditCard, title: 'Contractor ka udhaar', text: 'Hardware me sab se zyada paisa contractor ke paas atakta hai. Overdue aur 90 din purana udhaar "Aaj ka kaam" me sab se upar aata hai.' },
    { icon: Truck, title: 'Delivery aur projects', text: 'Aaj kaunsi gaari kahan jayegi, kis site par kitna maal pahunch chuka, aur kis quotation ka jawab baqi hai — sab ek jagah.' },
  ],
});
