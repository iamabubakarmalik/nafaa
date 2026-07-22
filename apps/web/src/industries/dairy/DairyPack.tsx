import { Milk, Users, Truck, Beaker, FileText, Route as RouteIcon, Package, Sparkles, LayoutDashboard } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import DairyDashboardPage from './pages/DairyDashboardPage';
import DairyProductsPage from './pages/DairyProductsPage';
import DairyCustomersPage from './pages/DairyCustomersPage';
import FarmersPage from './pages/FarmersPage';
import DairyRoutesPage from './pages/RoutesPage';
import DairyDeliveriesPage from './pages/DeliveriesPage';
import FarmerSuppliesPage from './pages/FarmerSuppliesPage';
import MonthlyBillsPage from './pages/MonthlyBillsPage';
import QualityTestsPage from './pages/QualityTestsPage';
import DairyProductWizardPage from './pages/DairyProductWizardPage';
import DairyProductDetailPage from './pages/DairyProductDetailPage';

/**
 * Dairy / Milk industry pack.
 * Farmers, customers, routes, deliveries, quality tests, monthly bills.
 */
export const DairyPack: IndustryPack = {
  id: 'dairy',
  name: 'Dairy / Milk',
  shortName: 'Dairy',
  emoji: '🥛',
  themeColor: '#d946ef',
  priority: 65,
  description:
    'Milk supply chain — farmers, subscribers, delivery routes, quality testing, monthly billing.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('DAIRY') ||
      type.includes('MILK') ||
      type.includes('LABAN')
    );
  },

  navGroups: [
    {
      label: 'Dairy Industry',
      icon: Milk,
      emoji: '🥛',
      color: '#d946ef',
      order: 20,
      items: [
        { to: '/dairy-products/new', label: '+ Add Dairy Product', icon: Sparkles, badge: 'FAST' },
        { to: '/dairy/dashboard', label: 'Dairy Dashboard', icon: LayoutDashboard },
        { to: '/dairy/products', label: 'Product Catalog', icon: Package },
        { to: '/dairy/customers', label: 'Customers (Khata)', icon: Users },
        { to: '/dairy/farmers', label: 'Farmers (Suppliers)', icon: Milk },
        { to: '/dairy/routes', label: 'Delivery Routes', icon: RouteIcon },
        { to: '/dairy/deliveries', label: 'Daily Deliveries', icon: Truck },
        { to: '/dairy/supplies', label: 'Farmer Supplies', icon: Package },
        { to: '/dairy/bills', label: 'Monthly Bills', icon: FileText },
        { to: '/dairy/quality-tests', label: 'Quality Tests', icon: Beaker },
      ],
    },
  ],

  routes: [
    // Wizard + Detail — highest priority dairy product routes
    { path: '/dairy-products/new', element: DairyProductWizardPage },
    { path: '/dairy-products/:id/edit', element: DairyProductWizardPage },
    { path: '/dairy-products/:id', element: DairyProductDetailPage },

    { path: '/dairy', element: DairyDashboardPage },
    { path: '/dairy/dashboard', element: DairyDashboardPage },
    { path: '/dairy/products', element: DairyProductsPage },
    { path: '/dairy/customers', element: DairyCustomersPage },
    { path: '/dairy/farmers', element: FarmersPage },
    { path: '/dairy/routes', element: DairyRoutesPage },
    { path: '/dairy/deliveries', element: DairyDeliveriesPage },
    { path: '/dairy/supplies', element: FarmerSuppliesPage },
    { path: '/dairy/bills', element: MonthlyBillsPage },
    { path: '/dairy/quality-tests', element: QualityTestsPage },
  ],

  dashboardComponent: DairyDashboardPage,

  productForm: {
    defaultUnit: 'liter',
    unitOptions: [
      { value: 'liter', label: 'Liter', hint: '🥛', group: 'Volume' },
      { value: 'ml', label: 'Milliliter', hint: '🥛', group: 'Volume' },
      { value: 'kg', label: 'Kilogram', hint: '⚖️', group: 'Weight' },
      { value: 'gram', label: 'Gram', hint: '⚖️', group: 'Weight' },
      { value: 'piece', label: 'Piece', hint: '🔢', group: 'Count' },
      { value: 'plate', label: 'Plate', hint: '🍽️', group: 'Serving' },
      { value: 'cup', label: 'Cup', hint: '🥤', group: 'Serving' },
      { value: 'bottle', label: 'Bottle', hint: '🍶', group: 'Container' },
      { value: 'packet', label: 'Packet', hint: '📦', group: 'Container' },
    ],
  },

  featureFlags: [
    { key: 'dairyRoutes', label: 'Delivery Routes', defaultEnabled: true },
    { key: 'dairyMonthlyBills', label: 'Monthly Khata Bills', defaultEnabled: true },
    { key: 'dairyQualityTests', label: 'Quality Testing', defaultEnabled: false },
    { key: 'dairyFarmers', label: 'Farmer Management', defaultEnabled: true },
  ],
};
