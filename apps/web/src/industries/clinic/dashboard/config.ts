/**
 * Clinic dashboard: the standard dashboard plus appointments, the live
 * queue, doctor load, lab orders and vaccinations.
 */

import {
  BarChart3, BookOpen, CalendarDays, CalendarPlus, Pill, Plus, Receipt, ShoppingCart, Stethoscope, Syringe, TestTube, Timer,
  UserCog, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useClinicOps } from './useClinicOps';
import { ClinicDoctors, ClinicQueue, ClinicToday, ClinicTopDoctors, clinicKpis, useClinicAttention } from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/clinic-services/${id}`;

function useClinicActions(): QuickAction[] {
  const { data } = useOverview();
  const { today, pendingLabs, dueVaccines, totalDoctors } = useClinicOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/clinic/appointments/new', icon: CalendarPlus, label: t('Naya appointment'), hint: t('Mareez book karein') },
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Fees / bill') },
    { to: '/clinic/queue', icon: Timer, label: t('Live line'), hint: today.waiting ? t('{{waiting}} intezar me', { waiting: today.waiting }) : t('Line khaali') },
    { to: '/clinic/appointments', icon: CalendarDays, label: t('Appointments'), hint: t('{{total}} aaj', { total: today.total }) },
    { to: '/clinic/patients', icon: Users, label: t('Mareez'), hint: t('Record dekhein') },
    { to: '/clinic/doctors', icon: UserCog, label: t('Doctors'), hint: t('{{totalDoctors}} doctor', { totalDoctors }) },
    { to: '/clinic/prescriptions', icon: Pill, label: t('Nuskhe'), hint: t('Prescriptions') },
    { to: '/clinic/lab-orders', icon: TestTube, label: t('Lab orders'), hint: pendingLabs ? t('{{pendingLabs}} baqi', { pendingLabs }) : t('Sab mukammal') },
    { to: '/clinic/vaccinations', icon: Syringe, label: t('Vaccines'), hint: dueVaccines ? t('{{dueVaccines}} due', { dueVaccines }) : t('Register') },
    { to: '/clinic-services/new', icon: Plus, label: t('Nayi service'), hint: t('Fees list me daalein') },
    { to: '/products', icon: Stethoscope, label: t('Services'), hint: t('{{value}} services', { value: s?.totalProducts ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Bill record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const clinicDashboard = createDashboard({
  label: t('Clinic'),
  productPath,
  openFrom: 9,
  primaryAction: { to: '/clinic/appointments/new', label: t('Naya appointment'), icon: CalendarPlus },
  kpis: clinicKpis,
  defaultKpis: ['clinic-appointments', 'clinic-waiting', 'sales', 'profit', 'clinic-labs', 'clinic-fees-due'],
  useAttention: useClinicAttention,
  widgets: [
    { id: 'clinic-today', title: t('Aaj ke appointment'), description: t('Booked, intezar, doctor ke paas aur mukammal'), size: 'third', sizes: ['third', 'half'], Component: ClinicToday },
    { id: 'clinic-queue', title: t('Aaj ki line'), description: t('Token ke saath aane wale mareez, emergency upar'), size: 'third', sizes: ANY_SIZE, Component: ClinicQueue },
    { id: 'clinic-doctors', title: t('Doctors aaj'), description: t('Har doctor ke aaj ke mareez'), size: 'third', sizes: ANY_SIZE, Component: ClinicDoctors },
  ],
  lateWidgets: [
    { id: 'clinic-top-doctors', title: t('Behtareen doctors'), description: t('30 din me sab se zyada fees wale doctor'), size: 'third', sizes: ANY_SIZE, Component: ClinicTopDoctors },
  ],
  useQuickActions: useClinicActions,
  omit: ['slow-movers'],
  guide: [
    { icon: Timer, title: t('Line aur appointments'), text: t('Aaj kitne mareez booked hain, kitne intezar me aur kitne doctor ke paas — emergency hamesha sab se upar. Jo apne waqt par nahi aaya wo "Aaj ka kaam" me aata hai.') },
    { icon: TestTube, title: t('Lab, vaccine aur fees'), text: t('Baqi lab reports, agle hafte ki vaccines aur jin mareezon ki fees poori nahi aayi — sab ek jagah, seedha button ke saath.') },
  ],
});
