/**
 * Industry dashboards shown on Home as one widget (the web merges each
 * industry's dashboard into its main dashboard). Loaded on demand, so only
 * the current shop's pack is read. The route is the pack's dashboard screen.
 */

import type { ComponentType } from 'react';

/* eslint-disable @typescript-eslint/no-require-imports */
const DASHBOARDS: Record<string, () => ComponentType> = {
  agri: () => require('./agri/screens/AgriDashboardScreen').AgriDashboardScreen,
  appliances: () => require('./appliances/screens/AppliancesDashboardScreen').AppliancesDashboardScreen,
  autoparts: () => require('./autoparts/screens/AutoPartsDashboardScreen').AutoPartsDashboardScreen,
  bakery: () => require('./bakery/screens/BakeryDashboardScreen').BakeryDashboardScreen,
  bookstore: () => require('./bookstore/screens/BookstoreDashboardScreen').BookstoreDashboardScreen,
  carpet: () => require('./carpet/screens/CarpetDashboardScreen').CarpetDashboardScreen,
  clinic: () => require('./clinic/screens/ClinicDashboardScreen').ClinicDashboardScreen,
  cosmetics: () => require('./cosmetics/screens/CosmeticsDashboardScreen').CosmeticsDashboardScreen,
  dairy: () => require('./dairy/screens/DairyDashboardScreen').DairyDashboardScreen,
  electronics: () => require('./electronics/screens/ElectronicsDashboardScreen').ElectronicsDashboardScreen,
  florist: () => require('./florist/screens/FloristDashboardScreen').FloristDashboardScreen,
  furniture: () => require('./furniture/screens/FurnitureDashboardScreen').FurnitureDashboardScreen,
  gaming: () => require('./gaming/screens/GamingDashboardScreen').GamingDashboardScreen,
  garments: () => require('./garments/screens/GarmentsDashboardScreen').GarmentsDashboardScreen,
  gym: () => require('./gym/screens/GymDashboardScreen').GymDashboardScreen,
  hardware: () => require('./hardware/screens/HardwareDashboardScreen').HardwareDashboardScreen,
  hotel: () => require('./hotel/screens/HotelDashboardScreen').HotelDashboardScreen,
  jewelry: () => require('./jewelry/screens/JewelryDashboardScreen').JewelryDashboardScreen,
  meat: () => require('./meat/screens/MeatDashboardScreen').MeatDashboardScreen,
  mobile: () => require('./mobile/screens/MobileDashboardScreen').MobileDashboardScreen,
  optical: () => require('./optical/screens/OpticalDashboardScreen').OpticalDashboardScreen,
  petshop: () => require('./petshop/screens/PetshopDashboardScreen').PetshopDashboardScreen,
  pharmacy: () => require('./pharmacy/screens/PharmacyDashboardScreen').PharmacyDashboardScreen,
  restaurant: () => require('./restaurant/screens/RestaurantDashboardScreen').RestaurantDashboardScreen,
  salon: () => require('./salon/screens/SalonDashboardScreen').SalonDashboardScreen,
  'services-biz': () => require('./services-biz/screens/ServicesDashboardScreen').ServicesDashboardScreen,
  shoe: () => require('./shoe/screens/ShoeDashboardScreen').ShoeDashboardScreen,
  sports: () => require('./sports/screens/SportsDashboardScreen').SportsDashboardScreen,
  toystore: () => require('./toystore/screens/ToystoreDashboardScreen').ToystoreDashboardScreen,
};
/* eslint-enable @typescript-eslint/no-require-imports */

const ALIASES: Record<string, string> = { services: 'services-biz' };

/** The pack id with a dashboard for this industry, or null. */
export function industryDashboardId(industryId: string | null | undefined): string | null {
  const id = industryId ? ALIASES[industryId] ?? industryId : null;
  return id && DASHBOARDS[id] ? id : null;
}

/** The pack's dashboard screen component (loads the module the first time). */
export function loadIndustryDashboard(packId: string): ComponentType | null {
  return DASHBOARDS[packId]?.() ?? null;
}
