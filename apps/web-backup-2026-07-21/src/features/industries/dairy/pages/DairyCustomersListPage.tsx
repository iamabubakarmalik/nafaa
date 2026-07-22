import DairyCustomersPage from './DairyCustomersPage';

/**
 * DairyCustomersListPage — Dairy tenant's /customers route.
 * The existing DairyCustomersPage (with routes, pause/resume, custom quantities)
 * is already the best dairy customer management screen — reuse it.
 */
export default function DairyCustomersListPage() {
  return <DairyCustomersPage />;
}
