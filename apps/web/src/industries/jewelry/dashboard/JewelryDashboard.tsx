import { DashboardView } from '@modules/dashboard/engine';
import { jewelryDashboard } from './config';

export default function JewelryDashboard() {
  return <DashboardView config={jewelryDashboard} />;
}
