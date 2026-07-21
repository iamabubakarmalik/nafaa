import {
  Stethoscope, LayoutDashboard, Calendar, Timer, UserCog, Users,
  Pill, TestTube, Syringe, Activity,
} from 'lucide-react';
import type { IndustryPack } from '@/features/industries/_shared/types/industry-pack';

import ClinicDashboardPage from './pages/ClinicDashboardPage';
import DoctorsPage from './pages/DoctorsPage';
import PatientsPage from './pages/PatientsPage';
import ClinicAppointmentsPage from './pages/ClinicAppointmentsPage';
import ClinicNewAppointmentPage from './pages/ClinicNewAppointmentPage';
import ClinicAppointmentDetailPage from './pages/ClinicAppointmentDetailPage';
import ClinicPrescriptionsPage from './pages/ClinicPrescriptionsPage';
import LabOrdersPage from './pages/LabOrdersPage';
import VaccinationsPage from './pages/VaccinationsPage';
import QueuePage from './pages/QueuePage';

/**
 * Clinic / Doctor / Medical Practice industry pack.
 * Appointments, patient records (EMR-lite), prescriptions,
 * lab orders, vaccinations, live token queue.
 */
export const ClinicPack: IndustryPack = {
  id: 'clinic',
  name: 'Clinic / Doctor',
  shortName: 'Clinic',
  emoji: '🩺',
  themeColor: '#0891b2',
  priority: 66,
  description:
    'Appointments, patient records, prescriptions, lab orders, vaccinations, live token queue.',

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
      label: 'Clinic Industry',
      icon: Stethoscope,
      emoji: '🩺',
      color: '#0891b2',
      order: 20,
      items: [
        { to: '/clinic/dashboard', label: 'Clinic Dashboard', icon: LayoutDashboard, badge: 'NEW' },
        { to: '/clinic/appointments/new', label: 'New Appointment', icon: Calendar, badge: 'FAST' },
        { to: '/clinic/appointments', label: 'Appointments', icon: Calendar },
        { to: '/clinic/queue', label: 'Live Queue', icon: Timer },
        { to: '/clinic/doctors', label: 'Doctors', icon: UserCog },
        { to: '/clinic/patients', label: 'Patients', icon: Users },
        { to: '/clinic/prescriptions', label: 'Prescriptions', icon: Pill },
        { to: '/clinic/lab-orders', label: 'Lab Orders', icon: TestTube },
        { to: '/clinic/vaccinations', label: 'Vaccinations', icon: Syringe },
      ],
    },
  ],

  routes: [
    { path: '/clinic', element: ClinicDashboardPage },
    { path: '/clinic/dashboard', element: ClinicDashboardPage },
    { path: '/clinic/appointments/new', element: ClinicNewAppointmentPage },
    { path: '/clinic/appointments/:id', element: ClinicAppointmentDetailPage },
    { path: '/clinic/appointments', element: ClinicAppointmentsPage },
    { path: '/clinic/queue', element: QueuePage },
    { path: '/clinic/doctors', element: DoctorsPage },
    { path: '/clinic/patients', element: PatientsPage },
    { path: '/clinic/prescriptions', element: ClinicPrescriptionsPage },
    { path: '/clinic/lab-orders', element: LabOrdersPage },
    { path: '/clinic/vaccinations', element: VaccinationsPage },
  ],

  dashboardComponent: ClinicDashboardPage,

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
