/** Gaming dashboard (web gaming/dashboard): stations in use, today's money by stream (cafe, top-ups, rentals), rentals overdue and quick actions. */

import { useQuery } from '@tanstack/react-query';
import { CreditCard, Monitor, PackageOpen, Timer, Trophy } from 'lucide-react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Card, ListRow } from '@/design';
import { PackDashboard, type DashAction, type DashAttention } from '../../_shared/packDashboard';
import { gamingApi } from '../api';
import { GAMING_KEYS } from '../meta';

export function GamingDashboardScreen() {
  const q = useQuery({ queryKey: [GAMING_KEYS.dash], queryFn: () => gamingApi.overview(), refetchInterval: 30_000 });
  const d = q.data;
  const attention: DashAttention[] = [];
  if (d?.rentals?.overdue) attention.push({ icon: PackageOpen, tone: 'danger', text: t('{{n}} rental ki wapsi me der', { n: d.rentals.overdue }), href: '/gaming/rentals' });
  if (d?.inventory?.upcomingTournaments) attention.push({ icon: Trophy, tone: 'info', text: t('{{n}} tournament aane wale', { n: d.inventory.upcomingTournaments }), href: '/gaming/tournaments' });
  const actions: DashAction[] = [
    { href: '/gaming/cafe', icon: Timer, label: t('Cafe live'), hint: t('Timers') }, { href: '/gaming/stations', icon: Monitor, label: t('Stations'), hint: t('Rate') },
    { href: '/gaming/rentals', icon: PackageOpen, label: t('Rentals'), hint: t('Kiraya') }, { href: '/gaming/topups', icon: CreditCard, label: t('Top-ups'), hint: t('Cards') }, { href: '/gaming/tournaments', icon: Trophy, label: t('Tournaments'), hint: t('Muqable') },
  ];
  const rows: Array<[string, number | undefined]> = [[t('Cafe sessions'), d?.today?.cafeRevenue], [t('Digital top-ups'), d?.today?.topupRevenue], [t('Rentals'), d?.today?.rentalRevenue]];
  return (
    <PackDashboard title={t('Gaming dashboard')} stats={[{ label: t('Stations chal rahe'), value: `${d?.totals?.activeSessions ?? 0}/${d?.totals?.activeStations ?? 0}` }, { label: t('Aaj Sale'), value: formatMoney(d?.today?.totalRevenue ?? 0) }, { label: t('Is mahine'), value: formatMoney(d?.monthly?.totalRevenue ?? 0) }]}
      attention={attention} actions={actions} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <Card flush title={t('Aaj ki kamai')}>{rows.map(([label, v], i) => <ListRow key={label} divider={i < rows.length - 1} title={label} trailing={formatMoney(v ?? 0)} />)}</Card>
    </PackDashboard>
  );
}
