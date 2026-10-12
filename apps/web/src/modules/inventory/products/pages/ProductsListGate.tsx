/**
 * Picks the products page for the current industry. Retail, Bakery,
 * Electronics and businesses without an industry use the shared page
 * (modules/inventory/products/list); the rest keep their own pages for now,
 * and industries without one use the older general list (carpet rolls,
 * IMEI and other industry panels live there).
 */

import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { Skeleton } from '@/design-system/components';

const PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  retail: lazy(() => import('@industries/retail/products/RetailProducts')),
  bakery: lazy(() => import('@industries/bakery/products/BakeryProducts')),
  electronics: lazy(() => import('@industries/electronics/products/ElectronicsProducts')),
  mobile: lazy(() => import('@industries/mobile/pages/MobileProductsPage')),
  appliances: lazy(() => import('@industries/appliances/pages/AppliancesProductsPage')),
  agri: lazy(() => import('@industries/agri/pages/AgriProductsListPage')),
  florist: lazy(() => import('@industries/florist/pages/FloristProductsPage')),
  furniture: lazy(() => import('@industries/furniture/pages/FurnitureProductsPage')),
  gaming: lazy(() => import('@industries/gaming/pages/GamingProductsPage')),
  optical: lazy(() => import('@industries/optical/pages/OpticalProductsPage')),
  petshop: lazy(() => import('@industries/petshop/pages/PetshopProductsPage')),
  shoe: lazy(() => import('@industries/shoe/pages/ShoeProductsPage')),
  sports: lazy(() => import('@industries/sports/pages/SportsProductsPage')),
  toystore: lazy(() => import('@industries/toystore/pages/ToyProductsPage')),
  // A restaurant's "stock" is its menu: whether a dish can be made, not a count.
  restaurant: lazy(() => import('@industries/restaurant/pages/RestaurantProductsListPage')),
};

const GeneralProducts = lazy(() => import('../list/general/GeneralProducts'));
const IndustryFallback = lazy(() => import('./ProductsListPage'));

function Loading() {
  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4">
      <Skeleton className="h-32 w-full rounded-3xl" />
      <Skeleton className="h-16 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-[22rem] rounded-2xl" />)}</div>
    </div>
  );
}

export default function ProductsListGate() {
  const industry = useCurrentIndustry();
  const Page = industry?.id ? (PAGES[industry.id] ?? IndustryFallback) : GeneralProducts;
  return <Suspense fallback={<Loading />}><Page /></Suspense>;
}
