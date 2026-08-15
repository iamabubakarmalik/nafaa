// apps/web/src/modules/inventory/low-stock/pages/LowStockGate.tsx
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import LowStockPage from './LowStockPage';
import RetailLowStockPage from '@industries/retail/pages/RetailLowStockPage';

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

    // Future: alag industries ka custom low-stock yahan add karo
    // case 'carpet':
    //   return <CarpetLowStockPage />;
    // case 'mobile':
    //   return <MobileLowStockPage />;
    // case 'pharmacy':
    //   return <PharmacyLowStockPage />;

    default:
      // Generic fallback — sab industries jinki custom page nahi hai
      return <LowStockPage />;
  }
}
