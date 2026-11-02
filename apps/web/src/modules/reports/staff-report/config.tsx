/**
 * What each industry changes in the staff report: what the people at the
 * counter are called, and a tip or guide step in that business's words.
 * Industries without an entry get the plain report.
 */

import { ChefHat, Scissors, Shirt, type LucideIcon } from 'lucide-react';
import type { GuideStep } from '@core/components/PageGuide';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { t } from '@core/i18n';

export interface StaffReportConfig {
  /** Business type shown in the header. */
  label: string;
  /** One person at the counter: "Cashier", "Waiter"… */
  person: string;
  tips?: string[];
  guide?: GuideStep[];
}

const step = (icon: LucideIcon, color: string, title: string, text: string): GuideStep => ({ icon, color, title, text });

const CONFIGS: Record<string, Omit<StaffReportConfig, 'label'> & { label?: string }> = {
  retail: { person: t('Cashier'), tips: [t('Rush ke ghanton me (heatmap me gehra rang) do counter chalayein — bill jaldi bante hain.')] },
  restaurant: {
    label: t('Restaurant'), person: t('Waiter'),
    tips: [t('POS par "kis ke naam" me waiter chunein — warna sale cashier ke naam lagti hai.')],
    guide: [step(ChefHat, '#ea580c', t('Waiter ki sale'), t('Har bill par waiter chuna ho to us ki sale, ausat bill aur rush ke ghante yahan alag dikhte hain.'))],
  },
  salon: {
    label: t('Salon'), person: t('Stylist'),
    guide: [step(Scissors, '#db2777', t('Stylist ka kaam'), t('Bill par stylist chunein — us ki kamai, ausat bill aur commission yahan aate hain.'))],
  },
  garments: {
    label: t('Garments'), person: t('Salesman'),
    guide: [step(Shirt, '#7c3aed', t('Salesman ki sale'), t('Counter par bill koi bhi banaye, "kis ke naam" me salesman chunein to sale usi ki ginti hai.'))],
  },
  shoe: { label: t('Shoes'), person: t('Salesman') },
  mobile: { label: t('Mobile'), person: t('Salesman') },
  electronics: { label: t('Electronics'), person: t('Salesman') },
  appliances: { label: t('Appliances'), person: t('Salesman') },
  jewelry: { label: t('Jewelry'), person: t('Salesman') },
  furniture: { label: t('Furniture'), person: t('Salesman') },
  hardware: { label: t('Hardware'), person: t('Salesman') },
  pharmacy: { label: t('Pharmacy'), person: t('Counter staff'), tips: [t('Raat ki shift ka galla roz band karein — subah wala banda pichhle din ka farq na uthaye.')] },
  bakery: { label: t('Bakery'), person: t('Cashier') },
};

export function useStaffReportConfig(): StaffReportConfig {
  const industry = useCurrentIndustry();
  const c = industry?.id ? CONFIGS[industry.id] : undefined;
  return { person: t('Staff'), ...c, label: c?.label ?? industry?.name ?? t('Dukaan') };
}
