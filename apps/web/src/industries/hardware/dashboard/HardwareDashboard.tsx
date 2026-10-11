import { DashboardView } from '@modules/dashboard/engine';
import { hardwareDashboard } from './config';

export default function HardwareDashboard() {
  return <DashboardView config={hardwareDashboard} />;
}
