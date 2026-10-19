/** The jewelry bill is made at the counter; this old address opens it. */

import { Navigate } from 'react-router-dom';

export default function NewSalePage() {
  return <Navigate to="/pos" replace />;
}
