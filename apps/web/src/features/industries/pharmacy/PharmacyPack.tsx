import { Pill, LayoutDashboard, AlertTriangle, Beaker, Stethoscope, ShieldAlert, Thermometer, Sparkles } from 'lucide-react';
import type { IndustryPack } from '@/features/industries/_shared/types/industry-pack';

import PharmacyDashboardPage from './pages/PharmacyDashboardPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import NewPrescriptionPage from './pages/NewPrescriptionPage';
import PrescriptionDetailPage from './pages/PrescriptionDetailPage';
import DoctorsPage from './pages/DoctorsPage';
import SaltsPage from './pages/SaltsPage';
import MedicinesPage from './pages/MedicinesPage';
import ExpiringPage from './pages/ExpiringPage';
import PharmacyMedicineWizardPage from './pages/PharmacyMedicineWizardPage';
import PharmacyMedicineDetailPage from './pages/PharmacyMedicineDetailPage';
import ControlledLogPage from './pages/ControlledLogPage';
import TemperatureLogPage from './pages/TemperatureLogPage';

export const PharmacyPack: IndustryPack = {
  id: 'pharmacy',
  name: 'Pharmacy / Medical Store',
  shortName: 'Pharmacy',
  emoji: '💊',
  themeColor: '#0891b2',
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
      label: 'Pharmacy Industry',
      icon: Pill,
      emoji: '💊',
      color: '#0891b2',
      order: 20,
      items: [
        { to: '/pharmacy-medicines/new', label: '+ Add Medicine', icon: Sparkles, badge: 'FAST' },
        { to: '/pharmacy/dashboard', label: 'Pharmacy Dashboard', icon: LayoutDashboard, badge: 'NEW' },
        { to: '/pharmacy/prescriptions', label: 'Prescriptions', icon: AlertTriangle },
        { to: '/pharmacy/medicines', label: 'Medicines', icon: Pill },
        { to: '/pharmacy/salts', label: 'Salts / Drugs', icon: Beaker },
        { to: '/pharmacy/doctors', label: 'Doctors', icon: Stethoscope },
        { to: '/pharmacy/expiring', label: 'Expiring Stock', icon: AlertTriangle },
        { to: '/pharmacy/controlled-log', label: 'Narcotic Register', icon: ShieldAlert },
        { to: '/pharmacy/temperature-log', label: 'Cold Chain', icon: Thermometer },
      ],
    },
  ],

  routes: [
    // ✅ Wizard FIRST (important)
    { path: '/pharmacy-medicines/new', element: PharmacyMedicineWizardPage },
    { path: '/pharmacy-medicines/:id/edit', element: PharmacyMedicineWizardPage },

    { path: '/pharmacy', element: PharmacyDashboardPage },
    { path: '/pharmacy/dashboard', element: PharmacyDashboardPage },
    { path: '/pharmacy/prescriptions/new', element: NewPrescriptionPage },
    { path: '/pharmacy/prescriptions/:id', element: PrescriptionDetailPage },
    { path: '/pharmacy/prescriptions', element: PrescriptionsPage },
    { path: '/pharmacy/doctors', element: DoctorsPage },
    { path: '/pharmacy/salts', element: SaltsPage },
    { path: '/pharmacy/medicines', element: MedicinesPage },

    // optional detail page (if used)
    { path: '/pharmacy-medicines/:id', element: PharmacyMedicineDetailPage },

    { path: '/pharmacy/expiring', element: ExpiringPage },
    { path: '/pharmacy/controlled-log', element: ControlledLogPage },
    { path: '/pharmacy/temperature-log', element: TemperatureLogPage },
  ],

  dashboardComponent: PharmacyDashboardPage,

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
