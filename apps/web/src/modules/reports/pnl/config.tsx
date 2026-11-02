/**
 * What each industry changes on the P&L: the name of its cost of goods and
 * a few tips in the guide. Industries without an entry use the plain words.
 */

import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { t } from '@core/i18n';

export interface PnlConfig {
  /** Business type shown in the header. */
  label: string;
  /** Name of the cost of goods line. */
  cogs: string;
  cogsHint: string;
  tips?: string[];
}

const BASE: PnlConfig = {
  label: t('Dukaan'),
  cogs: t('Maal ki cost (COGS)'),
  cogsHint: t('Jo maal bika, wo kitne ka khareeda tha'),
};

const CONFIGS: Record<string, Partial<PnlConfig>> = {
  retail: { label: t('Kiryana / retail') },
  pharmacy: { label: t('Pharmacy'), cogs: t('Dawaiyon ki cost'), tips: [t('Expire hui dawai "Stock adjustment" me Kharab likhein, tab hi wo nuqsan me aati hai.')] },
  restaurant: {
    label: t('Restaurant'), cogs: t('Khane ki cost (food cost)'), cogsHint: t('Recipe ke hisaab se saaman ki cost'),
    tips: [t('Recipe me saaman ki qeemat likhein, warna food cost "andaza" ya khali rahegi.'), t('Achhe restaurant me food cost aam tor par sale ka 30–35% hoti hai.')],
  },
  bakery: {
    label: t('Bakery'), cogs: t('Maal aur saaman ki cost'), cogsHint: t('Recipe ya product par likhi cost'),
    tips: [t('"Saamaan" (maida, cheeni) ki purchase Kharchay me judti hai. Agar products par cost bhi likhi hai to cost do dafa gin sakti hai.')],
  },
  mobile: { label: t('Mobile shop'), cogs: t('Phones aur parts ki cost'), tips: [t('Har IMEI ki apni cost hoti hai, wohi sale par likhi jati hai.')] },
  electronics: { label: t('Electronics'), cogs: t('Maal ki cost (serial war)') },
  appliances: { label: t('Appliances'), cogs: t('Maal ki cost (serial war)') },
  garments: { label: t('Garments'), cogs: t('Kapre ki cost') },
  shoe: { label: t('Shoes'), cogs: t('Jooton ki cost') },
  carpet: { label: t('Carpet'), cogs: t('Carpet ki cost (sq ft)') },
  agri: { label: t('Beej / khaad'), cogs: t('Beej aur khaad ki cost') },
  salon: { label: t('Salon'), cogs: t('Products ki cost'), tips: [t('Service ki sale ki cost nahi hoti; staff ki tankhwah aur commission yahan kharch me aati hai.')] },
  'services-biz': { label: t('Services'), cogs: t('Parts ki cost'), tips: [t('Mehnat (labour) ki sale ki cost nahi hoti, is liye margin zyada dikhta hai.')] },
  clinic: { label: t('Clinic'), cogs: t('Dawai / saaman ki cost') },
  hardware: { label: t('Hardware'), cogs: t('Maal ki cost') },
  jewelry: { label: t('Jewellery'), cogs: t('Sone / maal ki cost') },
  meat: { label: t('Gosht'), cogs: t('Gosht ki cost (kg)') },
  dairy: { label: t('Dairy'), cogs: t('Doodh / maal ki cost') },
};

export function usePnlConfig(): PnlConfig {
  const industry = useCurrentIndustry();
  return { ...BASE, ...(industry ? CONFIGS[industry.id] : undefined) };
}
