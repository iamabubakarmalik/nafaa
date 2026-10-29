import { Navigate, useParams } from 'react-router-dom';
import { Eye, FilePlus, FileText, FlaskConical, Glasses, LayoutDashboard, UserCog, Wrench } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import OpticalDashboard from './dashboard/OpticalDashboard';
import OpticalProductsPage from './pages/OpticalProductsPage';
import OpticalProductWizardPage from './pages/OpticalProductWizardPage';
import OpticalProductDetailPage from './pages/OpticalProductDetailPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import PrescriptionFormPage from './pages/PrescriptionFormPage';
import PrescriptionDetailPage from './pages/PrescriptionDetailPage';
import EyeTestsPage from './pages/EyeTestsPage';
import EyeTestDetailPage from './pages/EyeTestDetailPage';
import OptometristsPage from './pages/OptometristsPage';
import LensOrdersPage from './pages/LensOrdersPage';
import LensOrderFormPage from './pages/LensOrderFormPage';
import LensOrderDetailPage from './pages/LensOrderDetailPage';

/* Orders have no edit form: price and power are fixed once booked. */
function ToOrder() {
  const { id } = useParams();
  return <Navigate to={`/optical/lens-orders/${id ?? ''}`} replace />;
}

export const OpticalPack: IndustryPack = {
  id: 'optical',
  name: 'Optical & Eyewear',
  shortName: 'Optical',
  emoji: '👓',
  priority: 76,
  description:
    'Eye tests, nuskhe (SPH/CYL/AXIS/ADD/PD), chashma orders with advance, lab tracking and pickup, repairs, frames and contact lenses.',

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
        { to: '/optical/dashboard', label: 'Optical dashboard', icon: LayoutDashboard },
        { to: '/optical/lens-orders/new', label: 'New glasses order', icon: FilePlus, permission: PERMISSIONS.POS_USE },
        { to: '/optical/lens-orders', label: 'Glasses orders', icon: FlaskConical },
        { to: '/optical/lens-orders?view=repairs', label: 'Repair', icon: Wrench },
        { to: '/optical/eye-tests', label: 'Eye tests', icon: Eye },
        { to: '/optical/prescriptions', label: 'Prescriptions', icon: FileText },
        { to: '/optical/optometrists', label: 'Optometrists', icon: UserCog },
      ],
    },
  ],

  routes: [
    { path: '/optical-products/new', element: OpticalProductWizardPage, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/optical-products/:id/edit', element: OpticalProductWizardPage, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/optical-products/:id', element: OpticalProductDetailPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/optical-products', element: OpticalProductsPage, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/optical', element: OpticalDashboard },
    { path: '/optical/dashboard', element: OpticalDashboard },

    { path: '/optical/prescriptions/new', element: PrescriptionFormPage },
    { path: '/optical/prescriptions/:id/edit', element: PrescriptionFormPage },
    { path: '/optical/prescriptions/:id', element: PrescriptionDetailPage },
    { path: '/optical/prescriptions', element: PrescriptionsPage },

    { path: '/optical/eye-tests/:id', element: EyeTestDetailPage },
    { path: '/optical/eye-tests', element: EyeTestsPage },

    { path: '/optical/optometrists', element: OptometristsPage },

    { path: '/optical/lens-orders/new', element: LensOrderFormPage, permission: PERMISSIONS.POS_USE },
    { path: '/optical/lens-orders/:id/edit', element: ToOrder },
    { path: '/optical/lens-orders/:id', element: LensOrderDetailPage },
    { path: '/optical/lens-orders', element: LensOrdersPage },
  ],

  dashboardComponent: OpticalDashboard,

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
