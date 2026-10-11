import { DashboardView } from '@modules/dashboard/engine';
import { servicesBizDashboard } from './config';

export default function ServicesBizDashboard() {
  return <DashboardView config={servicesBizDashboard} />;
}
