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
import { t } from '@core/i18n';

const productPath = (id: string) => `/gaming-products/${id}`;

function useGamingActions(): QuickAction[] {
  const { data } = useOverview();
  const { stations, rentals, topups, tournaments } = useGamingOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/gaming/cafe', icon: Timer, label: t('Cafe live'), hint: t('{{inUse}} chal rahe', { inUse: stations.inUse }) },
    { to: '/pos', icon: ShoppingCart, label: t('POS counter'), hint: t('Sale karein') },
    { to: '/gaming/stations', icon: Monitor, label: t('Stations'), hint: t('{{total}} stations', { total: stations.total }) },
    { to: '/gaming/rentals', icon: PackageOpen, label: t('Rentals'), hint: rentals.overdue ? t('{{overdue}} late', { overdue: rentals.overdue }) : t('{{active}} bahar', { active: rentals.active }) },
    { to: '/gaming/topups', icon: CreditCard, label: t('Top-ups'), hint: t('{{topups}} card', { topups }) },
    { to: '/gaming/tournaments', icon: Trophy, label: t('Tournaments'), hint: t('{{count}} aane wale', { count: tournaments.list.length }) },
    { to: '/gaming-products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein') },
    { to: '/gaming-products', icon: Package, label: t('Products'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sales history'), hint: t('Purani receipts') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const gamingDashboard = createDashboard({
  label: t('Gaming'),
  productPath,
  openFrom: 12,
  primaryAction: { to: '/gaming/cafe', label: t('Cafe live'), icon: Timer },
  kpis: gamingKpis,
  defaultKpis: ['gaming-stations', 'gaming-cafe', 'gaming-rentals', 'sales', 'cash', 'month'],
  useAttention: useGamingAttention,
  widgets: [
    { id: 'gaming-live', title: t('Live sessions'), description: t('Abhi chalne wale stations, waqt aur chalta bill'), size: 'half', sizes: ANY_SIZE, Component: GamingLive },
    { id: 'gaming-streams', title: t('Kamai ke raste'), description: t('Cafe, top-ups aur rentals — aaj aur is mahine'), size: 'third', sizes: ['third', 'half'], Component: GamingStreams },
  ],
  lateWidgets: [
    { id: 'gaming-tournaments', title: t('Aane wale tournament'), description: t('Schedule, players aur prize'), size: 'third', sizes: ANY_SIZE, Component: GamingTournaments },
  ],
  useQuickActions: useGamingActions,
  moneyMap: { productsPath: '/gaming-products' },
  guide: [
    { icon: Timer, title: t('Live sessions'), text: t('Har chalta station, kitni der se khel raha hai aur ab tak ka bill. Ruka hua session peela dikhta hai — bhool kar chalta na rahe.') },
    { icon: PackageOpen, title: t('Rentals aur top-ups'), text: t('Late rental aur khatam hote top-up card "Aaj ka kaam" me upar aate hain — return mangwayein, codes waqt par mangwayein.') },
  ],
});
