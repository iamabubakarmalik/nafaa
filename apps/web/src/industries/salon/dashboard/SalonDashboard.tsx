import { DashboardView } from '@modules/dashboard/engine';
import { salonDashboard } from './config';

export default function SalonDashboard() {
  return <DashboardView config={salonDashboard} />;
}
