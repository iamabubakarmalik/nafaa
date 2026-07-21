import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@/features/industries/_shared/registry/useCurrentIndustry';
import CatalogPage from './CatalogPage';

const RestaurantCatalogPage = lazy(() => import('@/features/industries/restaurant/pages/RestaurantCatalogPage'));
const MobileCatalogPage = lazy(() => import('@/features/industries/mobile/pages/MobileCatalogPage'));
const CarpetCatalogPage = lazy(() => import('@/features/industries/carpet/pages/CarpetCatalogPage'));
const BakeryCatalogPage = lazy(() => import('@/features/industries/bakery/pages/BakeryCatalogPage'));
const ClinicCatalogPage = lazy(() => import('@/features/industries/clinic/pages/ClinicCatalogPage'));
const ServicesBizCatalogPage = lazy(() => import('@/features/industries/services-biz/pages/ServicesBizCatalogPage'));
const JewelryCatalogPage = lazy(() => import('@/features/industries/jewelry/pages/JewelryCatalogPage'));
const GymCatalogPage = lazy(() => import('@/features/industries/gym/pages/GymCatalogPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

export default function CatalogGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'restaurant') return <Suspense fallback={<Loader />}><RestaurantCatalogPage /></Suspense>;
  if (industry?.id === 'mobile') return <Suspense fallback={<Loader />}><MobileCatalogPage /></Suspense>;
  if (industry?.id === 'carpet') return <Suspense fallback={<Loader />}><CarpetCatalogPage /></Suspense>;
  if (industry?.id === 'bakery') return <Suspense fallback={<Loader />}><BakeryCatalogPage /></Suspense>;
  if (industry?.id === 'gym') return <Suspense fallback={<Loader />}><GymCatalogPage /></Suspense>;
  if (industry?.id === 'clinic') return <Suspense fallback={<Loader />}><ClinicCatalogPage /></Suspense>;
  if (industry?.id === 'services-biz') return <Suspense fallback={<Loader />}><ServicesBizCatalogPage /></Suspense>;
  if (industry?.id === 'jewelry') return <Suspense fallback={<Loader />}><JewelryCatalogPage /></Suspense>;

  return <CatalogPage />;
}
