import { DashboardView } from '@modules/dashboard/engine';
import { autoPartsDashboard } from './config';

export default function AutoPartsDashboard() {
  return <DashboardView config={autoPartsDashboard} />;
}
