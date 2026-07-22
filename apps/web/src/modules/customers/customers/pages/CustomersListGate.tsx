import { lazy, Suspense } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import CustomersListPage from './CustomersListPage';

const RestaurantCustomersPage = lazy(() => import('@industries/restaurant/pages/RestaurantCustomersPage'));
const MobileCustomersPage = lazy(() => import('@industries/mobile/pages/MobileCustomersPage'));
const CarpetCustomersPage = lazy(() => import('@industries/carpet/pages/CarpetCustomersPage'));
const RetailCustomersPage = lazy(() => import('@industries/retail/pages/RetailCustomersPage'));
const GarmentCustomersPage = lazy(() => import('@industries/garments/pages/GarmentCustomersPage'));
const BakeryCustomersPage = lazy(() => import('@industries/bakery/pages/BakeryCustomersPage'));
const ClinicCustomersPage = lazy(() => import('@industries/clinic/pages/ClinicCustomersPage'));
const ServicesBizCustomersPage = lazy(() => import('@industries/services-biz/pages/ServicesBizCustomersPage'));
const PharmacyCustomersPage = lazy(() => import('@industries/pharmacy/pages/PharmacyCustomersPage'));
const JewelryCustomersPage = lazy(() => import('@industries/jewelry/pages/JewelryCustomersPage'));
const HardwareCustomersPage = lazy(() => import('@industries/hardware/pages/HardwareCustomersPage'));
const DairyCustomersPage = lazy(() => import('@industries/dairy/pages/DairyCustomersPage'));
const MeatCustomersPage = lazy(() => import('@industries/meat/pages/MeatCustomersPage'));
const AgriCustomersPage = lazy(() => import('@industries/agri/pages/AgriCustomersPage'));
const AutoPartsCustomersPage = lazy(() => import('@industries/autoparts/pages/AutoPartsCustomersPage'));
const BookstoreCustomersPage = lazy(() => import('@industries/bookstore/pages/BookstoreCustomersPage'));
const HotelCustomersPage = lazy(() => import('@industries/hotel/pages/HotelCustomersPage'));
const GymCustomers = lazy(() => import('@industries/gym/pages/GymCustomersPage'));

function Loader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
    </div>
  );
}

export default function CustomersListGate() {
  const industry = useCurrentIndustry();

  if (industry?.id === 'restaurant') return <Suspense fallback={<Loader />}><RestaurantCustomersPage /></Suspense>;
  if (industry?.id === 'mobile') return <Suspense fallback={<Loader />}><MobileCustomersPage /></Suspense>;
  if (industry?.id === 'carpet') return <Suspense fallback={<Loader />}><CarpetCustomersPage /></Suspense>;
  if (industry?.id === 'retail') return <Suspense fallback={<Loader />}><RetailCustomersPage /></Suspense>;
  if (industry?.id === 'garments') return <Suspense fallback={<Loader />}><GarmentCustomersPage /></Suspense>;
  if (industry?.id === 'bakery') return <Suspense fallback={<Loader />}><BakeryCustomersPage /></Suspense>;
  if (industry?.id === 'gym') return <Suspense fallback={<Loader />}><GymCustomers /></Suspense>;
  if (industry?.id === 'clinic') return <Suspense fallback={<Loader />}><ClinicCustomersPage /></Suspense>;
  if (industry?.id === 'services-biz') return <Suspense fallback={<Loader />}><ServicesBizCustomersPage /></Suspense>;
  if (industry?.id === 'pharmacy') return <Suspense fallback={<Loader />}><PharmacyCustomersPage /></Suspense>;
  if (industry?.id === 'jewelry') return <Suspense fallback={<Loader />}><JewelryCustomersPage /></Suspense>;
  if (industry?.id === 'hardware') return <Suspense fallback={<Loader />}><HardwareCustomersPage /></Suspense>;
  if (industry?.id === 'dairy') return <Suspense fallback={<Loader />}><DairyCustomersPage /></Suspense>;
  if (industry?.id === 'meat') return <Suspense fallback={<Loader />}><MeatCustomersPage /></Suspense>;
  if (industry?.id === 'agri') return <Suspense fallback={<Loader />}><AgriCustomersPage /></Suspense>;
  if (industry?.id === 'autoparts') return <Suspense fallback={<Loader />}><AutoPartsCustomersPage /></Suspense>;
  if (industry?.id === 'bookstore') return <Suspense fallback={<Loader />}><BookstoreCustomersPage /></Suspense>;
  if (industry?.id === 'hotel') return <Suspense fallback={<Loader />}><HotelCustomersPage /></Suspense>;

  return <CustomersListPage />;
}
