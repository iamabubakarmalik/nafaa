/**
 * Industry identities.
 *
 * Each industry gets its own accent color and icon so a pharmacy, a bakery and
 * a mobile shop are recognisable at a glance — in the sidebar, on the login
 * screen and as the default brand color until the business picks its own.
 *
 * Colors are 600-step values that keep 4.5:1 contrast with white text. No two
 * industries share a color. Industry packs keep their logic; this file is the
 * single source for how an industry looks.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Armchair, Beef, BookOpen, Briefcase, CakeSlice, Dumbbell, Flower2, Footprints, Gamepad2, Gem,
  Glasses, Hammer, Hotel, Layers, Milk, PawPrint, Pill, Plug, Refrigerator, Scissors, Shirt,
  ShoppingBag, Smartphone, Sparkles, Stethoscope, Store, ToyBrick, Trophy, Truck, UtensilsCrossed, Wheat, Wrench,
} from 'lucide-react';

export interface IndustryIdentity {
  id: string;
  /** Short name shown in the UI. */
  label: string;
  /** Accent color (600 step). */
  color: string;
  icon: LucideIcon;
}

const IDENTITIES: readonly IndustryIdentity[] = [
  { id: 'retail', label: 'Retail & Kiryana', color: '#059669', icon: Store },
  { id: 'standard', label: 'General store', color: '#047857', icon: ShoppingBag },
  { id: 'pharmacy', label: 'Pharmacy', color: '#16a34a', icon: Pill },
  { id: 'clinic', label: 'Clinic', color: '#0d9488', icon: Stethoscope },
  { id: 'optical', label: 'Optical', color: '#0891b2', icon: Glasses },
  { id: 'appliances', label: 'Home appliances', color: '#0e7490', icon: Refrigerator },
  { id: 'dairy', label: 'Dairy', color: '#0284c7', icon: Milk },
  { id: 'services-biz', label: 'Services', color: '#0369a1', icon: Briefcase },
  { id: 'electronics', label: 'Electronics', color: '#2563eb', icon: Plug },
  { id: 'mobile', label: 'Mobile shop', color: '#1d4ed8', icon: Smartphone },
  { id: 'hotel', label: 'Hotel', color: '#4f46e5', icon: Hotel },
  { id: 'gaming', label: 'Gaming zone', color: '#7c3aed', icon: Gamepad2 },
  { id: 'toystore', label: 'Toy store', color: '#9333ea', icon: ToyBrick },
  { id: 'cosmetics', label: 'Cosmetics', color: '#c026d3', icon: Sparkles },
  { id: 'salon', label: 'Salon', color: '#a21caf', icon: Scissors },
  { id: 'garments', label: 'Garments', color: '#db2777', icon: Shirt },
  { id: 'bakery', label: 'Bakery', color: '#be185d', icon: CakeSlice },
  { id: 'florist', label: 'Florist', color: '#e11d48', icon: Flower2 },
  { id: 'carpet', label: 'Carpets', color: '#9f1239', icon: Layers },
  { id: 'gym', label: 'Gym', color: '#dc2626', icon: Dumbbell },
  { id: 'meat', label: 'Meat shop', color: '#991b1b', icon: Beef },
  { id: 'restaurant', label: 'Restaurant', color: '#ea580c', icon: UtensilsCrossed },
  { id: 'shoe', label: 'Shoe store', color: '#c2410c', icon: Footprints },
  { id: 'petshop', label: 'Pet shop', color: '#b45309', icon: PawPrint },
  { id: 'bookstore', label: 'Bookstore', color: '#a16207', icon: BookOpen },
  { id: 'jewelry', label: 'Jewellery', color: '#854d0e', icon: Gem },
  { id: 'furniture', label: 'Furniture', color: '#78350f', icon: Armchair },
  { id: 'agri', label: 'Agri & seeds', color: '#4d7c0f', icon: Wheat },
  { id: 'sports', label: 'Sports', color: '#15803d', icon: Trophy },
  { id: 'autoparts', label: 'Auto parts', color: '#475569', icon: Wrench },
  { id: 'hardware', label: 'Hardware', color: '#57534e', icon: Hammer },
  { id: 'distribution', label: 'Distributor', color: '#115e59', icon: Truck },
];

const BY_ID = new Map(IDENTITIES.map((i) => [i.id, i]));

/** Marketplace (seller workspace) has its own identity outside the industry list. */
export const MARKETPLACE_IDENTITY: IndustryIdentity = { id: 'marketplace', label: 'Marketplace', color: '#9333ea', icon: ShoppingBag };

export const DEFAULT_IDENTITY = BY_ID.get('retail')!;

export function industryIdentity(id: string | null | undefined): IndustryIdentity {
  return (id && BY_ID.get(id)) || DEFAULT_IDENTITY;
}

export function allIndustryIdentities(): readonly IndustryIdentity[] {
  return IDENTITIES;
}
