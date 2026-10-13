/**
 * Industry wording for the customers report: what a customer is called and
 * tips that suit how often people come back in that business. Industries
 * without an entry use the plain words.
 */

import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';

export interface CustomersReportConfig {
  /** Business type shown in the header. */
  label: string;
  /** What customers are called here, plural. */
  noun: string;
  tips?: string[];
}

const SLOW_BUYERS = 'Is karobar me log saal me kam dafa aate hain — "Kho gaye" aur "Khatre me" ko aaram se dekhein, sirf naam dekh kar pareshan na hon.';

const CONFIGS: Record<string, Omit<CustomersReportConfig, 'label'>> = {
  clinic: { noun: 'Mareez', tips: ['Follow-up wale mareez "Dhyan chahiye" me nazar aate hain — unhein WhatsApp par yaad dilayein.'] },
  gym: { noun: 'Members', tips: ['Jo member 30 din se nahi aaya woh "Khatre me" ya "Kho gaye" me chala jata hai — membership khatam hone se pehle rabta karein.'] },
  salon: { noun: 'Clients', tips: ['Har 4–6 hafte aane wale clients "Wafadar" hain — un ke liye chhoti si chhoot rakhein.'] },
  hotel: { noun: 'Mehmaan' },
  agri: { noun: 'Kisan', tips: ['Kheti ka kaam mausam ke saath chalta hai — retention ko pichle saal ke isi mahine se milayein.', SLOW_BUYERS] },
  pharmacy: { noun: 'Customers', tips: ['Har mahine dawai lene wale "Wafadar" me hone chahiye — jo is mahine nahi aaye unhein yaad dilayein.'] },
  jewelry: { noun: 'Customers', tips: [SLOW_BUYERS] },
  furniture: { noun: 'Customers', tips: [SLOW_BUYERS] },
  appliances: { noun: 'Customers', tips: [SLOW_BUYERS] },
  electronics: { noun: 'Customers', tips: [SLOW_BUYERS] },
  dairy: { noun: 'Customers', tips: ['Roz ke doodh wale customer "Behtareen" me hone chahiye — jo gir kar neeche aaye, un se poochein.'] },
};

export function useCustomersReportConfig(): CustomersReportConfig {
  const industry = useCurrentIndustry();
  const own = industry?.id ? CONFIGS[industry.id] : undefined;
  return { label: industry?.name ?? 'Dukaan', noun: own?.noun ?? 'Customers', tips: own?.tips };
}
