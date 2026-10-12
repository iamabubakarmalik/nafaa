/**
 * What each industry adds to the shared profit report: its own tab (profit
 * per IMEI or serial, recipe cost, dish food cost, bag size and season),
 * the word for an item, and guide steps. Industries without an entry get
 * the plain page.
 */

import { lazy, type ComponentType } from 'react';
import { Barcode, ChefHat, Croissant, Leaf, Smartphone, Soup, Wheat, type LucideIcon } from 'lucide-react';
import type { GuideStep } from '@core/components/PageGuide';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import type { ProfitFilters } from './api';

export interface ProfitFmt { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean }
export interface ProfitPanelProps { filters: ProfitFilters; fmt: ProfitFmt }

export interface ProfitReportConfig {
  /** Business type shown in the header. */
  label: string;
  /** Column title for an item (e.g. "Dish"). */
  itemWord?: string;
  extraTab?: { id: string; label: string; icon: LucideIcon; Component: ComponentType<ProfitPanelProps> };
  guide?: GuideStep[];
  tips?: string[];
}

const MobilePanel = lazy(() => import('./components/panels/DevicePanels').then((m) => ({ default: m.MobilePanel })));
const ElectronicsPanel = lazy(() => import('./components/panels/DevicePanels').then((m) => ({ default: m.ElectronicsPanel })));
const BakeryPanel = lazy(() => import('./components/panels/BakeryPanel').then((m) => ({ default: m.BakeryPanel })));
const RestaurantPanel = lazy(() => import('./components/panels/RestaurantPanel').then((m) => ({ default: m.RestaurantPanel })));
const AgriPanel = lazy(() => import('./components/panels/AgriPanel').then((m) => ({ default: m.AgriPanel })));

const CONFIGS: Record<string, ProfitReportConfig> = {
  retail: {
    label: 'Retail',
    tips: ['Grocery me margin kam hota hai — "Nuqsan wali" aur "Discount wali" list har hafte dekhein.'],
  },
  mobile: {
    label: 'Mobile',
    itemWord: 'Model',
    extraTab: { id: 'imei', label: 'IMEI war munafa', icon: Smartphone, Component: MobilePanel },
    guide: [{ icon: Smartphone, color: '#2563eb', title: 'Har phone ka munafa', text: '"IMEI war munafa" tab me har bika hua phone (naya ya used) us ki apni lagat ke saath. Upar naye phone, used phone, accessories aur repair ki kamai alag alag.' }],
  },
  electronics: {
    label: 'Electronics',
    extraTab: { id: 'serial', label: 'Qism aur serial', icon: Barcode, Component: ElectronicsPanel },
    guide: [{ icon: Barcode, color: '#7c3aed', title: 'Serial wale maal', text: '"Qism aur serial" tab me laptop, camera jaise serial wale har unit ka munafa, aur qism (charger, speaker…) aur halat (naya, open box, used) ke hisaab se kamai.' }],
  },
  bakery: {
    label: 'Bakery',
    extraTab: { id: 'recipe', label: 'Recipe cost', icon: Croissant, Component: BakeryPanel },
    guide: [{ icon: Wheat, color: '#d97706', title: 'Recipe se milan', text: 'Jo cheez dukaan me banti hai us ki asal lagat recipe se nikalti hai. "Recipe cost" tab batata hai kahan bill wali cost aur recipe ki cost me farq hai — aksar maida ya makkhan mehnga ho gaya aur rate purana hai.' }],
    tips: ['Recipe me saamaan ka rate taaza rakhein, warna munafa ghalat aayega.'],
  },
  restaurant: {
    label: 'Restaurant',
    itemWord: 'Dish',
    extraTab: { id: 'dishes', label: 'Dish food cost', icon: ChefHat, Component: RestaurantPanel },
    guide: [{ icon: Soup, color: '#ea580c', title: 'Food cost %', text: 'Rate ka kitna hissa saamaan me gaya. 30–35% aam hai, 45% se upar ho to rate kam hai ya portion bara. Jo dish sab se zyada bikti hai zaroori nahi sab se zyada kamaye — "Dish food cost" tab dekhein.' }],
  },
  agri: {
    label: 'Agri',
    extraTab: { id: 'agri', label: 'Qism, bori aur mausam', icon: Leaf, Component: AgriPanel },
    guide: [{ icon: Leaf, color: '#16a34a', title: 'Bori aur thok', text: 'Bori ka munafa per kilo bhi dekhein, aur thok rate par kitna bachta hai. Rabi aur Kharif ka munafa alag dikhta hai.' }],
  },
};

export function useProfitConfig(): ProfitReportConfig {
  const industry = useCurrentIndustry();
  return (industry?.id && CONFIGS[industry.id]) || { label: industry?.name ?? 'Dukaan' };
}
