import { DashboardView } from '@modules/dashboard/engine';
import { cosmeticsDashboard } from './config';

export default function CosmeticsDashboard() {
  return <DashboardView config={cosmeticsDashboard} />;
}
