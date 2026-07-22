import type { IndustryPlugin } from '@industries/_shared/types/section.types';
import { StandardInventorySection } from './sections/StandardInventorySection';

export const standardPlugin: IndustryPlugin = {
  key: 'STANDARD',
  label: 'Standard',
  matches: () => true, // fallback — always matches as last resort
  InventorySection: StandardInventorySection,
};
