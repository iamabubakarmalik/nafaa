import {
  Gem, LayoutDashboard, Sparkles, Users, TrendingUp, Coins,
  Palette, Repeat, ShoppingBag,
} from 'lucide-react';
import type { IndustryPack } from '@/features/industries/_shared/types/industry-pack';

import JewelryDashboardPage from './pages/JewelryDashboardPage';
import JewelryProductsPage from './pages/JewelryProductsPage';
import JewelrySalesPage from './pages/JewelrySalesPage';
import NewSalePage from './pages/NewSalePage';
import CustomOrdersPage from './pages/CustomOrdersPage';
import ExchangesPage from './pages/ExchangesPage';
import KarigarsPage from './pages/KarigarsPage';
import MetalRatesPage from './pages/MetalRatesPage';
import MetalStockPage from './pages/MetalStockPage';
import JewelryItemWizardPage from './pages/JewelryItemWizardPage';
import JewelryItemDetailPage from './pages/JewelryItemDetailPage';

export const JewelryPack: IndustryPack = {
  id: 'jewelry',
  name: 'Jewelry / Sonar',
  shortName: 'Jewelry',
  emoji: '💎',
  themeColor: '#d97706',
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
        { to: '/jewelry-items/new', label: '+ Add Jewelry Item', icon: Sparkles, badge: 'FAST' },
        { to: '/jewelry/dashboard', label: 'Jewelry Dashboard', icon: LayoutDashboard },
        { to: '/jewelry/products', label: 'Jewelry Catalog', icon: Gem },
        { to: '/jewelry/sales', label: 'Sales', icon: ShoppingBag },
        { to: '/jewelry/custom-orders', label: 'Custom Orders', icon: Palette, badge: 'NEW' },
        { to: '/jewelry/exchanges', label: 'Exchanges', icon: Repeat },
        { to: '/jewelry/karigars', label: 'Karigars', icon: Users },
        { to: '/jewelry/metal-rates', label: 'Metal Rates', icon: TrendingUp },
        { to: '/jewelry/metal-stock', label: 'Metal Stock', icon: Coins },
      ],
    },
  ],

  routes: [
    { path: '/jewelry-items/new', element: JewelryItemWizardPage },
    { path: '/jewelry-items/:id/edit', element: JewelryItemWizardPage },
    { path: '/jewelry-items/:id', element: JewelryItemDetailPage },
    { path: '/jewelry', element: JewelryDashboardPage },
    { path: '/jewelry/dashboard', element: JewelryDashboardPage },
    { path: '/jewelry/products', element: JewelryProductsPage },
    { path: '/jewelry/sales/new', element: NewSalePage },
    { path: '/jewelry/sales', element: JewelrySalesPage },
    { path: '/jewelry/custom-orders', element: CustomOrdersPage },
    { path: '/jewelry/exchanges', element: ExchangesPage },
    { path: '/jewelry/karigars', element: KarigarsPage },
    { path: '/jewelry/metal-rates', element: MetalRatesPage },
    { path: '/jewelry/metal-stock', element: MetalStockPage },
  ],

  dashboardComponent: JewelryDashboardPage,

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
