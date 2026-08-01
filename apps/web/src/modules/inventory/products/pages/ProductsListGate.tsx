// apps/web/src/modules/inventory/products/pages/ProductsListGate.tsx
import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '../../../../industries/_shared/registry/useCurrentIndustry';
import ProductsListPage from './ProductsListPage';

const RetailProductsPage = lazy(() => import('../../../../industries/retail/pages/RetailProductsPage'));

// ─── 10 NEW industries with dedicated list pages ───
const AppliancesProductsPage = lazy(() => import('@industries/appliances/pages/AppliancesProductsPage'));
const ElectronicsProductsPage = lazy(() => import('@industries/electronics/pages/ElectronicsProductsPage'));
const FloristProductsPage = lazy(() => import('@industries/florist/pages/FloristProductsPage'));
const FurnitureProductsPage = lazy(() => import('@industries/furniture/pages/FurnitureProductsPage'));
const GamingProductsPage = lazy(() => import('@industries/gaming/pages/GamingProductsPage'));
const OpticalProductsPage = lazy(() => import('@industries/optical/pages/OpticalProductsPage'));
const PetshopProductsPage = lazy(() => import('@industries/petshop/pages/PetshopProductsPage'));
const ShoeProductsPage = lazy(() => import('@industries/shoe/pages/ShoeProductsPage'));
const SportsProductsPage = lazy(() => import('@industries/sports/pages/SportsProductsPage'));
const ToystoreProductsPage = lazy(() => import('@industries/toystore/pages/ToyProductsPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-sky-200 border-t-sky-600 animate-spin" />
    </div>
  );
}

/**
 * ProductsListGate — /products ko industry ke hisaab se route karta hai.
 */
export default function ProductsListGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'retail') return <Suspense fallback={<Loader />}><RetailProductsPage /></Suspense>;

  // 10 NEW industries
  if (industry?.id === 'appliances') return <Suspense fallback={<Loader />}><AppliancesProductsPage /></Suspense>;
  if (industry?.id === 'electronics') return <Suspense fallback={<Loader />}><ElectronicsProductsPage /></Suspense>;
  if (industry?.id === 'florist') return <Suspense fallback={<Loader />}><FloristProductsPage /></Suspense>;
  if (industry?.id === 'furniture') return <Suspense fallback={<Loader />}><FurnitureProductsPage /></Suspense>;
  if (industry?.id === 'gaming') return <Suspense fallback={<Loader />}><GamingProductsPage /></Suspense>;
  if (industry?.id === 'optical') return <Suspense fallback={<Loader />}><OpticalProductsPage /></Suspense>;
  if (industry?.id === 'petshop') return <Suspense fallback={<Loader />}><PetshopProductsPage /></Suspense>;
  if (industry?.id === 'shoe') return <Suspense fallback={<Loader />}><ShoeProductsPage /></Suspense>;
  if (industry?.id === 'sports') return <Suspense fallback={<Loader />}><SportsProductsPage /></Suspense>;
  if (industry?.id === 'toystore') return <Suspense fallback={<Loader />}><ToystoreProductsPage /></Suspense>;

  return <ProductsListPage />;
}
