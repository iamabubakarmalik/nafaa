import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import RetailDashboard from './dashboard/RetailDashboard';
import RetailPos from './pos/RetailPos';
import BarcodeLabelsPage from '@modules/inventory/barcodes/pages/BarcodeLabelsPage';
import RetailProductEditor from './products/RetailProductEditor';
import RetailProductDetail from './products/RetailProductDetail';
import { t } from '@core/i18n';

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
  shortName: t('Retail'),
  emoji: '🛒',
  priority: 60,
  description:
    t('Multi-unit pricing (piece/dozen/carton), combos, quick-keys, damage tracking, smart reorder.'),

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
    { path: '/retail/barcode-labels', element: BarcodeLabelsPage },
  ],

  dashboardComponent: RetailDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs',    label: t('Pieces'),       hint: '🔢', group: t('Count') },
      { value: 'dozen',  label: t('Dozen (12)'),   hint: '📦', group: t('Count') },
      { value: 'pack',   label: t('Pack'),         hint: '📦', group: t('Count') },
      { value: 'carton', label: t('Carton'),       hint: '📦', group: t('Count') },
      { value: 'kg',     label: t('Kilograms'),    hint: '⚖️', group: t('Weight') },
      { value: 'gram',   label: t('Grams'),        hint: '⚖️', group: t('Weight') },
      { value: 'liter',  label: t('Liter'),        hint: '🥛', group: t('Volume') },
      { value: 'ml',     label: t('Milliliter'),   hint: '🥛', group: t('Volume') },
      { value: 'meter',  label: t('Meter'),        hint: '📏', group: t('Length') },
    ],
  },
};
