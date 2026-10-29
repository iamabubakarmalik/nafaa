/**
 * Home screen of a distributor: the distribution dashboard (what waits at
 * each step today). Staff who cannot see distribution orders, such as a
 * counter cashier, get the general dashboard instead of an access notice.
 */

import { lazy, Suspense } from 'react';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';

const DistributionDashboard = lazy(() => import('@modules/distribution/pages/DashboardPage'));
const GeneralDashboard = lazy(() => import('@modules/dashboard/general/GeneralDashboard'));

export default function DistributorHome() {
  const canSee = usePermission(PERMISSIONS.DISTRIBUTION_ORDERS_VIEW);
  const Home = canSee ? DistributionDashboard : GeneralDashboard;
  return <Suspense fallback={null}><Home /></Suspense>;
}
