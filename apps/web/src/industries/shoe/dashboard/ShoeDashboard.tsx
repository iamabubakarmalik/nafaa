import { DashboardView } from '@modules/dashboard/engine';
import { shoeDashboard } from './config';

export default function ShoeDashboard() {
  return <DashboardView config={shoeDashboard} />;
}
