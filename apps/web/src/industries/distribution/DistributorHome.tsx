/**
 * Home screen of a distributor: the distribution dashboard (what waits at
 * each step today). Staff who cannot see distribution orders, such as a
 * counter cashier, get the general dashboard instead of an access notice,
 * and so does everyone while distribution is off or not in the plan (the
 * general dashboard then shows the next step at the top).
 */

import { lazy, Suspense } from 'react';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useDistributionState } from '@modules/distribution/hooks/useDistribution';

const DistributionDashboard = lazy(() => import('@modules/distribution/pages/DashboardPage'));
const GeneralDashboard = lazy(() => import('@modules/dashboard/general/GeneralDashboard'));

export default function DistributorHome() {
  const canSee = usePermission(PERMISSIONS.DISTRIBUTION_ORDERS_VIEW);
  const { state } = useDistributionState();
  if (state === 'loading') return null;
  const Home = canSee && state === 'on' ? DistributionDashboard : GeneralDashboard;
  return <Suspense fallback={null}><Home /></Suspense>;
}
