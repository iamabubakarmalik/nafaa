/**
 * What each industry changes in the staff report: what the people at the
 * counter are called, and a tip or guide step in that business's words.
 * Industries without an entry get the plain report.
 */

import { ChefHat, Scissors, Shirt, type LucideIcon } from 'lucide-react';
import type { GuideStep } from '@core/components/PageGuide';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';

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
  retail: { person: 'Cashier', tips: ['Rush ke ghanton me (heatmap me gehra rang) do counter chalayein — bill jaldi bante hain.'] },
  restaurant: {
    label: 'Restaurant', person: 'Waiter',
    tips: ['POS par "kis ke naam" me waiter chunein — warna sale cashier ke naam lagti hai.'],
    guide: [step(ChefHat, '#ea580c', 'Waiter ki sale', 'Har bill par waiter chuna ho to us ki sale, ausat bill aur rush ke ghante yahan alag dikhte hain.')],
  },
  salon: {
    label: 'Salon', person: 'Stylist',
    guide: [step(Scissors, '#db2777', 'Stylist ka kaam', 'Bill par stylist chunein — us ki kamai, ausat bill aur commission yahan aate hain.')],
  },
  garments: {
    label: 'Garments', person: 'Salesman',
    guide: [step(Shirt, '#7c3aed', 'Salesman ki sale', 'Counter par bill koi bhi banaye, "kis ke naam" me salesman chunein to sale usi ki ginti hai.')],
  },
  shoe: { label: 'Shoes', person: 'Salesman' },
  mobile: { label: 'Mobile', person: 'Salesman' },
  electronics: { label: 'Electronics', person: 'Salesman' },
  appliances: { label: 'Appliances', person: 'Salesman' },
  jewelry: { label: 'Jewelry', person: 'Salesman' },
  furniture: { label: 'Furniture', person: 'Salesman' },
  hardware: { label: 'Hardware', person: 'Salesman' },
  pharmacy: { label: 'Pharmacy', person: 'Counter staff', tips: ['Raat ki shift ka galla roz band karein — subah wala banda pichhle din ka farq na uthaye.'] },
  bakery: { label: 'Bakery', person: 'Cashier' },
};

export function useStaffReportConfig(): StaffReportConfig {
  const industry = useCurrentIndustry();
  const c = industry?.id ? CONFIGS[industry.id] : undefined;
  return { person: 'Staff', ...c, label: c?.label ?? industry?.name ?? 'Dukaan' };
}
