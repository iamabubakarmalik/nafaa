import { DashboardView } from '@modules/dashboard/engine';
import { carpetDashboard } from './config';

export default function CarpetDashboard() {
  return <DashboardView config={carpetDashboard} />;
}
