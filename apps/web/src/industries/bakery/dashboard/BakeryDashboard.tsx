import { DashboardView } from '@modules/dashboard/engine';
import { bakeryDashboard } from './config';

export default function BakeryDashboard() {
  return <DashboardView config={bakeryDashboard} />;
}
