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
import { t } from '@core/i18n';

const productPath = (id: string) => `/pharmacy-medicines/${id}`;

function usePharmacyActions(): QuickAction[] {
  const { data } = useOverview();
  const { expiry, rx, medicines, tempBreaches } = usePharmacyOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Dawai bechein') },
    { to: '/pharmacy/prescriptions/new', icon: FilePlus, label: t('Naya nuskha'), hint: t('Prescription likhein') },
    { to: '/pharmacy/prescriptions', icon: FileText, label: t('Nuskhe'), hint: rx.pending ? t('{{pending}} check baqi', { pending: rx.pending }) : t('Sab check') },
    { to: '/pharmacy/expiring', icon: CalendarX, label: t('Expiry'), hint: expiry.expired.length ? t('{{count}} expired', { count: expiry.expired.length }) : t('{{count}} 30 din me', { count: expiry.month.length }) },
    { to: '/pharmacy/medicines', icon: Pill, label: t('Dawaiyan'), hint: t('{{medicines}} medicines', { medicines }) },
    { to: '/pharmacy-medicines/new', icon: Plus, label: t('Nayi dawai'), hint: t('Maal me daalein') },
    { to: '/pharmacy/salts', icon: Beaker, label: t('Salts'), hint: t('Formula se search') },
    { to: '/pharmacy/doctors', icon: Stethoscope, label: t('Doctors'), hint: t('Directory') },
    { to: '/pharmacy/controlled-log', icon: ShieldAlert, label: t('Controlled register'), hint: t('Narcotic log') },
    { to: '/pharmacy/temperature-log', icon: Thermometer, label: t('Temp log'), hint: tempBreaches ? t('{{tempBreaches}} masle', { tempBreaches }) : t('Fridge theek') },
    { to: '/purchases', icon: ShoppingBag, label: t('Purchase'), hint: t('Maal mangwayein') },
    { to: '/suppliers', icon: Building2, label: t('Suppliers'), hint: t('{{value}} distributor', { value: s?.totalSuppliers ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const pharmacyDashboard = createDashboard({
  label: t('Pharmacy'),
  productPath,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: pharmacyKpis,
  defaultKpis: ['pharmacy-expiry', 'pharmacy-rx', 'profit', 'cash', 'low-stock', 'month'],
  useAttention: usePharmacyAttention,
  widgets: [
    { id: 'pharmacy-expiry', title: t('Expiry ki fehrist'), description: t('Expire ho chuke aur 90 din me expire hone wale batch'), size: 'half', sizes: ANY_SIZE, Component: PharmacyExpiry },
    { id: 'pharmacy-rx', title: t('Nuskhe'), description: t('Check baqi, dene ko tayyar aur aaj diye'), size: 'third', sizes: ['third', 'half'], Component: PharmacyPrescriptions },
  ],
  lateWidgets: [
    { id: 'pharmacy-compliance', title: t('Hifazat aur register'), description: t('Fridge temperature, controlled dawai aur refill'), size: 'third', sizes: ['third', 'half'], Component: PharmacyCompliance },
  ],
  useQuickActions: usePharmacyActions,
  moneyMap: { useNotes: usePharmacyMoneyNotes, productsPath: '/pharmacy/medicines' },
  guide: [
    { icon: CalendarX, title: t('Expiry'), text: t('Expire dawai bechna jurm hai aur paisa bhi doobta hai. Is liye har batch ke din aur us ki cost likhi hai — 7 din wale pehle bechein ya supplier ko wapas karein.') },
    { icon: FileText, title: t('Nuskhe aur register'), text: t('Kitne nuskhe check ke intezar me hain, kitne dene ko tayyar, fridge ka temperature theek raha ya nahi, aur controlled dawai ka register — sab upar.') },
  ],
});
