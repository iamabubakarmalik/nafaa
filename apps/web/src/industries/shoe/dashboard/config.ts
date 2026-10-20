/**
 * Shoe dashboard: the standard dashboard plus size gaps, best-selling
 * sizes, size requests, exchanges and brands.
 */

import {
  Award, BarChart3, BookOpen, Footprints, HandMetal, Plus, Receipt, RefreshCw, Ruler, ShoppingCart, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useShoeOps } from './useShoeOps';
import { ShoeBrands, ShoeDesk, ShoeSizeGaps, ShoeTopSizes, shoeKpis, useShoeAttention } from './widgets';

const productPath = (id: string) => `/shoe-products/${id}`;

function useShoeActions(): QuickAction[] {
  const { data } = useOverview();
  const sh = useShoeOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Sale karein' },
    { to: '/shoe-products/new', icon: Plus, label: 'Naya joota', hint: 'Maal me daalein' },
    { to: '/shoe-products', icon: Footprints, label: 'Maal', hint: `${sh.totals.totalProducts} design` },
    { to: '/shoe/try-on', icon: HandMetal, label: 'Size farmaish', hint: sh.tryOn.pending ? `${sh.tryOn.pending} baqi` : 'Size ka intezar' },
    { to: '/shoe/exchanges', icon: RefreshCw, label: 'Exchange', hint: sh.exchanges.requested ? `${sh.exchanges.requested} baqi` : 'Size badlein' },
    { to: '/shoe/brands', icon: Award, label: 'Brands', hint: `${sh.totals.totalBrands} brands` },
    { to: '/shoe/size-charts', icon: Ruler, label: 'Size charts', hint: 'UK / EU / US' },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const shoeDashboard = createDashboard({
  label: 'Shoes',
  productPath,
  openFrom: 10,
  kpis: shoeKpis,
  defaultKpis: ['shoe-size-gaps', 'shoe-pairs', 'shoe-exchanges', 'profit', 'cash', 'month'],
  useAttention: useShoeAttention,
  widgets: [
    { id: 'shoe-size-gaps', title: 'Size khatam / kam', description: 'Jo size khatam ya kam reh gaye', size: 'third', sizes: ANY_SIZE, Component: ShoeSizeGaps },
    { id: 'shoe-top-sizes', title: 'Sab se zyada bikne wale size', description: 'Kaunsa size sab se zyada bikta hai', size: 'third', sizes: ['third', 'half', 'wide'], Component: ShoeTopSizes },
    { id: 'shoe-desk', title: 'Size farmaish aur exchange', description: 'Size ka intezar aur size exchange', size: 'third', sizes: ['third', 'half'], Component: ShoeDesk },
  ],
  lateWidgets: [
    { id: 'shoe-brands', title: 'Top brands', description: 'Sab se zyada bikne wale brands', size: 'third', sizes: ANY_SIZE, Component: ShoeBrands },
  ],
  useQuickActions: useShoeActions,
  moneyMap: { productsPath: '/shoe-products' },
  guide: [
    { icon: Ruler, title: 'Size ka stock', text: 'Joota size ke bagair nahi bikta. "Size khatam" wo sizes hain jo bilkul nahi bache — sab se zyada bikne wale size hamesha poore rakhein.' },
    { icon: HandMetal, title: 'Size farmaish aur exchange', text: 'Jo customer kisi size ka intezar kar raha hai, aur jo size badalna chahta hai — dono yahan, taa ke koi wapas na jaye.' },
  ],
});
