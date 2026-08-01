import {
  LayoutDashboard, Glasses, Eye, FileText, UserCog, FlaskConical,
  Calendar, Sparkles,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import OpticalDashboardPage from './pages/OpticalDashboardPage';
import OpticalProductsPage from './pages/OpticalProductsPage';
import OpticalProductWizardPage from './pages/OpticalProductWizardPage';
import OpticalProductDetailPage from './pages/OpticalProductDetailPage';
import OpticalPosPage from './pages/OpticalPosPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import PrescriptionFormPage from './pages/PrescriptionFormPage';
import PrescriptionDetailPage from './pages/PrescriptionDetailPage';
import EyeTestsPage from './pages/EyeTestsPage';
import EyeTestDetailPage from './pages/EyeTestDetailPage';
import OptometristsPage from './pages/OptometristsPage';
import LensOrdersPage from './pages/LensOrdersPage';
import LensOrderFormPage from './pages/LensOrderFormPage';
import LensOrderDetailPage from './pages/LensOrderDetailPage';

export const OpticalPack: IndustryPack = {
  id: 'optical',
  name: 'Optical & Eyewear',
  shortName: 'Optical',
  emoji: '👓',
  themeColor: '#06b6d4',
  priority: 76,
  description:
    'Prescriptions (SPH/CYL/AXIS), frames, lenses, contact lenses, eye tests with optometrists, lab lens orders.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('OPTICAL') || type.includes('EYEWEAR') ||
      type.includes('OPTOMETRY') || type.includes('OPTICIAN')
    );
  },

  navGroups: [
    {
      label: 'Optical',
      icon: Glasses,
      emoji: '👓',
      color: '#06b6d4',
      order: 20,
      items: [
        { to: '/optical/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/optical/eye-tests', label: 'Eye Tests', icon: Eye, badge: 'TODAY' },
        { to: '/optical/prescriptions', label: 'Prescriptions', icon: FileText },
        { to: '/optical/optometrists', label: 'Optometrists', icon: UserCog },
        { to: '/optical/lens-orders', label: 'Lens Orders', icon: FlaskConical, badge: 'LAB' },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: OpticalPosPage },

    { path: '/optical-products/new', element: OpticalProductWizardPage },
    { path: '/optical-products/:id/edit', element: OpticalProductWizardPage },
    { path: '/optical-products/:id', element: OpticalProductDetailPage },
    { path: '/optical-products', element: OpticalProductsPage },

    { path: '/optical', element: OpticalDashboardPage },
    { path: '/optical/dashboard', element: OpticalDashboardPage },

    { path: '/optical/prescriptions/new', element: PrescriptionFormPage },
    { path: '/optical/prescriptions/:id/edit', element: PrescriptionFormPage },
    { path: '/optical/prescriptions/:id', element: PrescriptionDetailPage },
    { path: '/optical/prescriptions', element: PrescriptionsPage },

    { path: '/optical/eye-tests/:id', element: EyeTestDetailPage },
    { path: '/optical/eye-tests', element: EyeTestsPage },

    { path: '/optical/optometrists', element: OptometristsPage },

    { path: '/optical/lens-orders/new', element: LensOrderFormPage },
    { path: '/optical/lens-orders/:id', element: LensOrderDetailPage },
    { path: '/optical/lens-orders', element: LensOrdersPage },
  ],

  dashboardComponent: OpticalDashboardPage,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Piece', hint: '👓', group: 'Count' },
      { value: 'pair', label: 'Pair', hint: '🕶️', group: 'Count' },
      { value: 'box', label: 'Box', hint: '📦', group: 'Count' },
      { value: 'pack', label: 'Pack', hint: '📦', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'opticalPrescriptions', label: 'Prescriptions (SPH/CYL/AXIS)', defaultEnabled: true },
    { key: 'opticalEyeTests', label: 'Eye Tests & Appointments', defaultEnabled: true },
    { key: 'opticalLensOrders', label: 'Lab Lens Orders', defaultEnabled: true },
    { key: 'opticalContactLens', label: 'Contact Lenses', defaultEnabled: true },
  ],
};
