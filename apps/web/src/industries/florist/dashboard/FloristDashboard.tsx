import { DashboardView } from '@modules/dashboard/engine';
import { floristDashboard } from './config';

export default function FloristDashboard() {
  return <DashboardView config={floristDashboard} />;
}
