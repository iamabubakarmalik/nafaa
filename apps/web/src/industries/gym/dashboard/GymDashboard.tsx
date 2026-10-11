import { DashboardView } from '@modules/dashboard/engine';
import { gymDashboard } from './config';

export default function GymDashboard() {
  return <DashboardView config={gymDashboard} />;
}
