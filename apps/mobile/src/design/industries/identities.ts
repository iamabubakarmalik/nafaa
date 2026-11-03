/**
 * Industry identities.
 *
 * Mirror of apps/web/src/design-system/industries/identities.ts. Labels are
 * marked with msg(); show them with t(identity.label).
 *
 * Each industry gets its own accent color and icon so a pharmacy, a bakery and
 * a mobile shop are recognisable at a glance — in the sidebar, on the login
 * screen and as the default brand color until the business picks its own.
 *
 * Colors are 600-step values that keep 4.5:1 contrast with white text. No two
 * industries share a color. Industry packs keep their logic; this file is the
 * single source for how an industry looks.
 */

import type { LucideIcon } from 'lucide-react-native';
import {
  Armchair, Beef, BookOpen, Briefcase, CakeSlice, Dumbbell, Flower2, Footprints, Gamepad2, Gem,
  Glasses, Hammer, Hotel, Layers, Milk, PawPrint, Pill, Plug, Refrigerator, Scissors, Shirt,
  ShoppingBag, Smartphone, Sparkles, Stethoscope, Store, ToyBrick, Trophy, Truck, UtensilsCrossed, Wheat, Wrench,
} from 'lucide-react-native';
import { msg } from '@/core/i18n';

export interface IndustryIdentity {
  id: string;
  /** Short name shown in the UI. */
  label: string;
  /** Accent color (600 step). */
  color: string;
  icon: LucideIcon;
}

const IDENTITIES: readonly IndustryIdentity[] = [
  { id: 'retail', label: msg('Retail & Kiryana'), color: '#059669', icon: Store },
  { id: 'standard', label: msg('General store'), color: '#047857', icon: ShoppingBag },
  { id: 'pharmacy', label: msg('Pharmacy'), color: '#16a34a', icon: Pill },
  { id: 'clinic', label: msg('Clinic'), color: '#0d9488', icon: Stethoscope },
  { id: 'optical', label: msg('Optical'), color: '#0891b2', icon: Glasses },
  { id: 'appliances', label: msg('Home appliances'), color: '#0e7490', icon: Refrigerator },
  { id: 'dairy', label: msg('Dairy'), color: '#0284c7', icon: Milk },
  { id: 'services-biz', label: msg('Services'), color: '#0369a1', icon: Briefcase },
  { id: 'electronics', label: msg('Electronics'), color: '#2563eb', icon: Plug },
  { id: 'mobile', label: msg('Mobile shop'), color: '#1d4ed8', icon: Smartphone },
  { id: 'hotel', label: msg('Hotel'), color: '#4f46e5', icon: Hotel },
  { id: 'gaming', label: msg('Gaming zone'), color: '#7c3aed', icon: Gamepad2 },
  { id: 'toystore', label: msg('Toy store'), color: '#9333ea', icon: ToyBrick },
  { id: 'cosmetics', label: msg('Cosmetics'), color: '#c026d3', icon: Sparkles },
  { id: 'salon', label: msg('Salon'), color: '#a21caf', icon: Scissors },
  { id: 'garments', label: msg('Garments'), color: '#db2777', icon: Shirt },
  { id: 'bakery', label: msg('Bakery'), color: '#be185d', icon: CakeSlice },
  { id: 'florist', label: msg('Florist'), color: '#e11d48', icon: Flower2 },
  { id: 'carpet', label: msg('Carpets'), color: '#9f1239', icon: Layers },
  { id: 'gym', label: msg('Gym'), color: '#dc2626', icon: Dumbbell },
  { id: 'meat', label: msg('Meat shop'), color: '#991b1b', icon: Beef },
  { id: 'restaurant', label: msg('Restaurant'), color: '#ea580c', icon: UtensilsCrossed },
  { id: 'shoe', label: msg('Shoe store'), color: '#c2410c', icon: Footprints },
  { id: 'petshop', label: msg('Pet shop'), color: '#b45309', icon: PawPrint },
  { id: 'bookstore', label: msg('Bookstore'), color: '#a16207', icon: BookOpen },
  { id: 'jewelry', label: msg('Jewellery'), color: '#854d0e', icon: Gem },
  { id: 'furniture', label: msg('Furniture'), color: '#78350f', icon: Armchair },
  { id: 'agri', label: msg('Agri & seeds'), color: '#4d7c0f', icon: Wheat },
  { id: 'sports', label: msg('Sports'), color: '#15803d', icon: Trophy },
  { id: 'autoparts', label: msg('Auto parts'), color: '#475569', icon: Wrench },
  { id: 'hardware', label: msg('Hardware'), color: '#57534e', icon: Hammer },
  { id: 'distribution', label: msg('Distributor'), color: '#115e59', icon: Truck },
];

const BY_ID = new Map(IDENTITIES.map((i) => [i.id, i]));

/** Marketplace (seller workspace) has its own identity outside the industry list. */
export const MARKETPLACE_IDENTITY: IndustryIdentity = { id: 'marketplace', label: msg('Marketplace'), color: '#9333ea', icon: ShoppingBag };

export const DEFAULT_IDENTITY = BY_ID.get('retail')!;

export function industryIdentity(id: string | null | undefined): IndustryIdentity {
  return (id && BY_ID.get(id)) || DEFAULT_IDENTITY;
}

export function allIndustryIdentities(): readonly IndustryIdentity[] {
  return IDENTITIES;
}
