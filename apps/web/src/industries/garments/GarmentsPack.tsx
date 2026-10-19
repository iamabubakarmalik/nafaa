import { Shirt, LayoutDashboard, Sparkles, Palette, Ruler, Scissors, Bookmark, CreditCard, Package, ArrowLeftRight } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import GarmentsDashboard from './dashboard/GarmentsDashboard';
import GarmentProductsPage from './pages/GarmentProductsPage';
import CollectionsPage from './pages/CollectionsPage';
import MeasurementsPage from './pages/MeasurementsPage';
import TailoringPage from './pages/TailoringPage';
import TailoringDetailPage from './pages/TailoringDetailPage';
import NewTailoringOrderPage from './pages/NewTailoringOrderPage';
import AlterationsPage from './pages/AlterationsPage';
import ReservationsPage from './pages/ReservationsPage';
import LayawayPage from './pages/LayawayPage';
import ExchangePage from './pages/ExchangePage';
import SizeChartsPage from './pages/SizeChartsPage';
import GarmentProductWizardPage from './pages/GarmentProductWizardPage';
import GarmentProductDetailPage from './pages/GarmentProductDetailPage';

/**
 * Garments / Boutique / Fashion industry pack: products with size × colour
 * variants on the shared pages, stitching orders with naap and advance,
 * alterations, holds, instalment plans, collections and size charts.
 */
export const GarmentsPack: IndustryPack = {
  id: 'garments',
  name: 'Garments / Boutique / Fashion',
  shortName: 'Garments',
  emoji: '👗',
  priority: 65,
  description:
    'Ready-made & custom stitching. Size × color variants, measurements, alterations, tailoring, layaway.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('GARMENT') ||
      type.includes('BOUTIQUE') ||
      type.includes('FASHION') ||
      type.includes('CLOTHING') ||
      type.includes('TAILOR') ||
      type.includes('APPAREL')
    );
  },

  navGroups: [
    {
      label: 'Garments Extras',
      icon: Shirt,
      emoji: '👗',
      color: '#ec4899',
      order: 20,
      items: [
        { to: '/garments/tailoring', label: 'Silai orders', icon: Scissors },
        { to: '/garments/alterations', label: 'Alterations', icon: Ruler },
        { to: '/garments/measurements', label: 'Naap', icon: Ruler },
        { to: '/garments/reservations', label: 'Hold', icon: Bookmark },
        { to: '/garments/layaway', label: 'Qist plan', icon: CreditCard },
        { to: '/garments/exchange', label: 'Exchange', icon: ArrowLeftRight, permission: 'returns.create' },
        { to: '/garments/collections', label: 'Collections', icon: Palette },
        { to: '/garments/size-charts', label: 'Size charts', icon: Package },
      ],
    },
  ],

  routes: [
    // Wizard + Detail — highest priority garment product routes
    { path: '/garment-products/new', element: GarmentProductWizardPage },
    { path: '/garment-products/:id/edit', element: GarmentProductWizardPage },
    { path: '/garment-products/:id', element: GarmentProductDetailPage },

    { path: '/garments', element: GarmentsDashboard },
    { path: '/garments/dashboard', element: GarmentsDashboard },
    { path: '/garments/products', element: GarmentProductsPage },
    { path: '/garments/collections', element: CollectionsPage },
    { path: '/garments/measurements', element: MeasurementsPage },
    { path: '/garments/tailoring/new', element: NewTailoringOrderPage },
    { path: '/garments/tailoring/:id', element: TailoringDetailPage },
    { path: '/garments/tailoring', element: TailoringPage },
    { path: '/garments/alterations', element: AlterationsPage },
    { path: '/garments/reservations', element: ReservationsPage },
    { path: '/garments/layaway', element: LayawayPage },
    { path: '/garments/exchange', element: ExchangePage },
    { path: '/garments/size-charts', element: SizeChartsPage },
  ],

  dashboardComponent: GarmentsDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '👗', group: 'Count' },
      { value: 'set', label: 'Set', hint: '🧥', group: 'Count' },
      { value: 'pair', label: 'Pair', hint: '👞', group: 'Count' },
      { value: 'meter', label: 'Meter', hint: '📏', group: 'Fabric' },
      { value: 'yard', label: 'Yard', hint: '📏', group: 'Fabric' },
    ],
  },

  featureFlags: [
    { key: 'garmentCollections', label: 'Seasonal Collections', defaultEnabled: true },
    { key: 'garmentMeasurements', label: 'Body Measurements', defaultEnabled: true },
    { key: 'garmentTailoring', label: 'Custom Tailoring', defaultEnabled: true },
    { key: 'garmentAlterations', label: 'Alteration Service', defaultEnabled: true },
    { key: 'garmentReservations', label: 'Reservations', defaultEnabled: true },
    { key: 'garmentLayaway', label: 'Layaway/Installments', defaultEnabled: false },
  ],
};
