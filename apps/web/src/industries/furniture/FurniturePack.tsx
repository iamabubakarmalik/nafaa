import {
  LayoutDashboard, Sofa, Hammer, Truck, ClipboardList, Package,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import FurnitureDashboardPage from './pages/FurnitureDashboardPage';
import FurnitureProductsPage from './pages/FurnitureProductsPage';
import FurnitureProductWizardPage from './pages/FurnitureProductWizardPage';
import FurnitureProductDetailPage from './pages/FurnitureProductDetailPage';
import FurniturePosPage from './pages/FurniturePosPage';
import CustomOrdersPage from './pages/CustomOrdersPage';
import CustomOrderDetailPage from './pages/CustomOrderDetailPage';
import CustomOrderFormPage from './pages/CustomOrderFormPage';
import CarpentersPage from './pages/CarpentersPage';
import DeliveriesPage from './pages/DeliveriesPage';

export const FurniturePack: IndustryPack = {
  id: 'furniture',
  name: 'Furniture Store',
  shortName: 'Furniture',
  emoji: '🪑',
  themeColor: '#a16207',
  priority: 76,
  description:
    'Custom furniture, showroom + workshop, deposit-based custom orders, carpenter workload, large-vehicle deliveries with assembly.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('FURNITURE') || type.includes('INTERIOR') || type.includes('CARPENTRY')
    );
  },

  navGroups: [
    {
      label: 'Furniture',
      icon: Sofa,
      emoji: '🪑',
      color: '#a16207',
      order: 20,
      items: [
        { to: '/furniture/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/furniture/custom-orders', label: 'Custom Orders', icon: ClipboardList, badge: 'HOT' },
        { to: '/furniture/deliveries', label: 'Deliveries', icon: Truck },
        { to: '/furniture/carpenters', label: 'Carpenters', icon: Hammer },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: FurniturePosPage },

    { path: '/furniture-products/new', element: FurnitureProductWizardPage },
    { path: '/furniture-products/:id/edit', element: FurnitureProductWizardPage },
    { path: '/furniture-products/:id', element: FurnitureProductDetailPage },
    { path: '/furniture-products', element: FurnitureProductsPage },

    { path: '/furniture', element: FurnitureDashboardPage },
    { path: '/furniture/dashboard', element: FurnitureDashboardPage },

    { path: '/furniture/custom-orders', element: CustomOrdersPage },
    { path: '/furniture/custom-orders/new', element: CustomOrderFormPage },
    { path: '/furniture/custom-orders/:id/edit', element: CustomOrderFormPage },
    { path: '/furniture/custom-orders/:id', element: CustomOrderDetailPage },

    { path: '/furniture/carpenters', element: CarpentersPage },
    { path: '/furniture/deliveries', element: DeliveriesPage },
  ],

  dashboardComponent: FurnitureDashboardPage,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '🪑', group: 'Count' },
      { value: 'set', label: 'Set', hint: '🛋️', group: 'Count' },
      { value: 'sqft', label: 'Sq. Ft', hint: '📐', group: 'Area' },
      { value: 'meter', label: 'Meter', hint: '📏', group: 'Length' },
    ],
  },

  featureFlags: [
    { key: 'furnitureCustomOrders', label: 'Custom / Made-to-order', defaultEnabled: true },
    { key: 'furnitureShowroom', label: 'Showroom Layout Mapping', defaultEnabled: true },
    { key: 'furnitureCarpenters', label: 'Workshop / Carpenter Mgmt', defaultEnabled: true },
    { key: 'furnitureDeliveries', label: 'Large-vehicle Delivery + Assembly', defaultEnabled: true },
    { key: 'furnitureEmi', label: 'EMI / Installment Plans', defaultEnabled: false },
  ],
};
