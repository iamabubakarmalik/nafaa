import type { IndustryPlugin } from '@/features/industries/_shared/types/section.types';
import { MobileInventorySection } from './sections/MobileInventorySection';
import { MobileHeaderActionBar } from './sections/MobileHeaderActionBar';
import { MobileAdminStockBlock } from './sections/MobileAdminStockBlock';
import { MobileCustomerStockBlock } from './sections/MobileCustomerStockBlock';
import { MobileVariantsBanner } from './sections/MobileVariantsBanner';
import { MobileVariantExtraPanel } from './sections/MobileVariantExtraPanel';

/**
 * Mobile Industry Plugin — Complete
 *
 * Activates when:
 *  - businessType is MOBILE / MOBILE_SHOP / ELECTRONICS / PHONE
 *  - OR features.imei is enabled (mixed shops)
 *
 * Provides all 6 industry slots:
 *  - InventorySection: IMEI quick-add + warranty + default PTA + stats
 *  - HeaderActionBar: Header IMEI badges + quick add button
 *  - AdminStockBlock: Sidebar IMEI breakdown + PTA mini chart
 *  - CustomerStockBlock: Customer-facing PTA + warranty badges
 *  - VariantsBanner: Storage × Color matrix guide
 *  - VariantExtraPanel: Per-variant IMEI stats + add IMEIs button
 */
export const mobilePlugin: IndustryPlugin = {
  key: 'MOBILE',
  label: 'Mobile',
  matches: ({ businessType, features }) => {
    const type = (businessType ?? '').toUpperCase();
    const isMobileBusiness =
      type === 'MOBILE' ||
      type === 'MOBILE_SHOP' ||
      type === 'ELECTRONICS' ||
      type.includes('PHONE');
    const hasImeiFeature = features?.imei === true;
    return isMobileBusiness || hasImeiFeature;
  },
  InventorySection: MobileInventorySection,
  HeaderActionBar: MobileHeaderActionBar,
  AdminStockBlock: MobileAdminStockBlock,
  CustomerStockBlock: MobileCustomerStockBlock,
  VariantsBanner: MobileVariantsBanner,
  VariantExtraPanel: MobileVariantExtraPanel,
};
