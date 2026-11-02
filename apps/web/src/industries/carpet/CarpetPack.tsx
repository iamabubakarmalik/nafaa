import { Layers, Scissors, Download, Sparkles } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import CarpetRollsPage from './pages/CarpetRollsPage';
import CarpetCutPiecesPage from './pages/CarpetCutPiecesPage';
import CarpetRollDetailPage from './pages/CarpetRollDetailPage';
import CarpetBulkImportPage from './pages/CarpetBulkImportPage';
import CarpetProductEditor from './products/CarpetProductEditor';
import CarpetProductDetail from './products/CarpetProductDetail';
import CarpetDashboard from './dashboard/CarpetDashboard';
import { t } from '@core/i18n';

/**
 * Carpet / flooring industry pack: rolls, cut pieces and roll import in the
 * sidebar; products, POS and sales run on the shared pages through the
 * carpet configs (products/, pos/, sales/).
 *
 * Priority 90 — wins when a tenant matches several packs.
 */
export const CarpetPack: IndustryPack = {
  id: 'carpet',
  name: 'Carpet / Flooring',
  shortName: t('Carpet'),
  emoji: '🧶',
  priority: 90,
  description:
    t('Roll-based inventory, cut pieces, length × width calculator, sqft pricing — for carpet, flooring, and matting businesses.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    if (type) {
      return (
        type.includes('CARPET') ||
        type.includes('FLOORING') ||
        type.includes('MATTING')
      );
    }
    const features = (tenant.businessFeatures ?? {}) as Record<string, boolean>;
    return features.carpetRolls === true;
  },

  navGroups: [
    {
      label: t('Carpet extras'),
      icon: Sparkles,
      emoji: '🧶',
      color: '#059669',
      order: 20,
      items: [
        { to: '/carpet-rolls',       label: t('Carpet rolls'),  icon: Layers },
        { to: '/carpet-cut-pieces',  label: t('Pieces'),         icon: Scissors },
        { to: '/carpet-bulk-import', label: t('Rolls import'),  icon: Download },
      ],
    },
  ],

  routes: [
    // Editor routes first so /:id/edit is not taken by /:id.
    { path: '/carpet-products/new',      element: CarpetProductEditor },
    { path: '/carpet-products/:id/edit', element: CarpetProductEditor },
    { path: '/carpet-products/:id',      element: CarpetProductDetail },

    // Carpet feature pages
    { path: '/carpet-rolls',        element: CarpetRollsPage },
    { path: '/carpet-rolls/:id',    element: CarpetRollDetailPage },
    { path: '/carpet-cut-pieces',   element: CarpetCutPiecesPage },
    { path: '/carpet-bulk-import',  element: CarpetBulkImportPage },
  ],

  dashboardComponent: CarpetDashboard,

  productForm: {
    defaultUnit: 'sqft',
    unitOptions: [
      { value: 'sqft', label: t('Sq ft'), hint: '📐', group: t('Area') },
      { value: 'sqm',  label: t('Sq meter'), hint: '📐', group: t('Area') },
      { value: 'sqyd', label: t('Sq gaz'), hint: '📐', group: t('Area') },
      { value: 'ft',   label: t('Running ft'), hint: '📏', group: t('Length') },
      { value: 'm',    label: t('Running meter'), hint: '📏', group: t('Length') },
      { value: 'pcs',  label: t('Piece (rug)'), hint: '🔢', group: t('Count') },
      { value: 'roll', label: t('Poora roll'), hint: '🧻', group: t('Count') },
    ],
  },

  featureFlags: [
    { key: 'carpetRolls',     label: t('Roll Tracking'),    description: t('Per-roll length + width + sqft'), defaultEnabled: true },
    { key: 'carpetCutPieces', label: t('Cut Pieces'),       description: t('Track leftover pieces separately'), defaultEnabled: true },
    { key: 'lengthWidthCalc', label: t('L × W Calculator'), description: t('Interactive dimension picker in POS'), defaultEnabled: true },
  ],
};
