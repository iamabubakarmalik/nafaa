/**
 * /distribution/reports (linked from Nafaa AI) opens the Distribution tab of
 * the report centre, keeping the day and view: ?tab=dsr&date=… or ?tab=summary.
 */

import { Navigate, useSearchParams } from 'react-router-dom';

export default function DistributionReportsRedirect() {
  const [params] = useSearchParams();
  const next = new URLSearchParams({ tab: 'distribution', view: params.get('tab') === 'summary' ? 'summary' : 'dsr' });
  const date = params.get('date');
  if (date) next.set('date', date);
  return <Navigate to={`/reports?${next.toString()}`} replace />;
}
