import {
  Stethoscope, LayoutDashboard, Calendar, CalendarPlus, Timer, UserCog, Users, Pill, TestTube, Syringe, Building2,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import ClinicDashboard from './dashboard/ClinicDashboard';
import DoctorsPage from './pages/DoctorsPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import PanelsPage from './pages/PanelsPage';
import PanelStatementPage from './pages/PanelStatementPage';
import ClinicAppointmentsPage from './pages/ClinicAppointmentsPage';
import ClinicNewAppointmentPage from './pages/ClinicNewAppointmentPage';
import ClinicAppointmentDetailPage from './pages/ClinicAppointmentDetailPage';
import ClinicPrescriptionsPage from './pages/ClinicPrescriptionsPage';
import LabOrdersPage from './pages/LabOrdersPage';
import VaccinationsPage from './pages/VaccinationsPage';
import QueuePage from './pages/QueuePage';
import { t } from '@core/i18n';

const BOOKINGS = PERMISSIONS.SERVICE_BOOKINGS_VIEW;
const RECORDS = PERMISSIONS.CLINIC_RECORDS_VIEW;

/**
 * Clinic / Doctor / Dental / Lab pack: reception and tokens, live line,
 * visits (vitals, notes, prescriptions, lab), patient records, doctors with
 * fees, day close and share payouts, vaccines, company panels. Medical
 * pages need records view; the patient directory and panels need customers
 * view, a panel statement khata view.
 */
export const ClinicPack: IndustryPack = {
  id: 'clinic',
  name: 'Clinic / Doctor',
  shortName: t('Clinic'),
  emoji: '🩺',
  priority: 66,
  description:
    t('Reception tokens, live line, visits with prescriptions and lab, patient records, doctor fees and day close, vaccines.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('CLINIC') ||
      type.includes('DOCTOR') ||
      type.includes('HOSPITAL') ||
      type.includes('DENTAL') ||
      type.includes('DENTIST') ||
      type.includes('THERAPY') ||
      type.includes('PHYSIO') ||
      type.includes('VET') ||
      type.includes('DIAGNOSTIC')
    );
  },

  navGroups: [
    {
      label: t('Clinic'),
      icon: Stethoscope,
      emoji: '🩺',
      color: '#0891b2',
      order: 20,
      items: [
        { to: '/clinic/dashboard', label: t('Clinic dashboard'), icon: LayoutDashboard },
        { to: '/clinic/appointments/new', label: t('Reception (token)'), icon: CalendarPlus, permission: BOOKINGS },
        { to: '/clinic/queue', label: t('Live queue'), icon: Timer, permission: BOOKINGS },
        { to: '/clinic/appointments', label: t('Appointments'), icon: Calendar, permission: BOOKINGS },
        { to: '/clinic/patients', label: t('Patients'), icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/clinic/doctors', label: t('Doctors'), icon: UserCog, permission: BOOKINGS },
        { to: '/clinic/panels', label: t('Panels'), icon: Building2, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/clinic/prescriptions', label: t('Prescriptions'), icon: Pill, permission: RECORDS },
        { to: '/clinic/lab-orders', label: t('Lab'), icon: TestTube, permission: RECORDS },
        { to: '/clinic/vaccinations', label: t('Vaccinations'), icon: Syringe, permission: RECORDS },
      ],
    },
  ],

  routes: [
    { path: '/clinic', element: ClinicDashboard },
    { path: '/clinic/dashboard', element: ClinicDashboard },
    { path: '/clinic/appointments/new', element: ClinicNewAppointmentPage, permission: BOOKINGS },
    { path: '/clinic/appointments/:id', element: ClinicAppointmentDetailPage, permission: BOOKINGS },
    { path: '/clinic/appointments', element: ClinicAppointmentsPage, permission: BOOKINGS },
    { path: '/clinic/queue', element: QueuePage, permission: BOOKINGS },
    { path: '/clinic/doctors', element: DoctorsPage, permission: BOOKINGS },
    { path: '/clinic/patients/:id', element: PatientDetailPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/clinic/patients', element: PatientsPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/clinic/panels/:id', element: PanelStatementPage, permission: PERMISSIONS.KHATA_VIEW },
    { path: '/clinic/panels', element: PanelsPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/clinic/prescriptions', element: ClinicPrescriptionsPage, permission: RECORDS },
    { path: '/clinic/lab-orders', element: LabOrdersPage, permission: RECORDS },
    { path: '/clinic/vaccinations', element: VaccinationsPage, permission: RECORDS },
  ],

  dashboardComponent: ClinicDashboard,

  productForm: {
    defaultUnit: 'service',
    unitOptions: [
      { value: 'service', label: t('Consultation / Service'), hint: '🩺', group: t('Service') },
      { value: 'session', label: t('Session'), hint: '⏱️', group: t('Service') },
      { value: 'visit', label: t('Visit'), hint: '🚪', group: t('Service') },
      { value: 'procedure', label: t('Procedure'), hint: '⚕️', group: t('Service') },
      { value: 'test', label: t('Lab Test'), hint: '🧪', group: t('Lab') },
      { value: 'panel', label: t('Test Panel'), hint: '🧪', group: t('Lab') },
      { value: 'dose', label: t('Dose (vaccine)'), hint: '💉', group: t('Vaccine') },
      { value: 'vial', label: t('Vial'), hint: '💉', group: t('Vaccine') },
      { value: 'hour', label: t('Hour'), hint: '⏰', group: t('Time') },
      { value: 'pcs', label: t('Piece (supplies)'), hint: '🔢', group: t('Supplies') },
    ],
  },

  featureFlags: [
    { key: 'clinicAppointments', label: t('Appointment Booking'), defaultEnabled: true },
    { key: 'clinicQueue', label: t('Live Token Queue'), defaultEnabled: true },
    { key: 'clinicPrescriptions', label: t('e-Prescriptions'), defaultEnabled: true },
    { key: 'clinicLabOrders', label: t('Lab Orders'), defaultEnabled: false },
    { key: 'clinicVaccinations', label: t('Vaccination Register'), defaultEnabled: false },
    { key: 'clinicVitals', label: t('Vitals Recording'), defaultEnabled: true },
  ],
};
