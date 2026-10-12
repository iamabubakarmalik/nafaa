/**
 * Picks the dashboard for the current industry. Every industry renders the
 * same engine (modules/dashboard/engine) with its own config; industries
 * without one get the general dashboard. Each is lazy-loaded so a shop only
 * downloads its own.
 */

import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { Skeleton } from '@/design-system/components';

const DASHBOARDS: Record<string, LazyExoticComponent<ComponentType>> = {
  agri: lazy(() => import('@industries/agri/dashboard/AgriDashboard')),
  appliances: lazy(() => import('@industries/appliances/dashboard/AppliancesDashboard')),
  autoparts: lazy(() => import('@industries/autoparts/dashboard/AutoPartsDashboard')),
  bakery: lazy(() => import('@industries/bakery/dashboard/BakeryDashboard')),
  bookstore: lazy(() => import('@industries/bookstore/dashboard/BookstoreDashboard')),
  carpet: lazy(() => import('@industries/carpet/dashboard/CarpetDashboard')),
  clinic: lazy(() => import('@industries/clinic/dashboard/ClinicDashboard')),
  cosmetics: lazy(() => import('@industries/cosmetics/dashboard/CosmeticsDashboard')),
  dairy: lazy(() => import('@industries/dairy/dashboard/DairyDashboard')),
  electronics: lazy(() => import('@industries/electronics/dashboard/ElectronicsDashboard')),
  florist: lazy(() => import('@industries/florist/dashboard/FloristDashboard')),
  furniture: lazy(() => import('@industries/furniture/dashboard/FurnitureDashboard')),
  gaming: lazy(() => import('@industries/gaming/dashboard/GamingDashboard')),
  garments: lazy(() => import('@industries/garments/dashboard/GarmentsDashboard')),
  gym: lazy(() => import('@industries/gym/dashboard/GymDashboard')),
  hardware: lazy(() => import('@industries/hardware/dashboard/HardwareDashboard')),
  hotel: lazy(() => import('@industries/hotel/dashboard/HotelDashboard')),
  jewelry: lazy(() => import('@industries/jewelry/dashboard/JewelryDashboard')),
  meat: lazy(() => import('@industries/meat/dashboard/MeatDashboard')),
  mobile: lazy(() => import('@industries/mobile/dashboard/MobileDashboard')),
  optical: lazy(() => import('@industries/optical/dashboard/OpticalDashboard')),
  petshop: lazy(() => import('@industries/petshop/dashboard/PetshopDashboard')),
  pharmacy: lazy(() => import('@industries/pharmacy/dashboard/PharmacyDashboard')),
  restaurant: lazy(() => import('@industries/restaurant/dashboard/RestaurantDashboard')),
  retail: lazy(() => import('@industries/retail/dashboard/RetailDashboard')),
  salon: lazy(() => import('@industries/salon/dashboard/SalonDashboard')),
  'services-biz': lazy(() => import('@industries/services-biz/dashboard/ServicesBizDashboard')),
  shoe: lazy(() => import('@industries/shoe/dashboard/ShoeDashboard')),
  sports: lazy(() => import('@industries/sports/dashboard/SportsDashboard')),
  toystore: lazy(() => import('@industries/toystore/dashboard/ToystoreDashboard')),
};

const GeneralDashboard = lazy(() => import('../general/GeneralDashboard'));

function Loading() {
  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-56 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
    </div>
  );
}

export default function DashboardGate() {
  const industry = useCurrentIndustry();
  const Dashboard = (industry?.id && DASHBOARDS[industry.id]) || GeneralDashboard;
  return <Suspense fallback={<Loading />}><Dashboard /></Suspense>;
}
