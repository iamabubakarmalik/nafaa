// apps/web/src/modules/dashboard/pages/DashboardGate.tsx
import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import DashboardPage from './DashboardPage';

// ─── Original 19 industries ───
const RestaurantDashboardV2 = lazy(() => import('@industries/restaurant/pages/RestaurantDashboardV2'));
const MobileDashboardV2 = lazy(() => import('@industries/mobile/pages/MobileDashboardV2'));
const CarpetDashboardV2 = lazy(() => import('@industries/carpet/pages/CarpetDashboardV2'));
const RetailDashboardV2 = lazy(() => import('@industries/retail/pages/RetailDashboardV2'));
const BakeryDashboardV2 = lazy(() => import('@industries/bakery/pages/BakeryDashboardV2'));
const ClinicDashboardV2 = lazy(() => import('@industries/clinic/pages/ClinicDashboardV2'));
const ServicesBizDashboardV2 = lazy(() => import('@industries/services-biz/pages/ServicesBizDashboardV2'));
const PharmacyDashboardV2 = lazy(() => import('@industries/pharmacy/pages/PharmacyDashboardV2'));
const JewelryDashboardV2 = lazy(() => import('@industries/jewelry/pages/JewelryDashboardV2'));
const HardwareDashboardV2 = lazy(() => import('@industries/hardware/pages/HardwareDashboardV2'));
const DairyDashboardV2 = lazy(() => import('@industries/dairy/pages/DairyDashboardV2'));
const MeatDashboardV2 = lazy(() => import('@industries/meat/pages/MeatDashboardV2'));
const AgriDashboardV2 = lazy(() => import('@industries/agri/pages/AgriDashboardV2'));
const AutoPartsDashboardV2 = lazy(() => import('@industries/autoparts/pages/AutoPartsDashboardV2'));
const BookstoreDashboardV2 = lazy(() => import('@industries/bookstore/pages/BookstoreDashboardV2'));
const SalonDashboardV2 = lazy(() => import('@industries/salon/pages/SalonDashboardV2'));
const HotelDashboardV2 = lazy(() => import('@industries/hotel/pages/HotelDashboardV2'));
const GymDashboard = lazy(() => import('@industries/gym/pages/GymDashboardV2'));
const GarmentsDashboard = lazy(() => import('@industries/garments/pages/GarmentsDashboardV2'));

// ─── 10 NEW industries ───
const AppliancesDashboard = lazy(() => import('@industries/appliances/pages/AppliancesDashboardPage'));
const ElectronicsDashboard = lazy(() => import('@industries/electronics/pages/ElectronicsDashboardPage'));
const FloristDashboard = lazy(() => import('@industries/florist/pages/FloristDashboardPage'));
const FurnitureDashboard = lazy(() => import('@industries/furniture/pages/FurnitureDashboardPage'));
const GamingDashboard = lazy(() => import('@industries/gaming/pages/GamingDashboardPage'));
const OpticalDashboard = lazy(() => import('@industries/optical/pages/OpticalDashboardPage'));
const PetshopDashboard = lazy(() => import('@industries/petshop/pages/PetshopDashboardPage'));
const ShoeDashboard = lazy(() => import('@industries/shoe/pages/ShoeDashboardPage'));
const SportsDashboard = lazy(() => import('@industries/sports/pages/SportsDashboardPage'));
const ToystoreDashboard = lazy(() => import('@industries/toystore/pages/ToystoreDashboardPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

export default function DashboardGate() {
  const industry = useCurrentIndustry();

  // ─── Original 19 ───
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
  if (industry?.id === 'garments') return <Suspense fallback={<Loader />}><GarmentsDashboard /></Suspense>;

  // ─── 10 NEW ───
  if (industry?.id === 'appliances') return <Suspense fallback={<Loader />}><AppliancesDashboard /></Suspense>;
  if (industry?.id === 'electronics') return <Suspense fallback={<Loader />}><ElectronicsDashboard /></Suspense>;
  if (industry?.id === 'florist') return <Suspense fallback={<Loader />}><FloristDashboard /></Suspense>;
  if (industry?.id === 'furniture') return <Suspense fallback={<Loader />}><FurnitureDashboard /></Suspense>;
  if (industry?.id === 'gaming') return <Suspense fallback={<Loader />}><GamingDashboard /></Suspense>;
  if (industry?.id === 'optical') return <Suspense fallback={<Loader />}><OpticalDashboard /></Suspense>;
  if (industry?.id === 'petshop') return <Suspense fallback={<Loader />}><PetshopDashboard /></Suspense>;
  if (industry?.id === 'shoe') return <Suspense fallback={<Loader />}><ShoeDashboard /></Suspense>;
  if (industry?.id === 'sports') return <Suspense fallback={<Loader />}><SportsDashboard /></Suspense>;
  if (industry?.id === 'toystore') return <Suspense fallback={<Loader />}><ToystoreDashboard /></Suspense>;

  return <DashboardPage />;
}
