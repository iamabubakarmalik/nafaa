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
import { t } from '@core/i18n';

const productPath = (id: string) => `/hardware-products/${id}`;

function useHardwareActions(): QuickAction[] {
  const { data } = useOverview();
  const { credit, delivery, projects, quotations, reorder } = useHardwareOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/hardware/quotations/new', icon: FileText, label: t('Nayi quotation'), hint: t('Bare order ka rate') },
    { to: '/hardware/quotations', icon: FileText, label: t('Quotations'), hint: quotations.pending ? t('{{pending}} jawab baqi', { pending: quotations.pending }) : t('Sab dekhein') },
    { to: '/hardware/deliveries', icon: Truck, label: t('Challan'), hint: delivery.today ? t('{{today}} aaj', { today: delivery.today }) : t('{{open}} baqi', { open: delivery.open }) },
    { to: '/hardware/projects', icon: Building2, label: t('Sites'), hint: t('{{active}} chal rahe', { active: projects.active }) },
    { to: '/hardware/credit-accounts', icon: CreditCard, label: t('Thekedar khata'), hint: cost(credit.outstanding) },
    { to: '/hardware/reorder-rules', icon: RefreshCw, label: t('Reorder'), hint: reorder ? t('{{reorder}} mangwana', { reorder }) : t('Sab theek') },
    { to: '/hardware-products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein') },
    { to: '/hardware/products', icon: Package, label: t('Maal'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/hardware/brands', icon: Award, label: t('Brands'), hint: t('Company wise') },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const hardwareDashboard = createDashboard({
  label: t('Hardware'),
  productPath,
  openFrom: 8,
  kpis: hardwareKpis,
  defaultKpis: ['hardware-deliveries', 'hardware-credit', 'hardware-quotes', 'profit', 'cash', 'month'],
  useAttention: useHardwareAttention,
  widgets: [
    { id: 'hardware-credit', title: t('Contractor udhaar'), description: t('Sab se zyada udhaar wale contractor aur purana balance'), size: 'third', sizes: ANY_SIZE, sensitive: true, Component: HardwareCredit },
    { id: 'hardware-deliveries', title: t('Aane wali delivery'), description: t('Site par jane wala maal, date se'), size: 'third', sizes: ANY_SIZE, Component: HardwareDeliveries },
    { id: 'hardware-projects', title: t('Chalte projects'), description: t('Construction sites aur kitna maal pahuncha'), size: 'third', sizes: ANY_SIZE, Component: HardwareProjects },
  ],
  lateWidgets: [
    { id: 'hardware-quotes', title: t('Quotations'), description: t('Jawab baqi, mani gayin aur expire'), size: 'third', sizes: ['third', 'half'], Component: HardwareQuotes },
  ],
  useQuickActions: useHardwareActions,
  moneyMap: { productsPath: '/hardware/products' },
  guide: [
    { icon: CreditCard, title: t('Contractor ka udhaar'), text: t('Hardware me sab se zyada paisa contractor ke paas atakta hai. Overdue aur 90 din purana udhaar "Aaj ka kaam" me sab se upar aata hai.') },
    { icon: Truck, title: t('Delivery aur projects'), text: t('Aaj kaunsi gaari kahan jayegi, kis site par kitna maal pahunch chuka, aur kis quotation ka jawab baqi hai — sab ek jagah.') },
  ],
});
