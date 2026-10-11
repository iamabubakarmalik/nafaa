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

const productPath = (id: string) => `/clinic-services/${id}`;

function useClinicActions(): QuickAction[] {
  const { data } = useOverview();
  const { today, pendingLabs, dueVaccines, totalDoctors } = useClinicOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/clinic/appointments/new', icon: CalendarPlus, label: 'Naya appointment', hint: 'Mareez book karein' },
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Fees / bill' },
    { to: '/clinic/queue', icon: Timer, label: 'Live line', hint: today.waiting ? `${today.waiting} intezar me` : 'Line khaali' },
    { to: '/clinic/appointments', icon: CalendarDays, label: 'Appointments', hint: `${today.total} aaj` },
    { to: '/clinic/patients', icon: Users, label: 'Mareez', hint: 'Record dekhein' },
    { to: '/clinic/doctors', icon: UserCog, label: 'Doctors', hint: `${totalDoctors} doctor` },
    { to: '/clinic/prescriptions', icon: Pill, label: 'Nuskhe', hint: 'Prescriptions' },
    { to: '/clinic/lab-orders', icon: TestTube, label: 'Lab orders', hint: pendingLabs ? `${pendingLabs} baqi` : 'Sab mukammal' },
    { to: '/clinic/vaccinations', icon: Syringe, label: 'Vaccines', hint: dueVaccines ? `${dueVaccines} due` : 'Register' },
    { to: '/clinic-services/new', icon: Plus, label: 'Nayi service', hint: 'Fees list me daalein' },
    { to: '/products', icon: Stethoscope, label: 'Services', hint: `${s?.totalProducts ?? 0} services` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Bill record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const clinicDashboard = createDashboard({
  label: 'Clinic',
  productPath,
  openFrom: 9,
  primaryAction: { to: '/clinic/appointments/new', label: 'Naya appointment', icon: CalendarPlus },
  kpis: clinicKpis,
  defaultKpis: ['clinic-appointments', 'clinic-waiting', 'sales', 'profit', 'clinic-labs', 'clinic-fees-due'],
  useAttention: useClinicAttention,
  widgets: [
    { id: 'clinic-today', title: 'Aaj ke appointment', description: 'Booked, intezar, doctor ke paas aur mukammal', size: 'third', sizes: ['third', 'half'], Component: ClinicToday },
    { id: 'clinic-queue', title: 'Aaj ki line', description: 'Token ke saath aane wale mareez, emergency upar', size: 'third', sizes: ANY_SIZE, Component: ClinicQueue },
    { id: 'clinic-doctors', title: 'Doctors aaj', description: 'Har doctor ke aaj ke mareez', size: 'third', sizes: ANY_SIZE, Component: ClinicDoctors },
  ],
  lateWidgets: [
    { id: 'clinic-top-doctors', title: 'Behtareen doctors', description: '30 din me sab se zyada fees wale doctor', size: 'third', sizes: ANY_SIZE, Component: ClinicTopDoctors },
  ],
  useQuickActions: useClinicActions,
  omit: ['slow-movers'],
  guide: [
    { icon: Timer, title: 'Line aur appointments', text: 'Aaj kitne mareez booked hain, kitne intezar me aur kitne doctor ke paas — emergency hamesha sab se upar. Jo apne waqt par nahi aaya wo "Aaj ka kaam" me aata hai.' },
    { icon: TestTube, title: 'Lab, vaccine aur fees', text: 'Baqi lab reports, agle hafte ki vaccines aur jin mareezon ki fees poori nahi aayi — sab ek jagah, seedha button ke saath.' },
  ],
});
