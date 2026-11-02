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
import { t } from '@core/i18n';

/**
 * Garments / Boutique / Fashion industry pack: products with size × colour
 * variants on the shared pages, stitching orders with naap and advance,
 * alterations, holds, instalment plans, collections and size charts.
 */
export const GarmentsPack: IndustryPack = {
  id: 'garments',
  name: 'Garments / Boutique / Fashion',
  shortName: t('Garments'),
  emoji: '👗',
  priority: 65,
  description:
    t('Ready-made & custom stitching. Size × color variants, measurements, alterations, tailoring, layaway.'),

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
      label: t('Garments extras'),
      icon: Shirt,
      emoji: '👗',
      color: '#ec4899',
      order: 20,
      items: [
        { to: '/garments/tailoring', label: t('Tailoring orders'), icon: Scissors },
        { to: '/garments/alterations', label: t('Alterations'), icon: Ruler },
        { to: '/garments/measurements', label: t('Measurements'), icon: Ruler },
        { to: '/garments/reservations', label: t('Holds'), icon: Bookmark },
        { to: '/garments/layaway', label: t('Instalment plan'), icon: CreditCard },
        { to: '/garments/exchange', label: t('Exchange'), icon: ArrowLeftRight, permission: 'returns.create' },
        { to: '/garments/collections', label: t('Collections'), icon: Palette },
        { to: '/garments/size-charts', label: t('Size charts'), icon: Package },
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
      { value: 'pcs', label: t('Pieces'), hint: '👗', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '🧥', group: t('Count') },
      { value: 'pair', label: t('Pair'), hint: '👞', group: t('Count') },
      { value: 'meter', label: t('Meter'), hint: '📏', group: t('Fabric') },
      { value: 'yard', label: t('Yard'), hint: '📏', group: t('Fabric') },
    ],
  },

  featureFlags: [
    { key: 'garmentCollections', label: t('Seasonal Collections'), defaultEnabled: true },
    { key: 'garmentMeasurements', label: t('Body Measurements'), defaultEnabled: true },
    { key: 'garmentTailoring', label: t('Custom Tailoring'), defaultEnabled: true },
    { key: 'garmentAlterations', label: t('Alteration Service'), defaultEnabled: true },
    { key: 'garmentReservations', label: t('Reservations'), defaultEnabled: true },
    { key: 'garmentLayaway', label: t('Layaway/Installments'), defaultEnabled: false },
  ],
};
