// apps/web/src/modules/pos/pages/PosGate.tsx
import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import PosPage from './PosPage';

// ─── Original 19 industries ───
const RetailPosPage = lazy(() => import('@industries/retail/pages/RetailPosPage'));
const RestaurantPosPage = lazy(() => import('@industries/restaurant/pages/RestaurantPosPage'));
const MobilePosPage = lazy(() => import('@industries/mobile/pages/MobilePosPage'));
const CarpetPosPage = lazy(() => import('@industries/carpet/pages/CarpetPosPage'));
const GarmentPosPage = lazy(() => import('@industries/garments/pages/GarmentPosPage'));
const BakeryPosPage = lazy(() => import('@industries/bakery/pages/BakeryPosPage'));
const GymPosPage = lazy(() => import('@industries/gym/pages/GymPosPage'));
const ClinicPosPage = lazy(() => import('@industries/clinic/pages/ClinicPosPage'));
const ServicesBizPosPage = lazy(() => import('@industries/services-biz/pages/ServicesBizPosPage'));
const PharmacyPosPage = lazy(() => import('@industries/pharmacy/pages/PharmacyPosPage'));
const JewelryPosPage = lazy(() => import('@industries/jewelry/pages/JewelryPosPage'));
const HardwarePosPage = lazy(() => import('@industries/hardware/pages/HardwarePosPage'));
const DairyPosPage = lazy(() => import('@industries/dairy/pages/DairyPosPage'));
const MeatPosPage = lazy(() => import('@industries/meat/pages/MeatPosPage'));
const AgriPosPage = lazy(() => import('@industries/agri/pages/AgriPosPage'));
const AutoPartsPosPage = lazy(() => import('@industries/autoparts/pages/AutoPartsPosPage'));
const BookstorePosPage = lazy(() => import('@industries/bookstore/pages/BookstorePosPage'));
const SalonPosPage = lazy(() => import('@industries/salon/pages/SalonPosPage'));
const HotelPosPage = lazy(() => import('@industries/hotel/pages/HotelPosPage'));

// ─── 10 NEW industries ───
const AppliancesPosPage = lazy(() => import('@industries/appliances/pages/AppliancesPosPage'));
const ElectronicsPosPage = lazy(() => import('@industries/electronics/pages/ElectronicsPosPage'));
const FloristPosPage = lazy(() => import('@industries/florist/pages/FloristPosPage'));
const FurniturePosPage = lazy(() => import('@industries/furniture/pages/FurniturePosPage'));
const GamingPosPage = lazy(() => import('@industries/gaming/pages/GamingPosPage'));
const OpticalPosPage = lazy(() => import('@industries/optical/pages/OpticalPosPage'));
const PetshopPosPage = lazy(() => import('@industries/petshop/pages/PetshopPosPage'));
const ShoePosPage = lazy(() => import('@industries/shoe/pages/ShoePosPage'));
const SportsPosPage = lazy(() => import('@industries/sports/pages/SportsPosPage'));
const ToystorePosPage = lazy(() => import('@industries/toystore/pages/ToystorePosPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

export default function PosGate() {
  const industry = useCurrentIndustry();

  // ─── Original 19 ───
  if (industry?.id === 'restaurant') return <Suspense fallback={<Loader />}><RestaurantPosPage /></Suspense>;
  if (industry?.id === 'mobile') return <Suspense fallback={<Loader />}><MobilePosPage /></Suspense>;
  if (industry?.id === 'carpet') return <Suspense fallback={<Loader />}><CarpetPosPage /></Suspense>;
  if (industry?.id === 'garments') return <Suspense fallback={<Loader />}><GarmentPosPage /></Suspense>;
  if (industry?.id === 'bakery') return <Suspense fallback={<Loader />}><BakeryPosPage /></Suspense>;
  if (industry?.id === 'gym') return <Suspense fallback={<Loader />}><GymPosPage /></Suspense>;
  if (industry?.id === 'clinic') return <Suspense fallback={<Loader />}><ClinicPosPage /></Suspense>;
  if (industry?.id === 'services-biz') return <Suspense fallback={<Loader />}><ServicesBizPosPage /></Suspense>;
  if (industry?.id === 'pharmacy') return <Suspense fallback={<Loader />}><PharmacyPosPage /></Suspense>;
  if (industry?.id === 'jewelry') return <Suspense fallback={<Loader />}><JewelryPosPage /></Suspense>;
  if (industry?.id === 'hardware') return <Suspense fallback={<Loader />}><HardwarePosPage /></Suspense>;
  if (industry?.id === 'dairy') return <Suspense fallback={<Loader />}><DairyPosPage /></Suspense>;
  if (industry?.id === 'meat') return <Suspense fallback={<Loader />}><MeatPosPage /></Suspense>;
  if (industry?.id === 'agri') return <Suspense fallback={<Loader />}><AgriPosPage /></Suspense>;
  if (industry?.id === 'autoparts') return <Suspense fallback={<Loader />}><AutoPartsPosPage /></Suspense>;
  if (industry?.id === 'bookstore') return <Suspense fallback={<Loader />}><BookstorePosPage /></Suspense>;
  if (industry?.id === 'salon') return <Suspense fallback={<Loader />}><SalonPosPage /></Suspense>;
  if (industry?.id === 'hotel') return <Suspense fallback={<Loader />}><HotelPosPage /></Suspense>;
  if (industry?.id === 'retail') return <Suspense fallback={<Loader />}><RetailPosPage /></Suspense>;

  // ─── 10 NEW ───
  if (industry?.id === 'appliances') return <Suspense fallback={<Loader />}><AppliancesPosPage /></Suspense>;
  if (industry?.id === 'electronics') return <Suspense fallback={<Loader />}><ElectronicsPosPage /></Suspense>;
  if (industry?.id === 'florist') return <Suspense fallback={<Loader />}><FloristPosPage /></Suspense>;
  if (industry?.id === 'furniture') return <Suspense fallback={<Loader />}><FurniturePosPage /></Suspense>;
  if (industry?.id === 'gaming') return <Suspense fallback={<Loader />}><GamingPosPage /></Suspense>;
  if (industry?.id === 'optical') return <Suspense fallback={<Loader />}><OpticalPosPage /></Suspense>;
  if (industry?.id === 'petshop') return <Suspense fallback={<Loader />}><PetshopPosPage /></Suspense>;
  if (industry?.id === 'shoe') return <Suspense fallback={<Loader />}><ShoePosPage /></Suspense>;
  if (industry?.id === 'sports') return <Suspense fallback={<Loader />}><SportsPosPage /></Suspense>;
  if (industry?.id === 'toystore') return <Suspense fallback={<Loader />}><ToystorePosPage /></Suspense>;

  return <PosPage />;
}
