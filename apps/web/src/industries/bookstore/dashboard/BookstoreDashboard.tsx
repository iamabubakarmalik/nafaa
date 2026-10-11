import { DashboardView } from '@modules/dashboard/engine';
import { bookstoreDashboard } from './config';

export default function BookstoreDashboard() {
  return <DashboardView config={bookstoreDashboard} />;
}
