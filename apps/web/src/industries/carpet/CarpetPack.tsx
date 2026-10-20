import { Layers, Scissors, Download, Sparkles } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import CarpetRollsPage from './pages/CarpetRollsPage';
import CarpetCutPiecesPage from './pages/CarpetCutPiecesPage';
import CarpetRollDetailPage from './pages/CarpetRollDetailPage';
import CarpetBulkImportPage from './pages/CarpetBulkImportPage';
import CarpetProductEditor from './products/CarpetProductEditor';
import CarpetProductDetail from './products/CarpetProductDetail';
import CarpetDashboard from './dashboard/CarpetDashboard';

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
  shortName: 'Carpet',
  emoji: '🧶',
  priority: 90,
  description:
    'Roll-based inventory, cut pieces, length × width calculator, sqft pricing — for carpet, flooring, and matting businesses.',

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
      label: 'Carpet Extras',
      icon: Sparkles,
      emoji: '🧶',
      color: '#059669',
      order: 20,
      items: [
        { to: '/carpet-rolls',       label: 'Carpet rolls',  icon: Layers },
        { to: '/carpet-cut-pieces',  label: 'Tukre',         icon: Scissors },
        { to: '/carpet-bulk-import', label: 'Rolls import',  icon: Download },
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
      { value: 'sqft', label: 'Sq ft', hint: '📐', group: 'Area' },
      { value: 'sqm',  label: 'Sq meter', hint: '📐', group: 'Area' },
      { value: 'sqyd', label: 'Sq gaz', hint: '📐', group: 'Area' },
      { value: 'ft',   label: 'Running ft', hint: '📏', group: 'Length' },
      { value: 'm',    label: 'Running meter', hint: '📏', group: 'Length' },
      { value: 'pcs',  label: 'Piece (rug)', hint: '🔢', group: 'Count' },
      { value: 'roll', label: 'Poora roll', hint: '🧻', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'carpetRolls',     label: 'Roll Tracking',    description: 'Per-roll length + width + sqft', defaultEnabled: true },
    { key: 'carpetCutPieces', label: 'Cut Pieces',       description: 'Track leftover pieces separately', defaultEnabled: true },
    { key: 'lengthWidthCalc', label: 'L × W Calculator', description: 'Interactive dimension picker in POS', defaultEnabled: true },
  ],
};
