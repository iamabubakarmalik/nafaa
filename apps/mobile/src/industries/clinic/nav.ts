/** More-menu items for the clinic pack (web ClinicPack navGroups; gathered by ../nav-services.ts). */

import { Building2, HandCoins, Calendar, CalendarPlus, LayoutDashboard, Pill, Syringe, TestTube, Timer, UserCog, Users } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const item = (to: string, label: string, icon: NavItem['icon'], permission: NavItem['permission'], keywords: string): NavItem => ({ to, href: to, label, icon, industries: ['clinic'], permission, module: 'industry', keywords });

export const NAV: NavItem[] = [
  { ...item('/clinic/dashboard', msg('Clinic dashboard'), LayoutDashboard, P.DASHBOARD_VIEW, 'clinic overview doctor'), href: '/clinic' },
  item('/clinic/appointments/new', msg('Reception (token)'), CalendarPlus, P.SERVICE_BOOKINGS_MANAGE, 'token reception walk-in mareez'),
  item('/clinic/queue', msg('Live queue'), Timer, P.SERVICE_BOOKINGS_VIEW, 'queue line waiting token'),
  item('/clinic/appointments', msg('Appointments'), Calendar, P.SERVICE_BOOKINGS_VIEW, 'appointment visit fee'),
  item('/clinic/patients', msg('Patients'), Users, P.CUSTOMERS_VIEW, 'patient mareez mrn'),
  item('/clinic/doctors', msg('Doctors'), UserCog, P.SERVICE_BOOKINGS_VIEW, 'doctor fee share'),
  item('/clinic/doctor-payouts', msg('Doctor payouts'), HandCoins, P.EXPENSES_CREATE, 'doctor share payout slip'),
  item('/clinic/panels', msg('Panels'), Building2, P.CUSTOMERS_VIEW, 'panel company insurance'),
  item('/clinic/prescriptions', msg('Prescriptions'), Pill, P.CLINIC_RECORDS_VIEW, 'nuskha prescription dawai'),
  item('/clinic/lab-orders', msg('Lab'), TestTube, P.CLINIC_RECORDS_VIEW, 'lab test result report'),
  item('/clinic/vaccinations', msg('Vaccinations'), Syringe, P.CLINIC_RECORDS_VIEW, 'vaccine epi dose'),
];
