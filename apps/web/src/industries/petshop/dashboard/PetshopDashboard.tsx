import { DashboardView } from '@modules/dashboard/engine';
import { petshopDashboard } from './config';

export default function PetshopDashboard() {
  return <DashboardView config={petshopDashboard} />;
}
