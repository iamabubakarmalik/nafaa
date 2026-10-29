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

/**
 * Pharmacy / medical store: medicines with formula and schedule on the
 * shared product pages, the shared counter with a register prompt for
 * controlled medicines, prescriptions, expiry, narcotic register and cold
 * chain.
 */
export const PharmacyPack: IndustryPack = {
  id: 'pharmacy',
  name: 'Pharmacy / Medical Store',
  shortName: 'Pharmacy',
  emoji: '💊',
  priority: 65,
  description:
    'Prescriptions, salts, doctors, batch tracking, expiry alerts, controlled substance register, cold chain temperature logs.',

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
      label: 'Pharmacy',
      icon: Pill,
      emoji: '💊',
      color: '#0891b2',
      order: 20,
      items: [
        { to: '/pharmacy/prescriptions/new', label: 'New prescription', icon: FilePlus, permission: PERMISSIONS.POS_USE },
        { to: '/pharmacy/prescriptions', label: 'Prescriptions', icon: FileText, permission: PERMISSIONS.POS_USE },
        { to: '/pharmacy/medicines', label: 'Medicines', icon: Pill, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/pharmacy/expiring', label: 'Expiry', icon: CalendarX, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/pharmacy/salts', label: 'Salts / formula', icon: Beaker, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/pharmacy/doctors', label: 'Doctors', icon: Stethoscope },
        { to: '/pharmacy/controlled-log', label: 'Narcotic register', icon: ShieldAlert, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/pharmacy/temperature-log', label: 'Cold chain', icon: Thermometer },
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
      { value: 'tablet', label: 'Tablet', hint: '💊', group: 'Dosage' },
      { value: 'capsule', label: 'Capsule', hint: '💊', group: 'Dosage' },
      { value: 'strip', label: 'Strip', hint: '📦', group: 'Pack' },
      { value: 'bottle', label: 'Bottle', hint: '🍶', group: 'Pack' },
      { value: 'vial', label: 'Vial', hint: '💉', group: 'Pack' },
      { value: 'ampoule', label: 'Ampoule', hint: '💉', group: 'Pack' },
      { value: 'tube', label: 'Tube', hint: '🧴', group: 'Pack' },
      { value: 'sachet', label: 'Sachet', hint: '📦', group: 'Pack' },
      { value: 'ml', label: 'Milliliter', hint: '🥛', group: 'Volume' },
      { value: 'gram', label: 'Grams', hint: '⚖️', group: 'Weight' },
      { value: 'pcs', label: 'Pieces', hint: '🔢', group: 'Count' },
      { value: 'box', label: 'Box', hint: '📦', group: 'Pack' },
    ],
  },

  featureFlags: [
    { key: 'pharmacyPrescriptions', label: 'Prescription Tracking', defaultEnabled: true },
    { key: 'pharmacySalts', label: 'Salt / Generic Mapping', defaultEnabled: true },
    { key: 'pharmacyExpiry', label: 'Expiry Alerts', defaultEnabled: true },
    { key: 'pharmacyControlled', label: 'Controlled Substances', defaultEnabled: true },
    { key: 'pharmacyColdChain', label: 'Temperature Logs', defaultEnabled: false },
    { key: 'expiry', label: 'Batch & Expiry Tracking', defaultEnabled: true },
  ],
};
