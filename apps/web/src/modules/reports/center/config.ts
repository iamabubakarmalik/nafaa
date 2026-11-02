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
import { t } from '@core/i18n';

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
  retail: { label: t('Retail'), tips: [t('"Maal" tab me "Ruka hua maal" dekhein — jo is period me bilkul nahi bika, us par sale lagayein.')] },
  restaurant: {
    label: t('Restaurant'),
    labels: { items: t('Dishes') },
    industry: { kind: 'restaurant', label: t('Restaurant'), icon: ChefHat, title: t('Orders, tables, waiter aur kitchen'),
      guide: step(ChefHat, '#ea580c', t('Restaurant tab'), t('Dine-in, takeaway, delivery ki alag kamai, kaunsi table sab se zyada kamati hai, waiter ki sale aur kitchen ka ausat waqt.')) },
  },
  clinic: {
    label: t('Clinic'),
    labels: { items: t('Services') },
    industry: { kind: 'clinic', label: t('Clinic'), icon: Stethoscope, title: t('Doctor, appointments aur fees'),
      guide: step(Stethoscope, '#0891b2', t('Clinic tab'), t('Har doctor ke appointments, kitne mareez nahi aaye, fees kitni bani aur kitni mili.')) },
  },
  gym: {
    label: t('Gym'),
    industry: { kind: 'gym', label: t('Gym'), icon: Dumbbell, title: t('Members, membership, haazri aur classes'),
      guide: step(Dumbbell, '#dc2626', t('Gym tab'), t('Naye members, kaunsa plan zyada bikta hai, baqi fees, kis waqt rush hota hai aur kis ki membership 7 din me khatam ho rahi hai.')) },
  },
  jewelry: {
    label: t('Jewelry'),
    industry: { kind: 'jewelry', label: t('Sona chandi'), icon: Gem, title: t('Gram, purity, banwai aur exchange'),
      guide: step(Gem, '#ca8a04', t('Sona chandi tab'), t('Kitne gram sona bika, kaunsi purity, banwai kitni kamayi aur purana sona kitna liya.')) },
    tips: [t('Jewelry bills ka wazan aur purity "Sona chandi" tab me hai; Sale tab POS ke bills dikhata hai.')],
  },
  mobile: {
    label: t('Mobile'),
    industry: { kind: 'mobile', label: t('Mobile'), icon: Smartphone, title: t('IMEI, PTA, repair, used phone aur qistein'),
      guide: step(Smartphone, '#2563eb', t('Mobile tab'), t('IMEI wale phone kitne bike, PTA ki halat, repair ki kamai, used phone ka profit aur qiston ka baqi.')) },
  },
  carpet: {
    label: t('Carpet'),
    industry: { kind: 'carpet', label: t('Carpet'), icon: Ruler, title: t('Sqft, design aur rolls'),
      guide: step(Ruler, '#7c3aed', t('Carpet tab'), t('Kitne sqft bike, kaunsa design zyada chalta hai, kitna kharab hua aur stock me kitne rolls hain.')) },
  },
  pharmacy: {
    label: t('Pharmacy'),
    labels: { items: t('Dawaiyan') },
    industry: { kind: 'pharmacy', label: t('Pharmacy'), icon: Pill, title: t('Expiry, schedule dawai aur nuskhe'),
      guide: step(Pill, '#059669', t('Pharmacy tab'), t('Kaunsi batch expire ho chuki ya 30/90 din me hogi, schedule wali dawaiyon ki sale, nuskhe aur controlled register.')) },
    tips: [t('Expire hone wali batches pehle bechein ya supplier ko wapas karein — Pharmacy tab me list hai.')],
  },
  bakery: {
    label: t('Bakery'),
    industry: { kind: 'bakery', label: t('Bakery'), icon: Croissant, title: t('Banaya, bika, phenka aur cake orders'),
      guide: step(Croissant, '#d97706', t('Bakery tab'), t('Plan me kitna socha, kitna bana, kitna phenkna para, aur cake/bare orders kitne aaye.')) },
  },
  agri: {
    label: t('Agri'),
    industry: { kind: 'agri', label: t('Kheti'), icon: Wheat, title: t('Type, mausam aur farmer ka udhaar'),
      guide: step(Wheat, '#16a34a', t('Kheti tab'), t('Beej, khaad, spray — kis type aur mausam ka maal bika, farmer par kitna udhaar hai, kis zila ke farmer hain.')) },
  },
  garments: {
    label: t('Garments'),
    industry: { kind: 'garments', label: t('Kapre'), icon: Shirt, title: t('Size, rang, season aur silai'),
      guide: step(Shirt, '#db2777', t('Kapre tab'), t('Kaunsa size aur rang zyada bikta hai, season war sale aur silai ke order — late wale bhi.')) },
  },
  electronics: {
    label: t('Electronics'),
    industry: { kind: 'electronics', label: t('Electronics'), icon: Cpu, title: t('Type, serial aur warranty'),
      guide: step(Cpu, '#2563eb', t('Electronics tab'), t('Type war sale, serial wale units ka profit, purana para maal aur warranty claims.')) },
  },
  appliances: {
    label: t('Appliances'),
    industry: { kind: 'appliances', label: t('Appliances'), icon: Refrigerator, title: t('Type, serial, service aur installation'),
      guide: step(Refrigerator, '#0891b2', t('Appliances tab'), t('Type war sale, serial ki umar, service calls, installations aur brand se lene wale claims.')) },
  },
  hardware: {
    label: t('Hardware'),
    industry: { kind: 'hardware', label: t('Projects'), icon: Hammer, title: t('Projects, quotations aur deliveries'),
      guide: step(Hammer, '#ea580c', t('Projects tab'), t('Chalu projects ka baqi, kitni quotations order bani aur deliveries ki halat.')) },
  },
  dairy: {
    label: t('Dairy'),
    industry: { kind: 'dairy', label: t('Dairy'), icon: Milk, title: t('Subah/shaam, delivery aur khate'),
      guide: step(Milk, '#0284c7', t('Dairy tab'), t('Subah aur shaam ki sale, kitna doodh pohncha, kaunsi delivery reh gayi aur khaton me kitna baqi hai.')) },
  },
  meat: {
    label: t('Meat'),
    industry: { kind: 'meat', label: t('Gosht'), icon: Beef, title: t('Kg, janwar, cut aur halal record'),
      guide: step(Beef, '#b91c1c', t('Gosht tab'), t('Kitne kg bika, kis janwar aur cut ka, zinda janwar kitne hain aur zibah ka halal record.')) },
  },
  autoparts: {
    label: t('Auto parts'),
    industry: { kind: 'autoparts', label: t('Workshop'), icon: Car, title: t('Jobs, mistri aur gaariyan'),
      guide: step(Car, '#475569', t('Workshop tab'), t('Kitni gaariyan aayin, kaam ki halat, mistri war kamai aur kis company ki gaariyan zyada aati hain.')) },
  },
  bookstore: {
    label: t('Bookstore'),
    industry: { kind: 'bookstore', label: t('Kitabein'), icon: BookOpen, title: t('Kitabein, stationery aur art'),
      guide: step(BookOpen, '#7c3aed', t('Kitabein tab'), t('Kitabon, stationery aur art ke saamaan ki alag sale aur har type ki details.')) },
  },
  'services-biz': {
    label: t('Services'),
    labels: { items: t('Services') },
    industry: { kind: 'services-biz', label: t('Jobs'), icon: Wrench, title: t('Jobs, technician aur baqi amount'),
      guide: step(Wrench, '#0f766e', t('Jobs tab'), t('Kitni jobs aayin, kitni mukammal hui, technician war kamai aur kitni amount baqi hai.')) },
  },
};

export function useReportsConfig(): ReportsConfig {
  const industry = useCurrentIndustry();
  return (industry?.id && CONFIGS[industry.id]) || { label: industry?.name ?? t('Dukaan') };
}
