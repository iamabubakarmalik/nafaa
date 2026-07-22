/**
 * Register every industry pack with the IndustryRegistry.
 *
 * Import this file ONCE from `src/App.tsx` (top-level, before rendering).
 * To add a new industry:
 *   1. Build it under `src/features/industries/<name>/`.
 *   2. Export its `<Name>Pack` from `src/features/industries/<name>/index.ts`.
 *   3. Import and add it to the array below.
 */

import { IndustryRegistry } from '@/features/industries/_shared/registry/IndustryRegistry';

// ─── Original 15 industries ────────────────────────────────
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

// ─── 4 new industries ──────────────────────────────────────
import { BakeryPack } from '@/features/industries/bakery';
import { ClinicPack } from '@/features/industries/clinic';
import { GymPack } from '@/features/industries/gym';
import { ServicesBizPack } from '@/features/industries/services-biz';

let registered = false;

export function registerIndustries(): void {
  if (registered) return;
  registered = true;

  IndustryRegistry.register([
    // Highest priority first (resolution picks highest when multiple match)
    CarpetPack,        // 90
    MobilePack,        // 80
    HotelPack,         // 75
    BakeryPack,        // 72 (bumped above Restaurant 70)
    RestaurantPack,    // 70
    JewelryPack,       // 68
    ClinicPack,        // 66 (new)
    PharmacyPack,      // 65
    RetailPack,        // 60
    AutoPartsPack,     // 58
    ServicesBizPack,   // 56 (new)
    SalonPack,         // 55
    GymPack,           // 54 (new)
    BookstorePack,     // 52
    GarmentsPack,      // 50
    HardwarePack,      // 48
    MeatPack,          // 46
    DairyPack,         // 44
    AgriPack,          // 42
  ]);
}

// Register immediately on import so anything reading the registry
// (Sidebar, router) sees packs on first render.
registerIndustries();
