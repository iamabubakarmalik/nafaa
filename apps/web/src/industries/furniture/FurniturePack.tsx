import {
  LayoutDashboard, Sofa, Hammer, Truck, ClipboardList, Package,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import FurnitureDashboard from './dashboard/FurnitureDashboard';
import FurnitureProductsPage from './pages/FurnitureProductsPage';
import FurnitureProductWizardPage from './pages/FurnitureProductWizardPage';
import FurnitureProductDetailPage from './pages/FurnitureProductDetailPage';
import FurniturePosPage from './pages/FurniturePosPage';
import CustomOrdersPage from './pages/CustomOrdersPage';
import CustomOrderDetailPage from './pages/CustomOrderDetailPage';
import CustomOrderFormPage from './pages/CustomOrderFormPage';
import CarpentersPage from './pages/CarpentersPage';
import DeliveriesPage from './pages/DeliveriesPage';
import { CATEGORY_GROUPS } from './lib/meta';
import { t } from '@core/i18n';

export const FurniturePack: IndustryPack = {
  id: 'furniture',
  name: 'Furniture Store',
  shortName: t('Furniture'),
  emoji: '🪑',
  priority: 76,
  categoryKinds: CATEGORY_GROUPS.flatMap((g) => g.items).filter(([v]) => v !== 'OTHER').map(([value, label]) => ({ value, label })),
  description:
    t('Custom furniture, showroom + workshop, deposit-based custom orders, carpenter workload, large-vehicle deliveries with assembly.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('FURNITURE') || type.includes('INTERIOR') || type.includes('CARPENTRY')
    );
  },

  navGroups: [
    {
      label: t('Furniture'),
      icon: Sofa,
      emoji: '🪑',
      color: '#a16207',
      order: 20,
      items: [
        { to: '/furniture/dashboard', label: t('Dashboard'), icon: LayoutDashboard },
        { to: '/furniture/custom-orders', label: t('Custom orders'), icon: ClipboardList, badge: t('HOT') },
        { to: '/furniture/deliveries', label: t('Deliveries'), icon: Truck },
        { to: '/furniture/carpenters', label: t('Craftsmen'), icon: Hammer },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: FurniturePosPage },

    { path: '/furniture-products/new', element: FurnitureProductWizardPage },
    { path: '/furniture-products/:id/edit', element: FurnitureProductWizardPage },
    { path: '/furniture-products/:id', element: FurnitureProductDetailPage },
    { path: '/furniture-products', element: FurnitureProductsPage },

    { path: '/furniture', element: FurnitureDashboard },
    { path: '/furniture/dashboard', element: FurnitureDashboard },

    { path: '/furniture/custom-orders', element: CustomOrdersPage },
    { path: '/furniture/custom-orders/new', element: CustomOrderFormPage },
    { path: '/furniture/custom-orders/:id/edit', element: CustomOrderFormPage },
    { path: '/furniture/custom-orders/:id', element: CustomOrderDetailPage },

    { path: '/furniture/carpenters', element: CarpentersPage },
    { path: '/furniture/deliveries', element: DeliveriesPage },
  ],

  dashboardComponent: FurnitureDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Pieces'), hint: '🪑', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '🛋️', group: t('Count') },
      { value: 'sqft', label: t('Sq. Ft'), hint: '📐', group: t('Area') },
      { value: 'meter', label: t('Meter'), hint: '📏', group: t('Length') },
    ],
  },

  featureFlags: [
    { key: 'furnitureCustomOrders', label: t('Custom / Made-to-order'), defaultEnabled: true },
    { key: 'furnitureShowroom', label: t('Showroom Layout Mapping'), defaultEnabled: true },
    { key: 'furnitureCarpenters', label: t('Workshop / Carpenter Mgmt'), defaultEnabled: true },
    { key: 'furnitureDeliveries', label: t('Large-vehicle Delivery + Assembly'), defaultEnabled: true },
    { key: 'furnitureEmi', label: t('EMI / Installment Plans'), defaultEnabled: false },
  ],
};
