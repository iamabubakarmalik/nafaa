/**
 * Sports shop dashboard: the standard dashboard plus team orders, repairs
 * and brands.
 */

import { Award, BarChart3, BookOpen, Package, Plus, Receipt, ShoppingCart, Trophy, Users, Wrench } from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useSportsOps } from './useSportsOps';
import {
  SportsBrands, SportsRepairs, SportsTeamDeliveries, sportsKpis, useSportsAttention, useSportsMoneyTiles,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/sports-products/${id}`;

function useSportsActions(): QuickAction[] {
  const { data } = useOverview();
  const { team, repairs, totalBrands, totalProducts } = useSportsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein') },
    { to: '/sports-products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein') },
    { to: '/sports-products', icon: Package, label: t('Products'), hint: t('{{value}} items', { value: totalProducts || s?.totalProducts || 0 }) },
    { to: '/sports/team-orders/new', icon: Users, label: t('Team order'), hint: t('Naya order') },
    { to: '/sports/team-orders', icon: Trophy, label: t('Team orders'), hint: team.ready ? t('{{ready}} tayyar', { ready: team.ready }) : t('{{active}} chaalu', { active: team.active }) },
    { to: '/sports/repair-services', icon: Wrench, label: t('Repairs'), hint: repairs.overdue ? t('{{overdue}} late', { overdue: repairs.overdue }) : t('{{pending}} baqi', { pending: repairs.pending }) },
    { to: '/sports/brands', icon: Award, label: t('Brands'), hint: t('{{totalBrands}} brands', { totalBrands }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const sportsDashboard = createDashboard({
  label: t('Sports'),
  productPath,
  kpis: sportsKpis,
  defaultKpis: ['sports-team-orders', 'sports-repairs', 'profit', 'month', 'cash', 'low-stock'],
  useAttention: useSportsAttention,
  widgets: [
    { id: 'sports-team-deliveries', title: t('Team order delivery'), description: t('Agle 14 din me dene wale team orders aur baqi amount'), size: 'half', sizes: ANY_SIZE, Component: SportsTeamDeliveries },
    { id: 'sports-repairs', title: t('Repair me saamaan'), description: t('Bat, racket aur doosra saamaan jo repair me hai'), size: 'half', sizes: ANY_SIZE, Component: SportsRepairs },
  ],
  lateWidgets: [
    { id: 'sports-brands', title: t('Top brands'), description: t('Sab se zyada bikne wale brands'), size: 'third', sizes: ANY_SIZE, Component: SportsBrands },
  ],
  useQuickActions: useSportsActions,
  moneyMap: { useExtraTiles: useSportsMoneyTiles, productsPath: '/sports-products' },
  guide: [
    { icon: Users, title: t('Team orders'), text: t('Jersey aur kit ke bare order delivery ki date se lage hain. Jo 3 din me dena hai aur tayyar nahi, wo "Aaj ka kaam" me upar aata hai — baqi amount bhi saath likhi hai.') },
    { icon: Wrench, title: t('Repairs'), text: t('Jo repair waada kiye waqt se late ho gayi wo laal dikhti hai. Jo mukammal ho chuki uske customer ko call karein taake saamaan le jaye.') },
  ],
});
