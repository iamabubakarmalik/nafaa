// apps/web/src/industries/mobile/index.ts
import type { IndustryPlugin } from '@industries/_shared/types/section.types';
import { MobileInventorySection } from './sections/MobileInventorySection';
import { MobileHeaderActionBar } from './sections/MobileHeaderActionBar';
import { MobileAdminStockBlock } from './sections/MobileAdminStockBlock';
import { MobileCustomerStockBlock } from './sections/MobileCustomerStockBlock';
import { MobileVariantsBanner } from './sections/MobileVariantsBanner';
import { MobileVariantExtraPanel } from './sections/MobileVariantExtraPanel';

/**
 * Mobile Industry Plugin — STRICT MATCHING
 *
 * Activates ONLY for mobile-specific business types.
 * Does NOT match ELECTRONICS / GADGETS / TECH (those belong to ElectronicsPack).
 */
export const mobilePlugin: IndustryPlugin = {
  key: 'MOBILE',
  label: 'Mobile',
  matches: ({ businessType, features }) => {
    const type = (businessType ?? '').toUpperCase().trim();

    const MOBILE_TYPES = [
      'MOBILE',
      'MOBILE_SHOP',
      'MOBILE_STORE',
      'CELLPHONE',
      'CELLPHONE_SHOP',
      'SMARTPHONE_SHOP',
      'PHONE_SHOP',
      'PHONE_STORE',
    ];

    if (MOBILE_TYPES.includes(type)) return true;

    // Explicitly reject electronics/gadgets/tech
    const isElectronicsType =
      type.includes('ELECTRONIC') ||
      type.includes('GADGET') ||
      type.includes('TECH') ||
      type === 'CONSUMER_ELECTRONICS';
    if (isElectronicsType) return false;

    // Fallback: activate on IMEI feature toggle
    return features?.imei === true;
  },
  InventorySection: MobileInventorySection,
  HeaderActionBar: MobileHeaderActionBar,
  AdminStockBlock: MobileAdminStockBlock,
  CustomerStockBlock: MobileCustomerStockBlock,
  VariantsBanner: MobileVariantsBanner,
  VariantExtraPanel: MobileVariantExtraPanel,
};

export { MobilePack } from './MobilePack';
