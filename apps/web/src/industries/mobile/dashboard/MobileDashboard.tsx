import { DashboardView } from '@modules/dashboard/engine';
import { mobileDashboard } from './config';

export default function MobileDashboard() {
  return <DashboardView config={mobileDashboard} />;
}
