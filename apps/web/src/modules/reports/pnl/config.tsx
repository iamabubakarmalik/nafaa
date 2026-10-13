/**
 * What each industry changes on the P&L: the name of its cost of goods and
 * a few tips in the guide. Industries without an entry use the plain words.
 */

import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';

export interface PnlConfig {
  /** Business type shown in the header. */
  label: string;
  /** Name of the cost of goods line. */
  cogs: string;
  cogsHint: string;
  tips?: string[];
}

const BASE: PnlConfig = {
  label: 'Dukaan',
  cogs: 'Maal ki lagat (COGS)',
  cogsHint: 'Jo maal bika, wo kitne ka khareeda tha',
};

const CONFIGS: Record<string, Partial<PnlConfig>> = {
  retail: { label: 'Kiryana / retail' },
  pharmacy: { label: 'Pharmacy', cogs: 'Dawaiyon ki lagat', tips: ['Expire hui dawai "Stock adjustment" me Kharab likhein, tab hi wo nuqsan me aati hai.'] },
  restaurant: {
    label: 'Restaurant', cogs: 'Khane ki lagat (food cost)', cogsHint: 'Recipe ke hisaab se saaman ki lagat',
    tips: ['Recipe me saaman ki qeemat likhein, warna food cost "andaza" ya khali rahegi.', 'Achhe restaurant me food cost aam tor par bikri ka 30–35% hoti hai.'],
  },
  bakery: {
    label: 'Bakery', cogs: 'Maal aur saaman ki lagat', cogsHint: 'Recipe ya product par likhi cost',
    tips: ['"Saamaan" (maida, cheeni) ki kharidari Kharchay me judti hai. Agar products par cost bhi likhi hai to lagat do dafa gin sakti hai.'],
  },
  mobile: { label: 'Mobile shop', cogs: 'Phones aur parts ki lagat', tips: ['Har IMEI ki apni cost hoti hai, wohi bikri par likhi jati hai.'] },
  electronics: { label: 'Electronics', cogs: 'Maal ki lagat (serial war)' },
  appliances: { label: 'Appliances', cogs: 'Maal ki lagat (serial war)' },
  garments: { label: 'Garments', cogs: 'Kapre ki lagat' },
  shoe: { label: 'Shoes', cogs: 'Jooton ki lagat' },
  carpet: { label: 'Carpet', cogs: 'Carpet ki lagat (sq ft)' },
  agri: { label: 'Beej / khaad', cogs: 'Beej aur khaad ki lagat' },
  salon: { label: 'Salon', cogs: 'Products ki lagat', tips: ['Service ki bikri ki lagat nahi hoti; staff ki tankhwah aur commission yahan kharch me aati hai.'] },
  'services-biz': { label: 'Services', cogs: 'Parts ki lagat', tips: ['Mehnat (labour) ki bikri ki lagat nahi hoti, is liye margin zyada dikhta hai.'] },
  clinic: { label: 'Clinic', cogs: 'Dawai / saaman ki lagat' },
  hardware: { label: 'Hardware', cogs: 'Maal ki lagat' },
  jewelry: { label: 'Jewellery', cogs: 'Sone / maal ki lagat' },
  meat: { label: 'Gosht', cogs: 'Gosht ki lagat (kg)' },
  dairy: { label: 'Dairy', cogs: 'Doodh / maal ki lagat' },
};

export function usePnlConfig(): PnlConfig {
  const industry = useCurrentIndustry();
  return { ...BASE, ...(industry ? CONFIGS[industry.id] : undefined) };
}
