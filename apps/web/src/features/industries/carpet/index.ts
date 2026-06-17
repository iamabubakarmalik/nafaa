import type { IndustryPlugin } from '@/features/industries/_shared/types/section.types';
import { CarpetInventorySection } from './sections/CarpetInventorySection';
import { CarpetVariantsBanner } from './sections/CarpetVariantsBanner';
import { CarpetVariantExtraPanel } from './sections/CarpetVariantExtraPanel';
import { CarpetHeaderActionBar } from './sections/CarpetHeaderActionBar';
import { CarpetAdminStockBlock } from './sections/CarpetAdminStockBlock';
import { CarpetCustomerStockBlock } from './sections/CarpetCustomerStockBlock';

const CARPET_UNITS = ['sqft', 'sqm', 'sqyd'];

export const carpetPlugin: IndustryPlugin = {
  key: 'CARPET',
  label: 'Carpet',
  matches: ({ businessType, unit, features }) => {
    const type = (businessType ?? '').toUpperCase();
    const isCarpetBusiness =
      type === 'CARPET' ||
      type === 'FLOORING' ||
      features?.lengthWidthCalc === true;
    return isCarpetBusiness && CARPET_UNITS.includes(unit);
  },
  InventorySection: CarpetInventorySection,
  VariantsBanner: CarpetVariantsBanner,
  VariantExtraPanel: CarpetVariantExtraPanel,
  HeaderActionBar: CarpetHeaderActionBar,
  AdminStockBlock: CarpetAdminStockBlock,
  CustomerStockBlock: CarpetCustomerStockBlock,
};
