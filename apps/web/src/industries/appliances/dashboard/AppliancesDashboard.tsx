import { DashboardView } from '@modules/dashboard/engine';
import { appliancesDashboard } from './config';

export default function AppliancesDashboard() {
  return <DashboardView config={appliancesDashboard} />;
}
