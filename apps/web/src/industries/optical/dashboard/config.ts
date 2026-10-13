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

const productPath = (id: string) => `/optical-products/${id}`;

function useOpticalActions(): QuickAction[] {
  const { data } = useOverview();
  const { pending, testsLeft } = useOpticalOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Sale karein' },
    { to: '/optical/eye-tests', icon: Eye, label: 'Eye tests', hint: testsLeft ? `${testsLeft} aaj baqi` : 'Appointment' },
    { to: '/optical/prescriptions/new', icon: FilePlus, label: 'Naya nuskha', hint: 'Number likhein' },
    { to: '/optical/lens-orders/new', icon: FlaskConical, label: 'Lens order', hint: 'Lab ko bhejein' },
    { to: '/optical/lens-orders', icon: Glasses, label: 'Orders', hint: pending.lensOrdersReady ? `${pending.lensOrdersReady} tayyar` : `${pending.lensOrdersAtLab} lab me` },
    { to: '/optical/prescriptions', icon: FileText, label: 'Nuskhe', hint: 'Prescriptions' },
    { to: '/optical/optometrists', icon: UserCog, label: 'Doctors', hint: 'Optometrists' },
    { to: '/optical-products/new', icon: Plus, label: 'Naya product', hint: 'Frame / lens' },
    { to: '/optical-products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/purchases', icon: ShoppingBag, label: 'Purchase', hint: 'Maal mangwayein' },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const opticalDashboard = createDashboard({
  label: 'Optical',
  productPath,
  openFrom: 10,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: opticalKpis,
  defaultKpis: ['optical-tests', 'optical-lab', 'optical-ready', 'sales', 'profit', 'optical-receivable'],
  useAttention: useOpticalAttention,
  widgets: [
    { id: 'optical-schedule', title: 'Aaj ke eye test', description: 'Aaj ke appointment, waqt aur doctor ke saath', size: 'third', sizes: ANY_SIZE, Component: OpticalSchedule },
    { id: 'optical-pickup', title: 'Chashma tayyar', description: 'Tayyar chashme jin ke customer ko bulana hai', size: 'third', sizes: ANY_SIZE, Component: OpticalPickup },
    { id: 'optical-lab-late', title: 'Lab se late', description: 'Waade ki date guzar gayi, order abhi nahi aaya', size: 'third', sizes: ANY_SIZE, Component: OpticalLabLate },
  ],
  lateWidgets: [
    { id: 'optical-rx-expiring', title: 'Nuskha purana ho raha', description: '60 din me khatam hone wale nuskhe — naye test ka mauqa', size: 'third', sizes: ANY_SIZE, Component: OpticalRxExpiring },
  ],
  useQuickActions: useOpticalActions,
  moneyMap: { productsPath: '/optical-products' },
  guide: [
    { icon: FlaskConical, title: 'Lab aur pickup', text: 'Jo order lab se late hai wo laal me, aur jo chashma tayyar para hai us ke customer ka number saath — call karein aur baqi paisa bhi le lein.' },
    { icon: FileText, title: 'Eye test aur nuskhe', text: 'Aaj ke eye test waqt ke hisaab se. Jin ka nuskha purana ho raha hai unhein naye test ke liye bulayein — ye naya chashma bikne ka sab se acha mauqa hai.' },
  ],
});
