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

/**
 * Jewelry / sonar pack: pieces by weight and karat on the shared product
 * pages, a counter priced from today's rate with old gold as trade-in,
 * custom orders with karigar gold, old gold buying, repairs, metal stock
 * and daily rates. Sales history, receipts and reports are the shared ones.
 */
export const JewelryPack: IndustryPack = {
  id: 'jewelry',
  name: 'Jewelry / Sonar',
  shortName: 'Jewelry',
  emoji: '💎',
  priority: 65,
  description:
    'Gold/silver/platinum, live metal rates, hallmark, gemstones, karigar tracking, custom orders, exchanges.',

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
      label: 'Jewelry Industry',
      icon: Gem,
      emoji: '💎',
      color: '#d97706',
      order: 20,
      items: [
        { to: '/pos', label: 'Counter', icon: ShoppingCart, permission: PERMISSIONS.POS_USE },
        { to: '/jewelry/metal-rates', label: 'Aaj ka rate', icon: TrendingUp },
        { to: '/jewelry-items/new', label: 'Naya zewar', icon: Sparkles, permission: PERMISSIONS.PRODUCTS_CREATE },
        { to: '/jewelry/products', label: 'Zewar', icon: Gem, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/jewelry/sales', label: 'Sales', icon: ShoppingBag, permission: PERMISSIONS.SALES_VIEW },
        { to: '/jewelry/custom-orders', label: 'Custom orders', icon: Palette, permission: PERMISSIONS.POS_USE },
        { to: '/jewelry/exchanges', label: 'Purana sona', icon: Repeat, permission: PERMISSIONS.PURCHASES_VIEW },
        { to: '/jewelry/repairs', label: 'Repair', icon: Wrench, permission: PERMISSIONS.POS_USE },
        { to: '/jewelry/karigars', label: 'Karigar', icon: Users, permission: PERMISSIONS.SUPPLIERS_VIEW },
        { to: '/jewelry/metal-stock', label: 'Metal stock', icon: Coins, permission: PERMISSIONS.STOCK_MOVEMENTS_VIEW },
        { to: '/jewelry/dashboard', label: 'Jewelry dashboard', icon: LayoutDashboard },
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
      { value: 'pcs', label: 'Pieces', hint: '💎', group: 'Count' },
      { value: 'set', label: 'Set', hint: '👑', group: 'Count' },
      { value: 'pair', label: 'Pair', hint: '👂', group: 'Count' },
      { value: 'gram', label: 'Grams', hint: '⚖️', group: 'Weight' },
      { value: 'tola', label: 'Tola', hint: '⚖️', group: 'Weight' },
      { value: 'carat', label: 'Carat', hint: '💎', group: 'Weight' },
    ],
  },

  featureFlags: [
    { key: 'jewelryHallmark', label: 'Hallmark Tracking', defaultEnabled: true },
    { key: 'jewelryLiveRates', label: 'Live Metal Rates', defaultEnabled: true },
    { key: 'jewelryKarigars', label: 'Karigar Management', defaultEnabled: true },
    { key: 'jewelryCustomOrders', label: 'Custom Orders', defaultEnabled: true },
    { key: 'jewelryExchanges', label: 'Metal Exchanges', defaultEnabled: true },
    { key: 'jewelryGemstones', label: 'Gemstone Details', defaultEnabled: true },
    { key: 'jewelryBuyback', label: 'Buyback Policy', defaultEnabled: true },
  ],
};
