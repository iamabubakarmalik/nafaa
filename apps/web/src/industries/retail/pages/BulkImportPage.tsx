/** The retail import moved to the shared import page; old links and bookmarks land there. */

import { Navigate } from 'react-router-dom';

export default function BulkImportPage() {
  return <Navigate to="/products/bulk-import" replace />;
}
