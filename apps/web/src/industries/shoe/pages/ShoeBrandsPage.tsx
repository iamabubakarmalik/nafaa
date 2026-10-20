/**
 * Shoe brands are the shop's product brands (one list for the editor,
 * filters and reports). Older shoe brands are moved there first, then the
 * shared brands page opens.
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/design-system/components';
import { shoeProductsApi } from '../api/products.api';

export default function ShoeBrandsPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { shoeProductsApi.syncBrands().catch(() => undefined).finally(() => setReady(true)); }, []);
  return ready ? <Navigate to="/brands" replace /> : <Skeleton className="h-40 w-full rounded-3xl" />;
}
