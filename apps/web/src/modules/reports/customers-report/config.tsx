/**
 * Industry wording for the customers report: what a customer is called and
 * tips that suit how often people come back in that business. Industries
 * without an entry use the plain words.
 */

import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { t } from '@core/i18n';

export interface CustomersReportConfig {
  /** Business type shown in the header. */
  label: string;
  /** What customers are called here, plural. */
  noun: string;
  tips?: string[];
}

const SLOW_BUYERS = t('Is karobar me log saal me kam dafa aate hain — "Kho gaye" aur "Khatre me" ko aaram se dekhein, sirf naam dekh kar pareshan na hon.');

const CONFIGS: Record<string, Omit<CustomersReportConfig, 'label'>> = {
  clinic: { noun: t('Mareez'), tips: [t('Follow-up wale mareez "Dhyan chahiye" me nazar aate hain — unhein WhatsApp par yaad dilayein.')] },
  gym: { noun: t('Members'), tips: [t('Jo member 30 din se nahi aaya woh "Khatre me" ya "Kho gaye" me chala jata hai — membership khatam hone se pehle rabta karein.')] },
  salon: { noun: t('Clients'), tips: [t('Har 4–6 hafte aane wale clients "Wafadar" hain — un ke liye chhoti si discount rakhein.')] },
  hotel: { noun: t('Mehmaan') },
  agri: { noun: t('Kisan'), tips: [t('Kheti ka kaam mausam ke saath chalta hai — retention ko pichle saal ke isi mahine se milayein.'), SLOW_BUYERS] },
  pharmacy: { noun: t('Customers'), tips: [t('Har mahine dawai lene wale "Wafadar" me hone chahiye — jo is mahine nahi aaye unhein yaad dilayein.')] },
  jewelry: { noun: t('Customers'), tips: [SLOW_BUYERS] },
  furniture: { noun: t('Customers'), tips: [SLOW_BUYERS] },
  appliances: { noun: t('Customers'), tips: [SLOW_BUYERS] },
  electronics: { noun: t('Customers'), tips: [SLOW_BUYERS] },
  dairy: { noun: t('Customers'), tips: [t('Roz ke doodh wale customer "Behtareen" me hone chahiye — jo gir kar neeche aaye, un se poochein.')] },
};

export function useCustomersReportConfig(): CustomersReportConfig {
  const industry = useCurrentIndustry();
  const own = industry?.id ? CONFIGS[industry.id] : undefined;
  return { label: industry?.name ?? t('Dukaan'), noun: own?.noun ?? t('Customers'), tips: own?.tips };
}
