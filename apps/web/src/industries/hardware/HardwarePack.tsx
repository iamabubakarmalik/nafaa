import { Award, Building2, FilePlus, FileText, HardHat, LayoutDashboard, Package, RefreshCw, Truck } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import HardwareDashboard from './dashboard/HardwareDashboard';
import HardwareBrandsPage from './pages/BrandsPage';
import HardwareProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import HardwareQuotationsPage from './pages/QuotationsPage';
import QuotationFormPage from './pages/NewQuotationPage';
import HardwareQuotationDetailPage from './pages/QuotationDetailPage';
import HardwareDeliveriesPage from './pages/DeliveriesPage';
import DeliveryFormPage from './pages/DeliveryFormPage';
import DeliveryDetailPage from './pages/DeliveryDetailPage';
import HardwareCreditAccountsPage from './pages/CreditAccountsPage';
import HardwareReorderRulesPage from './pages/ReorderRulesPage';
import HardwareProducts from './products/HardwareProducts';
import HardwareProductEditor from './products/HardwareProductEditor';
import HardwareProductDetail from './products/HardwareProductDetail';

/**
 * Hardware / sanitary / paint / building material store: sized items with
 * loose and pack sale, retail, contractor and quantity rates on the shared
 * counter, quotations that become bills, delivery challans (one bill in
 * several trips), contractor sites and khata, and reorder points.
 */
export const HardwarePack: IndustryPack = {
  id: 'hardware',
  name: 'Hardware / Building Materials',
  shortName: 'Hardware',
  emoji: '🔨',
  priority: 48,
  description:
    'Sizes and shades, retail, contractor and bulk rates, quotations to bills, delivery challans, contractor sites and khata, reorder alerts.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('HARDWARE') ||
      type.includes('BUILDING') ||
      type.includes('CONSTRUCTION') ||
      type.includes('CEMENT') ||
      type.includes('STEEL') ||
      type.includes('SANITARY') ||
      type.includes('PLUMBING') ||
      type.includes('TILES') ||
      type.includes('PAINT')
    );
  },

  navGroups: [
    {
      label: 'Hardware',
      icon: HardHat,
      emoji: '🔨',
      color: '#a16207',
      order: 20,
      items: [
        { to: '/hardware/dashboard', label: 'Hardware dashboard', icon: LayoutDashboard },
        { to: '/hardware/quotations/new', label: 'Nayi quotation', icon: FilePlus, permission: PERMISSIONS.POS_USE },
        { to: '/hardware/quotations', label: 'Quotations', icon: FileText, permission: PERMISSIONS.SALES_VIEW },
        { to: '/hardware/deliveries', label: 'Delivery challan', icon: Truck, permission: PERMISSIONS.SALES_VIEW },
        { to: '/hardware/credit-accounts', label: 'Thekedar khata', icon: HardHat, permission: PERMISSIONS.KHATA_VIEW },
        { to: '/hardware/projects', label: 'Sites / projects', icon: Building2, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/hardware/products', label: 'Maal (items)', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/hardware/reorder-rules', label: 'Reorder', icon: RefreshCw, permission: PERMISSIONS.LOW_STOCK_VIEW },
        { to: '/hardware/brands', label: 'Brands', icon: Award, permission: PERMISSIONS.BRANDS_VIEW },
      ],
    },
  ],

  routes: [
    { path: '/hardware-products/new', element: HardwareProductEditor, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/hardware-products/:id/edit', element: HardwareProductEditor, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/hardware-products/:id', element: HardwareProductDetail, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/hardware/products', element: HardwareProducts, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/hardware', element: HardwareDashboard },
    { path: '/hardware/dashboard', element: HardwareDashboard },
    { path: '/hardware/brands', element: HardwareBrandsPage, permission: PERMISSIONS.BRANDS_VIEW },
    { path: '/hardware/projects/:id', element: ProjectDetailPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/hardware/projects', element: HardwareProjectsPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/hardware/quotations/new', element: QuotationFormPage, permission: PERMISSIONS.POS_USE },
    { path: '/hardware/quotations/:id/edit', element: QuotationFormPage, permission: PERMISSIONS.POS_USE },
    { path: '/hardware/quotations/:id', element: HardwareQuotationDetailPage, permission: PERMISSIONS.SALES_VIEW },
    { path: '/hardware/quotations', element: HardwareQuotationsPage, permission: PERMISSIONS.SALES_VIEW },
    { path: '/hardware/deliveries/new', element: DeliveryFormPage, permission: PERMISSIONS.POS_USE },
    { path: '/hardware/deliveries/:id', element: DeliveryDetailPage, permission: PERMISSIONS.SALES_VIEW },
    { path: '/hardware/deliveries', element: HardwareDeliveriesPage, permission: PERMISSIONS.SALES_VIEW },
    { path: '/hardware/credit-accounts', element: HardwareCreditAccountsPage, permission: PERMISSIONS.KHATA_VIEW },
    { path: '/hardware/reorder-rules', element: HardwareReorderRulesPage, permission: PERMISSIONS.LOW_STOCK_VIEW },
  ],

  dashboardComponent: HardwareDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'bag', label: 'Bag (cement)', hint: '🛍️', group: 'Bulk' },
      { value: 'ton', label: 'Ton (steel/sand)', hint: '⚖️', group: 'Bulk' },
      { value: 'kg', label: 'Kilogram', hint: '⚖️', group: 'Weight' },
      { value: 'pcs', label: 'Pieces', hint: '🔢', group: 'Count' },
      { value: 'bundle', label: 'Bundle', hint: '📦', group: 'Count' },
      { value: 'meter', label: 'Meter', hint: '📏', group: 'Length' },
      { value: 'feet', label: 'Feet', hint: '📏', group: 'Length' },
      { value: 'sqft', label: 'Sq Feet (tiles)', hint: '📐', group: 'Area' },
      { value: 'sqm', label: 'Sq Meter', hint: '📐', group: 'Area' },
      { value: 'cft', label: 'Cubic Feet (sand/gravel)', hint: '📦', group: 'Volume' },
      { value: 'liter', label: 'Liter (paint)', hint: '🥛', group: 'Volume' },
      { value: 'gallon', label: 'Gallon (paint)', hint: '🪣', group: 'Volume' },
      { value: 'sheet', label: 'Sheet', hint: '📄', group: 'Count' },
      { value: 'box', label: 'Box (tiles)', hint: '📦', group: 'Count' },
      { value: 'roll', label: 'Roll (wire)', hint: '🧵', group: 'Count' },
      { value: 'set', label: 'Set', hint: '🧰', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'hardwareBulkPricing', label: 'Bulk Pricing Tiers', defaultEnabled: true },
    { key: 'hardwareProjects', label: 'Project Tracking', defaultEnabled: true },
    { key: 'hardwareQuotations', label: 'Quotations', defaultEnabled: true },
    { key: 'hardwareDeliveries', label: 'Delivery Dispatch', defaultEnabled: true },
    { key: 'hardwareCredit', label: 'Credit Khata', defaultEnabled: true },
  ],
};
