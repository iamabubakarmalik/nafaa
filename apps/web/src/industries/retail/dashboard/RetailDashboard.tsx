import { DashboardView } from '@modules/dashboard/engine';
import { retailDashboard } from './config';

export default function RetailDashboard() {
  return <DashboardView config={retailDashboard} />;
}
