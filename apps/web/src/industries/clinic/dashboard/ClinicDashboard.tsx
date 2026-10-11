import { DashboardView } from '@modules/dashboard/engine';
import { clinicDashboard } from './config';

export default function ClinicDashboard() {
  return <DashboardView config={clinicDashboard} />;
}
