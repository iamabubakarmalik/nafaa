import { DashboardView } from '@modules/dashboard/engine';
import { gamingDashboard } from './config';

export default function GamingDashboard() {
  return <DashboardView config={gamingDashboard} />;
}
