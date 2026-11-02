import { Scissors, LayoutDashboard, Calendar, Timer, UserCheck, Award, BookmarkPlus, Heart, Receipt, Ticket } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import SalonDashboard from './dashboard/SalonDashboard';
import AppointmentsPage from './pages/AppointmentsPage';
import CalendarViewPage from './pages/CalendarViewPage';
import ServicesPage from './pages/ServicesPage';
import StaffPage from './pages/StaffPage';
import NewAppointmentPage from './pages/NewAppointmentPage';
import AppointmentDetailPage from './pages/AppointmentDetailPage';
import MembershipsPage from './pages/MembershipsPage';
import PackagesPage from './pages/PackagesPage';
import CustomersPage from './pages/CustomersPage';
import GiftVouchersPage from './pages/GiftVouchersPage';
import CommissionPayoutPage from './pages/CommissionPayoutPage';
import SalonServiceWizardPage from './pages/SalonServiceWizardPage';
import SalonServiceDetailPage from './pages/SalonServiceDetailPage';
import { t } from '@core/i18n';

/**
 * Salon / Beauty Parlour / Spa industry pack.
 * Appointments, services, staff commissions and payouts, memberships,
 * packages, gift vouchers.
 */
export const SalonPack: IndustryPack = {
  id: 'salon',
  name: 'Salon / Beauty Parlour',
  shortName: t('Salon'),
  emoji: '💇',
  priority: 55,
  description:
    t('Appointment booking, service catalog, staff commissions, memberships, prepaid packages, customer profiles.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('SALON') ||
      type.includes('PARLOUR') ||
      type.includes('PARLOR') ||
      type.includes('BEAUTY') ||
      type.includes('SPA') ||
      type.includes('BARBER')
    );
  },

  navGroups: [
    {
      label: t('Salon'),
      icon: Scissors,
      emoji: '💇',
      color: '#db2777',
      order: 20,
      items: [
        { to: '/salon/dashboard', label: t('Salon dashboard'), icon: LayoutDashboard },
        { to: '/pos', label: t('Salon counter'), icon: Receipt },
        { to: '/salon/appointments', label: t('Appointments'), icon: Calendar },
        { to: '/salon/calendar', label: t('Calendar'), icon: Timer },
        { to: '/salon/services', label: t('Services'), icon: Scissors },
        { to: '/salon/staff', label: t('Stylists & commission'), icon: UserCheck },
        { to: '/salon/memberships', label: t('Memberships'), icon: Award },
        { to: '/salon/packages', label: t('Packages'), icon: BookmarkPlus },
        { to: '/salon/gift-vouchers', label: t('Gift vouchers'), icon: Ticket },
        { to: '/salon/customers', label: t('Salon customers'), icon: Heart },
      ],
    },
  ],

  routes: [
    // The service form comes before the detail route so "new" is not read as an id.
    { path: '/salon-services/new', element: SalonServiceWizardPage },
    { path: '/salon-services/:id/edit', element: SalonServiceWizardPage },

    { path: '/salon', element: SalonDashboard },
    { path: '/salon/dashboard', element: SalonDashboard },
    { path: '/salon/appointments/new', element: NewAppointmentPage },
    { path: '/salon/appointments/:id', element: AppointmentDetailPage },
    { path: '/salon/appointments', element: AppointmentsPage },
    { path: '/salon/calendar', element: CalendarViewPage },

    { path: '/salon/services', element: ServicesPage },
    { path: '/salon-services/:id', element: SalonServiceDetailPage },

    { path: '/salon/staff', element: StaffPage },
    { path: '/salon/staff/:id/payout', element: CommissionPayoutPage },
    { path: '/salon/memberships', element: MembershipsPage },
    { path: '/salon/packages', element: PackagesPage },
    { path: '/salon/gift-vouchers', element: GiftVouchersPage },
    { path: '/salon/customers', element: CustomersPage },
  ],

  dashboardComponent: SalonDashboard,

  productForm: {
    defaultUnit: 'service',
    unitOptions: [
      { value: 'service', label: t('Service'), hint: '💇', group: t('Service') },
      { value: 'session', label: t('Session'), hint: '⏱️', group: t('Service') },
      { value: 'hour', label: t('Hour'), hint: '⏰', group: t('Time') },
      { value: 'pcs', label: t('Pieces'), hint: '🔢', group: t('Product') },
      { value: 'bottle', label: t('Bottle'), hint: '🍶', group: t('Product') },
      { value: 'ml', label: t('Milliliter'), hint: '🥛', group: t('Volume') },
      { value: 'gram', label: t('Grams'), hint: '⚖️', group: t('Weight') },
    ],
  },

  featureFlags: [
    { key: 'salonAppointments', label: t('Appointment Booking'), defaultEnabled: true },
    { key: 'salonMemberships', label: t('Memberships'), defaultEnabled: true },
    { key: 'salonPackages', label: t('Prepaid Packages'), defaultEnabled: true },
    { key: 'salonCommissions', label: t('Staff Commissions'), defaultEnabled: true },
  ],
};
