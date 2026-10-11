import { DashboardView } from '@modules/dashboard/engine';
import { restaurantDashboard } from './config';

export default function RestaurantDashboard() {
  return <DashboardView config={restaurantDashboard} />;
}
