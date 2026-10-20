/**
 * Sports brands are the shop's product brands (one list for the editor,
 * filters and reports). Older sports brands are moved there first, then
 * the shared brands page opens.
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Skeleton } from '@/design-system/components';
import { sportsProductsApi } from '../api/products.api';

export default function SportsBrandsPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { sportsProductsApi.syncBrands().catch(() => undefined).finally(() => setReady(true)); }, []);
  return ready ? <Navigate to="/brands" replace /> : <Skeleton className="h-40 w-full rounded-3xl" />;
}
