import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import RetailDashboard from './dashboard/RetailDashboard';
import RetailPos from './pos/RetailPos';
import BulkImportPage from './pages/BulkImportPage';
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

  navGroups: [],

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

    // Retail features
    { path: '/retail/bulk-import',    element: BulkImportPage },
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
};
