import { DashboardView } from '@modules/dashboard/engine';
import { garmentsDashboard } from './config';

export default function GarmentsDashboard() {
  return <DashboardView config={garmentsDashboard} />;
}
