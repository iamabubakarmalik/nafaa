import { DashboardView } from '../engine';
import { generalDashboard } from './config';

export default function GeneralDashboard() {
  return <DashboardView config={generalDashboard} />;
}
