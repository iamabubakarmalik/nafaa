/**
 * What each industry adds to the shared report centre: its own tab (filled
 * from /reports/center/industry/:kind), renamed sections, guide steps and
 * tips. Industries without an entry get the plain report centre.
 */

import {
  Beef, BookOpen, Car, ChefHat, Croissant, Cpu, Dumbbell, Gem, Hammer, Milk, Pill, Refrigerator, Ruler, Shirt, Smartphone,
  Stethoscope, Wheat, Wrench, type LucideIcon,
} from 'lucide-react';
import type { GuideStep } from '@core/components/PageGuide';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import type { SectionId } from './api';

export interface ReportsConfig {
  /** Business type shown in the header. */
  label: string;
  /** Industry tab; `kind` picks the server section. */
  industry?: { kind: string; label: string; icon: LucideIcon; title: string; guide: GuideStep };
  /** Section names in this business's words. */
  labels?: Partial<Record<SectionId, string>>;
  tips?: string[];
}

const step = (icon: LucideIcon, color: string, title: string, text: string): GuideStep => ({ icon, color, title, text });

const CONFIGS: Record<string, ReportsConfig> = {
  retail: { label: 'Retail', tips: ['"Maal" tab me "Ruka hua maal" dekhein — jo is muddat me bilkul nahi bika, us par sale lagayein.'] },
  restaurant: {
    label: 'Restaurant',
    labels: { items: 'Dishes' },
    industry: { kind: 'restaurant', label: 'Restaurant', icon: ChefHat, title: 'Orders, tables, waiter aur kitchen',
      guide: step(ChefHat, '#ea580c', 'Restaurant tab', 'Dine-in, takeaway, delivery ki alag kamai, kaunsi table sab se zyada kamati hai, waiter ki bikri aur kitchen ka ausat waqt.') },
  },
  clinic: {
    label: 'Clinic',
    labels: { items: 'Services' },
    industry: { kind: 'clinic', label: 'Clinic', icon: Stethoscope, title: 'Doctor, appointments aur fees',
      guide: step(Stethoscope, '#0891b2', 'Clinic tab', 'Har doctor ke appointments, kitne mareez nahi aaye, fees kitni bani aur kitni mili.') },
  },
  gym: {
    label: 'Gym',
    industry: { kind: 'gym', label: 'Gym', icon: Dumbbell, title: 'Members, membership, haazri aur classes',
      guide: step(Dumbbell, '#dc2626', 'Gym tab', 'Naye members, kaunsa plan zyada bikta hai, baqi fees, kis waqt rush hota hai aur kis ki membership 7 din me khatam ho rahi hai.') },
  },
  jewelry: {
    label: 'Jewelry',
    industry: { kind: 'jewelry', label: 'Sona chandi', icon: Gem, title: 'Gram, purity, banwai aur exchange',
      guide: step(Gem, '#ca8a04', 'Sona chandi tab', 'Kitne gram sona bika, kaunsi purity, banwai kitni kamayi aur purana sona kitna liya.') },
    tips: ['Jewelry bills ka wazan aur purity "Sona chandi" tab me hai; Bikri tab POS ke bills dikhata hai.'],
  },
  mobile: {
    label: 'Mobile',
    industry: { kind: 'mobile', label: 'Mobile', icon: Smartphone, title: 'IMEI, PTA, repair, used phone aur qistein',
      guide: step(Smartphone, '#2563eb', 'Mobile tab', 'IMEI wale phone kitne bike, PTA ki halat, repair ki kamai, used phone ka munafa aur qiston ka baqi.') },
  },
  carpet: {
    label: 'Carpet',
    industry: { kind: 'carpet', label: 'Carpet', icon: Ruler, title: 'Sqft, design aur rolls',
      guide: step(Ruler, '#7c3aed', 'Carpet tab', 'Kitne sqft bike, kaunsa design zyada chalta hai, kitna kharab hua aur stock me kitne rolls hain.') },
  },
  pharmacy: {
    label: 'Pharmacy',
    labels: { items: 'Dawaiyan' },
    industry: { kind: 'pharmacy', label: 'Pharmacy', icon: Pill, title: 'Expiry, schedule dawai aur nuskhe',
      guide: step(Pill, '#059669', 'Pharmacy tab', 'Kaunsi batch expire ho chuki ya 30/90 din me hogi, schedule wali dawaiyon ki bikri, nuskhe aur controlled register.') },
    tips: ['Expire hone wali batches pehle bechein ya supplier ko wapas karein — Pharmacy tab me list hai.'],
  },
  bakery: {
    label: 'Bakery',
    industry: { kind: 'bakery', label: 'Bakery', icon: Croissant, title: 'Banaya, bika, phenka aur cake orders',
      guide: step(Croissant, '#d97706', 'Bakery tab', 'Plan me kitna socha, kitna bana, kitna phenkna para, aur cake/bare orders kitne aaye.') },
  },
  agri: {
    label: 'Agri',
    industry: { kind: 'agri', label: 'Kheti', icon: Wheat, title: 'Qism, mausam aur farmer ka udhaar',
      guide: step(Wheat, '#16a34a', 'Kheti tab', 'Beej, khaad, spray — kis qism aur mausam ka maal bika, farmer par kitna udhaar hai, kis zila ke farmer hain.') },
  },
  garments: {
    label: 'Garments',
    industry: { kind: 'garments', label: 'Kapre', icon: Shirt, title: 'Size, rang, season aur silai',
      guide: step(Shirt, '#db2777', 'Kapre tab', 'Kaunsa size aur rang zyada bikta hai, season war bikri aur silai ke order — late wale bhi.') },
  },
  electronics: {
    label: 'Electronics',
    industry: { kind: 'electronics', label: 'Electronics', icon: Cpu, title: 'Qism, serial aur warranty',
      guide: step(Cpu, '#2563eb', 'Electronics tab', 'Qism war bikri, serial wale units ka munafa, purana para maal aur warranty claims.') },
  },
  appliances: {
    label: 'Appliances',
    industry: { kind: 'appliances', label: 'Appliances', icon: Refrigerator, title: 'Qism, serial, service aur installation',
      guide: step(Refrigerator, '#0891b2', 'Appliances tab', 'Qism war bikri, serial ki umar, service calls, installations aur brand se lene wale claims.') },
  },
  hardware: {
    label: 'Hardware',
    industry: { kind: 'hardware', label: 'Projects', icon: Hammer, title: 'Projects, quotations aur deliveries',
      guide: step(Hammer, '#ea580c', 'Projects tab', 'Chalu projects ka baqi, kitni quotations order bani aur deliveries ki halat.') },
  },
  dairy: {
    label: 'Dairy',
    industry: { kind: 'dairy', label: 'Dairy', icon: Milk, title: 'Subah/shaam, delivery aur khate',
      guide: step(Milk, '#0284c7', 'Dairy tab', 'Subah aur shaam ki bikri, kitna doodh pohncha, kaunsi delivery reh gayi aur khaton me kitna baqi hai.') },
  },
  meat: {
    label: 'Meat',
    industry: { kind: 'meat', label: 'Gosht', icon: Beef, title: 'Kg, janwar, cut aur halal record',
      guide: step(Beef, '#b91c1c', 'Gosht tab', 'Kitne kg bika, kis janwar aur cut ka, zinda janwar kitne hain aur zibah ka halal record.') },
  },
  autoparts: {
    label: 'Auto parts',
    industry: { kind: 'autoparts', label: 'Workshop', icon: Car, title: 'Jobs, mistri aur gaariyan',
      guide: step(Car, '#475569', 'Workshop tab', 'Kitni gaariyan aayin, kaam ki halat, mistri war kamai aur kis company ki gaariyan zyada aati hain.') },
  },
  bookstore: {
    label: 'Bookstore',
    industry: { kind: 'bookstore', label: 'Kitabein', icon: BookOpen, title: 'Kitabein, stationery aur art',
      guide: step(BookOpen, '#7c3aed', 'Kitabein tab', 'Kitabon, stationery aur art ke saamaan ki alag bikri aur har qism ki tafseel.') },
  },
  'services-biz': {
    label: 'Services',
    labels: { items: 'Services' },
    industry: { kind: 'services-biz', label: 'Jobs', icon: Wrench, title: 'Jobs, technician aur baqi raqam',
      guide: step(Wrench, '#0f766e', 'Jobs tab', 'Kitni jobs aayin, kitni mukammal hui, technician war kamai aur kitni raqam baqi hai.') },
  },
};

export function useReportsConfig(): ReportsConfig {
  const industry = useCurrentIndustry();
  return (industry?.id && CONFIGS[industry.id]) || { label: industry?.name ?? 'Dukaan' };
}
