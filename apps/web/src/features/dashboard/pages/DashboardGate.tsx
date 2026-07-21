import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@/features/industries/_shared/registry/useCurrentIndustry';
import DashboardPage from './DashboardPage';

const RestaurantDashboardV2 = lazy(() => import('@/features/industries/restaurant/pages/RestaurantDashboardV2'));
const MobileDashboardV2 = lazy(() => import('@/features/industries/mobile/pages/MobileDashboardV2'));
const CarpetDashboardV2 = lazy(() => import('@/features/industries/carpet/pages/CarpetDashboardV2'));
const RetailDashboardV2 = lazy(() => import('@/features/industries/retail/pages/RetailDashboardV2'));
const BakeryDashboardV2 = lazy(() => import('@/features/industries/bakery/pages/BakeryDashboardV2'));
const ClinicDashboardV2 = lazy(() => import('@/features/industries/clinic/pages/ClinicDashboardV2'));
const ServicesBizDashboardV2 = lazy(() => import('@/features/industries/services-biz/pages/ServicesBizDashboardV2'));
const PharmacyDashboardV2 = lazy(() => import('@/features/industries/pharmacy/pages/PharmacyDashboardV2'));
const JewelryDashboardV2 = lazy(() => import('@/features/industries/jewelry/pages/JewelryDashboardV2'));
const HardwareDashboardV2 = lazy(() => import('@/features/industries/hardware/pages/HardwareDashboardV2'));
const DairyDashboardV2 = lazy(() => import('@/features/industries/dairy/pages/DairyDashboardV2'));
const MeatDashboardV2 = lazy(() => import('@/features/industries/meat/pages/MeatDashboardV2'));
const AgriDashboardV2 = lazy(() => import('@/features/industries/agri/pages/AgriDashboardV2'));
const AutoPartsDashboardV2 = lazy(() => import('@/features/industries/autoparts/pages/AutoPartsDashboardV2'));
const BookstoreDashboardV2 = lazy(() => import('@/features/industries/bookstore/pages/BookstoreDashboardV2'));
const SalonDashboardV2 = lazy(() => import('@/features/industries/salon/pages/SalonDashboardV2'));
const HotelDashboardV2 = lazy(() => import('@/features/industries/hotel/pages/HotelDashboardV2'));
const GymDashboard = lazy(() => import('@/features/industries/gym/pages/GymDashboardV2'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

export default function DashboardGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'restaurant') return <Suspense fallback={<Loader />}><RestaurantDashboardV2 /></Suspense>;
  if (industry?.id === 'mobile') return <Suspense fallback={<Loader />}><MobileDashboardV2 /></Suspense>;
  if (industry?.id === 'carpet') return <Suspense fallback={<Loader />}><CarpetDashboardV2 /></Suspense>;
  if (industry?.id === 'retail') return <Suspense fallback={<Loader />}><RetailDashboardV2 /></Suspense>;
  if (industry?.id === 'bakery') return <Suspense fallback={<Loader />}><BakeryDashboardV2 /></Suspense>;
  if (industry?.id === 'gym') return <Suspense fallback={<Loader />}><GymDashboard /></Suspense>;
  if (industry?.id === 'clinic') return <Suspense fallback={<Loader />}><ClinicDashboardV2 /></Suspense>;
  if (industry?.id === 'services-biz') return <Suspense fallback={<Loader />}><ServicesBizDashboardV2 /></Suspense>;
  if (industry?.id === 'pharmacy') return <Suspense fallback={<Loader />}><PharmacyDashboardV2 /></Suspense>;
  if (industry?.id === 'jewelry') return <Suspense fallback={<Loader />}><JewelryDashboardV2 /></Suspense>;
  if (industry?.id === 'hardware') return <Suspense fallback={<Loader />}><HardwareDashboardV2 /></Suspense>;
  if (industry?.id === 'dairy') return <Suspense fallback={<Loader />}><DairyDashboardV2 /></Suspense>;
  if (industry?.id === 'meat') return <Suspense fallback={<Loader />}><MeatDashboardV2 /></Suspense>;
  if (industry?.id === 'agri') return <Suspense fallback={<Loader />}><AgriDashboardV2 /></Suspense>;
  if (industry?.id === 'autoparts') return <Suspense fallback={<Loader />}><AutoPartsDashboardV2 /></Suspense>;
  if (industry?.id === 'bookstore') return <Suspense fallback={<Loader />}><BookstoreDashboardV2 /></Suspense>;
  if (industry?.id === 'salon') return <Suspense fallback={<Loader />}><SalonDashboardV2 /></Suspense>;
  if (industry?.id === 'hotel') return <Suspense fallback={<Loader />}><HotelDashboardV2 /></Suspense>;

  return <DashboardPage />;
}
