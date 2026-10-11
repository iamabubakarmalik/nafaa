import { DashboardView } from '@modules/dashboard/engine';
import { opticalDashboard } from './config';

export default function OpticalDashboard() {
  return <DashboardView config={opticalDashboard} />;
}
