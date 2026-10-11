import { DashboardView } from '@modules/dashboard/engine';
import { meatDashboard } from './config';

export default function MeatDashboard() {
  return <DashboardView config={meatDashboard} />;
}
