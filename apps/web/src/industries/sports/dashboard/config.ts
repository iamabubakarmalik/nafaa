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

const productPath = (id: string) => `/sports-products/${id}`;

function useSportsActions(): QuickAction[] {
  const { data } = useOverview();
  const { team, repairs, totalBrands, totalProducts } = useSportsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Sale karein' },
    { to: '/sports-products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/sports-products', icon: Package, label: 'Products', hint: `${totalProducts || s?.totalProducts || 0} items` },
    { to: '/sports/team-orders/new', icon: Users, label: 'Team order', hint: 'Naya order' },
    { to: '/sports/team-orders', icon: Trophy, label: 'Team orders', hint: team.ready ? `${team.ready} tayyar` : `${team.active} chaalu` },
    { to: '/sports/repair-services', icon: Wrench, label: 'Repairs', hint: repairs.overdue ? `${repairs.overdue} late` : `${repairs.pending} baqi` },
    { to: '/sports/brands', icon: Award, label: 'Brands', hint: `${totalBrands} brands` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const sportsDashboard = createDashboard({
  label: 'Sports',
  productPath,
  kpis: sportsKpis,
  defaultKpis: ['sports-team-orders', 'sports-repairs', 'profit', 'month', 'cash', 'low-stock'],
  useAttention: useSportsAttention,
  widgets: [
    { id: 'sports-team-deliveries', title: 'Team order delivery', description: 'Agle 14 din me dene wale team orders aur baqi amount', size: 'half', sizes: ANY_SIZE, Component: SportsTeamDeliveries },
    { id: 'sports-repairs', title: 'Repair me saamaan', description: 'Bat, racket aur doosra saamaan jo repair me hai', size: 'half', sizes: ANY_SIZE, Component: SportsRepairs },
  ],
  lateWidgets: [
    { id: 'sports-brands', title: 'Top brands', description: 'Sab se zyada bikne wale brands', size: 'third', sizes: ANY_SIZE, Component: SportsBrands },
  ],
  useQuickActions: useSportsActions,
  moneyMap: { useExtraTiles: useSportsMoneyTiles, productsPath: '/sports-products' },
  guide: [
    { icon: Users, title: 'Team orders', text: 'Jersey aur kit ke bare order delivery ki date se lage hain. Jo 3 din me dena hai aur tayyar nahi, wo "Aaj ka kaam" me upar aata hai — baqi amount bhi saath likhi hai.' },
    { icon: Wrench, title: 'Repairs', text: 'Jo repair waada kiye waqt se late ho gayi wo laal dikhti hai. Jo mukammal ho chuki uske customer ko call karein taake saamaan le jaye.' },
  ],
});
