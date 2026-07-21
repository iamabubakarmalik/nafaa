/**
 * Register every industry pack with the IndustryRegistry.
 *
 * Import this file ONCE from `src/App.tsx` (top-level, before rendering).
 * Do not call registrations at module load elsewhere — keep the wiring
 * in one predictable place so onboarding new devs stays easy.
 *
 * To add a new industry:
 *   1. Build it under `src/features/industries/<name>/`.
 *   2. Export its `<Name>Pack` from `src/features/industries/<name>/index.ts`.
 *   3. Import and add it to the array below.
 */

import { IndustryRegistry } from '@/features/industries/_shared/registry/IndustryRegistry';

import { HotelPack } from '@/features/industries/hotel';
import { CarpetPack } from '@/features/industries/carpet';
import { MobilePack } from '@/features/industries/mobile';
import { RestaurantPack } from '@/features/industries/restaurant';
import { PharmacyPack } from '@/features/industries/pharmacy';
import { RetailPack } from '@/features/industries/retail';
import { SalonPack } from '@/features/industries/salon';
import { JewelryPack } from '@/features/industries/jewelry';
import { AutoPartsPack } from '@/features/industries/autoparts';
import { BookstorePack } from '@/features/industries/bookstore';
import { GarmentsPack } from '@/features/industries/garments';
import { HardwarePack } from '@/features/industries/hardware';
import { MeatPack } from '@/features/industries/meat';
import { DairyPack } from '@/features/industries/dairy';
import { AgriPack } from '@/features/industries/agri';

let registered = false;

export function registerIndustries(): void {
  if (registered) return;
  registered = true;

  IndustryRegistry.register([
    HotelPack,
    CarpetPack,
    MobilePack,
    RestaurantPack,
    PharmacyPack,
    RetailPack,
    SalonPack,
    JewelryPack,
    AutoPartsPack,
    BookstorePack,
    GarmentsPack,
    HardwarePack,
    MeatPack,
    DairyPack,
    AgriPack,
  ]);
}

// Register immediately on import so anything reading the registry
// (e.g. Sidebar, router) sees packs on first render.
registerIndustries();
