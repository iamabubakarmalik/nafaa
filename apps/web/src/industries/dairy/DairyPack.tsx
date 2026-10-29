import { Beaker, Factory, FileText, LayoutDashboard, Milk, Package, Route as RouteIcon, Truck, Users, Warehouse } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import DairyDashboard from './dashboard/DairyDashboard';
import DairyProducts from './products/DairyProducts';
import DairyProductEditor from './products/DairyProductEditor';
import DairyProductDetail from './products/DairyProductDetail';
import DairyCustomersPage from './pages/DairyCustomersPage';
import DairyCustomerFormPage from './pages/DairyCustomerFormPage';
import DairyCustomerDetailPage from './pages/DairyCustomerDetailPage';
import FarmersPage from './pages/FarmersPage';
import FarmerDetailPage from './pages/FarmerDetailPage';
import DairyRoutesPage from './pages/RoutesPage';
import DairyDeliveriesPage from './pages/DeliveriesPage';
import FarmerSuppliesPage from './pages/FarmerSuppliesPage';
import MonthlyBillsPage from './pages/MonthlyBillsPage';
import QualityTestsPage from './pages/QualityTestsPage';
import ProductionPage from './pages/ProductionPage';

/**
 * Dairy / milk shop: loose milk, dahi and makhan on the shared counter,
 * morning and evening milk bought from gawalas (supplier account and
 * payment), home delivery customers with a daily quantity, monthly bills
 * on the khata, dahi / makhan made from milk and the day-end spoilage.
 */
export const DairyPack: IndustryPack = {
  id: 'dairy',
  name: 'Dairy / Milk',
  shortName: 'Dairy',
  emoji: '🥛',
  priority: 65,
  description:
    'Gawalon se doodh, ghar delivery aur mahine ka bill, dahi / makhan banana, khula doodh counter par.',

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
      label: 'Dairy shop',
      icon: Milk,
      emoji: '🥛',
      color: '#0ea5e9',
      order: 20,
      items: [
        { to: '/dairy/dashboard', label: 'Dairy dashboard', icon: LayoutDashboard },
        { to: '/dairy/deliveries', label: 'Home delivery', icon: Truck, permission: PERMISSIONS.POS_USE },
        { to: '/dairy/customers', label: 'Delivery customers', icon: Users, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/dairy/bills', label: 'Monthly bills', icon: FileText, permission: PERMISSIONS.KHATA_VIEW },
        { to: '/dairy/supplies', label: 'Milk intake', icon: Warehouse, permission: PERMISSIONS.PURCHASES_VIEW },
        { to: '/dairy/farmers', label: 'Milk suppliers', icon: Milk, permission: PERMISSIONS.SUPPLIERS_VIEW },
        { to: '/dairy/production', label: 'Yogurt / butter, damaged stock', icon: Factory, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
        { to: '/dairy/products', label: 'Products', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/dairy/routes', label: 'Delivery routes', icon: RouteIcon, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/dairy/quality-tests', label: 'Quality tests', icon: Beaker, permission: PERMISSIONS.PURCHASES_VIEW },
      ],
    },
  ],

  routes: [
    { path: '/dairy-products/new', element: DairyProductEditor, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/dairy-products/:id/edit', element: DairyProductEditor, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/dairy-products/:id', element: DairyProductDetail, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/dairy/products', element: DairyProducts, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/dairy', element: DairyDashboard },
    { path: '/dairy/dashboard', element: DairyDashboard },
    { path: '/dairy/customers/new', element: DairyCustomerFormPage, permission: PERMISSIONS.CUSTOMERS_EDIT },
    { path: '/dairy/customers/:id/edit', element: DairyCustomerFormPage, permission: PERMISSIONS.CUSTOMERS_EDIT },
    { path: '/dairy/customers/:id', element: DairyCustomerDetailPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/dairy/customers', element: DairyCustomersPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/dairy/farmers/:id', element: FarmerDetailPage, permission: PERMISSIONS.SUPPLIERS_VIEW },
    { path: '/dairy/farmers', element: FarmersPage, permission: PERMISSIONS.SUPPLIERS_VIEW },
    { path: '/dairy/routes', element: DairyRoutesPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/dairy/deliveries', element: DairyDeliveriesPage, permission: PERMISSIONS.POS_USE },
    { path: '/dairy/supplies', element: FarmerSuppliesPage, permission: PERMISSIONS.PURCHASES_VIEW },
    { path: '/dairy/farmer-supplies', element: FarmerSuppliesPage, permission: PERMISSIONS.PURCHASES_VIEW },
    { path: '/dairy/bills', element: MonthlyBillsPage, permission: PERMISSIONS.KHATA_VIEW },
    { path: '/dairy/monthly-bills', element: MonthlyBillsPage, permission: PERMISSIONS.KHATA_VIEW },
    { path: '/dairy/quality-tests', element: QualityTestsPage, permission: PERMISSIONS.PURCHASES_VIEW },
    { path: '/dairy/production', element: ProductionPage, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
  ],

  dashboardComponent: DairyDashboard,

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
