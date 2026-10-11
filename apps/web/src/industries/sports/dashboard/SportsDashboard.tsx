import { DashboardView } from '@modules/dashboard/engine';
import { sportsDashboard } from './config';

export default function SportsDashboard() {
  return <DashboardView config={sportsDashboard} />;
}
