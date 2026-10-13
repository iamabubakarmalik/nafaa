/**
 * What each industry adds to the shared low-stock page: labels for its
 * product types, a link to add IMEIs or serials, extra statuses, warnings
 * above the list, an extra tab and guide steps. Industries without an entry
 * get the plain page.
 */

import { lazy, type ComponentType } from 'react';
import { Barcode, ChefHat, Croissant, Leaf, ShieldAlert, Smartphone, Snowflake, Wheat, type LucideIcon } from 'lucide-react';
import type { GuideStep } from '@core/components/PageGuide';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { catLabel } from '@industries/appliances/constants';
import { CATEGORY_META as ELECTRONICS_TYPES } from '@industries/electronics/constants';
import { prettyAgriKind, type AgriKind } from '@industries/agri/lib/agriCategory';
import type { LowList, LowSettings, LowStatusFilter } from './api';

export interface LowStockBannerProps {
  data: LowList;
  setStatus: (s: LowStatusFilter) => void;
  openTab: (id: string) => void;
}

export interface LowStockConfig {
  /** Business type shown in the header. */
  label: string;
  /** Names an industry type (appliance or electronics category, agri kind) and titles its filter. */
  groups?: { title: string; label: (id: string) => string };
  /** Page where IMEIs or serials of a device line are added. */
  deviceLink?: (productId: string) => string;
  /** Extra statuses this industry uses. */
  statuses?: Array<'registration' | 'season'>;
  /** Starting numbers; the shop can change them on the page. */
  defaults?: Partial<LowSettings>;
  Banner?: ComponentType<LowStockBannerProps>;
  extraTab?: { id: string; label: string; icon: LucideIcon; Component: ComponentType };
  guide?: GuideStep[];
  tips?: string[];
}

const RestaurantBanner = lazy(() => import('./components/panels/RestaurantPanels').then((m) => ({ default: m.RestaurantBanner })));
const RestaurantDishes = lazy(() => import('./components/panels/RestaurantPanels').then((m) => ({ default: m.RestaurantDishes })));
const BakeryBanner = lazy(() => import('./components/panels/BakeryPanels').then((m) => ({ default: m.BakeryBanner })));
const BakeryIngredients = lazy(() => import('./components/panels/BakeryPanels').then((m) => ({ default: m.BakeryIngredients })));
const AgriBanner = lazy(() => import('./components/panels/AgriBanner').then((m) => ({ default: m.AgriBanner })));

const CONFIGS: Record<string, LowStockConfig> = {
  retail: {
    label: 'Retail',
    tips: ['Expiry wala maal pehle bechein — "Expiry" filter se dekhein kya jaldi kharab hoga.'],
  },
  mobile: {
    label: 'Mobile',
    deviceLink: (id) => `/products/${id}/imei`,
    guide: [{ icon: Smartphone, color: '#2563eb', title: 'Phone ki ginti IMEI se', text: 'Phone ka stock utne IMEI hain jitne dukaan me para hain. Model ke neeche har rang/memory ki ginti likhi hai. "IMEI" se naye phone daalein.' }],
  },
  electronics: {
    label: 'Electronics',
    deviceLink: (id) => `/electronics-products/${id}`,
    groups: { title: 'Type', label: (id) => ELECTRONICS_TYPES[id as keyof typeof ELECTRONICS_TYPES]?.label ?? id },
    guide: [{ icon: Barcode, color: '#2563eb', title: 'Serial wale model', text: 'Laptop, camera jaise serial wale maal ki ginti serial se hoti hai. Cable, charger ka stock aam tareeqe se.' }],
  },
  appliances: {
    label: 'Appliances',
    deviceLink: (id) => `/appliance-products/${id}`,
    groups: { title: 'Type', label: (id) => catLabel(id) },
    defaults: { targetDays: 15 },
    guide: [{ icon: Snowflake, color: '#0891b2', title: 'Mausam ka khayal', text: 'Garmi se pehle AC aur cooler, sardi se pehle geyser aur heater. Mehenga maal hai — order kam din ka banta hai (15 din), Settings se badlein.' }],
  },
  bakery: {
    label: 'Bakery',
    Banner: BakeryBanner,
    extraTab: { id: 'ingredients', label: 'Saamaan', icon: Wheat, Component: BakeryIngredients },
    guide: [
      { icon: Croissant, color: '#d97706', title: 'Aaj kya banana hai', text: 'Jo cheezein dukaan me banti hain un par "Banana hai" likha hai — itna banayein ke hadd tak pohanch jaye. Ye supplier order me nahi jatin.' },
      { icon: Wheat, color: '#7c3aed', title: 'Saamaan', text: '"Saamaan" tab me maida, cheeni, makkhan jo kam hain. Supplier ko WhatsApp list bhejein ya order banayein.' },
    ],
    tips: ['Peeli patti batati hai kya aaj hi bechna hai, warna phenkna parega.'],
  },
  agri: {
    label: 'Agri',
    statuses: ['registration', 'season'],
    groups: { title: 'Type', label: (id) => prettyAgriKind(id as AgriKind) },
    Banner: AgriBanner,
    guide: [
      { icon: ShieldAlert, color: '#be123c', title: 'Registration', text: 'Beej, khaad aur spray ki sarkari registration khatam ho to stock hone par bhi bechna mana hai. "Registration" filter se dekhein aur renew karwayein.' },
      { icon: Leaf, color: '#16a34a', title: 'Mausam', text: 'Abhi ke aur agle mausam (Rabi / Kharif) ka jo maal kam hai woh "Mausam" filter me hai. Mausam se pehle mangwayein.' },
    ],
  },
  restaurant: {
    label: 'Restaurant',
    Banner: RestaurantBanner,
    extraTab: { id: 'dishes', label: 'Dishes', icon: ChefHat, Component: RestaurantDishes },
    guide: [{ icon: ChefHat, color: '#ea580c', title: 'Kaunsi dish nahi ban sakti', text: 'Dish stock me nahi hoti, saamaan hota hai. "Dishes" tab batata hai kaunsi dish kitni aur ban sakti hai aur kaunsa saamaan rok raha hai. Saamaan ki roz ki khapat recipe se ginti hoti hai.' }],
  },
};

export function useLowStockConfig(): LowStockConfig {
  const industry = useCurrentIndustry();
  return (industry?.id && CONFIGS[industry.id]) || { label: industry?.name ?? 'Dukaan' };
}
