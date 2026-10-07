// apps/web/src/modules/inventory/low-stock/pages/LowStockGate.tsx
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import LowStockPage from './LowStockPage';
import RetailLowStockPage from '@industries/retail/pages/RetailLowStockPage';
import MobileLowStockPage from '@industries/mobile/pages/MobileLowStockPage';
import ElectronicsLowStockPage from '@industries/electronics/pages/ElectronicsLowStockPage';
import AppliancesLowStockPage from '@industries/appliances/pages/AppliancesLowStockPage';
import BakeryLowStockPage from '@industries/bakery/pages/BakeryLowStockPage';
import AgriLowStockPage from '@industries/agri/pages/AgriLowStockPage';
import RestaurantLowStockPage from '@industries/restaurant/pages/RestaurantLowStockPage';

/**
 * LowStockGate — routes /low-stock (ya /inventory/low-stock) to the
 * correct industry-specific alerts page.
 *
 * Har industry ka apna low-stock view ho sakta hai (jaise
 * Stock Report). Retail = grocery-focused (expiry-urgent items,
 * WhatsApp supplier reminders, reorder suggestions, velocity).
 * Baaki industries abhi generic page use karti hain — unki
 * custom pages baad mein add hongi jab zaroorat ho.
 */
export default function LowStockGate() {
  const industry = useCurrentIndustry();

  switch (industry?.id) {
    case 'retail':
      return <RetailLowStockPage />;

    case 'mobile':
      return <MobileLowStockPage />;

    case 'electronics':
      return <ElectronicsLowStockPage />;
    case 'appliances':
      return <AppliancesLowStockPage />;

    /* Bakery ka masla alag hai: sirf "stock kam hai" kaafi nahi.
       Aaj kya banana hai, saamaan hai ya nahi, aur kya aaj hi
       bikna chahiye — teenon ek jagah. */
    case 'bakery':
      return <BakeryLowStockPage />;

    /* Agri ka masla bhi alag hai: stock kam hona to ek taraf, beej
       aur dawa ki sarkari registration khatam ho jaye to poora
       stock hone par bhi wo bik nahi sakti. Aur season nikal jaye
       to maal saal bhar para rehta hai. */
    case 'agri':
      return <AgriLowStockPage />;

    /* Restaurant ka sawal hi alag hai: biryani stock me nahi hoti,
       chawal aur murghi hote hain. Is liye yahan "kaunsa maal kam
       hai" nahi, balke "ab kaunsi dish nahi ban sakti" dikhta hai. */
    case 'restaurant':
      return <RestaurantLowStockPage />;

    // Future: alag industries ka custom low-stock yahan add karo
    // case 'carpet':
    //   return <CarpetLowStockPage />;
    // case 'pharmacy':
    //   return <PharmacyLowStockPage />;

    default:
      // Generic fallback — sab industries jinki custom page nahi hai
      return <LowStockPage />;
  }
}
