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
import { t } from '@core/i18n';

const productPath = (id: string) => `/salon-services/${id}`;

function useSalonActions(): QuickAction[] {
  const { data } = useOverview();
  const { today, week, staff, memberships, packages } = useSalonOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/salon/appointments/new', icon: CalendarPlus, label: t('Naya appointment'), hint: t('Waqt book karein') },
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Bill banayein') },
    { to: '/salon/appointments', icon: Calendar, label: t('Appointments'), hint: t('{{count}} aaj baqi', { count: today.pending.length }) },
    { to: '/salon/calendar', icon: Timer, label: t('Calendar'), hint: t('{{count}} agle 7 din', { count: week.count }) },
    { to: '/salon/services', icon: Scissors, label: t('Services'), hint: t('{{value}} services', { value: s?.totalProducts ?? 0 }) },
    { to: '/salon-services/new', icon: Plus, label: t('Nayi service'), hint: t('Rate aur waqt') },
    { to: '/salon/staff', icon: UserCheck, label: t('Staff'), hint: t('{{count}} log', { count: staff.length }) },
    { to: '/salon/memberships', icon: Crown, label: t('Memberships'), hint: t('{{active}} active', { active: memberships.active }) },
    { to: '/salon/packages', icon: BookmarkPlus, label: t('Packages'), hint: t('{{active}} chaalu', { active: packages.active }) },
    { to: '/salon/customers', icon: Heart, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const salonDashboard = createDashboard({
  label: t('Salon'),
  productPath,
  openFrom: 9,
  primaryAction: { to: '/salon/appointments/new', label: t('Naya appointment'), icon: CalendarPlus },
  kpis: salonKpis,
  defaultKpis: ['salon-appointments', 'salon-chairs', 'salon-next', 'profit', 'average', 'cash'],
  useAttention: useSalonAttention,
  widgets: [
    { id: 'salon-appointments', title: t('Aaj ke appointments'), description: t('Chair par, aaye hue aur aane wale — waqt ke hisaab se'), size: 'half', sizes: ANY_SIZE, Component: SalonAppointments },
    { id: 'salon-staff', title: t('Staff ka aaj'), description: t('Kaun masroof hai, kaun farigh, agla appointment'), size: 'half', sizes: ANY_SIZE, Component: SalonStaffBoard },
    { id: 'salon-day', title: t('Aaj ka haal'), description: t('Appointments status ke hisaab se'), size: 'third', sizes: ['third', 'half'], Component: SalonDayStatus },
  ],
  lateWidgets: [
    { id: 'salon-memberships', title: t('Memberships'), description: t('Tiers aur 15 din me khatam hone wali memberships'), size: 'third', sizes: ANY_SIZE, Component: SalonMemberships },
  ],
  useQuickActions: useSalonActions,
  moneyMap: { productsPath: '/salon/services' },
  omit: ['slow-movers'],
  guide: [
    { icon: Calendar, title: t('Aaj ke appointments'), text: t('Jo chair par hai wo sab se upar, phir jo aa kar baithe hain, phir waqt ke hisaab se. 15 min late booking "Late" dikhti hai — call karein ya no-show lagayein.') },
    { icon: Scissors, title: t('Staff ka aaj'), text: t('Har stylist: abhi kis ke saath hai ya farigh hai, aur aaj ke kitne appointments ho gaye. Walk-in aaye to farigh staff foran nazar aata hai.') },
  ],
});
