import { DashboardView } from '@modules/dashboard/engine';
import { agriDashboard } from './config';

export default function AgriDashboard() {
  return <DashboardView config={agriDashboard} />;
}
