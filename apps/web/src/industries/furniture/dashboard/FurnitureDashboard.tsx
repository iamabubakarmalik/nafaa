import { DashboardView } from '@modules/dashboard/engine';
import { furnitureDashboard } from './config';

export default function FurnitureDashboard() {
  return <DashboardView config={furnitureDashboard} />;
}
