import { LayoutDashboard, Sparkles, Layers, AlertTriangle, Zap, Download, RefreshCw } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import RetailDashboardPage from './pages/RetailDashboard1';
import RetailPosPage from './pages/RetailPosPage';
import CombosPage from './pages/CombosPage';
import ComboFormPage from './pages/ComboFormPage';
import DamageLogPage from './pages/DamageLogPage';
import ProductUnitsPage from './pages/ProductUnitsPage';
import QuickKeysPage from './pages/QuickKeysPage';
import BulkImportPage from './pages/BulkImportPage';
import ReorderPage from './pages/ReorderPage';
import BarcodeLabelsPage from './pages/BarcodeLabelsPage';
import RetailProductWizardPage from './pages/RetailProductWizardPage';
import RetailProductDetailPage from './pages/RetailProductDetailPage';

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
  themeColor: '#0ea5e9',
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
        { to: '/retail/dashboard',    label: 'Retail Dashboard', icon: LayoutDashboard },
        { to: '/retail/combos',       label: 'Combos',           icon: Sparkles },
        { to: '/retail/product-units',label: 'Multi-Units',      icon: Layers },
        { to: '/retail/damage',       label: 'Damage & Wastage', icon: AlertTriangle },
        { to: '/retail/quick-keys',   label: 'Quick Keys',       icon: Zap },
        { to: '/retail/bulk-import',  label: 'Bulk Import',      icon: Download },
        { to: '/retail/reorders',     label: 'Smart Reorder',    icon: RefreshCw, badge: 'AI' },
      ],
    },
  ],

  routes: [
    // POS (route rahe, sidebar sirf core POS wale link se open ho)
    { path: '/pos', element: RetailPosPage },

    // Retail product wizard (Products page se "+ Add" pe redirect hoga)
    { path: '/retail-products/new',       element: RetailProductWizardPage },
    { path: '/retail-products/:id/edit',  element: RetailProductWizardPage },
    { path: '/retail-products/:id',       element: RetailProductDetailPage },

    // Retail Dashboard
    { path: '/retail',            element: RetailDashboardPage },
    { path: '/retail/dashboard',  element: RetailDashboardPage },

    // Combos
    { path: '/retail/combos/new',       element: ComboFormPage },
    { path: '/retail/combos/:id/edit',  element: ComboFormPage },
    { path: '/retail/combos',           element: CombosPage },

    // Retail features
    { path: '/retail/damage',         element: DamageLogPage },
    { path: '/retail/product-units',  element: ProductUnitsPage },
    { path: '/retail/quick-keys',     element: QuickKeysPage },
    { path: '/retail/bulk-import',    element: BulkImportPage },
    { path: '/retail/reorders',       element: ReorderPage },
    { path: '/retail/barcode-labels', element: BarcodeLabelsPage },
  ],

  dashboardComponent: RetailDashboardPage,

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
    { key: 'retailDamage',    label: 'Damage Tracking',     defaultEnabled: true },
    { key: 'retailQuickKeys', label: 'Quick Keys',          defaultEnabled: true },
    { key: 'retailReorder',   label: 'Smart Reorder',       defaultEnabled: false },
  ],
};
