// apps/web/src/app/providers/registerIndustries.ts
/**
 * Register every industry pack with the IndustryRegistry.
 *
 * Import this file ONCE from `src/App.tsx` (top-level, before rendering).
 * To add a new industry:
 *   1. Build it under `src/industries/<name>/`.
 *   2. Export its `<Name>Pack` from `src/industries/<name>/index.ts`.
 *   3. Import and add it to the array below with appropriate priority.
 */

import { IndustryRegistry } from '@industries/_shared/registry/IndustryRegistry';

// ─── Original 19 industries ────────────────────────────────
import { HotelPack } from '@industries/hotel';
import { CarpetPack } from '@industries/carpet';
import { MobilePack } from '@industries/mobile';
import { RestaurantPack } from '@industries/restaurant';
import { PharmacyPack } from '@industries/pharmacy';
import { RetailPack } from '@industries/retail';
import { SalonPack } from '@industries/salon';
import { JewelryPack } from '@industries/jewelry';
import { AutoPartsPack } from '@industries/autoparts';
import { BookstorePack } from '@industries/bookstore';
import { GarmentsPack } from '@industries/garments';
import { HardwarePack } from '@industries/hardware';
import { MeatPack } from '@industries/meat';
import { DairyPack } from '@industries/dairy';
import { AgriPack } from '@industries/agri';
import { BakeryPack } from '@industries/bakery';
import { ClinicPack } from '@industries/clinic';
import { GymPack } from '@industries/gym';
import { ServicesBizPack } from '@industries/services-biz';

// ─── 10 NEW industries ─────────────────────────────────────
import { AppliancesPack } from '@industries/appliances';
import { ElectronicsPack } from '@industries/electronics';
import { FloristPack } from '@industries/florist';
import { FurniturePack } from '@industries/furniture';
import { GamingPack } from '@industries/gaming';
import { OpticalPack } from '@industries/optical';
import { PetshopPack } from '@industries/petshop';
import { ShoePack } from '@industries/shoe';
import { SportsPack } from '@industries/sports';
import { ToystorePack } from '@industries/toystore';

let registered = false;

export function registerIndustries(): void {
  if (registered) return;
  registered = true;

  IndustryRegistry.register([
    // Highest priority first (resolution picks highest when multiple match)
    CarpetPack,          // 90 — length × width sqft
    JewelryPack,         // 88 — weight × purity live rates
    OpticalPack,         // 82 — prescription lens
    MobilePack,          // 80 — IMEI tracking
    GamingPack,          // 78 — cafe timer + rentals
    MeatPack,            // 78 — halal + slaughter log
    HotelPack,           // 75 — room bookings
    BakeryPack,          // 72 — custom cakes
    RestaurantPack,      // 70 — tables + KOT
    ClinicPack,          // 66 — patient records
    PharmacyPack,        // 65 — expiry + Rx
    AppliancesPack,      // 64 — installation + AMC
    ElectronicsPack,     // 62 — serial tracking
    RetailPack,          // 60 — general kiryana
    AutoPartsPack,       // 58 — vehicle registry
    SportsPack,          // 56 — team orders
    ServicesBizPack,     // 56 — technician dispatch
    SalonPack,           // 55 — appointments
    GymPack,             // 54 — memberships
    BookstorePack,       // 52 — school lists
    GarmentsPack,        // 50 — size × color
    ShoePack,            // 49 — size matrix + brand
    HardwarePack,        // 48 — bulk + quotations
    FurniturePack,       // 47 — custom orders
    ToystorePack,        // 45 — age-appropriate
    DairyPack,           // 44 — routes + subscriptions
    PetshopPack,         // 43 — vaccinations
    AgriPack,            // 42 — farmer khata
    FloristPack,         // 40 — occasions + freshness
  ]);
}

// Register immediately on import so anything reading the registry
// (Sidebar, router) sees packs on first render.
registerIndustries();
