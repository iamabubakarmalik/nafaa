import { LayoutDashboard, Sparkles, Layers, Download, RefreshCw } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import RetailDashboard from './dashboard/RetailDashboard';
import RetailPos from './pos/RetailPos';
import CombosPage from './pages/CombosPage';
import ComboFormPage from './pages/ComboFormPage';
import ProductUnitsPage from './pages/ProductUnitsPage';
import BulkImportPage from './pages/BulkImportPage';
import ReorderPage from './pages/ReorderPage';
import BarcodeLabelsPage from '@modules/inventory/barcodes/pages/BarcodeLabelsPage';
import RetailProductEditor from './products/RetailProductEditor';
import RetailProductDetail from './products/RetailProductDetail';

/**
 * Retail / General Store / Kirana / Supermarket industry pack.
 *
 * Sidebar mein SIRF retail-specific features dikhate hain.
 * POS, Products, Barcode Labels — ye core POS sidebar mein hain,
 * yahan duplicate NAHI karna.
 *
 * Routes register rahenge (purane links, wizard, edit pages ke liye)
 * bas navGroups se remove kar diya.
 */
export const RetailPack: IndustryPack = {
  id: 'retail',
  name: 'Retail / Kirana / General Store',
  shortName: 'Retail',
  emoji: '🛒',
  priority: 60,
  description:
    'Multi-unit pricing (piece/dozen/carton), combos, quick-keys, damage tracking, smart reorder.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('RETAIL') ||
      type.includes('KIRYANA') ||
      type.includes('KIRANA') ||
      type.includes('GENERAL') ||
      type.includes('SUPERMARKET') ||
      type.includes('GROCERY') ||
      type.includes('MART')
    );
  },

  navGroups: [
    {
      label: 'Retail Extras',
      icon: Sparkles,
      emoji: '🛒',
      color: '#0ea5e9',
      order: 20,
      items: [
        { to: '/retail/combos',       label: 'Combos',           icon: Sparkles },
        { to: '/retail/product-units',label: 'Multi-Units',      icon: Layers },
        { to: '/retail/reorders',     label: 'Smart Reorder',    icon: RefreshCw, badge: 'AI' },
      ],
    },
  ],

  routes: [
    // POS (route rahe, sidebar sirf core POS wale link se open ho)
    { path: '/pos', element: RetailPos },

    // Retail product wizard (Products page se "+ Add" pe redirect hoga)
    { path: '/retail-products/new',       element: RetailProductEditor },
    { path: '/retail-products/:id/edit',  element: RetailProductEditor },
    { path: '/retail-products/:id',       element: RetailProductDetail },

    // Retail Dashboard
    { path: '/retail',            element: RetailDashboard },
    { path: '/retail/dashboard',  element: RetailDashboard },

    // Combos
    { path: '/retail/combos/new',       element: ComboFormPage },
    { path: '/retail/combos/:id/edit',  element: ComboFormPage },
    { path: '/retail/combos',           element: CombosPage },

    // Retail features
    { path: '/retail/product-units',  element: ProductUnitsPage },
    { path: '/retail/bulk-import',    element: BulkImportPage },
    { path: '/retail/reorders',       element: ReorderPage },
    { path: '/retail/barcode-labels', element: BarcodeLabelsPage },
  ],

  dashboardComponent: RetailDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs',    label: 'Pieces',       hint: '🔢', group: 'Count' },
      { value: 'dozen',  label: 'Dozen (12)',   hint: '📦', group: 'Count' },
      { value: 'pack',   label: 'Pack',         hint: '📦', group: 'Count' },
      { value: 'carton', label: 'Carton',       hint: '📦', group: 'Count' },
      { value: 'kg',     label: 'Kilograms',    hint: '⚖️', group: 'Weight' },
      { value: 'gram',   label: 'Grams',        hint: '⚖️', group: 'Weight' },
      { value: 'liter',  label: 'Liter',        hint: '🥛', group: 'Volume' },
      { value: 'ml',     label: 'Milliliter',   hint: '🥛', group: 'Volume' },
      { value: 'meter',  label: 'Meter',        hint: '📏', group: 'Length' },
    ],
  },

  featureFlags: [
    { key: 'retailCombos',    label: 'Combo Products',      defaultEnabled: true },
    { key: 'retailMultiUnit', label: 'Multi-Unit Pricing',  defaultEnabled: true },
    { key: 'retailReorder',   label: 'Smart Reorder',       defaultEnabled: false },
  ],
};
