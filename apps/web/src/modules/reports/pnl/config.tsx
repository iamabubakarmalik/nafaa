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
  cogs: 'Maal ki cost (COGS)',
  cogsHint: 'Jo maal bika, wo kitne ka khareeda tha',
};

const CONFIGS: Record<string, Partial<PnlConfig>> = {
  retail: { label: 'Kiryana / retail' },
  pharmacy: { label: 'Pharmacy', cogs: 'Dawaiyon ki cost', tips: ['Expire hui dawai "Stock adjustment" me Kharab likhein, tab hi wo nuqsan me aati hai.'] },
  restaurant: {
    label: 'Restaurant', cogs: 'Khane ki cost (food cost)', cogsHint: 'Recipe ke hisaab se saaman ki cost',
    tips: ['Recipe me saaman ki qeemat likhein, warna food cost "andaza" ya khali rahegi.', 'Achhe restaurant me food cost aam tor par sale ka 30–35% hoti hai.'],
  },
  bakery: {
    label: 'Bakery', cogs: 'Maal aur saaman ki cost', cogsHint: 'Recipe ya product par likhi cost',
    tips: ['"Saamaan" (maida, cheeni) ki purchase Kharchay me judti hai. Agar products par cost bhi likhi hai to cost do dafa gin sakti hai.'],
  },
  mobile: { label: 'Mobile shop', cogs: 'Phones aur parts ki cost', tips: ['Har IMEI ki apni cost hoti hai, wohi sale par likhi jati hai.'] },
  electronics: { label: 'Electronics', cogs: 'Maal ki cost (serial war)' },
  appliances: { label: 'Appliances', cogs: 'Maal ki cost (serial war)' },
  garments: { label: 'Garments', cogs: 'Kapre ki cost' },
  shoe: { label: 'Shoes', cogs: 'Jooton ki cost' },
  carpet: { label: 'Carpet', cogs: 'Carpet ki cost (sq ft)' },
  agri: { label: 'Beej / khaad', cogs: 'Beej aur khaad ki cost' },
  salon: { label: 'Salon', cogs: 'Products ki cost', tips: ['Service ki bikri ki lagat nahi hoti; staff ki tankhwah aur commission yahan kharch me aati hai.'] },
  'services-biz': { label: 'Services', cogs: 'Parts ki cost', tips: ['Mehnat (labour) ki sale ki cost nahi hoti, is liye margin zyada dikhta hai.'] },
  clinic: { label: 'Clinic', cogs: 'Dawai / saaman ki cost' },
  hardware: { label: 'Hardware', cogs: 'Maal ki cost' },
  jewelry: { label: 'Jewellery', cogs: 'Sone / maal ki cost' },
  meat: { label: 'Gosht', cogs: 'Gosht ki cost (kg)' },
  dairy: { label: 'Dairy', cogs: 'Doodh / maal ki cost' },
};

export function usePnlConfig(): PnlConfig {
  const industry = useCurrentIndustry();
  return { ...BASE, ...(industry ? CONFIGS[industry.id] : undefined) };
}
