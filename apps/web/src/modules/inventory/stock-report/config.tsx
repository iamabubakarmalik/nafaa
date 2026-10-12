/**
 * What each industry adds to the shared stock report: names for its product
 * types, extra status filters, a link to its IMEI or serial page, a warning
 * above the list, an extra tab and guide steps. Industries without an entry
 * get the plain report.
 */

import { lazy, type ComponentType } from 'react';
import { Barcode, ChefHat, Croissant, Layers, Pill, ShieldAlert, Smartphone, Snowflake, Wheat, type LucideIcon } from 'lucide-react';
import type { GuideStep } from '@core/components/PageGuide';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { catLabel } from '@industries/appliances/constants';
import { CATEGORY_META as ELECTRONICS_TYPES } from '@industries/electronics/constants';
import { prettyAgriKind, type AgriKind } from '@industries/agri/lib/agriCategory';
import { SEASONS } from '@industries/agri/lib/agriUnits';
import type { StockList, StockStatusFilter } from './api/stock-report.api';

export interface StockBannerProps {
  list: StockList;
  setStatus: (s: StockStatusFilter) => void;
  openTab: (id: string) => void;
}

export interface StockReportConfig {
  /** Business type shown in the header. */
  label: string;
  /** Names an industry type (appliance or electronics category, agri kind) and titles its filter. */
  groups?: { title: string; label: (id: string) => string };
  /** Names a season in the analytics (agri). */
  seasonLabel?: (id: string) => string;
  /** Extra status filters this industry uses. */
  statuses?: StockStatusFilter[];
  /** Page where IMEIs or serials of a device line are managed. */
  deviceLink?: (productId: string) => string;
  Banner?: ComponentType<StockBannerProps>;
  extraTab?: { id: string; label: string; icon: LucideIcon; Component: ComponentType };
  guide?: GuideStep[];
  tips?: string[];
}

const MobileDevices = lazy(() => import('./components/panels/devices').then((m) => ({ default: m.MobileDevices })));
const ElectronicsSerials = lazy(() => import('./components/panels/devices').then((m) => ({ default: m.ElectronicsSerials })));
const AppliancesSerials = lazy(() => import('./components/panels/devices').then((m) => ({ default: m.AppliancesSerials })));
const BakeryRaw = lazy(() => import('./components/panels/BakeryRaw').then((m) => ({ default: m.BakeryRaw })));
const AgriBanner = lazy(() => import('./components/panels/AgriBanner').then((m) => ({ default: m.AgriBanner })));
// Restaurant dishes are worked out by the low-stock module; the same panels serve here.
const RestaurantBanner = lazy(() => import('@modules/inventory/low-stock/components/panels/RestaurantPanels').then((m) => ({ default: m.RestaurantBanner })));
const RestaurantDishes = lazy(() => import('@modules/inventory/low-stock/components/panels/RestaurantPanels').then((m) => ({ default: m.RestaurantDishes })));

const CONFIGS: Record<string, StockReportConfig> = {
  retail: {
    label: 'Retail',
    tips: ['Expiry wala maal pehle bechein — "Expiry" filter batata hai kya jaldi kharab hoga.'],
  },
  pharmacy: {
    label: 'Pharmacy',
    guide: [{ icon: Pill, color: '#be185d', title: 'Expiry aur batch', text: '"Expiry" filter aur Analytics me har batch ki expiry aur us ki lagat. Expire dawa bechna mana hai — supplier ko wapas ya damage me daalein.' }],
  },
  mobile: {
    label: 'Mobile',
    deviceLink: (id) => `/products/${id}/imei`,
    extraTab: { id: 'devices', label: 'Phones', icon: Smartphone, Component: MobileDevices },
    guide: [{ icon: Smartphone, color: '#2563eb', title: 'Phone IMEI se gine jate hain', text: 'Phone ka stock aur lagat har IMEI ki apni kharid se. "Phones" tab me har phone kitne din se para hai, PTA status aur used phone alag.' }],
  },
  electronics: {
    label: 'Electronics',
    deviceLink: (id) => `/electronics-products/${id}`,
    groups: { title: 'Qism', label: (id) => ELECTRONICS_TYPES[id as keyof typeof ELECTRONICS_TYPES]?.label ?? id },
    extraTab: { id: 'serials', label: 'Serial units', icon: Barcode, Component: ElectronicsSerials },
    guide: [{ icon: Barcode, color: '#2563eb', title: 'Serial wale model', text: 'Laptop, TV jaise serial wale maal ki ginti aur lagat har serial se. "Serial units" tab me umar aur warranty kab khatam.' }],
  },
  appliances: {
    label: 'Appliances',
    deviceLink: (id) => `/appliance-products/${id}`,
    groups: { title: 'Qism', label: (id) => catLabel(id) },
    extraTab: { id: 'serials', label: 'Serial units', icon: Snowflake, Component: AppliancesSerials },
    guide: [{ icon: Snowflake, color: '#0891b2', title: 'Serial aur warranty', text: '"Serial units" tab me har unit kitne din se para hai, compressor/motor warranty kab khatam, aur jo bik gaya magar laga nahi.' }],
  },
  bakery: {
    label: 'Bakery',
    statuses: ['made', 'raw'],
    extraTab: { id: 'raw', label: 'Saamaan', icon: Wheat, Component: BakeryRaw },
    guide: [
      { icon: Croissant, color: '#d97706', title: 'Khud banaya aur bahar se laya', text: '"Khud banaya" filter se dukaan me bana maal alag dekhein. Is ki cost recipe se aati hai — cost nahi likhi to value ghalat hogi.' },
      { icon: Wheat, color: '#a16207', title: 'Banane ka saamaan', text: '"Saamaan" tab me maida, cheeni, makkhan ki qeemat. Ye bhi paisa hai jo store me para hai.' },
    ],
  },
  restaurant: {
    label: 'Restaurant',
    statuses: ['raw'],
    Banner: RestaurantBanner,
    extraTab: { id: 'dishes', label: 'Dishes', icon: ChefHat, Component: RestaurantDishes },
    guide: [{ icon: ChefHat, color: '#ea580c', title: 'Dish ka stock nahi hota', text: 'Dish recipe se banti hai, is liye list me sirf kacha saamaan (chawal, murghi, tel) aur bana banaya maal (bottle, chips) hai. "Dishes" tab batata hai kaunsi dish kitni aur ban sakti hai.' }],
  },
  agri: {
    label: 'Agri',
    statuses: ['blocked'],
    groups: { title: 'Qism', label: (id) => prettyAgriKind(id as AgriKind) },
    seasonLabel: (id) => SEASONS.find((s) => s.v === id)?.l ?? (id === 'none' ? 'Likha nahi' : id),
    Banner: AgriBanner,
    guide: [{ icon: ShieldAlert, color: '#be123c', title: 'Registration', text: 'Beej, khaad aur spray ki registration khatam ho to maal hone par bhi bechna mana hai. Upar laal patti aur "Registration" filter se dekhein. Analytics me mausam ke hisaab se paisa.' }],
    tips: ['Bori ka size product par likha ho to tafseel me poora kilo bhi dikhta hai.'],
  },
  carpet: {
    label: 'Carpet',
    guide: [{ icon: Layers, color: '#7c3aed', title: 'Sqft aur rolls', text: 'Carpet ka stock rolls aur cut pieces ke bache sqft se. Lagat har roll ke rate se. Line kholein to har roll aur piece alag.' }],
  },
};

export function useStockReportConfig(): StockReportConfig {
  const industry = useCurrentIndustry();
  return (industry?.id && CONFIGS[industry.id]) || { label: industry?.name ?? 'Dukaan' };
}
