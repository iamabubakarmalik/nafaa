/**
 * Picks the POS for the current industry. Retail, Bakery, Electronics,
 * Pharmacy, Mobile and businesses without an industry run on the shared POS engine
 * (modules/pos/engine); the rest still use their own pages until their
 * industry flow is rebuilt.
 */
import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';

// ─── Original 19 industries ───
const RetailPos = lazy(() => import('@industries/retail/pos/RetailPos'));
const RestaurantPosPage = lazy(() => import('@industries/restaurant/pages/RestaurantPosPage'));
const MobilePos = lazy(() => import('@industries/mobile/pos/MobilePos'));
const CarpetPosPage = lazy(() => import('@industries/carpet/pages/CarpetPosPage'));
const GarmentPosPage = lazy(() => import('@industries/garments/pages/GarmentPosPage'));
const BakeryPos = lazy(() => import('@industries/bakery/pos/BakeryPos'));
const GymPosPage = lazy(() => import('@industries/gym/pages/GymPosPage'));
const ClinicPosPage = lazy(() => import('@industries/clinic/pages/ClinicPosPage'));
const ServicesBizPosPage = lazy(() => import('@industries/services-biz/pages/ServicesBizPosPage'));
const PharmacyPos = lazy(() => import('@industries/pharmacy/pos/PharmacyPos'));
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
const ElectronicsPos = lazy(() => import('@industries/electronics/pos/ElectronicsPos'));
const GeneralPos = lazy(() => import('../general/GeneralPos'));
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
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}

export default function PosGate() {
  const industry = useCurrentIndustry();

  // ─── Original 19 ───
  if (industry?.id === 'restaurant') return <Suspense fallback={<Loader />}><RestaurantPosPage /></Suspense>;
  if (industry?.id === 'mobile') return <Suspense fallback={<Loader />}><MobilePos /></Suspense>;
  if (industry?.id === 'carpet') return <Suspense fallback={<Loader />}><CarpetPosPage /></Suspense>;
  if (industry?.id === 'garments') return <Suspense fallback={<Loader />}><GarmentPosPage /></Suspense>;
  if (industry?.id === 'bakery') return <Suspense fallback={<Loader />}><BakeryPos /></Suspense>;
  if (industry?.id === 'gym') return <Suspense fallback={<Loader />}><GymPosPage /></Suspense>;
  if (industry?.id === 'clinic') return <Suspense fallback={<Loader />}><ClinicPosPage /></Suspense>;
  if (industry?.id === 'services-biz') return <Suspense fallback={<Loader />}><ServicesBizPosPage /></Suspense>;
  if (industry?.id === 'pharmacy') return <Suspense fallback={<Loader />}><PharmacyPos /></Suspense>;
  if (industry?.id === 'jewelry') return <Suspense fallback={<Loader />}><JewelryPosPage /></Suspense>;
  if (industry?.id === 'hardware') return <Suspense fallback={<Loader />}><HardwarePosPage /></Suspense>;
  if (industry?.id === 'dairy') return <Suspense fallback={<Loader />}><DairyPosPage /></Suspense>;
  if (industry?.id === 'meat') return <Suspense fallback={<Loader />}><MeatPosPage /></Suspense>;
  if (industry?.id === 'agri') return <Suspense fallback={<Loader />}><AgriPosPage /></Suspense>;
  if (industry?.id === 'autoparts') return <Suspense fallback={<Loader />}><AutoPartsPosPage /></Suspense>;
  if (industry?.id === 'bookstore') return <Suspense fallback={<Loader />}><BookstorePosPage /></Suspense>;
  if (industry?.id === 'salon') return <Suspense fallback={<Loader />}><SalonPosPage /></Suspense>;
  if (industry?.id === 'hotel') return <Suspense fallback={<Loader />}><HotelPosPage /></Suspense>;
  if (industry?.id === 'retail') return <Suspense fallback={<Loader />}><RetailPos /></Suspense>;

  // ─── 10 NEW ───
  if (industry?.id === 'appliances') return <Suspense fallback={<Loader />}><AppliancesPosPage /></Suspense>;
  if (industry?.id === 'electronics') return <Suspense fallback={<Loader />}><ElectronicsPos /></Suspense>;
  if (industry?.id === 'florist') return <Suspense fallback={<Loader />}><FloristPosPage /></Suspense>;
  if (industry?.id === 'furniture') return <Suspense fallback={<Loader />}><FurniturePosPage /></Suspense>;
  if (industry?.id === 'gaming') return <Suspense fallback={<Loader />}><GamingPosPage /></Suspense>;
  if (industry?.id === 'optical') return <Suspense fallback={<Loader />}><OpticalPosPage /></Suspense>;
  if (industry?.id === 'petshop') return <Suspense fallback={<Loader />}><PetshopPosPage /></Suspense>;
  if (industry?.id === 'shoe') return <Suspense fallback={<Loader />}><ShoePosPage /></Suspense>;
  if (industry?.id === 'sports') return <Suspense fallback={<Loader />}><SportsPosPage /></Suspense>;
  if (industry?.id === 'toystore') return <Suspense fallback={<Loader />}><ToystorePosPage /></Suspense>;

  return <Suspense fallback={<Loader />}><GeneralPos /></Suspense>;
}
