/**
 * Picks the sales history for the current industry. Retail, Bakery,
 * Electronics, Pharmacy, Mobile, Restaurant, Garments, Clinic, Jewelry,
 * Hardware, Auto parts, Salon, Gym, Hotel, Dairy, Meat, Services, Appliances,
 * Optical, Toy store, Sports, Florist, Pet shop, Carpet, Gaming, Furniture
 * and businesses without an industry use the shared
 * history (modules/sales/history) through their config; the rest keep their
 * own pages for now.
 */
import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';

const RestaurantSalesPage = lazy(() => import('@industries/restaurant/pages/RestaurantSalesPage'));
const MobileSalesPage = lazy(() => import('@industries/mobile/pages/MobileSalesPage'));
const ElectronicsSales = lazy(() => import('@industries/electronics/sales/ElectronicsSales'));
const GeneralSales = lazy(() => import('@modules/sales/history/general/GeneralSales'));
const AppliancesSalesPage = lazy(() => import('@industries/appliances/pages/AppliancesSalesPage'));
const CarpetSales = lazy(() => import('@industries/carpet/sales/CarpetSales'));
const GamingSalesPage = lazy(() => import('@industries/gaming/pages/GamingSalesPage'));
const FurnitureSalesPage = lazy(() => import('@industries/furniture/pages/FurnitureSalesPage'));
const RetailSales = lazy(() => import('@industries/retail/sales/RetailSales'));
const GarmentSalesPage = lazy(() => import('@industries/garments/pages/GarmentSalesPage'));
const BakerySales = lazy(() => import('@industries/bakery/sales/BakerySales'));
const GymSalesPage = lazy(() => import('@industries/gym/pages/GymSalesPage'));
const ClinicSalesPage = lazy(() => import('@industries/clinic/pages/ClinicSalesPage'));
const ServicesBizSalesPage = lazy(() => import('@industries/services-biz/pages/ServicesBizSalesPage'));
const PharmacySales = lazy(() => import('@industries/pharmacy/sales/PharmacySales'));
const JewelrySalesPage = lazy(() => import('@industries/jewelry/pages/JewelrySalesPage'));
const HardwareSales = lazy(() => import('@industries/hardware/sales/HardwareSales'));
const DairySales = lazy(() => import('@industries/dairy/sales/DairySales'));
const MeatSalesPage = lazy(() => import('@industries/meat/pages/MeatSalesPage'));
const AgriSalesPage = lazy(() => import('@industries/agri/pages/AgriSalesPage'));
const AutoPartsSalesPage = lazy(() => import('@industries/autoparts/pages/AutoPartsSalesPage'));
const BookstoreSalesPage = lazy(() => import('@industries/bookstore/pages/BookstoreSalesPage'));
const SalonSalesPage = lazy(() => import('@industries/salon/pages/SalonSalesPage'));
const HotelSalesPage = lazy(() => import('@industries/hotel/pages/HotelSalesPage'));
const OpticalSales = lazy(() => import('@industries/optical/sales/OpticalSales'));
const ToystoreSalesPage = lazy(() => import('@industries/toystore/pages/ToystoreSalesPage'));
const SportsSalesPage = lazy(() => import('@industries/sports/pages/SportsSalesPage'));
const FloristSalesPage = lazy(() => import('@industries/florist/pages/FloristSalesPage'));
const PetshopSalesPage = lazy(() => import('@industries/petshop/pages/PetshopSalesPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

export default function SalesGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'restaurant') return <Suspense fallback={<Loader />}><RestaurantSalesPage /></Suspense>;
  if (industry?.id === 'mobile') return <Suspense fallback={<Loader />}><MobileSalesPage /></Suspense>;
  if (industry?.id === 'electronics') return <Suspense fallback={<Loader />}><ElectronicsSales /></Suspense>;
  if (industry?.id === 'appliances') return <Suspense fallback={<Loader />}><AppliancesSalesPage /></Suspense>;
  if (industry?.id === 'carpet') return <Suspense fallback={<Loader />}><CarpetSales /></Suspense>;
  if (industry?.id === 'retail') return <Suspense fallback={<Loader />}><RetailSales /></Suspense>;
  if (industry?.id === 'garments') return <Suspense fallback={<Loader />}><GarmentSalesPage /></Suspense>;
  if (industry?.id === 'bakery') return <Suspense fallback={<Loader />}><BakerySales /></Suspense>;
  if (industry?.id === 'gym') return <Suspense fallback={<Loader />}><GymSalesPage /></Suspense>;
  if (industry?.id === 'clinic') return <Suspense fallback={<Loader />}><ClinicSalesPage /></Suspense>;
  if (industry?.id === 'services-biz') return <Suspense fallback={<Loader />}><ServicesBizSalesPage /></Suspense>;
  if (industry?.id === 'pharmacy') return <Suspense fallback={<Loader />}><PharmacySales /></Suspense>;
  if (industry?.id === 'jewelry') return <Suspense fallback={<Loader />}><JewelrySalesPage /></Suspense>;
  if (industry?.id === 'hardware') return <Suspense fallback={<Loader />}><HardwareSales /></Suspense>;
  if (industry?.id === 'dairy') return <Suspense fallback={<Loader />}><DairySales /></Suspense>;
  if (industry?.id === 'meat') return <Suspense fallback={<Loader />}><MeatSalesPage /></Suspense>;
  if (industry?.id === 'agri') return <Suspense fallback={<Loader />}><AgriSalesPage /></Suspense>;
  if (industry?.id === 'autoparts') return <Suspense fallback={<Loader />}><AutoPartsSalesPage /></Suspense>;
  if (industry?.id === 'bookstore') return <Suspense fallback={<Loader />}><BookstoreSalesPage /></Suspense>;
  if (industry?.id === 'salon') return <Suspense fallback={<Loader />}><SalonSalesPage /></Suspense>;
  if (industry?.id === 'hotel') return <Suspense fallback={<Loader />}><HotelSalesPage /></Suspense>;
  if (industry?.id === 'optical') return <Suspense fallback={<Loader />}><OpticalSales /></Suspense>;
  if (industry?.id === 'toystore') return <Suspense fallback={<Loader />}><ToystoreSalesPage /></Suspense>;
  if (industry?.id === 'sports') return <Suspense fallback={<Loader />}><SportsSalesPage /></Suspense>;
  if (industry?.id === 'florist') return <Suspense fallback={<Loader />}><FloristSalesPage /></Suspense>;
  if (industry?.id === 'petshop') return <Suspense fallback={<Loader />}><PetshopSalesPage /></Suspense>;
  if (industry?.id === 'gaming') return <Suspense fallback={<Loader />}><GamingSalesPage /></Suspense>;
  if (industry?.id === 'furniture') return <Suspense fallback={<Loader />}><FurnitureSalesPage /></Suspense>;

  return <Suspense fallback={<Loader />}><GeneralSales /></Suspense>;
}
