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
import { t } from '@core/i18n';

const productPath = (id: string) => `/shoe-products/${id}`;

function useShoeActions(): QuickAction[] {
  const { data } = useOverview();
  const sh = useShoeOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein') },
    { to: '/shoe-products/new', icon: Plus, label: t('Naya joota'), hint: t('Maal me daalein') },
    { to: '/shoe-products', icon: Footprints, label: t('Maal'), hint: t('{{totalProducts}} design', { totalProducts: sh.totals.totalProducts }) },
    { to: '/shoe/try-on', icon: HandMetal, label: t('Size farmaish'), hint: sh.tryOn.pending ? t('{{pending}} baqi', { pending: sh.tryOn.pending }) : t('Size ka intezar') },
    { to: '/shoe/exchanges', icon: RefreshCw, label: t('Exchange'), hint: t('Size badlein') },
    { to: '/shoe/brands', icon: Award, label: t('Brands'), hint: t('{{totalBrands}} brands', { totalBrands: sh.totals.totalBrands }) },
    { to: '/shoe/size-charts', icon: Ruler, label: t('Size charts'), hint: t('UK / EU / US') },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const shoeDashboard = createDashboard({
  label: t('Shoes'),
  productPath,
  openFrom: 10,
  kpis: shoeKpis,
  defaultKpis: ['shoe-size-gaps', 'shoe-pairs', 'shoe-exchanges', 'profit', 'cash', 'month'],
  useAttention: useShoeAttention,
  widgets: [
    { id: 'shoe-size-gaps', title: t('Size khatam / kam'), description: t('Jo size khatam ya kam reh gaye'), size: 'third', sizes: ANY_SIZE, Component: ShoeSizeGaps },
    { id: 'shoe-top-sizes', title: t('Sab se zyada bikne wale size'), description: t('Kaunsa size sab se zyada bikta hai'), size: 'third', sizes: ['third', 'half', 'wide'], Component: ShoeTopSizes },
    { id: 'shoe-desk', title: t('Size farmaish aur exchange'), description: t('Size ka intezar aur size exchange'), size: 'third', sizes: ['third', 'half'], Component: ShoeDesk },
  ],
  lateWidgets: [
    { id: 'shoe-brands', title: t('Top brands'), description: t('Sab se zyada bikne wale brands'), size: 'third', sizes: ANY_SIZE, Component: ShoeBrands },
  ],
  useQuickActions: useShoeActions,
  moneyMap: { productsPath: '/shoe-products' },
  guide: [
    { icon: Ruler, title: t('Size ka stock'), text: t('Joota size ke bagair nahi bikta. "Size khatam" wo sizes hain jo bilkul nahi bache — sab se zyada bikne wale size hamesha poore rakhein.') },
    { icon: HandMetal, title: t('Size farmaish aur exchange'), text: t('Jo customer kisi size ka intezar kar raha hai, aur jo size badalna chahta hai — dono yahan, taa ke koi wapas na jaye.') },
  ],
});
