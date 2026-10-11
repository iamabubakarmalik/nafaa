import { DashboardView } from '@modules/dashboard/engine';
import { pharmacyDashboard } from './config';

export default function PharmacyDashboard() {
  return <DashboardView config={pharmacyDashboard} />;
}
