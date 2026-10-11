import { DashboardView } from '@modules/dashboard/engine';
import { electronicsDashboard } from './config';

export default function ElectronicsDashboard() {
  return <DashboardView config={electronicsDashboard} />;
}
