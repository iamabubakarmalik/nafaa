import { Beaker, CalendarX, FilePlus, FileText, Pill, ShieldAlert, Stethoscope, Thermometer } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import PharmacyDashboard from './dashboard/PharmacyDashboard';
import PrescriptionsPage from './pages/PrescriptionsPage';
import NewPrescriptionPage from './pages/NewPrescriptionPage';
import PrescriptionDetailPage from './pages/PrescriptionDetailPage';
import DoctorsPage from './pages/PharmacyDoctorsPage';
import SaltsPage from './pages/SaltsPage';
import ExpiringPage from './pages/ExpiringPage';
import ControlledLogPage from './pages/ControlledLogPage';
import TemperatureLogPage from './pages/TemperatureLogPage';
import PharmacyProducts from './products/PharmacyProducts';
import PharmacyProductEditor from './products/PharmacyProductEditor';
import PharmacyProductDetail from './products/PharmacyProductDetail';
import { t } from '@core/i18n';

/**
 * Pharmacy / medical store: medicines with formula and schedule on the
 * shared product pages, the shared counter with a register prompt for
 * controlled medicines, prescriptions, expiry, narcotic register and cold
 * chain.
 */
export const PharmacyPack: IndustryPack = {
  id: 'pharmacy',
  name: 'Pharmacy / Medical Store',
  shortName: t('Pharmacy'),
  emoji: '💊',
  priority: 65,
  description:
    t('Prescriptions, salts, doctors, batch tracking, expiry alerts, controlled substance register, cold chain temperature logs.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('PHARMACY') ||
      type.includes('MEDICAL') ||
      type.includes('CHEMIST') ||
      type.includes('DRUG')
    );
  },

  navGroups: [
    {
      label: t('Pharmacy'),
      icon: Pill,
      emoji: '💊',
      color: '#0891b2',
      order: 20,
      items: [
        { to: '/pharmacy/prescriptions/new', label: t('New prescription'), icon: FilePlus, permission: PERMISSIONS.POS_USE },
        { to: '/pharmacy/prescriptions', label: t('Prescriptions'), icon: FileText, permission: PERMISSIONS.POS_USE },
        { to: '/pharmacy/medicines', label: t('Medicines'), icon: Pill, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/pharmacy/expiring', label: t('Expiry'), icon: CalendarX, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/pharmacy/salts', label: t('Salts / formula'), icon: Beaker, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/pharmacy/doctors', label: t('Doctors'), icon: Stethoscope },
        { to: '/pharmacy/controlled-log', label: t('Narcotic register'), icon: ShieldAlert, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/pharmacy/temperature-log', label: t('Cold chain'), icon: Thermometer },
      ],
    },
  ],

  routes: [
    { path: '/pharmacy-medicines/new', element: PharmacyProductEditor, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/pharmacy-medicines/:id/edit', element: PharmacyProductEditor, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/pharmacy-medicines/:id', element: PharmacyProductDetail, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/pharmacy/medicines', element: PharmacyProducts, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/pharmacy', element: PharmacyDashboard },
    { path: '/pharmacy/dashboard', element: PharmacyDashboard },
    { path: '/pharmacy/prescriptions/new', element: NewPrescriptionPage, permission: PERMISSIONS.POS_USE },
    { path: '/pharmacy/prescriptions/:id', element: PrescriptionDetailPage, permission: PERMISSIONS.POS_USE },
    { path: '/pharmacy/prescriptions', element: PrescriptionsPage, permission: PERMISSIONS.POS_USE },
    { path: '/pharmacy/doctors', element: DoctorsPage },
    { path: '/pharmacy/salts', element: SaltsPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/pharmacy/expiring', element: ExpiringPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/pharmacy/controlled-log', element: ControlledLogPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/pharmacy/temperature-log', element: TemperatureLogPage },
  ],

  dashboardComponent: PharmacyDashboard,

  productForm: {
    defaultUnit: 'tablet',
    unitOptions: [
      { value: 'tablet', label: t('Tablet'), hint: '💊', group: t('Dosage') },
      { value: 'capsule', label: t('Capsule'), hint: '💊', group: t('Dosage') },
      { value: 'strip', label: t('Strip'), hint: '📦', group: t('Pack') },
      { value: 'bottle', label: t('Bottle'), hint: '🍶', group: t('Pack') },
      { value: 'vial', label: t('Vial'), hint: '💉', group: t('Pack') },
      { value: 'ampoule', label: t('Ampoule'), hint: '💉', group: t('Pack') },
      { value: 'tube', label: t('Tube'), hint: '🧴', group: t('Pack') },
      { value: 'sachet', label: t('Sachet'), hint: '📦', group: t('Pack') },
      { value: 'ml', label: t('Milliliter'), hint: '🥛', group: t('Volume') },
      { value: 'gram', label: t('Grams'), hint: '⚖️', group: t('Weight') },
      { value: 'pcs', label: t('Pieces'), hint: '🔢', group: t('Count') },
      { value: 'box', label: t('Box'), hint: '📦', group: t('Pack') },
    ],
  },

  featureFlags: [
    { key: 'pharmacyPrescriptions', label: t('Prescription Tracking'), defaultEnabled: true },
    { key: 'pharmacySalts', label: t('Salt / Generic Mapping'), defaultEnabled: true },
    { key: 'pharmacyExpiry', label: t('Expiry Alerts'), defaultEnabled: true },
    { key: 'pharmacyControlled', label: t('Controlled Substances'), defaultEnabled: true },
    { key: 'pharmacyColdChain', label: t('Temperature Logs'), defaultEnabled: false },
    { key: 'expiry', label: t('Batch & Expiry Tracking'), defaultEnabled: true },
  ],
};
