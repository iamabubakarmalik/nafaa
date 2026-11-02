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
import { catLabel } from '@industries/appliances/components/meta';
import { CATEGORY_META as ELECTRONICS_TYPES } from '@industries/electronics/constants';
import { prettyAgriKind, type AgriKind } from '@industries/agri/lib/agriCategory';
import { SEASONS } from '@industries/agri/lib/agriUnits';
import type { StockList, StockStatusFilter } from './api/stock-report.api';
import { t } from '@core/i18n';

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
    label: t('Retail'),
    tips: [t('Expiry wala maal pehle bechein — "Expiry" filter batata hai kya jaldi kharab hoga.')],
  },
  pharmacy: {
    label: t('Pharmacy'),
    guide: [{ icon: Pill, color: '#be185d', title: t('Expiry aur batch'), text: t('"Expiry" filter aur Analytics me har batch ki expiry aur us ki cost. Expire dawa bechna mana hai — supplier ko wapas ya damage me daalein.') }],
  },
  mobile: {
    label: t('Mobile'),
    deviceLink: (id) => `/products/${id}/imei`,
    extraTab: { id: 'devices', label: t('Phones'), icon: Smartphone, Component: MobileDevices },
    guide: [{ icon: Smartphone, color: '#2563eb', title: t('Phone IMEI se gine jate hain'), text: t('Phone ka stock aur cost har IMEI ki apni kharid se. "Phones" tab me har phone kitne din se para hai, PTA status aur used phone alag.') }],
  },
  electronics: {
    label: t('Electronics'),
    deviceLink: (id) => `/electronics-products/${id}`,
    groups: { title: t('Type'), label: (id) => ELECTRONICS_TYPES[id as keyof typeof ELECTRONICS_TYPES]?.label ?? id },
    extraTab: { id: 'serials', label: t('Serial units'), icon: Barcode, Component: ElectronicsSerials },
    guide: [{ icon: Barcode, color: '#2563eb', title: t('Serial wale model'), text: t('Laptop, TV jaise serial wale maal ki ginti aur cost har serial se. "Serial units" tab me umar aur warranty kab khatam.') }],
  },
  appliances: {
    label: t('Appliances'),
    deviceLink: (id) => `/appliance-products/${id}`,
    groups: { title: t('Type'), label: (id) => catLabel(id) },
    extraTab: { id: 'serials', label: t('Serial units'), icon: Snowflake, Component: AppliancesSerials },
    guide: [{ icon: Snowflake, color: '#0891b2', title: t('Serial aur warranty'), text: t('"Serial units" tab me har unit kitne din se para hai, compressor/motor warranty kab khatam, aur jo bik gaya magar laga nahi.') }],
  },
  bakery: {
    label: t('Bakery'),
    statuses: ['made', 'raw'],
    extraTab: { id: 'raw', label: t('Saamaan'), icon: Wheat, Component: BakeryRaw },
    guide: [
      { icon: Croissant, color: '#d97706', title: t('Khud banaya aur bahar se laya'), text: t('"Khud banaya" filter se dukaan me bana maal alag dekhein. Is ki cost recipe se aati hai — cost nahi likhi to value ghalat hogi.') },
      { icon: Wheat, color: '#a16207', title: t('Banane ka saamaan'), text: t('"Saamaan" tab me maida, cheeni, makkhan ki qeemat. Ye bhi paisa hai jo store me para hai.') },
    ],
  },
  restaurant: {
    label: t('Restaurant'),
    statuses: ['raw'],
    Banner: RestaurantBanner,
    extraTab: { id: 'dishes', label: t('Dishes'), icon: ChefHat, Component: RestaurantDishes },
    guide: [{ icon: ChefHat, color: '#ea580c', title: t('Dish ka stock nahi hota'), text: t('Dish recipe se banti hai, is liye list me sirf kacha saamaan (chawal, murghi, tel) aur bana banaya maal (bottle, chips) hai. "Dishes" tab batata hai kaunsi dish kitni aur ban sakti hai.') }],
  },
  agri: {
    label: t('Agri'),
    statuses: ['blocked'],
    groups: { title: t('Type'), label: (id) => prettyAgriKind(id as AgriKind) },
    seasonLabel: (id) => SEASONS.find((s) => s.v === id)?.l ?? (id === 'none' ? t('Likha nahi') : id),
    Banner: AgriBanner,
    guide: [{ icon: ShieldAlert, color: '#be123c', title: t('Registration'), text: t('Beej, khaad aur spray ki registration khatam ho to maal hone par bhi bechna mana hai. Upar laal patti aur "Registration" filter se dekhein. Analytics me mausam ke hisaab se paisa.') }],
    tips: [t('Bori ka size product par likha ho to details me poora kilo bhi dikhta hai.')],
  },
  carpet: {
    label: t('Carpet'),
    guide: [{ icon: Layers, color: '#7c3aed', title: t('Sqft aur rolls'), text: t('Carpet ka stock rolls aur cut pieces ke bache sqft se. Cost har roll ke rate se. Line kholein to har roll aur piece alag.') }],
  },
};

export function useStockReportConfig(): StockReportConfig {
  const industry = useCurrentIndustry();
  return (industry?.id && CONFIGS[industry.id]) || { label: industry?.name ?? t('Dukaan') };
}
