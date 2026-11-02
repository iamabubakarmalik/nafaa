import {
  Gem, LayoutDashboard, Sparkles, Users, TrendingUp, Coins,
  Palette, Repeat, ShoppingBag, ShoppingCart, Wrench,
} from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import JewelryDashboard from './dashboard/JewelryDashboard';
import JewelryProductsPage from './pages/JewelryProductsPage';
import JewelrySalesPage from './pages/JewelrySalesPage';
import NewSalePage from './pages/NewSalePage';
import CustomOrdersPage from './pages/CustomOrdersPage';
import ExchangesPage from './pages/ExchangesPage';
import RepairsPage from './pages/RepairsPage';
import KarigarsPage from './pages/KarigarsPage';
import MetalRatesPage from './pages/MetalRatesPage';
import MetalStockPage from './pages/MetalStockPage';
import JewelryItemWizardPage from './pages/JewelryItemWizardPage';
import JewelryItemDetailPage from './pages/JewelryItemDetailPage';
import { t } from '@core/i18n';

/**
 * Jewelry / sonar pack: pieces by weight and karat on the shared product
 * pages, a counter priced from today's rate with old gold as trade-in,
 * custom orders with karigar gold, old gold buying, repairs, metal stock
 * and daily rates. Sales history, receipts and reports are the shared ones.
 */
export const JewelryPack: IndustryPack = {
  id: 'jewelry',
  name: 'Jewelry / Sonar',
  shortName: t('Jewelry'),
  emoji: '💎',
  priority: 65,
  description:
    t('Gold/silver/platinum, live metal rates, hallmark, gemstones, karigar tracking, custom orders, exchanges.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('JEWELRY') ||
      type.includes('JEWELLERY') ||
      type.includes('SONAR') ||
      type.includes('GOLD') ||
      type.includes('SILVER') ||
      type.includes('DIAMOND')
    );
  },

  navGroups: [
    {
      label: t('Jewellery'),
      icon: Gem,
      emoji: '💎',
      color: '#d97706',
      order: 20,
      items: [
        { to: '/pos', label: t('Counter'), icon: ShoppingCart, permission: PERMISSIONS.POS_USE },
        { to: '/jewelry/metal-rates', label: t('Today\'s rates'), icon: TrendingUp },
        { to: '/jewelry-items/new', label: t('New jewellery'), icon: Sparkles, permission: PERMISSIONS.PRODUCTS_CREATE },
        { to: '/jewelry/products', label: t('Jewellery'), icon: Gem, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/jewelry/sales', label: t('Sales'), icon: ShoppingBag, permission: PERMISSIONS.SALES_VIEW },
        { to: '/jewelry/custom-orders', label: t('Custom orders'), icon: Palette, permission: PERMISSIONS.POS_USE },
        { to: '/jewelry/exchanges', label: t('Old gold'), icon: Repeat, permission: PERMISSIONS.PURCHASES_VIEW },
        { to: '/jewelry/repairs', label: t('Repair'), icon: Wrench, permission: PERMISSIONS.POS_USE },
        { to: '/jewelry/karigars', label: t('Craftsmen'), icon: Users, permission: PERMISSIONS.SUPPLIERS_VIEW },
        { to: '/jewelry/metal-stock', label: t('Metal stock'), icon: Coins, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
        { to: '/jewelry/dashboard', label: t('Jewelry dashboard'), icon: LayoutDashboard },
      ],
    },
  ],

  routes: [
    { path: '/jewelry-items/new', element: JewelryItemWizardPage, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/jewelry-items/:id/edit', element: JewelryItemWizardPage, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/jewelry-items/:id', element: JewelryItemDetailPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/jewelry', element: JewelryDashboard },
    { path: '/jewelry/dashboard', element: JewelryDashboard },
    { path: '/jewelry/products', element: JewelryProductsPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/jewelry/sales/new', element: NewSalePage, permission: PERMISSIONS.POS_USE },
    { path: '/jewelry/sales', element: JewelrySalesPage, permission: PERMISSIONS.SALES_VIEW },
    { path: '/jewelry/custom-orders', element: CustomOrdersPage, permission: PERMISSIONS.POS_USE },
    { path: '/jewelry/exchanges', element: ExchangesPage },
    { path: '/jewelry/repairs', element: RepairsPage, permission: PERMISSIONS.POS_USE },
    { path: '/jewelry/karigars', element: KarigarsPage, permission: PERMISSIONS.SUPPLIERS_VIEW },
    { path: '/jewelry/metal-rates', element: MetalRatesPage },
    { path: '/jewelry/metal-stock', element: MetalStockPage, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
  ],

  dashboardComponent: JewelryDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Pieces'), hint: '💎', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '👑', group: t('Count') },
      { value: 'pair', label: t('Pair'), hint: '👂', group: t('Count') },
      { value: 'gram', label: t('Grams'), hint: '⚖️', group: t('Weight') },
      { value: 'tola', label: t('Tola'), hint: '⚖️', group: t('Weight') },
      { value: 'carat', label: t('Carat'), hint: '💎', group: t('Weight') },
    ],
  },

  featureFlags: [
    { key: 'jewelryHallmark', label: t('Hallmark Tracking'), defaultEnabled: true },
    { key: 'jewelryLiveRates', label: t('Live Metal Rates'), defaultEnabled: true },
    { key: 'jewelryKarigars', label: t('Karigar Management'), defaultEnabled: true },
    { key: 'jewelryCustomOrders', label: t('Custom Orders'), defaultEnabled: true },
    { key: 'jewelryExchanges', label: t('Metal Exchanges'), defaultEnabled: true },
    { key: 'jewelryGemstones', label: t('Gemstone Details'), defaultEnabled: true },
    { key: 'jewelryBuyback', label: t('Buyback Policy'), defaultEnabled: true },
  ],
};
