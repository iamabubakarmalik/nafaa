/**
 * Optical dashboard: the standard dashboard plus eye tests, lens orders at
 * the lab, glasses ready for pickup and expiring prescriptions.
 */

import {
  BarChart3, BookOpen, Eye, FilePlus, FileText, FlaskConical, Glasses, Package, Plus, Receipt, ShoppingBag, ShoppingCart,
  UserCog, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useOpticalOps } from './useOpticalOps';
import {
  OpticalLabLate, OpticalPickup, OpticalRxExpiring, OpticalSchedule, opticalKpis, useOpticalAttention,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/optical-products/${id}`;

function useOpticalActions(): QuickAction[] {
  const { data } = useOverview();
  const { pending, testsLeft } = useOpticalOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/optical/eye-tests', icon: Eye, label: t('Eye tests'), hint: testsLeft ? t('{{testsLeft}} aaj baqi', { testsLeft }) : t('Appointment') },
    { to: '/optical/prescriptions/new', icon: FilePlus, label: t('Naya nuskha'), hint: t('Number likhein') },
    { to: '/optical/lens-orders/new', icon: FlaskConical, label: t('Lens order'), hint: t('Lab ko bhejein') },
    { to: '/optical/lens-orders', icon: Glasses, label: t('Orders'), hint: pending.lensOrdersReady ? t('{{lensOrdersReady}} tayyar', { lensOrdersReady: pending.lensOrdersReady }) : t('{{lensOrdersAtLab}} lab me', { lensOrdersAtLab: pending.lensOrdersAtLab }) },
    { to: '/optical/prescriptions', icon: FileText, label: t('Nuskhe'), hint: t('Prescriptions') },
    { to: '/optical/optometrists', icon: UserCog, label: t('Doctors'), hint: t('Optometrists') },
    { to: '/optical-products/new', icon: Plus, label: t('Naya product'), hint: t('Frame / lens') },
    { to: '/products', icon: Package, label: t('Maal'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/purchases', icon: ShoppingBag, label: t('Purchase'), hint: t('Maal mangwayein') },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const opticalDashboard = createDashboard({
  label: t('Optical'),
  productPath,
  openFrom: 10,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: opticalKpis,
  defaultKpis: ['optical-tests', 'optical-lab', 'optical-ready', 'sales', 'profit', 'optical-receivable'],
  useAttention: useOpticalAttention,
  widgets: [
    { id: 'optical-schedule', title: t('Aaj ke eye test'), description: t('Aaj ke appointment, waqt aur doctor ke saath'), size: 'third', sizes: ANY_SIZE, Component: OpticalSchedule },
    { id: 'optical-pickup', title: t('Chashma tayyar'), description: t('Tayyar chashme jin ke customer ko bulana hai'), size: 'third', sizes: ANY_SIZE, Component: OpticalPickup },
    { id: 'optical-lab-late', title: t('Lab se late'), description: t('Waade ki date guzar gayi, order abhi nahi aaya'), size: 'third', sizes: ANY_SIZE, Component: OpticalLabLate },
  ],
  lateWidgets: [
    { id: 'optical-rx-expiring', title: t('Nuskha purana ho raha'), description: t('60 din me khatam hone wale nuskhe — naye test ka mauqa'), size: 'third', sizes: ANY_SIZE, Component: OpticalRxExpiring },
  ],
  useQuickActions: useOpticalActions,
  moneyMap: { productsPath: '/products' },
  guide: [
    { icon: FlaskConical, title: t('Lab aur pickup'), text: t('Jo order lab se late hai wo laal me, aur jo chashma tayyar para hai us ke customer ka number saath — call karein aur baqi paisa bhi le lein.') },
    { icon: FileText, title: t('Eye test aur nuskhe'), text: t('Aaj ke eye test waqt ke hisaab se. Jin ka nuskha purana ho raha hai unhein naye test ke liye bulayein — ye naya chashma bikne ka sab se acha mauqa hai.') },
  ],
});
