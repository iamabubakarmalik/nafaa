import { DashboardView } from '@modules/dashboard/engine';
import { hotelDashboard } from './config';

export default function HotelDashboard() {
  return <DashboardView config={hotelDashboard} />;
}
