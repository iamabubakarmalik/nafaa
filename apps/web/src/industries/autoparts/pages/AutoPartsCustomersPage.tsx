import { Navigate } from 'react-router-dom';

/** Customers use the shared directory (khata, vehicles from the vehicles page); this old page only forwards there. */
export default function AutoPartsCustomersPage() {
  return <Navigate to="/customers" replace />;
}
