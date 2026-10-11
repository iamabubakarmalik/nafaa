import { DashboardView } from '@modules/dashboard/engine';
import { dairyDashboard } from './config';

export default function DairyDashboard() {
  return <DashboardView config={dairyDashboard} />;
}
