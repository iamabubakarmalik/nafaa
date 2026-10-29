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
  shortName: 'Clinic',
  emoji: '🩺',
  priority: 66,
  description:
    'Reception tokens, live line, visits with prescriptions and lab, patient records, doctor fees and day close, vaccines.',

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
      label: 'Clinic',
      icon: Stethoscope,
      emoji: '🩺',
      color: '#0891b2',
      order: 20,
      items: [
        { to: '/clinic/dashboard', label: 'Clinic dashboard', icon: LayoutDashboard },
        { to: '/clinic/appointments/new', label: 'Reception (token)', icon: CalendarPlus, permission: BOOKINGS },
        { to: '/clinic/queue', label: 'Live queue', icon: Timer, permission: BOOKINGS },
        { to: '/clinic/appointments', label: 'Appointments', icon: Calendar, permission: BOOKINGS },
        { to: '/clinic/patients', label: 'Patients', icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/clinic/doctors', label: 'Doctors', icon: UserCog, permission: BOOKINGS },
        { to: '/clinic/panels', label: 'Panels', icon: Building2, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/clinic/prescriptions', label: 'Prescriptions', icon: Pill, permission: RECORDS },
        { to: '/clinic/lab-orders', label: 'Lab', icon: TestTube, permission: RECORDS },
        { to: '/clinic/vaccinations', label: 'Vaccinations', icon: Syringe, permission: RECORDS },
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
      { value: 'service', label: 'Consultation / Service', hint: '🩺', group: 'Service' },
      { value: 'session', label: 'Session', hint: '⏱️', group: 'Service' },
      { value: 'visit', label: 'Visit', hint: '🚪', group: 'Service' },
      { value: 'procedure', label: 'Procedure', hint: '⚕️', group: 'Service' },
      { value: 'test', label: 'Lab Test', hint: '🧪', group: 'Lab' },
      { value: 'panel', label: 'Test Panel', hint: '🧪', group: 'Lab' },
      { value: 'dose', label: 'Dose (vaccine)', hint: '💉', group: 'Vaccine' },
      { value: 'vial', label: 'Vial', hint: '💉', group: 'Vaccine' },
      { value: 'hour', label: 'Hour', hint: '⏰', group: 'Time' },
      { value: 'pcs', label: 'Piece (supplies)', hint: '🔢', group: 'Supplies' },
    ],
  },

  featureFlags: [
    { key: 'clinicAppointments', label: 'Appointment Booking', defaultEnabled: true },
    { key: 'clinicQueue', label: 'Live Token Queue', defaultEnabled: true },
    { key: 'clinicPrescriptions', label: 'e-Prescriptions', defaultEnabled: true },
    { key: 'clinicLabOrders', label: 'Lab Orders', defaultEnabled: false },
    { key: 'clinicVaccinations', label: 'Vaccination Register', defaultEnabled: false },
    { key: 'clinicVitals', label: 'Vitals Recording', defaultEnabled: true },
  ],
};
