/**
 * Pharmacy dashboard: the standard dashboard plus expiry, prescriptions,
 * cold chain and controlled-drug compliance.
 */

import {
  BarChart3, Beaker, BookOpen, Building2, CalendarX, FilePlus, FileText, Pill, Plus, Receipt, ShieldAlert, ShoppingBag,
  ShoppingCart, Stethoscope, Thermometer, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { usePharmacyOps } from './usePharmacyOps';
import {
  PharmacyCompliance, PharmacyExpiry, PharmacyPrescriptions, pharmacyKpis, usePharmacyAttention, usePharmacyMoneyNotes,
} from './widgets';

const productPath = (id: string) => `/pharmacy-medicines/${id}`;

function usePharmacyActions(): QuickAction[] {
  const { data } = useOverview();
  const { expiry, rx, medicines, tempBreaches } = usePharmacyOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Dawai bechein' },
    { to: '/pharmacy/prescriptions/new', icon: FilePlus, label: 'Naya nuskha', hint: 'Prescription likhein' },
    { to: '/pharmacy/prescriptions', icon: FileText, label: 'Nuskhe', hint: rx.pending ? `${rx.pending} check baqi` : 'Sab check' },
    { to: '/pharmacy/expiring', icon: CalendarX, label: 'Expiry', hint: expiry.expired.length ? `${expiry.expired.length} expired` : `${expiry.month.length} 30 din me` },
    { to: '/pharmacy/medicines', icon: Pill, label: 'Dawaiyan', hint: `${medicines} medicines` },
    { to: '/pharmacy-medicines/new', icon: Plus, label: 'Nayi dawai', hint: 'Maal me daalein' },
    { to: '/pharmacy/salts', icon: Beaker, label: 'Salts', hint: 'Formula se search' },
    { to: '/pharmacy/doctors', icon: Stethoscope, label: 'Doctors', hint: 'Directory' },
    { to: '/pharmacy/controlled-log', icon: ShieldAlert, label: 'Controlled register', hint: 'Narcotic log' },
    { to: '/pharmacy/temperature-log', icon: Thermometer, label: 'Temp log', hint: tempBreaches ? `${tempBreaches} masle` : 'Fridge theek' },
    { to: '/purchases', icon: ShoppingBag, label: 'Purchase', hint: 'Maal mangwayein' },
    { to: '/suppliers', icon: Building2, label: 'Suppliers', hint: `${s?.totalSuppliers ?? 0} distributor` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const pharmacyDashboard = createDashboard({
  label: 'Pharmacy',
  productPath,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: pharmacyKpis,
  defaultKpis: ['pharmacy-expiry', 'pharmacy-rx', 'profit', 'cash', 'low-stock', 'month'],
  useAttention: usePharmacyAttention,
  widgets: [
    { id: 'pharmacy-expiry', title: 'Expiry ki fehrist', description: 'Expire ho chuke aur 90 din me expire hone wale batch', size: 'half', sizes: ANY_SIZE, Component: PharmacyExpiry },
    { id: 'pharmacy-rx', title: 'Nuskhe', description: 'Check baqi, dene ko tayyar aur aaj diye', size: 'third', sizes: ['third', 'half'], Component: PharmacyPrescriptions },
  ],
  lateWidgets: [
    { id: 'pharmacy-compliance', title: 'Hifazat aur register', description: 'Fridge temperature, controlled dawai aur refill', size: 'third', sizes: ['third', 'half'], Component: PharmacyCompliance },
  ],
  useQuickActions: usePharmacyActions,
  moneyMap: { useNotes: usePharmacyMoneyNotes, productsPath: '/pharmacy/medicines' },
  guide: [
    { icon: CalendarX, title: 'Expiry', text: 'Expire dawai bechna jurm hai aur paisa bhi doobta hai. Is liye har batch ke din aur us ki cost likhi hai — 7 din wale pehle bechein ya supplier ko wapas karein.' },
    { icon: FileText, title: 'Nuskhe aur register', text: 'Kitne nuskhe check ke intezar me hain, kitne dene ko tayyar, fridge ka temperature theek raha ya nahi, aur controlled dawai ka register — sab upar.' },
  ],
});
