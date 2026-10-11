import { DashboardView } from '@modules/dashboard/engine';
import { toystoreDashboard } from './config';

export default function ToystoreDashboard() {
  return <DashboardView config={toystoreDashboard} />;
}
