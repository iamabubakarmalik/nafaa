/**
 * Gaming dashboard: the standard dashboard plus live cafe sessions,
 * revenue by stream (cafe, top-ups, rentals) and tournaments.
 */

import {
  BarChart3, BookOpen, CreditCard, Monitor, Package, PackageOpen, Plus, Receipt, ShoppingCart, Timer, Trophy, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useGamingOps } from './useGamingOps';
import { GamingLive, GamingStreams, GamingTournaments, gamingKpis, useGamingAttention } from './widgets';

const productPath = (id: string) => `/gaming-products/${id}`;

function useGamingActions(): QuickAction[] {
  const { data } = useOverview();
  const { stations, rentals, topups, tournaments } = useGamingOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/gaming/cafe', icon: Timer, label: 'Cafe live', hint: `${stations.inUse} chal rahe` },
    { to: '/pos', icon: ShoppingCart, label: 'POS counter', hint: 'Sale karein' },
    { to: '/gaming/stations', icon: Monitor, label: 'Stations', hint: `${stations.total} stations` },
    { to: '/gaming/rentals', icon: PackageOpen, label: 'Rentals', hint: rentals.overdue ? `${rentals.overdue} late` : `${rentals.active} bahar` },
    { to: '/gaming/topups', icon: CreditCard, label: 'Top-ups', hint: `${topups} card` },
    { to: '/gaming/tournaments', icon: Trophy, label: 'Tournaments', hint: `${tournaments.list.length} aane wale` },
    { to: '/gaming-products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/gaming-products', icon: Package, label: 'Products', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sales history', hint: 'Purani receipts' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const gamingDashboard = createDashboard({
  label: 'Gaming',
  productPath,
  openFrom: 12,
  primaryAction: { to: '/gaming/cafe', label: 'Cafe live', icon: Timer },
  kpis: gamingKpis,
  defaultKpis: ['gaming-stations', 'gaming-cafe', 'gaming-rentals', 'sales', 'cash', 'month'],
  useAttention: useGamingAttention,
  widgets: [
    { id: 'gaming-live', title: 'Live sessions', description: 'Abhi chalne wale stations, waqt aur chalta bill', size: 'half', sizes: ANY_SIZE, Component: GamingLive },
    { id: 'gaming-streams', title: 'Kamai ke raste', description: 'Cafe, top-ups aur rentals — aaj aur is mahine', size: 'third', sizes: ['third', 'half'], Component: GamingStreams },
  ],
  lateWidgets: [
    { id: 'gaming-tournaments', title: 'Aane wale tournament', description: 'Schedule, players aur prize', size: 'third', sizes: ANY_SIZE, Component: GamingTournaments },
  ],
  useQuickActions: useGamingActions,
  moneyMap: { productsPath: '/gaming-products' },
  guide: [
    { icon: Timer, title: 'Live sessions', text: 'Har chalta station, kitni der se khel raha hai aur ab tak ka bill. Ruka hua session peela dikhta hai — bhool kar chalta na rahe.' },
    { icon: PackageOpen, title: 'Rentals aur top-ups', text: 'Late rental aur khatam hote top-up card "Aaj ka kaam" me upar aate hain — wapsi mangwayein, codes waqt par mangwayein.' },
  ],
});
