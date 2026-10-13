/**
 * Salon dashboard: the standard dashboard plus today's appointments, staff
 * load, the day's status and memberships.
 */

import {
  BarChart3, BookmarkPlus, BookOpen, Calendar, CalendarPlus, Crown, Heart, Plus, Receipt, Scissors, ShoppingCart, Timer, UserCheck,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { useMasked } from '@modules/dashboard/engine';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useSalonOps } from './useSalonOps';
import {
  SalonAppointments, SalonDayStatus, SalonMemberships, SalonStaffBoard, salonKpis, useSalonAttention,
} from './widgets';

const productPath = (id: string) => `/salon-services/${id}`;

function useSalonActions(): QuickAction[] {
  const { data } = useOverview();
  const { today, week, staff, memberships, packages } = useSalonOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/salon/appointments/new', icon: CalendarPlus, label: 'Naya appointment', hint: 'Waqt book karein' },
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Bill banayein' },
    { to: '/salon/appointments', icon: Calendar, label: 'Appointments', hint: `${today.pending.length} aaj baqi` },
    { to: '/salon/calendar', icon: Timer, label: 'Calendar', hint: `${week.count} agle 7 din` },
    { to: '/salon/services', icon: Scissors, label: 'Services', hint: `${s?.totalProducts ?? 0} services` },
    { to: '/salon-services/new', icon: Plus, label: 'Nayi service', hint: 'Rate aur waqt' },
    { to: '/salon/staff', icon: UserCheck, label: 'Staff', hint: `${staff.length} log` },
    { to: '/salon/memberships', icon: Crown, label: 'Memberships', hint: `${memberships.active} active` },
    { to: '/salon/packages', icon: BookmarkPlus, label: 'Packages', hint: `${packages.active} chaalu` },
    { to: '/salon/customers', icon: Heart, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const salonDashboard = createDashboard({
  label: 'Salon',
  productPath,
  openFrom: 9,
  primaryAction: { to: '/salon/appointments/new', label: 'Naya appointment', icon: CalendarPlus },
  kpis: salonKpis,
  defaultKpis: ['salon-appointments', 'salon-chairs', 'salon-next', 'profit', 'average', 'cash'],
  useAttention: useSalonAttention,
  widgets: [
    { id: 'salon-appointments', title: 'Aaj ke appointments', description: 'Chair par, aaye hue aur aane wale — waqt ke hisaab se', size: 'half', sizes: ANY_SIZE, Component: SalonAppointments },
    { id: 'salon-staff', title: 'Staff ka aaj', description: 'Kaun masroof hai, kaun farigh, agla appointment', size: 'half', sizes: ANY_SIZE, Component: SalonStaffBoard },
    { id: 'salon-day', title: 'Aaj ka haal', description: 'Appointments status ke hisaab se', size: 'third', sizes: ['third', 'half'], Component: SalonDayStatus },
  ],
  lateWidgets: [
    { id: 'salon-memberships', title: 'Memberships', description: 'Tiers aur 15 din me khatam hone wali memberships', size: 'third', sizes: ANY_SIZE, Component: SalonMemberships },
  ],
  useQuickActions: useSalonActions,
  moneyMap: { productsPath: '/salon/services' },
  omit: ['slow-movers'],
  guide: [
    { icon: Calendar, title: 'Aaj ke appointments', text: 'Jo chair par hai wo sab se upar, phir jo aa kar baithe hain, phir waqt ke hisaab se. 15 min late booking "Late" dikhti hai — call karein ya no-show lagayein.' },
    { icon: Scissors, title: 'Staff ka aaj', text: 'Har stylist: abhi kis ke saath hai ya farigh hai, aur aaj ke kitne appointments ho gaye. Walk-in aaye to farigh staff foran nazar aata hai.' },
  ],
});
