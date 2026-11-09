/**
 * One product library dialog for the whole app. Any screen opens it with
 * `openProductLibrary` (products page button, POS or products-page scans
 * that matched nothing); the host mounted in App shows it and refreshes the
 * product lists after an import.
 */

import { Suspense, lazy, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import type { ProductLibraryProps } from './ProductLibrary';

const ProductLibrary = lazy(() => import('./ProductLibrary').then((m) => ({ default: m.ProductLibrary })));

type Request = Omit<ProductLibraryProps, 'onClose'>;
let show: ((r: Request | null) => void) | null = null;

export function openProductLibrary(request: Request = {}) {
  show?.(request);
}

/** Query keys of every list that shows products. */
const PRODUCT_KEYS = ['product-catalog', 'products', 'product', 'products-for-pos', 'retail-products', 'brands', 'categories', 'tags', 'pharmacy-medicine-facts'];

export function ProductLibraryHost() {
  const [request, setRequest] = useState<Request | null>(null);
  const qc = useQueryClient();
  useEffect(() => {
    show = setRequest;
    return () => { show = null; };
  }, []);
  if (!request) return null;
  return (
    <Suspense fallback={null}>
      <ProductLibrary
        {...request}
        onClose={() => setRequest(null)}
        onImported={() => {
          PRODUCT_KEYS.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
          void forceRefreshProducts().catch(() => undefined);
          request.onImported?.();
        }}
      />
    </Suspense>
  );
}
